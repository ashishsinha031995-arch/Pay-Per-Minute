import { useState, useEffect } from "react";
import { ChatService } from "../services/chat.service";

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    ChatService.getSession(sessionId)
      .then((data) => {
        if (data.messages) {
          setMessages(data.messages);
        }
      })
      .catch((err) => {
        if (err && err.message && err.message.includes('Failed to fetch')) {
          console.warn("Network connection starting up. Retrying session load...");
        } else {
          console.error("Error loading session:", err);
        }
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  return { messages, setMessages, loading };
}
