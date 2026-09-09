import { describe, expect, it, vi } from "vitest";
import { getOperatorConversation } from "@/lib/services/workspace-conversations";

function conversationClient(type = "support") {
  const update = vi.fn();
  const data: Record<string, unknown> = {
    workspace_conversations: {
      id: "thread",
      conversation_type: type,
      state: "open",
      subject: "Safe reviewer thread",
      updated_at: "2026-09-08T00:00:00Z",
    },
    workspace_conversation_messages: [],
    support_reports: null,
    workspace_conversation_reports: [],
    workspace_conversation_attachments: [],
    workspace_conversation_participants: [
      { principal_type: "support_queue", unread_count: 5 },
    ],
  };
  const from = (table: string) => {
    const result = { data: data[table], error: null };
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      update: (value: unknown) => {
        update(value);
        return builder;
      },
      single: async () => result,
      maybeSingle: async () => result,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve),
    };
    return builder;
  };
  return { client: { from } as never, update };
}
describe("LOC check-only conversation reads", () => {
  it("keeps unread state unchanged for LOC reads", async () => {
    const { client, update } = conversationClient();
    const result = await getOperatorConversation(client, "thread", {
      markRead: false,
    });
    expect(update).not.toHaveBeenCalled();
    expect(result.conversation.unreadCount).toBe(5);
  });
  it("preserves original UI read marking by default", async () => {
    const { client, update } = conversationClient();
    const result = await getOperatorConversation(client, "thread");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ unread_count: 0 }),
    );
    expect(result.conversation.unreadCount).toBe(0);
  });
  it("does not expose unreported private rep messages", async () => {
    const { client, update } = conversationClient("rep_direct");
    await expect(
      getOperatorConversation(client, "thread", { markRead: false }),
    ).rejects.toThrow("unreported rep direct conversation is private");
    expect(update).not.toHaveBeenCalled();
  });
});
