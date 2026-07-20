const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName: 'callmint' });
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;

  // Query consultants
  const cols = await db.collection('consultants').find({
    $or: [
      { email: /kartiknagar/i },
      { username: /khyati/i },
      { display_name: /khyati/i }
    ]
  }).toArray();
  console.log('--- Consultants in Mongo ---');
  console.log(cols);

  // Query audit logs
  const logs = await db.collection('audit_logs').find({
    $or: [
      { details: /khyati/i },
      { actor: /khyati/i }
    ]
  }).toArray();
  console.log('--- Audit Logs in Mongo ---');
  console.log(logs);

  await mongoose.disconnect();
}

run().catch(console.error);
