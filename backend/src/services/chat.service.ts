import { db } from '../config/database.js';

export const ChatService = {
  getSessionMessages: (sessionId: string) => {
    return db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC').all(sessionId);
  }
};
