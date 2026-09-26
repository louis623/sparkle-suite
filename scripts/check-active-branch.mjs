import { existsSync, readFileSync, statSync } from "node:fs";
import {
  dirname,
  isAbsolute,
  join,
  normalize,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const policyPath = resolve(repositoryRoot, "config", "active-branches.json");
const policy = JSON.parse(readFileSync(policyPath, "utf8"));

function gitDirectories() {
  const dotGit = resolve(repositoryRoot, ".git");
  const gitDirectory = statSync(dotGit).isDirectory()
    ? dotGit
    : resolve(
        repositoryRoot,
        readFileSync(dotGit, "utf8").trim().replace(/^gitdir:\s*/i, ""),
      );
  const commonDirectoryPath = join(gitDirectory, "commondir");
  const commonDirectory = existsSync(commonDirectoryPath)
    ? resolve(
        gitDirectory,
        readFileSync(commonDirectoryPath, "utf8").trim(),
      )
    : gitDirectory;

  return { commonDirectory, gitDirectory };
}

function gitMetadata() {
  const { commonDirectory, gitDirectory } = gitDirectories();
  const head = readFileSync(join(gitDirectory, "HEAD"), "utf8").trim();
  const config = readFileSync(join(commonDirectory, "config"), "utf8");
  const originSection = config.match(
    /\[remote "origin"\]([\s\S]*?)(?=\r?\n\[|$)/,
  );
  const originUrl = originSection?.[1].match(/^\s*url\s*=\s*(.+)$/m)?.[1];

  if (!originUrl) {
    throw new Error("Git remote origin URL is missing from repository config.");
  }

  return {
    branch: head.startsWith("ref: refs/heads/")
      ? head.replace("ref: refs/heads/", "")
      : "(detached HEAD)",
    originUrl,
  };
}

export function normalizeRepository(remoteUrl) {
  return remoteUrl
    .trim()
    .replace(/^git@github\.com:/i, "")
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/g, "");
}

export function evaluateBranchPolicy({
  branch,
  remoteRepository,
  worktree,
  isVercel = false,
  platform = process.platform,
  projectId = process.env.VERCEL_PROJECT_ID,
}) {
  const errors = [];
  const smoke = policy.smokeBranches?.includes(branch) === true;

  if (!policy.activeBranches.includes(branch) && !smoke) {
    errors.push(
      `branch "${branch}" is not active; allowed: ${policy.activeBranches.join(", ")}`,
    );
  }
  if (smoke && isVercel && projectId !== policy.smokeProjectId) {
    errors.push('Smoke branch requires the exact Suite Smoke Vercel project; production is forbidden.');
  }

  if (remoteRepository !== policy.repository) {
    errors.push(
      `GitHub repository "${remoteRepository}" does not match ${policy.repository}`,
    );
  }

  if (
    platform === "win32" &&
    !isVercel &&
    !(smoke ? policy.smokeLocalWorktrees : (policy.activeLocalWorktrees || [policy.primaryLocalWorktree])).some(
      (allowedWorktree) =>
        normalize(worktree).toLowerCase() ===
        normalize(allowedWorktree).toLowerCase(),
    )
  ) {
    errors.push(
      `worktree "${worktree}" is not an active Sparkle Suite workbench: ${(policy.activeLocalWorktrees || [policy.primaryLocalWorktree]).join(", ")}`,
    );
  }

  return errors;
}

export function currentBranch() {
  const environmentBranch =
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.GITHUB_HEAD_REF ||
    process.env.GITHUB_REF_NAME;
  const declaredReleaseBranch = process.env.SPARKLE_RELEASE_BRANCH?.trim();

  if (
    environmentBranch &&
    declaredReleaseBranch &&
    environmentBranch.replace(/^refs\/heads\//, "") !== declaredReleaseBranch
  ) {
    throw new Error(
      `Declared release branch "${declaredReleaseBranch}" does not match platform branch "${environmentBranch}".`,
    );
  }

  if (environmentBranch) {
    return environmentBranch.replace(/^refs\/heads\//, "");
  }

  if (declaredReleaseBranch) return declaredReleaseBranch;

  return gitMetadata().branch;
}

function hasDeclaredManualReleaseProvenance() {
  return Boolean(
    process.env.SPARKLE_RELEASE_BRANCH?.trim() &&
      process.env.SPARKLE_RELEASE_REPOSITORY?.trim(),
  );
}

export function currentRepository() {
  if (process.env.VERCEL === "1" || hasDeclaredManualReleaseProvenance()) {
    const owner = process.env.VERCEL_GIT_REPO_OWNER?.trim();
    const repository = process.env.VERCEL_GIT_REPO_SLUG?.trim();
    const declaredReleaseRepository =
      process.env.SPARKLE_RELEASE_REPOSITORY?.trim();

    if (owner && repository) {
      const platformRepository = `${owner}/${repository}`;
      if (
        declaredReleaseRepository &&
        platformRepository !== declaredReleaseRepository
      ) {
        throw new Error(
          `Declared release repository "${declaredReleaseRepository}" does not match Vercel repository "${platformRepository}".`,
        );
      }
      return platformRepository;
    }

    if (!declaredReleaseRepository) {
      throw new Error(
        "Vercel Git repository metadata is missing; expected platform metadata or SPARKLE_RELEASE_REPOSITORY for a manual CLI deployment.",
      );
    }

    return declaredReleaseRepository;
  }

  return normalizeRepository(gitMetadata().originUrl);
}

function main() {
  const operationIndex = process.argv.indexOf("--operation");
  const operation =
    operationIndex >= 0 && process.argv[operationIndex + 1]
      ? process.argv[operationIndex + 1]
      : process.env.npm_lifecycle_event || "operation";
  const branch = currentBranch();
  const worktree = repositoryRoot;
  const remoteRepository = currentRepository();
  const errors = evaluateBranchPolicy({
    branch,
    remoteRepository,
    worktree,
    isVercel:
      process.env.VERCEL === "1" || hasDeclaredManualReleaseProvenance(),
  });

  if (errors.length > 0) {
    console.error(
      [
        "",
        "SPARKLE SUITE BRANCH SAFETY BLOCK",
        `Refused ${operation}.`,
        ...errors.map((error) => `- ${error}`),
        "",
        `Review ${policyPath} and docs/sparkle-suite/operations/branch-register.md.`,
        "Do not bypass this guard. Update the allowlist only after Louis approves a branch-status change.",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log(
    `Sparkle Suite branch safety passed: ${policy.repository} @ ${branch} (${worktree})`,
  );
}

if (isAbsolute(process.argv[1] || "") &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
