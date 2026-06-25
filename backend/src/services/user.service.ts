import { db } from '../config/database.js';

export const UserService = {
  isBlockedByConsultant: (consultantId: number, userName: string): boolean => {
    const isBlocked = db.prepare('SELECT id FROM blocked_users WHERE consultant_id = ? AND LOWER(user_name) = LOWER(?)').get(consultantId, userName.trim());
    return !!isBlocked;
  }
};
