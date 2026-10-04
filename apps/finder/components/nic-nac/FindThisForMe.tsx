import { FinderNicNacChatbot } from "@/components/nic-nac/FinderNicNacChatbot";
import { finderNicNacPublicLine, finderNicNacSilverMessage } from "@/lib/sparkle-finder/access-split";
import { findNicNacMatchesForItem } from "@/lib/sparkle-finder/nic-nac";
import { getSparkleFinderAccountEntitlements } from "@/lib/sparkle-finder/entitlements";
import { getLocalRepBoardHref, getLocalRepHref } from "@/lib/sparkle-finder/route-hrefs";
import type { SparkleFinderAccountState } from "@/lib/sparkle-finder/auth";
import type { FinderAvailabilityResult } from "@/lib/sparkle-finder/catalog-service";
import type { NicNacDataSource, NicNacFindMatch } from "@/lib/sparkle-finder/nic-nac";

type FindThisForMeProps = {
  accountState: SparkleFinderAccountState;
  jewelryItemId?: string;
  compact?: boolean;
  availability?: FinderAvailabilityResult;
};

export function FindThisForMe({ accountState, jewelryItemId, compact = false, availability }: FindThisForMeProps) {
  const entitlements = getSparkleFinderAccountEntitlements(accountState);

  if (!entitlements.canUseNicNacFindRequests) {
    return <NicNacUpgradePrompt compact={compact} />;
  }

  if (!jewelryItemId) {
    return <NicNacEmptyPrompt compact={compact} />;
  }

  const result = findNicNacMatchesForItem(accountState, jewelryItemId, availability);

  if (!result.ok) {
    return <NicNacEmptyPrompt compact={compact} />;
  }
  const activeMatches = result.results.filter(isFreshLead);
  const emptyState =
    activeMatches.length === 0
      ? "No shows in the next 48 hours currently have this dancer. Add the jewelry to your Wishlist or search again later."
      : result.emptyState;

  return (
    <FinderNicNacChatbot
      compact={compact}
      leadCountLabel={formatLeadCount(activeMatches.length, result.dataSource)}
      leads={activeMatches.map((match) => buildLead(match, result.dataSource))}
      quickBubbles={[
        {
          label: "Check saved pieces",
          response:
            activeMatches.length > 0
              ? `I found ${activeMatches.length} fresh dancer lead${activeMatches.length === 1 ? "" : "s"} inside the next 48 hours. I added the Dance Floor and show links to this Wishlist lead.`
              : emptyState,
        },
        {
          label: "Match dancer leads",
          response: "Exact dancer leads show first, then I widen to the same collection and jewelry type from known rep-hosted paths. I only call it a lead when the show is inside the next 48 hours.",
        },
        {
          label: "Next show context",
          response: "I include the next known show in your time zone. Once the show passes, the lead expires and you can search again.",
        },
      ]}
      emptyState={emptyState}
      status="ready"
    />
  );
}

function NicNacUpgradePrompt({ compact }: { compact: boolean }) {
  return (
    <FinderNicNacChatbot
      compact={compact}
      quickBubbles={[
        {
          label: "Check saved pieces",
          response: `${finderNicNacPublicLine} ${finderNicNacSilverMessage}`,
        },
        {
          label: "Match dancer leads",
          response: "With Silver, I can compare your target piece against known dancers on rep Dance Floors.",
        },
        {
          label: "Show timing context",
          response: "When a match has a known upcoming show, I can point you there first.",
        },
      ]}
      status="upgrade"
    />
  );
}

function NicNacEmptyPrompt({ compact }: { compact: boolean }) {
  const emptyState =
    "Add an existing library record to your collection or Wishlist, then Nic-Nac can check saved Dance Floor paths and next shows.";

  return (
    <FinderNicNacChatbot
      compact={compact}
      emptyState={emptyState}
      quickBubbles={[
        {
          label: "Find a library piece",
          response: "Start in the master library, save the piece, then come back and ask me to check leads.",
        },
        {
          label: "Open Showcase Studio",
          response: "If the piece is missing, Showcase Studio can collect label evidence and a clean light-box photo for review.",
        },
        {
          label: "Next show context",
          response: "Once a saved piece has matches, I can include next-show context with the lead.",
        },
      ]}
      status="empty"
    />
  );
}

function formatLeadCount(count: number, dataSource: NicNacDataSource) {
  const sourceLabel = dataSource === "api" ? "Sparkle Suite" : "preview";
  const leadLabel = count === 1 ? "dancer lead" : "dancer leads";

  return `${count} ${sourceLabel} ${leadLabel}`;
}

function formatMatchType(value: string) {
  return value === "exact_item" ? "Exact dancer" : "Similar dancer";
}

function buildLead(match: NicNacFindMatch, dataSource: NicNacDataSource) {
  const isApi = dataSource === "api";

  return {
    id: match.listing.id,
    businessName: match.rep.businessName,
    collectionName: match.matchedItem.collectionName,
    confidenceLabel: match.confidenceLabel,
    matchTypeLabel: formatMatchType(match.matchType),
    matchedItemName: match.matchedItem.name,
    nextShowLabel: match.nextLiveShow?.title ?? "No upcoming show listed",
    showStartsAt: match.nextLiveShow?.startsAt,
    primaryHref: isApi ? match.rep.siteUrl : getLocalRepBoardHref(match.listing.boardUrl),
    primaryLabel: "View Dance Floor",
    repName: isApi ? match.rep.displayName : undefined,
    secondaryHref: isApi ? match.nextLiveShow?.showUrl ?? match.rep.siteUrl : getLocalRepHref(match.nextLiveShow?.showUrl ?? match.rep.siteUrl),
    secondaryLabel: "View Show",
  };
}

function isFreshLead(match: NicNacFindMatch) {
  if (!match.nextLiveShow) {
    return false;
  }

  const startsAt = new Date(match.nextLiveShow.startsAt).getTime();

  if (!Number.isFinite(startsAt)) {
    return false;
  }

  const now = Date.now();
  const fortyEightHoursFromNow = now + 48 * 60 * 60 * 1000;

  return startsAt >= now && startsAt <= fortyEightHoursFromNow;
}
