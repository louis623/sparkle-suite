import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  finderCollectionSaveSilverMessage,
  finderNicNacPublicLine,
  finderNicNacSilverMessage,
} from "../../lib/sparkle-finder/access-split";

const publicLine = "Nic-Nac is your collection curator and jewelry finder assistant.";

const touchedCopyFiles = [
  "lib/sparkle-finder/access-split.ts",
  "app/(hub)/silver/page.tsx",
  "app/(hub)/silver/actions.ts",
  "components/nic-nac/FinderNicNacWorkspace.tsx",
  "components/nic-nac/FindThisForMe.tsx",
  "components/nic-nac/FinderNicNacChatbot.tsx",
  "components/favorites/FavoriteRepsPanel.tsx",
  "components/silver/CollectionManager.tsx",
  "components/silver/SimpleSilverShowcase.tsx",
  "components/silver/ProfileEditor.tsx",
  "components/showcase/ShowcaseOwnerPanel.tsx",
];

describe("Finder access split", () => {
  it("uses the locked Nic-Nac public line", () => {
    expect(finderNicNacPublicLine).toBe(publicLine);
    expect(finderNicNacSilverMessage).toBe("Silver is required to use Nic-Nac.");
    expect(finderCollectionSaveSilverMessage).toBe("Silver is required to save a collection.");
    expect(`${finderNicNacPublicLine} ${finderNicNacSilverMessage}`).not.toMatch(/limited helper|unlimited chat/i);
  });

  it("keeps added customer copy free of limited-helper wording", () => {
    const copy = touchedCopyFiles.map((file) => readFileSync(file, "utf8")).join("\n");

    expect(copy).toContain(publicLine);
    expect(copy).not.toMatch(/limited helper/i);
    expect(copy).not.toMatch(/unlimited chat/i);
    expect(copy).not.toMatch(/\bvault\b/i);
  });

  it("keeps the launch-notify live write", () => {
    const source = readFileSync("app/api/finder/launch-notify/route.ts", "utf8");

    expect(source).toContain("createLiveFinderLaunchNotifyClient");
    expect(source).toContain("finderLaunchNotifyTable");
    expect(source).toContain(".insert(parsed.row)");
  });

  it("records the Free Studio read and favorite insert policy without a Silver cap", () => {
    const source = readFileSync(
      "supabase/migrations/20261003193000_sparkle_finder_free_access_split.sql",
      "utf8",
    );

    expect(source).toContain('drop policy if exists "Silver users can select their own intake submissions"');
    expect(source).toContain("user_id = auth.uid()");
    expect(source).toContain("Saving a collection and Nic-Nac stay Silver");
    expect(source).not.toMatch(/count\s*</);
  });
});
