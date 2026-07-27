"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type {
  ConversationPlan,
  ConversationStatus,
  MercuryConversation,
  MercuryConversationSummary,
} from "../../lib/mercury/conversation-types";
import ConversationSidebar from "./ConversationSidebar";
import MercuryPlanCard from "./MercuryPlanCard";

type LoadState = "loading" | "ready" | "unavailable" | "error";

type ApiFailure = {
  error?: string;
  code?: string;
};

async function responsePayload<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiFailure;
  if (!response.ok) {
    const error = new Error(payload.error ?? "Mercury request failed.");
    error.name = payload.code ?? "mercury_error";
    throw error;
  }
  return payload;
}

function summaryFromConversation(
  conversation: MercuryConversation,
): MercuryConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    status: conversation.status,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messageCount,
  };
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MercuryWorkspace() {
  const messageRegionRef = useRef<HTMLDivElement>(null);
  const [conversationStatus, setConversationStatus] =
    useState<ConversationStatus>("active");
  const [conversations, setConversations] = useState<
    MercuryConversationSummary[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversation, setConversation] =
    useState<MercuryConversation | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [detailLoading, setDetailLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [actionPlanId, setActionPlanId] = useState<string | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<{
    planId: string;
    version: number;
  } | null>(null);

  const loadConversations = useCallback(
    async (status: ConversationStatus, preferredId?: string) => {
      setLoadState("loading");
      setError("");

      try {
        const response = await fetch(
          `/api/mercury/conversations?status=${status}&limit=50`,
          { cache: "no-store" },
        );
        const payload = await responsePayload<{
          conversations: MercuryConversationSummary[];
        }>(response);
        setConversations(payload.conversations);
        setLoadState("ready");

        const nextId =
          preferredId &&
          payload.conversations.some((item) => item.id === preferredId)
            ? preferredId
            : payload.conversations[0]?.id ?? null;
        setSelectedId(nextId);
        if (!nextId) setConversation(null);
      } catch (requestError) {
        const unavailable =
          requestError instanceof Error &&
          requestError.name === "persistence_unavailable";
        setLoadState(unavailable ? "unavailable" : "error");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Mercury could not load conversations.",
        );
      }
    },
    [],
  );

  useEffect(() => {
    void loadConversations(conversationStatus);
  }, [conversationStatus, loadConversations]);

  useEffect(() => {
    if (!selectedId || loadState !== "ready") return;

    const controller = new AbortController();
    setDetailLoading(true);
    setError("");

    void fetch(`/api/mercury/conversations/${selectedId}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) =>
        responsePayload<{ conversation: MercuryConversation }>(response),
      )
      .then((payload) => {
        setConversation(payload.conversation);
        setTitleDraft(payload.conversation.title);
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Mercury could not load the conversation.",
        );
      })
      .finally(() => setDetailLoading(false));

    return () => controller.abort();
  }, [loadState, selectedId]);

  useEffect(() => {
    messageRegionRef.current?.scrollTo({
      top: messageRegionRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conversation?.messages.length]);

  function upsertSummary(nextConversation: MercuryConversation) {
    const summary = summaryFromConversation(nextConversation);
    setConversations((current) => [
      summary,
      ...current.filter((item) => item.id !== summary.id),
    ]);
  }

  function startNewConversation() {
    setConversationStatus("active");
    setSelectedId(null);
    setConversation(null);
    setDraft("");
    setError("");
    setRenaming(false);
    setRevisionTarget(null);
  }

  function selectConversation(conversationId: string) {
    setRevisionTarget(null);
    setSelectedId(conversationId);
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (message.length < 5 || message.length > 500 || sending) return;

    setSending(true);
    setError("");

    try {
      const endpoint = selectedId
        ? `/api/mercury/conversations/${selectedId}/messages`
        : "/api/mercury/conversations";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          message,
          supersedesPlanId: revisionTarget?.planId,
        }),
      });
      const payload = await responsePayload<{
        conversation: MercuryConversation;
      }>(response);

      setConversationStatus("active");
      setSelectedId(payload.conversation.id);
      setConversation(payload.conversation);
      setTitleDraft(payload.conversation.title);
      upsertSummary(payload.conversation);
      setDraft("");
      setRevisionTarget(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Mercury could not process the message.",
      );
    } finally {
      setSending(false);
    }
  }

  async function decideApproval(
    planId: string,
    decision: "approved" | "rejected",
    note?: string,
  ) {
    if (actionPlanId) return;
    setActionPlanId(planId);
    setError("");

    try {
      const response = await fetch(`/api/mercury/plans/${planId}/approval`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ decision, note }),
      });
      const payload = await responsePayload<{
        conversation: MercuryConversation | null;
      }>(response);
      if (!payload.conversation) {
        throw new Error("Mercury could not reload the decided plan.");
      }
      setConversation(payload.conversation);
      upsertSummary(payload.conversation);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Mercury could not record the approval decision.",
      );
      throw requestError;
    } finally {
      setActionPlanId(null);
    }
  }

  function startRevision(plan: ConversationPlan) {
    setRevisionTarget({ planId: plan.id, version: plan.version });
    setDraft("");
    requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>("#mercury-message")?.focus();
    });
  }

  async function updateConversation(input: {
    title?: string;
    status?: ConversationStatus;
  }) {
    if (!conversation || sending) return;
    setSending(true);
    setError("");

    try {
      const response = await fetch(
        `/api/mercury/conversations/${conversation.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const payload = await responsePayload<{
        conversation: MercuryConversation;
      }>(response);
      setConversation(payload.conversation);
      setTitleDraft(payload.conversation.title);
      setRenaming(false);

      if (input.status) {
        setRevisionTarget(null);
        setConversationStatus(input.status);
        await loadConversations(input.status, payload.conversation.id);
      } else {
        upsertSummary(payload.conversation);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Mercury could not update the conversation.",
      );
    } finally {
      setSending(false);
    }
  }

  const unavailable = loadState === "unavailable";
  const archived = conversation?.status === "archived";

  return (
    <div className="mercury-workspace">
      <ConversationSidebar
        conversations={conversations}
        selectedId={selectedId}
        status={conversationStatus}
        loading={loadState === "loading"}
        disabled={unavailable || sending}
        onSelect={selectConversation}
        onNew={startNewConversation}
        onStatusChange={(status) => {
          setRevisionTarget(null);
          setConversationStatus(status);
        }}
      />

      <section className="mercury-thread" aria-label="Mercury workspace">
        <header className="mercury-thread-header">
          <div>
            <span>Commerce Intelligence Engine</span>
            {renaming && conversation ? (
              <form
                className="mercury-title-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void updateConversation({ title: titleDraft.trim() });
                }}
              >
                <input
                  aria-label="Conversation title"
                  value={titleDraft}
                  maxLength={100}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  autoFocus
                />
                <button type="submit" disabled={!titleDraft.trim() || sending}>
                  Save
                </button>
                <button type="button" onClick={() => setRenaming(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <h1>{conversation?.title ?? "Mercury"}</h1>
            )}
          </div>

          {conversation ? (
            <div className="mercury-thread-actions">
              <button
                type="button"
                onClick={() => setRenaming(true)}
                disabled={sending}
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() =>
                  void updateConversation({
                    status: archived ? "active" : "archived",
                  })
                }
                disabled={sending}
              >
                {archived ? "Restore" : "Archive"}
              </button>
            </div>
          ) : null}
        </header>

        {unavailable ? (
          <div className="mercury-configuration-state" role="status">
            <span>Database required</span>
            <h2>Connect PostgreSQL to enable durable Mercury conversations.</h2>
            <p>
              Configure <code>DATABASE_URL</code> and run{" "}
              <code>npm run migrate</code> to apply migrations through{" "}
              <code>004</code>. Mercury will not
              simulate conversation persistence or claim that unsaved plans are
              durable.
            </p>
          </div>
        ) : loadState === "error" ? (
          <div className="mercury-configuration-state is-error" role="alert">
            <span>Workspace unavailable</span>
            <h2>Mercury could not load this workspace.</h2>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadConversations(conversationStatus)}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div
              className="mercury-message-region"
              ref={messageRegionRef}
              aria-live="polite"
            >
              {detailLoading ? (
                <div className="mercury-thread-state">Loading conversation…</div>
              ) : conversation?.messages.length ? (
                conversation.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`mercury-message is-${message.author}`}
                  >
                    <div className="mercury-message-author">
                      <strong>
                        {message.author === "user" ? "You" : "Mercury"}
                      </strong>
                      <time dateTime={message.createdAt}>
                        {formatMessageTime(message.createdAt)}
                      </time>
                    </div>
                    <p>{message.content}</p>
                    {message.plan ? (
                      <MercuryPlanCard
                        plan={message.plan}
                        busy={archived || actionPlanId !== null}
                        onDecision={decideApproval}
                        onRevise={startRevision}
                      />
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="mercury-welcome">
                  <span>M</span>
                  <p>Mercury · Commerce Intelligence Engine</p>
                  <h2>What should we understand or improve?</h2>
                  <p>
                    State a commerce objective. Mercury will create a reviewable
                    plan, disclose its current evidence limits, and preserve the
                    conversation when PostgreSQL is configured.
                  </p>
                  <div className="mercury-suggestions">
                    {[
                      "Audit advertising efficiency and catalog conversion",
                      "Forecast inventory risk for the next eight weeks",
                      "Review compliance exposure across priority products",
                    ].map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion}
                        onClick={() => setDraft(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error ? (
              <p className="mercury-request-error" role="alert">
                {error}
              </p>
            ) : null}

            {!archived ? (
              <form className="mercury-composer" onSubmit={submitMessage}>
                {revisionTarget ? (
                  <div className="mercury-revision-context">
                    <span>
                      Creating revision v{revisionTarget.version + 1}
                    </span>
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => setRevisionTarget(null)}
                    >
                      Cancel revision
                    </button>
                  </div>
                ) : null}
                <label htmlFor="mercury-message">Message Mercury</label>
                <textarea
                  id="mercury-message"
                  value={draft}
                  maxLength={500}
                  rows={3}
                  placeholder={
                    revisionTarget
                      ? "Describe the revised objective or constraints…"
                      : "Describe the commerce question or outcome…"
                  }
                  disabled={
                    sending || actionPlanId !== null || loadState !== "ready"
                  }
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      (event.metaKey || event.ctrlKey)
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <div>
                  <span>{draft.length}/500 · Ctrl Enter to send</span>
                  <button
                    type="submit"
                    disabled={
                      sending ||
                      actionPlanId !== null ||
                      draft.trim().length < 5 ||
                      loadState !== "ready"
                    }
                  >
                    {sending ? "Planning…" : "Send to Mercury"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mercury-archived-state">
                This conversation is archived and read-only.
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
