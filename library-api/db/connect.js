import { MongoClient, ServerApiVersion } from 'mongodb';

let client;
let db;

export const connectToDb = async (uri, dbName) => {
  if (!uri) throw new Error('MONGODB_URI is not defined');
  if (!dbName) throw new Error('DB_NAME is not defined');
  if (db) return db;

  client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000
  });

  console.log('🔌 Connecting to MongoDB…');
  await client.connect();
  await client.db('admin').command({ ping: 1 });

  db = client.db(dbName);
  console.log(`✅ Connected to MongoDB: ${db.databaseName}`);

  const close = async (signal) => {
    try {
      console.log(`\n🔻 Received ${signal}, closing MongoDB client...`);
      await client.close();
      console.log('👋 MongoDB client closed.');
    } catch (e) {
      console.error('Error closing MongoDB client:', e);
    } finally {
      process.exit(0);
    }
  };
  process.once('SIGINT', () => close('SIGINT'));
  process.once('SIGTERM', () => close('SIGTERM'));

  return db;
};

export const getDb = () => {
  if (!db) throw new Error('Database not initialized. Call connectToDb first.');
  return db;
};
