import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');

// Initialize schema
export function initDb() {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      duration_days INTEGER NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS consultants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      photo_url TEXT,
      bio TEXT,
      price_per_minute REAL DEFAULT 10.0,
      is_online INTEGER DEFAULT 0,
      is_busy INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      wallet_today REAL DEFAULT 0.0,
      wallet_monthly REAL DEFAULT 0.0,
      wallet_total REAL DEFAULT 0.0,
      wallet_withdrawable REAL DEFAULT 0.0,
      plan_expiry TEXT,
      category TEXT DEFAULT 'Consultants',
      experience INTEGER DEFAULT 5,
      languages TEXT DEFAULT 'English, Hindi',
      specializations TEXT DEFAULT 'General',
      verification_status TEXT DEFAULT 'Verified',
      lifetime_revenue REAL DEFAULT 0.0,
      total_sessions INTEGER DEFAULT 0,
      average_rating REAL DEFAULT 5.0,
      aadhaar_number TEXT,
      aadhaar_photo_url TEXT,
      pan_number TEXT,
      pan_photo_url TEXT,
      kyc_status TEXT DEFAULT 'unsubmitted',
      kyc_reject_reason TEXT,
      bank_account_holder_name TEXT,
      bank_account_number TEXT,
      bank_ifsc_code TEXT,
      bank_name TEXT,
      bank_status TEXT DEFAULT 'unsubmitted',
      bank_reject_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT,
      display_name TEXT NOT NULL,
      photo_url TEXT,
      dob TEXT,
      gender TEXT,
      wallet_balance REAL DEFAULT 0.0,
      lifetime_recharge REAL DEFAULT 0.0,
      is_active INTEGER DEFAULT 1,
      is_blocked INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      consultant_id INTEGER NOT NULL,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      price_per_minute REAL NOT NULL,
      total_paid REAL NOT NULL,
      commission_rate REAL NOT NULL,
      consultant_earnings REAL NOT NULL,
      commission_amount REAL NOT NULL,
      status TEXT NOT NULL, -- 'pending', 'active', 'completed', 'cancelled'
      payment_id TEXT,
      order_id TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      expires_at TEXT,
      transcript TEXT,
      FOREIGN KEY (consultant_id) REFERENCES consultants (id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      sender_type TEXT NOT NULL, -- 'user', 'consultant'
      sender_name TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions (id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consultant_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      text TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (consultant_id) REFERENCES consultants (id)
    );

    CREATE TABLE IF NOT EXISTS blocked_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      consultant_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (consultant_id) REFERENCES consultants (id),
      UNIQUE(consultant_id, user_name)
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'recharge' (credit), 'consultation' (debit), 'refund' (credit)
      amount REAL NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS sent_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Migrate existing tables if they are missing newer columns
  try { db.exec("ALTER TABLE users ADD COLUMN password TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN email TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN photo_url TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN dob TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN gender TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN wallet_balance REAL DEFAULT 0.0;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN lifetime_recharge REAL DEFAULT 0.0;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0;"); } catch(_) {}

  try { db.exec("ALTER TABLE consultants ADD COLUMN email TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN category TEXT DEFAULT 'Consultants';"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN experience INTEGER DEFAULT 5;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN languages TEXT DEFAULT 'English, Hindi';"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN specializations TEXT DEFAULT 'General';"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN verification_status TEXT DEFAULT 'Verified';"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN lifetime_revenue REAL DEFAULT 0.0;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN total_sessions INTEGER DEFAULT 0;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN average_rating REAL DEFAULT 5.0;"); } catch(_) {}

  try { db.exec("ALTER TABLE users ADD COLUMN locked_consultant_id INTEGER DEFAULT NULL;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN admin_allow_others INTEGER DEFAULT 0;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN category TEXT DEFAULT 'General';"); } catch(_) {}

  try { db.exec("ALTER TABLE wallet_transactions ADD COLUMN gst_rate REAL DEFAULT 0.0;"); } catch(_) {}
  try { db.exec("ALTER TABLE wallet_transactions ADD COLUMN gst_amount REAL DEFAULT 0.0;"); } catch(_) {}
  try { db.exec("ALTER TABLE wallet_transactions ADD COLUMN total_paid REAL DEFAULT 0.0;"); } catch(_) {}

  // Alter plans and consultants to support dynamic caps
  try { db.exec("ALTER TABLE plans ADD COLUMN max_consultant_rate REAL DEFAULT 1000;"); } catch(_) {}
  try { db.exec("ALTER TABLE plans ADD COLUMN support_hours TEXT DEFAULT '72 Hours';"); } catch(_) {}
  try { db.exec("ALTER TABLE plans ADD COLUMN commission_rate REAL DEFAULT 20.0;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN plan_id INTEGER REFERENCES plans(id);"); } catch(_) {}

  // KYC and Bank Details migration
  try { db.exec("ALTER TABLE consultants ADD COLUMN aadhaar_number TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN aadhaar_photo_url TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN pan_number TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN pan_photo_url TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN kyc_status TEXT DEFAULT 'unsubmitted';"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN kyc_reject_reason TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN bank_account_holder_name TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN bank_account_number TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN bank_ifsc_code TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN bank_name TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN bank_status TEXT DEFAULT 'unsubmitted';"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN bank_reject_reason TEXT;"); } catch(_) {}

  // Seed default Admin Settings
  const commissionSetting = db.prepare('SELECT * FROM admin_settings WHERE key = ?').get('commission_percentage');
  if (!commissionSetting) {
    db.prepare('INSERT INTO admin_settings (key, value) VALUES (?, ?)').run('commission_percentage', '20');
  }

  // Seed default Subscription Plans
  const hasStarter = db.prepare("SELECT id FROM plans WHERE name LIKE '%Starter%' OR name LIKE '%Launchpad%'").get();
  if (!hasStarter) {
    db.exec("DELETE FROM plans;");
    const insertPlan = db.prepare(`
      INSERT INTO plans (name, price, duration_days, description, max_consultant_rate, support_hours, commission_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertPlan.run(
      'Starter Launchpad (30 Days Free Trial)', 
      0.0, 
      30, 
      'Free first 30 days, then ₹999/month. Direct support within 72 hours. Consultant calling rate capped at maximum ₹25/min. 30% platform commission.',
      25.0,
      '72 Hours',
      30.0
    );
    insertPlan.run(
      'Professional Growth Booster', 
      4999.0, 
      30, 
      'Accelerate your bookings and status. Direct support within 48 hours. Consultant calling rate capped at maximum ₹100/min. 25% platform commission.',
      100.0,
      '48 Hours',
      25.0
    );
    insertPlan.run(
      'Elite Mastermind Hub', 
      9999.0, 
      30, 
      'Premium elite placement for top industry experts. Direct support within 24 hours. Consultant calling rate capped at maximum ₹500/min. 20% platform commission.',
      500.0,
      '24 Hours',
      20.0
    );
  }

  // Seed default Consultants
  const consultantsCount = db.prepare('SELECT COUNT(*) as count FROM consultants').get() as { count: number };
  if (consultantsCount.count === 0) {
    const insertConsultant = db.prepare(`
      INSERT INTO consultants (
        username, password, display_name, photo_url, bio, price_per_minute, 
        is_online, is_busy, is_active, plan_expiry, wallet_total, wallet_withdrawable,
        category, experience, languages, specializations, verification_status, lifetime_revenue, total_sessions, average_rating
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    insertConsultant.run(
      'astro_pandit', 
      'pandit123', 
      'Astro Pandit', 
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=300', 
      'Expert Vedic Astrologer, Kundali specialist, Tarot Reader & Vastu Consultant with 12+ years of guiding light.', 
      25.0, 
      1, // online
      0, // not busy
      1, // active
      futureDate,
      1250.0,
      1000.0,
      'Astrologers',
      12,
      'Hindi, Sanskrit, English',
      'Vedic Astrology, Kundali Matching, Tarot Reading',
      'Verified',
      8500.0,
      142,
      4.8
    );

    insertConsultant.run(
      'influencer_karan', 
      'karan123', 
      'Karan Johar (Growth)', 
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300', 
      'Social media growth hacker, personal brand consultant, and creator strategy director.', 
      50.0, 
      1, // online
      0, // not busy
      1, // active
      futureDate,
      4500.0,
      3600.0,
      'Influencers',
      6,
      'English, Hindi',
      'Brand Deals, Audience Scaling, Video Hooks',
      'Verified',
      15400.0,
      88,
      4.9
    );

    insertConsultant.run(
      'coach_rahul', 
      'rahul123', 
      'Coach Rahul', 
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300', 
      'Life Coach, Motivational Speaker & Career Counselor. Helping you unlock your true focus and relationship harmony.', 
      40.0, 
      1, // online
      0, // not busy
      1, // active
      futureDate,
      3600.0,
      2880.0,
      'Coaches',
      8,
      'English, Hindi',
      'Subconscious reprogramming, Career Transition, Relationship counseling',
      'Verified',
      12200.0,
      104,
      4.7
    );

    insertConsultant.run(
      'consult_shreya', 
      'shreya123', 
      'Shreya Sen (Business)', 
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300', 
      'Enterprise Strategy Consultant & ex-MBB. Specializes in startup pitch decks and scale-up models.', 
      80.0, 
      1, // online
      0, // not busy
      1, // active
      futureDate,
      1600.0,
      1280.0,
      'Consultants',
      10,
      'English, Bengali',
      'Product Market Fit, Financial Modeling, Capital Raising',
      'Verified',
      21300.0,
      65,
      4.9
    );

    insertConsultant.run(
      'lawyer_sharma', 
      'sharma123', 
      'Advocate Sharma', 
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300', 
      'Senior Advocate specializing in intellectual property, startups, contracts, and dispute resolution.', 
      60.0, 
      1, // online
      1, // busy
      1, // active
      futureDate,
      750.0,
      600.0,
      'Lawyers',
      15,
      'English, Hindi, Punjabi',
      'Patent Filing, Founder Agreements, NDAs, Litigation',
      'Verified',
      34000.0,
      150,
      4.6
    );

    insertConsultant.run(
      'mentor_ayush', 
      'ayush123', 
      'Mentor Ayush', 
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300', 
      'Tech Lead & Mentor. Helping devs step up to tech architecture roles and prepare for system design interviews.', 
      30.0, 
      1, // online
      0, // not busy
      1, // active
      futureDate,
      315.0,
      252.0,
      'Mentors',
      7,
      'English, Hindi, Gujarati',
      'System Design, LeetCode Strategy, Engineering Management',
      'Verified',
      9500.0,
      72,
      4.9
    );

    const insertReview = db.prepare('INSERT INTO reviews (consultant_id, user_name, rating, text, created_at) VALUES (?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    insertReview.run(1, 'Aman', 5, 'Highly accurate predictions! Saved my relationship.', now);
    insertReview.run(1, 'Neha', 4, 'Very polite and knowledgeable astrologer.', now);
    insertReview.run(2, 'Rohit', 5, 'Super motivational session. Cleared my job selection dilemma.', now);
    insertReview.run(3, 'Sanya', 5, 'Loved the tarot reading, so on point!', now);
  }

  // Migrate existing IDs < 10000 to be at least 5 digits
  try {
    // Turn foreign keys OFF outside transaction
    db.pragma('foreign_keys = OFF');

    db.transaction(() => {
      // Migrate consultants
      const lowCons = db.prepare('SELECT id FROM consultants WHERE id < 10000 ORDER BY id DESC').all() as { id: number }[];
      for (const cons of lowCons) {
        const oldId = cons.id;
        const newId = oldId + 10000;
        let targetId = newId;
        const exists = db.prepare('SELECT id FROM consultants WHERE id = ?').get(targetId);
        if (exists) {
          const maxIdRow = db.prepare('SELECT MAX(id) as maxId FROM consultants').get() as { maxId: number | null };
          targetId = Math.max(10000, maxIdRow?.maxId || 10000) + 1;
        }
        
        db.prepare('UPDATE sessions SET consultant_id = ? WHERE consultant_id = ?').run(targetId, oldId);
        db.prepare('UPDATE reviews SET consultant_id = ? WHERE consultant_id = ?').run(targetId, oldId);
        db.prepare('UPDATE blocked_users SET consultant_id = ? WHERE consultant_id = ?').run(targetId, oldId);
        db.prepare('UPDATE consultants SET id = ? WHERE id = ?').run(targetId, oldId);
      }

      // Migrate users
      const lowUsers = db.prepare('SELECT id FROM users WHERE id < 10000 ORDER BY id DESC').all() as { id: number }[];
      for (const usr of lowUsers) {
        const oldId = usr.id;
        const newId = oldId + 10000;
        let targetId = newId;
        const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
        if (exists) {
          const maxIdRow = db.prepare('SELECT MAX(id) as maxId FROM users').get() as { maxId: number | null };
          targetId = Math.max(10000, maxIdRow?.maxId || 10000) + 1;
        }

        db.prepare('UPDATE sessions SET user_id = ? WHERE user_id = ?').run(targetId, oldId);
        db.prepare('UPDATE wallet_transactions SET user_id = ? WHERE user_id = ?').run(targetId, oldId);
        db.prepare('UPDATE users SET id = ? WHERE id = ?').run(targetId, oldId);
      }

      // Update auto-increment sequence tables
      const maxUser = db.prepare('SELECT MAX(id) as maxId FROM users').get() as { maxId: number | null };
      const maxUserId = maxUser?.maxId || 10000;

      const maxCons = db.prepare('SELECT MAX(id) as maxId FROM consultants').get() as { maxId: number | null };
      const maxConsId = maxCons?.maxId || 10000;

      db.prepare("INSERT OR IGNORE INTO sqlite_sequence (name, seq) VALUES ('users', 10000)").run();
      db.prepare("UPDATE sqlite_sequence SET seq = ? WHERE name = 'users'").run(Math.max(10000, maxUserId));

      db.prepare("INSERT OR IGNORE INTO sqlite_sequence (name, seq) VALUES ('consultants', 10000)").run();
      db.prepare("UPDATE sqlite_sequence SET seq = ? WHERE name = 'consultants'").run(Math.max(10000, maxConsId));
    })();

    // Turn foreign keys ON outside transaction
    db.pragma('foreign_keys = ON');
    console.log('Database IDs migrated to 5-digit format successfully');
  } catch (err) {
    try { db.pragma('foreign_keys = ON'); } catch (_) {}
    console.error('Error migrating IDs to 5-digit format:', err);
  }
}

export function logWalletTransaction(
  userId: number,
  type: 'recharge' | 'consultation' | 'refund',
  amount: number,
  description: string,
  gstRate: number = 0.0,
  gstAmount: number = 0.0,
  totalPaid: number = amount
) {
  try {
    db.prepare(`
      INSERT INTO wallet_transactions (user_id, type, amount, description, gst_rate, gst_amount, total_paid, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, type, amount, description, gstRate, gstAmount, totalPaid, new Date().toISOString());
  } catch (err) {
    console.error('Failed to log wallet transaction:', err);
  }
}

export { db };
