import { describe, expect, it } from "vitest";

import {
  currentRepository,
  evaluateBranchPolicy,
  normalizeRepository,
} from "../scripts/check-active-branch.mjs";

describe("Sparkle Suite active branch policy", () => {
  it("accepts the verified repository, protected development branch, and primary worktree", () => {
    expect(
      evaluateBranchPolicy({
        branch: "codex/nic-nac-trade-hardening",
        remoteRepository: "louis623/sparkle-suite",
        worktree: "C:\\Users\\louis\\sparkle-suite-repo",
        platform: "win32",
      }),
    ).toEqual([]);
  });

  it("accepts the isolated release branch only from its explicitly registered worktree", () => {
    expect(
      evaluateBranchPolicy({
        branch: "codex/nic-nac-photo-rarity-repair",
        remoteRepository: "louis623/sparkle-suite",
        worktree:
          "C:\\Users\\louis\\sparkle-suite-repo\\.local\\worktrees\\nic-nac-photo-rarity",
        platform: "win32",
      }),
    ).toEqual([]);
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
      'branch "main" is not active; allowed: codex/nic-nac-photo-rarity-repair, codex/nic-nac-trade-hardening',
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
});
