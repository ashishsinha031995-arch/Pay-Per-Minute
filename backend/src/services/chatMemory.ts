import { db } from '../config/database.js';

export interface MemoryMessage {
  id: number;
  session_id: string;
  sender_type: 'user' | 'consultant';
  sender_name: string;
  text: string;
  created_at: string;
  is_read: number;
}

// In-memory store for active session messages
const activeSessionMessages = new Map<string, MemoryMessage[]>();
let messageIdCounter = 1000000;

export const ChatMemoryService = {
  addMessage(sessionId: string, senderType: 'user' | 'consultant', senderName: string, text: string): MemoryMessage {
    if (!activeSessionMessages.has(sessionId)) {
      activeSessionMessages.set(sessionId, []);
    }
    const messages = activeSessionMessages.get(sessionId)!;
    const msg: MemoryMessage = {
      id: messageIdCounter++,
      session_id: sessionId,
      sender_type: senderType,
      sender_name: senderName,
      text,
      created_at: new Date().toISOString(),
      is_read: 0
    };
    messages.push(msg);
    return msg;
  },

  getMessages(sessionId: string): MemoryMessage[] {
    return activeSessionMessages.get(sessionId) || [];
  },

  markAsRead(sessionId: string, readerType: 'user' | 'consultant') {
    const messages = activeSessionMessages.get(sessionId);
    if (messages) {
      const partnerType = readerType === 'user' ? 'consultant' : 'user';
      for (const msg of messages) {
        if (msg.sender_type === partnerType) {
          msg.is_read = 1;
        }
      }
    }
  },

  // This function is called when a session ends to consolidate and persist the messages.
  consolidateAndSave(sessionId: string): { transcript: string; consultantMsgCount: number } {
    const messages = activeSessionMessages.get(sessionId) || [];
    
    // 1. Generate the transcript using individual messages
    const transcript = messages.map(m => {
      const timeStr = new Date(m.created_at).toLocaleTimeString();
      const textVal = m.text.startsWith('[VOICE_NOTE]:') ? '[Voice Note 🎙️]' : m.text;
      return `[${timeStr}] ${m.sender_name}: ${textVal}`;
    }).join('\n');

    const consultantMsgs = messages.filter(m => m.sender_type === 'consultant');
    const userMsgs = messages.filter(m => m.sender_type === 'user');

    // 2. Save at most 2 consolidated rows to SQLite/MongoDB database: One for the entire User, one for the entire Consultant.
    if (userMsgs.length > 0) {
      // consolidate user messages
      const userText = userMsgs.map(m => m.text).join('\n');
      const firstUserMsg = userMsgs[0];
      
      db.prepare(`
        INSERT INTO messages (session_id, sender_type, sender_name, text, created_at, is_read)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(sessionId, 'user', firstUserMsg.sender_name, userText, firstUserMsg.created_at);
    }

    if (consultantMsgs.length > 0) {
      // consolidate consultant messages
      const consultantText = consultantMsgs.map(m => m.text).join('\n');
      const firstConsultantMsg = consultantMsgs[0];
      
      db.prepare(`
        INSERT INTO messages (session_id, sender_type, sender_name, text, created_at, is_read)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(sessionId, 'consultant', firstConsultantMsg.sender_name, consultantText, firstConsultantMsg.created_at);
    }

    // 3. Clear memory for this session
    activeSessionMessages.delete(sessionId);

    return {
      transcript,
      consultantMsgCount: consultantMsgs.length
    };
  },

  clearMemory(sessionId: string) {
    activeSessionMessages.delete(sessionId);
  }
};
