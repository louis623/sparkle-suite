import { describe, expect, it } from "vitest";

import {
  currentBranch,
  currentRepository,
  evaluateBranchPolicy,
  normalizeRepository,
} from "../scripts/check-active-branch.mjs";

describe("Sparkle Suite active branch policy", () => {
  it("accepts the verified repository, production branch, and primary worktree", () => {
    expect(
      evaluateBranchPolicy({
        branch: "codex/nic-nac-trade-hardening",
        remoteRepository: "louis623/sparkle-suite",
        worktree: "C:\\Users\\louis\\sparkle-suite-repo",
        platform: "win32",
      }),
    ).toEqual([]);
  });

  it("rejects the retired photo-rarity release branch and worktree", () => {
    const errors = evaluateBranchPolicy({
      branch: "codex/nic-nac-photo-rarity-repair",
      remoteRepository: "louis623/sparkle-suite",
      worktree:
        "C:\\Users\\louis\\sparkle-suite-repo\\.local\\worktrees\\nic-nac-photo-rarity",
      platform: "win32",
    });

    expect(errors).toContain(
      'branch "codex/nic-nac-photo-rarity-repair" is not active; allowed: codex/nic-nac-trade-hardening',
    );
    expect(
      errors.some((error) =>
        error.includes("is not an active Sparkle Suite workbench"),
      ),
    ).toBe(true);
  });

  it("fails closed on legacy or unknown branches", () => {
    expect(
      evaluateBranchPolicy({
        branch: "main",
        remoteRepository: "louis623/sparkle-suite",
        worktree: "C:\\Users\\louis\\sparkle-suite-repo",
        platform: "win32",
      }),
    ).toContain(
      'branch "main" is not active; allowed: codex/nic-nac-trade-hardening',
    );
  });

  it("fails closed on the wrong repository or a secondary worktree", () => {
    const errors = evaluateBranchPolicy({
      branch: "codex/nic-nac-trade-hardening",
      remoteRepository: "louis623/another-repo",
      worktree: "C:\\Users\\louis\\.codex\\worktrees\\1234\\sparkle-suite-repo",
      platform: "win32",
    });

    expect(errors).toHaveLength(2);
  });

  it("normalizes supported GitHub remote formats", () => {
    expect(
      normalizeRepository("https://github.com/louis623/sparkle-suite.git"),
    ).toBe("louis623/sparkle-suite");
    expect(normalizeRepository("git@github.com:louis623/sparkle-suite.git")).toBe(
      "louis623/sparkle-suite",
    );
  });

  it("reads repository identity from Vercel system metadata without a Git remote", () => {
    const previous = {
      vercel: process.env.VERCEL,
      owner: process.env.VERCEL_GIT_REPO_OWNER,
      repository: process.env.VERCEL_GIT_REPO_SLUG,
    };

    process.env.VERCEL = "1";
    process.env.VERCEL_GIT_REPO_OWNER = "louis623";
    process.env.VERCEL_GIT_REPO_SLUG = "sparkle-suite";

    try {
      expect(currentRepository()).toBe("louis623/sparkle-suite");
    } finally {
      if (previous.vercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previous.vercel;
      if (previous.owner === undefined) delete process.env.VERCEL_GIT_REPO_OWNER;
      else process.env.VERCEL_GIT_REPO_OWNER = previous.owner;
      if (previous.repository === undefined)
        delete process.env.VERCEL_GIT_REPO_SLUG;
      else process.env.VERCEL_GIT_REPO_SLUG = previous.repository;
    }
  });

  it("accepts explicit, matching provenance for a sourceless manual Vercel deployment", () => {
    const previous = {
      vercel: process.env.VERCEL,
      branch: process.env.SPARKLE_RELEASE_BRANCH,
      repository: process.env.SPARKLE_RELEASE_REPOSITORY,
      vercelBranch: process.env.VERCEL_GIT_COMMIT_REF,
      owner: process.env.VERCEL_GIT_REPO_OWNER,
      slug: process.env.VERCEL_GIT_REPO_SLUG,
    };

    process.env.VERCEL = "1";
    process.env.SPARKLE_RELEASE_BRANCH = "codex/nic-nac-trade-hardening";
    process.env.SPARKLE_RELEASE_REPOSITORY = "louis623/sparkle-suite";
    delete process.env.VERCEL_GIT_COMMIT_REF;
    delete process.env.VERCEL_GIT_REPO_OWNER;
    delete process.env.VERCEL_GIT_REPO_SLUG;

    try {
      expect(currentBranch()).toBe("codex/nic-nac-trade-hardening");
      expect(currentRepository()).toBe("louis623/sparkle-suite");
    } finally {
      for (const [key, value] of Object.entries({
        VERCEL: previous.vercel,
        SPARKLE_RELEASE_BRANCH: previous.branch,
        SPARKLE_RELEASE_REPOSITORY: previous.repository,
        VERCEL_GIT_COMMIT_REF: previous.vercelBranch,
        VERCEL_GIT_REPO_OWNER: previous.owner,
        VERCEL_GIT_REPO_SLUG: previous.slug,
      })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("accepts explicit manual-release provenance when the Vercel CLI build has no .git checkout", () => {
    const previous = {
      vercel: process.env.VERCEL,
      branch: process.env.SPARKLE_RELEASE_BRANCH,
      repository: process.env.SPARKLE_RELEASE_REPOSITORY,
    };

    delete process.env.VERCEL;
    process.env.SPARKLE_RELEASE_BRANCH = "codex/nic-nac-trade-hardening";
    process.env.SPARKLE_RELEASE_REPOSITORY = "louis623/sparkle-suite";

    try {
      expect(currentBranch()).toBe("codex/nic-nac-trade-hardening");
      expect(currentRepository()).toBe("louis623/sparkle-suite");
    } finally {
      if (previous.vercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previous.vercel;
      if (previous.branch === undefined) delete process.env.SPARKLE_RELEASE_BRANCH;
      else process.env.SPARKLE_RELEASE_BRANCH = previous.branch;
      if (previous.repository === undefined)
        delete process.env.SPARKLE_RELEASE_REPOSITORY;
      else process.env.SPARKLE_RELEASE_REPOSITORY = previous.repository;
    }
  });

  it("rejects conflicting manual and platform provenance", () => {
    const previousBranch = process.env.SPARKLE_RELEASE_BRANCH;
    const previousVercelBranch = process.env.VERCEL_GIT_COMMIT_REF;
    process.env.SPARKLE_RELEASE_BRANCH = "codex/nic-nac-photo-rarity-repair";
    process.env.VERCEL_GIT_COMMIT_REF = "codex/nic-nac-trade-hardening";

    try {
      expect(() => currentBranch()).toThrow("does not match platform branch");
    } finally {
      if (previousBranch === undefined) delete process.env.SPARKLE_RELEASE_BRANCH;
      else process.env.SPARKLE_RELEASE_BRANCH = previousBranch;
      if (previousVercelBranch === undefined)
        delete process.env.VERCEL_GIT_COMMIT_REF;
      else process.env.VERCEL_GIT_COMMIT_REF = previousVercelBranch;
    }
  });
});
