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
      average_rating REAL DEFAULT 5.0
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

  // Migrate existing users table if they are missing newer columns
  try { db.exec("ALTER TABLE users ADD COLUMN password TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN email TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN photo_url TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN dob TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN gender TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN wallet_balance REAL DEFAULT 0.0;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN lifetime_recharge REAL DEFAULT 0.0;"); } catch(_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0;"); } catch(_) {}

  // Migrate existing consultants table for newer columns
  try { db.exec("ALTER TABLE consultants ADD COLUMN email TEXT;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN category TEXT DEFAULT 'Consultants';"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN experience INTEGER DEFAULT 5;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN languages TEXT DEFAULT 'English, Hindi';"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN specializations TEXT DEFAULT 'General';"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN verification_status TEXT DEFAULT 'Verified';"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN lifetime_revenue REAL DEFAULT 0.0;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN total_sessions INTEGER DEFAULT 0;"); } catch(_) {}
  try { db.exec("ALTER TABLE consultants ADD COLUMN average_rating REAL DEFAULT 5.0;"); } catch(_) {}

  // Seed default Admin Settings
  const commissionSetting = db.prepare('SELECT * FROM admin_settings WHERE key = ?').get('commission_percentage');
  if (!commissionSetting) {
    db.prepare('INSERT INTO admin_settings (key, value) VALUES (?, ?)').run('commission_percentage', '20');
  }

  // Seed default Subscription Plans
  const plansCount = db.prepare('SELECT COUNT(*) as count FROM plans').get() as { count: number };
  if (plansCount.count === 0) {
    const insertPlan = db.prepare('INSERT INTO plans (name, price, duration_days, description) VALUES (?, ?, ?, ?)');
    insertPlan.run('Silver Plan', 499, 30, 'Standard profile listing on platform, access to basic statistics.');
    insertPlan.run('Gold Plan', 999, 90, 'Featured profile listing with higher visibility, standard platform support.');
    insertPlan.run('Platinum Plan', 1999, 180, 'Elite status profile listing with premium support and custom commission discount.');
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

    // Add some initial mock consultants for the demo representing all 6 categories
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

    // Seed default reviews
    const insertReview = db.prepare('INSERT INTO reviews (consultant_id, user_name, rating, text, created_at) VALUES (?, ?, ?, ?, ?)');
    const now = new Date().toISOString();
    insertReview.run(1, 'Aman', 5, 'Highly accurate predictions! Saved my relationship.', now);
    insertReview.run(1, 'Neha', 4, 'Very polite and knowledgeable astrologer.', now);
    insertReview.run(2, 'Rohit', 5, 'Super motivational session. Cleared my job selection dilemma.', now);
    insertReview.run(3, 'Sanya', 5, 'Loved the tarot reading, so on point!', now);
  }
}

export function logWalletTransaction(userId: number, type: 'recharge' | 'consultation' | 'refund', amount: number, description: string) {
  try {
    db.prepare(`
      INSERT INTO wallet_transactions (user_id, type, amount, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, type, amount, description, new Date().toISOString());
  } catch (err) {
    console.error('Failed to log wallet transaction:', err);
  }
}

export { db };
