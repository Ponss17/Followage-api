import { MongoClient } from 'mongodb';
import vercelFns from '@vercel/functions';
const { attachDatabasePool } = vercelFns;

const uri = process.env.MONGODB_URI || process.env.Losperrisapi_MONGODB_URI || process.env.NONOGDB_URI;
const hasUri = !!uri;
const dbName = process.env.MONGODB_DB || 'followage';

const options = {
  appName: 'losperris.followage',
  maxIdleTimeMS: 5000,
  maxPoolSize: 5
};

const client = hasUri ? new MongoClient(uri, options) : null;
if (client && attachDatabasePool) attachDatabasePool(client);

let connected = false;
let indexesEnsured = false;

const memory = new Map();
function match(doc, filter) {
  if (filter.user_id && filter.type) return String(doc.user_id) === String(filter.user_id) && String(doc.type) === String(filter.type);
  if (filter.login && filter.type) return String(doc.login) === String(filter.login) && String(doc.type) === String(filter.type);
  return false;
}
const memoryCol = {
  async findOne(filter) {
    for (const doc of memory.values()) {
      if (match(doc, filter)) return doc;
    }
    return null;
  },
  async findOneAndUpdate(filter, update, _options) {
    let doc = await this.findOne(filter);
    if (!doc) {
      doc = { ...filter, ...(update?.$setOnInsert || {}), ...(update?.$set || {}) };
    } else {
      doc = { ...doc, ...(update?.$set || {}) };
    }
    memory.set(`${doc.user_id || doc.login}:${doc.type}`, doc);
    return { value: doc };
  },
  async createIndex() { return true; }
};

export async function getTokensCollection() {
  if (!hasUri) return memoryCol;
  if (!connected) {
    await client.connect();
    connected = true;
  }
  const db = client.db(dbName);
  const col = db.collection('tokens');
  if (!indexesEnsured) {
    await col.createIndex({ user_id: 1, type: 1 }, { unique: true });
    await col.createIndex({ login: 1, type: 1 });
  }
  return col;
}

export async function getClipRateCollection() {
  if (!hasUri) return memoryCol;
  if (!connected) {
    await client.connect();
    connected = true;
  }
  const db = client.db(dbName);
  const col = db.collection('clip_rate');
  await col.createIndex({ expire_at: 1 }, { expireAfterSeconds: 0 });
  await col.createIndex({ user_id: 1 });
  return col;
}

export default client;