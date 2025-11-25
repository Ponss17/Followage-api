import { MongoClient } from 'mongodb';
import { attachDatabasePool } from '@vercel/functions';

const uri = process.env.MONGODB_URI || process.env.Losperrisapi_MONGODB_URI || process.env.NONOGDB_URI;
const dbName = process.env.MONGODB_DB || 'followage';

const options = {
  appName: 'losperris.followage',
  maxIdleTimeMS: 5000,
  maxPoolSize: 5
};

const client = new MongoClient(uri, options);
attachDatabasePool(client);

let connected = false;
let indexesEnsured = false;

export async function getTokensCollection() {
  if (!connected) {
    await client.connect();
    connected = true;
  }
  const db = client.db(dbName);
  const col = db.collection('tokens');
  if (!indexesEnsured) {
    await col.createIndex({ user_id: 1, type: 1 }, { unique: true });
    indexesEnsured = true;
  }
  return col;
}

export default client;