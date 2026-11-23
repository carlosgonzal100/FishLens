import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Brand from "../components/Brand";
import { askAssistant, MAX_QUESTION_LENGTH } from "../chat/assistant";
import "./ChatScreen.css";

type Message = { from: "user" | "assistant"; text: string; error?: boolean };

// User Story 6.2 - Ask the AI Assistant About Fish. Only signed-in users can see it.
export default function ChatScreen({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [waiting, setWaiting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages, waiting]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const text = question.trim();
    if (!text || waiting) return;

    setMessages((current) => [...current, { from: "user", text }]);
    setQuestion("");
    setWaiting(true);

    const reply = await askAssistant(text);
    setMessages((current) => [
      ...current,
      "answer" in reply
        ? { from: "assistant", text: reply.answer }
        : { from: "assistant", text: reply.error, error: true },
    ]);
    setWaiting(false);
  }

  // Enter sends the question; Shift+Enter starts a new line.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <main className="chat-screen">
      <section className="chat-card">
        <header className="chat-header">
          <button className="chat-back" type="button" onClick={onBack}>
            <span aria-hidden="true">←</span> Dashboard
          </button>
          <Brand />
        </header>

        <div className="chat-messages" aria-live="polite">
          <div className="chat-column">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <div className="title-rule" />
                <h1>Ask about fish</h1>
                <p>
                  Ask about Long Island fish: what a species looks like, where to find it, or what
                  bait to use.
                </p>
              </div>
            )}

            {messages.map((message, index) =>
              message.from === "user" ? (
                <p key={index} className="chat-message chat-message-user">
                  {message.text}
                </p>
              ) : (
                <div key={index} className="chat-message chat-message-assistant">
                  <span className="chat-sender">FishLens Assistant</span>
                  <p className={message.error ? "chat-error" : undefined}>{message.text}</p>
                </div>
              ),
            )}

            {waiting && (
              <div className="chat-message chat-message-assistant">
                <span className="chat-sender">FishLens Assistant</span>
                <p className="chat-thinking">Thinking…</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <form className="chat-composer" onSubmit={send}>
          <div className="chat-input-box">
            <label className="chat-label" htmlFor="chat-question">
              Your question
            </label>
            <textarea
              id="chat-question"
              rows={1}
              placeholder="Ask about a fish, where to catch it, or what bait to use…"
              value={question}
              maxLength={MAX_QUESTION_LENGTH}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="chat-send"
              type="submit"
              aria-label="Send"
              disabled={waiting || !question.trim()}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
              </svg>
            </button>
          </div>
          {question.length > MAX_QUESTION_LENGTH - 100 && (
            <p className="chat-count">
              {question.length} / {MAX_QUESTION_LENGTH} characters
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
