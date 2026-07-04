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

    // Save directly to the database immediately to prevent loss on server restart!
    try {
      const result = db.prepare(`
        INSERT INTO messages (session_id, sender_type, sender_name, text, created_at, is_read)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(sessionId, senderType, senderName, text, msg.created_at, msg.is_read);
      
      if (result && result.lastInsertRowid) {
        msg.id = Number(result.lastInsertRowid);
      }
    } catch (err) {
      console.error('[ChatMemoryService] Error inserting message to DB:', err);
    }

    return msg;
  },

  getMessages(sessionId: string): MemoryMessage[] {
    let messages = activeSessionMessages.get(sessionId);
    if (!messages || messages.length === 0) {
      // Fetch individual messages from the database
      try {
        const dbMsgs = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC').all(sessionId) as any[];
        messages = dbMsgs.map(m => ({
          id: m.id,
          session_id: m.session_id,
          sender_type: m.sender_type,
          sender_name: m.sender_name,
          text: m.text,
          created_at: m.created_at,
          is_read: m.is_read
        }));
        // Cache back to active memory if there is an active session
        const sess = db.prepare("SELECT status FROM sessions WHERE id = ?").get(sessionId) as { status: string } | undefined;
        if (sess && sess.status === 'active') {
          activeSessionMessages.set(sessionId, messages);
        }
      } catch (err) {
        console.error('[ChatMemoryService] Error loading messages from DB:', err);
        messages = [];
      }
    }
    return messages;
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
    // Also mark as read in the database
    try {
      const partnerType = readerType === 'user' ? 'consultant' : 'user';
      db.prepare(`
        UPDATE messages 
        SET is_read = 1 
        WHERE session_id = ? AND sender_type = ?
      `).run(sessionId, partnerType);
    } catch (err) {
      console.error('[ChatMemoryService] Error marking messages as read in DB:', err);
    }
  },

  // This function is called when a session ends to consolidate and persist the messages.
  consolidateAndSave(sessionId: string): { transcript: string; consultantMsgCount: number } {
    let messages = activeSessionMessages.get(sessionId) || [];
    if (messages.length === 0) {
      // Fallback to fetching individual messages from the database
      try {
        const dbMsgs = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY id ASC').all(sessionId) as any[];
        messages = dbMsgs.map(m => ({
          id: m.id,
          session_id: m.session_id,
          sender_type: m.sender_type,
          sender_name: m.sender_name,
          text: m.text,
          created_at: m.created_at,
          is_read: m.is_read
        }));
      } catch (err) {
        console.error('[ChatMemoryService] Error loading messages from DB during consolidation:', err);
      }
    }
    
    // 1. Generate the transcript using individual messages
    const transcript = messages.map(m => {
      let timeStr = 'Unknown Time';
      try {
        if (m.created_at) {
          const d = new Date(m.created_at);
          if (!isNaN(d.getTime())) {
            timeStr = d.toLocaleTimeString();
          }
        }
      } catch (e) {}
      const textVal = (m.text && typeof m.text === 'string' && m.text.startsWith('[VOICE_NOTE]:')) ? '[Voice Note 🎙️]' : (m.text || '');
      return `[${timeStr}] ${m.sender_name || 'User'}: ${textVal}`;
    }).join('\n');

    const consultantMsgs = messages.filter(m => m.sender_type === 'consultant');

    // 2. We DO NOT insert consolidated rows anymore because we already have all individual messages stored immediately in the DB!
    // Storing consolidated rows in addition to individual rows would result in duplicate messages being displayed in the chat.

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
