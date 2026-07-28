import type {
  ConversationStatus,
  MercuryConversationSummary,
} from "../../lib/mercury/conversation-types";

type ConversationSidebarProps = {
  conversations: MercuryConversationSummary[];
  selectedId: string | null;
  status: ConversationStatus;
  loading: boolean;
  disabled: boolean;
  canCreate: boolean;
  onSelect: (conversationId: string) => void;
  onNew: () => void;
  onStatusChange: (status: ConversationStatus) => void;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

export default function ConversationSidebar({
  conversations,
  selectedId,
  status,
  loading,
  disabled,
  canCreate,
  onSelect,
  onNew,
  onStatusChange,
}: ConversationSidebarProps) {
  return (
    <aside className="mercury-conversations" aria-label="Mercury conversations">
      <div className="mercury-conversations-heading">
        <div>
          <span>Workspace</span>
          <h2>Conversations</h2>
        </div>
        {canCreate ? (
          <button
            type="button"
            className="mercury-new-conversation"
            onClick={onNew}
            disabled={disabled}
          >
            <span aria-hidden="true">＋</span>
            New
          </button>
        ) : null}
      </div>

      <div className="mercury-conversation-tabs" aria-label="Conversation status">
        <button
          type="button"
          className={status === "active" ? "is-active" : ""}
          aria-pressed={status === "active"}
          onClick={() => onStatusChange("active")}
          disabled={disabled}
        >
          Active
        </button>
        <button
          type="button"
          className={status === "archived" ? "is-active" : ""}
          aria-pressed={status === "archived"}
          onClick={() => onStatusChange("archived")}
          disabled={disabled}
        >
          Archived
        </button>
      </div>

      <div className="mercury-conversation-list">
        {loading ? (
          <p className="mercury-conversation-list-state">Loading conversations…</p>
        ) : conversations.length ? (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={`mercury-conversation-item ${
                selectedId === conversation.id ? "is-selected" : ""
              }`}
              aria-current={selectedId === conversation.id ? "page" : undefined}
              onClick={() => onSelect(conversation.id)}
              disabled={disabled}
            >
              <strong>{conversation.title}</strong>
              <span>
                {conversation.messageCount} messages
                <time dateTime={conversation.updatedAt}>
                  {dateFormatter.format(new Date(conversation.updatedAt))}
                </time>
              </span>
            </button>
          ))
        ) : (
          <p className="mercury-conversation-list-state">
            {status === "active"
              ? "No conversations yet."
              : "No archived conversations."}
          </p>
        )}
      </div>
    </aside>
  );
}
