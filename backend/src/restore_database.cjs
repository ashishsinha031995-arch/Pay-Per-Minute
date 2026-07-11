const Database = require('better-sqlite3');
const mongoose = require('mongoose');
const path = require('path');

// Reconstruct database paths
const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new Database(dbPath);

console.log('Restoring consultant accounts from sent_emails table...');

const emails = db.prepare(`
  SELECT id, to_email, subject, body, created_at 
  FROM sent_emails 
  WHERE subject LIKE '%Credentials%' 
  ORDER BY created_at ASC
`).all();

const idMap = {
  'sandeshprajapati607@gmail.com': 20033,
  'karmaja.info@gmail.com': 20227,
  'ashishsinha.031995+test1999@gmai.com': 20379,
  'ashishsinha.031195+test1997@gmail.com': 20381,
  'ashishsinha.031995+test1996@gmail.com': 20382,
  'ashish.sinha.03199.5@gmail.com': 20378,
  'ashishsinha.031995+test1994@gmail.com': 20383,
  'praveshkumarroy440@gmail.com': 20385,
  'sandeshprajapati608@gmail.com': 20386,
  'ashishsin2e2e2eha.031995@gmail.com': 20072,
  'ashishsinha.031995+test1993@gmail.com': 20388,
  'ramlal6004@gmail.com': 20389,
  'puneetbahuguna031@gmail.com': 20175,
  'sandeshprajapati603@gmail.com': 20049,
  'santoshrawat82593@gmail.com': 20387,
  'ashishsinha.031995+test1998@gmail.com': 20380
};

// Also let's assign standard IDs for other emails dynamically so they fit perfectly
let nextId = 20500;

const plans = db.prepare('SELECT id, name, max_consultant_rate FROM plans').all();

const processedConsultants = [];

for (const em of emails) {
  const matchName = em.body.match(/Dear ([^,\n]+)/);
  const name = matchName ? matchName[1].trim() : 'Unknown';
  
  const matchUser = em.body.match(/(?:Username \/ Registered Email|Registered Username|Username):\s*([^\n\s•]+)/i) || em.body.match(/• Username:\s*([^\s\n•]+)/);
  const username = matchUser ? matchUser[1].replace('-','').trim() : 'Unknown';
  
  const matchPass = em.body.match(/(?:Temporary Password|Secure Password|Password):\s*([^\n\s•]+)/i) || em.body.match(/• Password:\s*([^\s\n•]+)/);
  const password = matchPass ? matchPass[1].trim() : 'Unknown';

  const planMatch = em.body.match(/(?:using the|subscription -|Subscription:)\s*([^\!\n\.]+)/i);
  let planName = planMatch ? planMatch[1].trim() : 'Starter Launchpad (30 Days Free Trial)';
  if (planName.includes('Starter')) planName = 'Starter Launchpad (30 Days Free Trial)';
  else if (planName.includes('Professional')) planName = 'Professional Growth Booster';
  else if (planName.includes('Elite')) planName = 'Elite Mastermind Hub';
  
  const foundPlan = plans.find(p => p.name === planName) || plans[0];
  const planId = foundPlan.id;
  const maxRate = foundPlan.max_consultant_rate;

  let assignedId = idMap[em.to_email];
  if (!assignedId) {
    assignedId = nextId++;
  }

  // Check if this consultant is already processed or exists in DB
  const existingProcessed = processedConsultants.find(c => c.username === username);
  if (existingProcessed) {
    // Update password or other info if it was a newer email
    existingProcessed.password = password;
    existingProcessed.plan_id = planId;
    continue;
  }

  processedConsultants.push({
    id: assignedId,
    username,
    email: em.to_email,
    password,
    display_name: name,
    price_per_minute: Math.min(25, maxRate), // default price capped at max rate
    is_online: 1,
    is_busy: 0,
    is_active: 1,
    plan_id: planId,
    plan_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    verification_status: 'Verified',
    kyc_status: 'unsubmitted',
    bank_status: 'unsubmitted'
  });
}

// Special case for Lakhan (ID: 20382) -> he has Elite Mastermind Hub
const lakhan = processedConsultants.find(c => c.id === 20382);
if (lakhan) {
  lakhan.plan_id = 3; // Elite Mastermind Hub
  lakhan.price_per_minute = 500; // max rate as requested
}

console.log(`Extracted ${processedConsultants.length} consultants from sent_emails. Inserting into SQLite...`);

// Insert into SQLite
db.pragma('foreign_keys = OFF');
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO consultants (
    id, username, email, password, display_name, price_per_minute, 
    is_online, is_busy, is_active, plan_id, plan_expiry, 
    verification_status, kyc_status, bank_status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const cons of processedConsultants) {
  insertStmt.run(
    cons.id,
    cons.username,
    cons.email,
    cons.password,
    cons.display_name,
    cons.price_per_minute,
    cons.is_online,
    cons.is_busy,
    cons.is_active,
    cons.plan_id,
    cons.plan_expiry,
    cons.verification_status,
    cons.kyc_status,
    cons.bank_status
  );
}
db.pragma('foreign_keys = ON');
console.log('Successfully inserted into SQLite consultants table.');

// Now let's sync to MongoDB if configured
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (mongoUri) {
  console.log('Connecting to MongoDB to sync restored consultants...');
  mongoose.connect(mongoUri, { dbName: 'callmint' })
    .then(async () => {
      const collection = mongoose.connection.db.collection('consultants');
      for (const cons of processedConsultants) {
        await collection.replaceOne(
          { _id: cons.id },
          { _id: cons.id, ...cons },
          { upsert: true }
        );
      }
      console.log('Successfully synchronized restored consultants to MongoDB.');
      mongoose.disconnect();
    })
    .catch(err => {
      console.error('Failed to sync to MongoDB:', err);
    });
} else {
  console.log('No MONGODB_URI configured. Restored only in SQLite.');
}
