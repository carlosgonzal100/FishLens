// Sends a question to the AI assistant (User Story 6.2) through the Django
// backend, which calls Claude. The API key stays on the server.

import { API_URL } from "../auth/accounts";
import { getSessionToken } from "../auth/session";

// The same limit as the backend, which refuses longer questions.
export const MAX_QUESTION_LENGTH = 500;

const SERVER_ERROR = "We can't reach the assistant right now. Please try again.";

export type AssistantReply = { answer: string; source: string } | { error: string };

export async function askAssistant(question: string): Promise<AssistantReply> {
  try {
    const response = await fetch(`${API_URL}/api/chat/ask/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getSessionToken()}`,
      },
      body: JSON.stringify({ question }),
    });
    const body = await response.json();
    if (response.status === 200) return { answer: body.answer, source: body.source };
    // e.g. "Please sign in again." or "Questions can be at most 500 characters."
    return { error: body.errors?.question ?? body.errors?.form ?? SERVER_ERROR };
  } catch {
    return { error: SERVER_ERROR };
  }
}
