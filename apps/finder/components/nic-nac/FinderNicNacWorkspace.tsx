"use client";

import { Camera, Heart, Search, Sparkles, Star, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { NicNacMark } from "@/components/nic-nac/NicNacMark";
import { finderNicNacPublicLine, finderNicNacSilverMessage } from "@/lib/sparkle-finder/access-split";
import type { ManagedCollectionItem } from "@/components/silver/CollectionManager";
import type { JewelryItem, SilverProfile } from "@/lib/sparkle-finder/types";

type FinderNicNacWorkspaceProps = {
  canUseNicNac: boolean;
  collectionItems: ManagedCollectionItem[];
  displayName: string;
  libraryItems: JewelryItem[];
  profile: SilverProfile;
};

const quickPrompts = [
  {
    icon: Sparkles,
    label: "Add a piece I own",
    prompt: "Tell me the item number, name, or upload the label and jewelry photo.",
  },
  {
    icon: Search,
    label: "I am looking for a piece",
    prompt: "Tell me what you remember and I will search the library and dancer leads.",
  },
  {
    icon: Camera,
    label: "Upload a missing piece",
    prompt: "Start with the original label photo, then I will ask for the jewelry photo.",
  },
  {
    icon: Star,
    label: "Organize my Showcase",
    prompt: "I can update public/private, reveal stories, highlights, and wishlist status.",
  },
  {
    icon: Users,
    label: "Show my favorite reps",
    prompt: "List the reps I have saved and any safe notes you remember.",
  },
  {
    icon: Heart,
    label: "Find my favorite reps' next lives",
    prompt: "Check favorite reps and dancer leads for upcoming live show times.",
  },
  {
    icon: Users,
    label: "Review public Showcase discovery",
    prompt: "Search bounded public Showcase discovery with one-way follows and safety filters.",
  },
  {
    icon: Star,
    label: "Review followed collector status",
    prompt: "Review one-way followed collectors and their public Showcase status.",
  },
];

export function FinderNicNacWorkspace({ canUseNicNac, ...props }: FinderNicNacWorkspaceProps) {
  if (!canUseNicNac) {
    return (
      <section
        className="overflow-hidden rounded-[var(--sparkle-radius-sm)] border border-[rgba(238,44,155,0.22)] bg-[linear-gradient(135deg,#fffefd_0%,#fff4f8_52%,#fff8ef_100%)] p-5 shadow-[var(--sparkle-shadow-sm)]"
        data-smoke="finder-nic-nac-curator"
        id="nic-nac-curator"
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">Nic-Nac</p>
        <h2 className="mt-2 font-[family-name:var(--font-playfair)] text-3xl font-semibold leading-tight text-[var(--sparkle-plum-deep)]">
          {finderNicNacPublicLine}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--sparkle-ink-muted)]">{finderNicNacSilverMessage}</p>
      </section>
    );
  }

  return <FinderNicNacCurator {...props} />;
}

function FinderNicNacCurator({
  collectionItems,
  displayName,
  libraryItems,
  profile,
}: Omit<FinderNicNacWorkspaceProps, "canUseNicNac">) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/finder/nic-nac",
      }),
    [],
  );
  const { messages, sendMessage, status, error, regenerate, stop } = useChat({ transport });
  const [draft, setDraft] = useState("");
  const ownedCount = collectionItems.filter((item) => item.state === "owned").length;
  const wishlistCount = collectionItems.filter((item) => item.state === "wishlist").length;
  const highlightedCount = collectionItems.filter((item) => item.isHighlighted).length;
  const memoryHints = buildMemoryHints(collectionItems, profile);
  const isBusy = status === "streaming" || status === "submitted";

  async function submitPrompt(text: string) {
    const nextText = text.trim();

    if (!nextText || isBusy) {
      return;
    }

    setDraft("");
    await sendMessage({ text: nextText });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitPrompt(draft);
  }

  return (
    <section
      className="overflow-hidden rounded-[var(--sparkle-radius-sm)] border border-[rgba(238,44,155,0.22)] bg-[linear-gradient(135deg,#fffefd_0%,#fff4f8_52%,#fff8ef_100%)] shadow-[var(--sparkle-shadow-sm)]"
      data-smoke="finder-nic-nac-curator"
      id="nic-nac-curator"
    >
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <NicNacMark size={36} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">
                Nic-Nac Collection Curator
              </p>
              <h2 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold leading-tight text-[var(--sparkle-plum-deep)]">
                What are we adding today, {displayName}?
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--sparkle-ink-muted)]">
            {finderNicNacPublicLine} Tell Nic-Nac what you want to add, find, or update. I can search the library,
            remember your favorite reps, track what you collect, prep missing-piece review, and keep your Showcase tidy.
          </p>

          <form
            className="mt-5 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3"
            data-nic-nac-api="/api/finder/nic-nac"
            onSubmit={handleSubmit}
          >
            <label className="sr-only" htmlFor="finder-nic-nac-curator-input">
              Tell Nic-Nac what you want to add, find, or update
            </label>
            <textarea
              aria-busy={isBusy}
              className="min-h-20 w-full resize-y rounded-[var(--sparkle-radius-sm)] border border-transparent bg-[var(--sparkle-paper-soft)] p-3 text-sm leading-6 text-[var(--sparkle-ink)] outline-none transition focus:border-[var(--sparkle-coral)]"
              disabled={isBusy}
              id="finder-nic-nac-curator-input"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Tell Nic-Nac what you want to add, find, or update..."
              rows={3}
              value={draft}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-4 text-sm font-bold text-white"
                disabled={isBusy || draft.trim().length === 0}
                type="submit"
              >
                <Sparkles aria-hidden="true" className="size-4" />
                {isBusy ? "Nic-Nac is thinking" : "Ask Nic-Nac"}
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 text-sm font-bold text-[var(--sparkle-rose)]"
                disabled={isBusy}
                onClick={() => setDraft("I have label and jewelry photos for a missing piece. Help me submit it to Showcase Studio.")}
                type="button"
              >
                <Camera aria-hidden="true" className="size-4" />
                Add photos
              </button>
              {isBusy ? (
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 text-sm font-bold text-[var(--sparkle-ink-muted)]"
                  onClick={stop}
                  type="button"
                >
                  Stop
                </button>
              ) : null}
            </div>
          </form>

          <NicNacConversation
            error={error}
            messages={messages}
            onRetry={regenerate}
            status={status}
          />
        </div>

        <aside className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white/78 p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">
              Nic-Nac remembers
            </p>
            <div className="mt-3 grid gap-2">
              {memoryHints.map((hint) => (
                <p
                  className="rounded border border-[var(--sparkle-border)] bg-[var(--sparkle-paper-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--sparkle-ink-muted)]"
                  key={hint}
                >
                  {hint}
                </p>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-[rgba(238,44,155,0.14)] pt-3 text-center">
            <Stat label="Owned" value={ownedCount} />
            <Stat label="Wishlist" value={wishlistCount} />
            <Stat label="Showcase" value={highlightedCount} />
          </div>
        </aside>
      </div>

      <div className="grid gap-2 border-t border-[rgba(238,44,155,0.14)] bg-white/60 p-4 md:grid-cols-3 xl:grid-cols-5">
        {quickPrompts.map((prompt) => {
          const Icon = prompt.icon;

          return (
            <button
              aria-label={prompt.label}
              className="grid min-h-24 gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3 text-left transition hover:border-[var(--sparkle-coral)]"
              disabled={isBusy}
              key={prompt.label}
              onClick={() => void submitPrompt(`${prompt.label}. ${prompt.prompt}`)}
              title={prompt.prompt}
              type="button"
            >
              <span className="inline-flex size-8 items-center justify-center rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-blush-bg)] text-[var(--sparkle-plum)]">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span className="text-sm font-bold leading-5 text-[var(--sparkle-plum-deep)]">{prompt.label}</span>
              <span className="text-xs font-semibold leading-5 text-[var(--sparkle-ink-muted)]">{prompt.prompt}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[rgba(238,44,155,0.14)] bg-[var(--sparkle-paper)] px-4 py-3">
        {["Owned", "Looking For", "Wishlist", "Showcase", "Drafts", "Favorite reps"].map((tab) => (
          <span
            className="inline-flex min-h-9 items-center rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 text-xs font-bold text-[var(--sparkle-ink-muted)]"
            key={tab}
          >
            {tab}
          </span>
        ))}
        <span className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 text-xs font-bold text-[var(--sparkle-ink-muted)]">
          <Heart aria-hidden="true" className="size-3.5 text-[var(--sparkle-coral)]" />
          {libraryItems.length} library records available
        </span>
      </div>
    </section>
  );
}

function NicNacConversation({
  error,
  messages,
  onRetry,
  status,
}: {
  error: Error | undefined;
  messages: UIMessage[];
  onRetry: () => void;
  status: string;
}) {
  if (messages.length === 0 && !error) {
    return (
      <div className="mt-4 rounded-[var(--sparkle-radius-sm)] border border-[rgba(238,44,155,0.16)] bg-white/72 p-4 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
        Nic-Nac is ready to help add pieces, update your Showcase, remember favorite reps, and search Sparkle Finder.
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className="mt-4 grid max-h-[28rem] gap-3 overflow-y-auto rounded-[var(--sparkle-radius-sm)] border border-[rgba(238,44,155,0.16)] bg-white/72 p-3"
    >
      {messages.map((message) => (
        <div
          className={
            message.role === "user"
              ? "ml-auto max-w-[84%] rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-3 py-2 text-sm leading-6 text-white"
              : "mr-auto max-w-[84%] rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 py-2 text-sm leading-6 text-[var(--sparkle-ink)]"
          }
          key={message.id}
        >
          {readMessageText(message)}
        </div>
      ))}
      {status === "streaming" || status === "submitted" ? (
        <div className="mr-auto rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--sparkle-ink-muted)]">
          Nic-Nac is checking your Finder workspace...
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[var(--sparkle-radius-sm)] border border-[rgba(238,44,155,0.28)] bg-[var(--sparkle-blush-bg)] p-3 text-sm font-semibold leading-6 text-[var(--sparkle-plum-deep)]">
          Nic-Nac could not answer that just now.
          <button
            className="ml-2 underline decoration-[var(--sparkle-coral)] underline-offset-4"
            onClick={onRetry}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}

function readMessageText(message: UIMessage) {
  const text = (message.parts ?? [])
    .map((part) => {
      const maybeText = part as { type?: string; text?: string };

      return maybeText.type === "text" ? maybeText.text ?? "" : "";
    })
    .join("")
    .trim();

  return text || (message.role === "assistant" ? "Nic-Nac is working on that." : "Sent to Nic-Nac.");
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[var(--sparkle-plum-deep)]">
        {value}
      </p>
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--sparkle-ink-muted)]">{label}</p>
    </div>
  );
}

function buildMemoryHints(collectionItems: ManagedCollectionItem[], profile: SilverProfile): string[] {
  const hints: string[] = [];
  const ownedItems = collectionItems.filter((item) => item.state === "owned");
  const wishlistItems = collectionItems.filter((item) => item.state === "wishlist");
  const highlighted = collectionItems.find((item) => item.isHighlighted);

  if (profile.bio.trim()) {
    hints.push(profile.bio.trim());
  }

  if (ownedItems.length > 0) {
    hints.push(`You have ${ownedItems.length} owned piece${ownedItems.length === 1 ? "" : "s"} saved.`);
  }

  if (wishlistItems[0]) {
    hints.push(`Current hunt: ${wishlistItems[0].jewelryItem.name}.`);
  }

  if (highlighted) {
    hints.push(`Showcase highlight: ${highlighted.jewelryItem.name}.`);
  }

  hints.push("Favorite reps: add them here and Nic-Nac will remember.");

  return hints.slice(0, 4);
}
