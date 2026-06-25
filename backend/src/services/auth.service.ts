import { db } from '../config/database.js';

export const AuthService = {
  findUserById: (id: number) => {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },
  findConsultantById: (id: number) => {
    return db.prepare('SELECT * FROM consultants WHERE id = ?').get(id);
  }
};
