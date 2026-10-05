import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';

const memory = {
  profiles: new Map(),
  conversations: new Map()
};
const MAX_MESSAGES_PER_CONVERSATION = 1500;

let mongo = null;
let collections = null;
let storageStatus = { mode: 'memory', message: 'MongoDB is not configured; data is temporary.' };

export async function connectStore() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return storageStatus;

  try {
    mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await mongo.connect();
    const database = mongo.db(process.env.MONGODB_DB_NAME || 'sunday_companion');
    collections = {
      profiles: database.collection('profiles'),
      conversations: database.collection('conversations')
    };
    await Promise.all([
      collections.profiles.createIndex({ userId: 1 }, { unique: true }),
      collections.conversations.createIndex({ userId: 1, updatedAt: -1 })
    ]);
    storageStatus = { mode: 'mongodb', message: 'Connected to MongoDB.' };
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    storageStatus = { mode: 'memory', message: 'MongoDB connection failed; data is temporary.' };
    await mongo?.close().catch(() => {});
    mongo = null;
    collections = null;
  }
  return storageStatus;
}

export function getStorageStatus() {
  return storageStatus;
}

export async function closeStore() {
  if (mongo) await mongo.close();
  mongo = null;
  collections = null;
}

export async function getProfile(userId) {
  if (collections) return (await collections.profiles.findOne({ userId })) || { userId, name: '', interests: '', notes: '' };
  return memory.profiles.get(userId) || { userId, name: '', interests: '', notes: '' };
}

export async function putProfile(userId, profile) {
  const record = { userId, ...profile, updatedAt: new Date() };
  if (collections) await collections.profiles.updateOne({ userId }, { $set: record }, { upsert: true });
  else memory.profiles.set(userId, record);
  return record;
}

export async function deleteProfile(userId) {
  if (collections) await collections.profiles.deleteOne({ userId });
  else memory.profiles.delete(userId);
}

function cloneConversation(conversation) {
  if (!conversation) return null;
  return { ...conversation, messages: conversation.messages.map(message => ({ ...message })) };
}

export async function listConversations(userId) {
  if (collections) return collections.conversations.find({ userId }).sort({ updatedAt: -1 }).limit(50).toArray();
  return [...memory.conversations.values()]
    .filter(conversation => conversation.userId === userId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 50)
    .map(cloneConversation);
}

export async function createConversation(userId) {
  const now = new Date();
  const conversation = {
    _id: randomUUID(),
    userId,
    title: 'A little check-in',
    createdAt: now,
    updatedAt: now,
    messages: [{ role: 'assistant', content: 'Hey love! ❤️ How was your day?', createdAt: now }]
  };
  if (collections) await collections.conversations.insertOne(conversation);
  else memory.conversations.set(conversation._id, conversation);
  return cloneConversation(conversation);
}

export async function getConversation(userId, conversationId) {
  if (collections) return collections.conversations.findOne({ _id: conversationId, userId });
  const conversation = memory.conversations.get(conversationId);
  return conversation?.userId === userId ? cloneConversation(conversation) : null;
}

export async function addConversationMessage(userId, conversationId, message) {
  const now = new Date();
  if (collections) {
    const conversation = await collections.conversations.findOne({ _id: conversationId, userId });
    if (!conversation) return null;
    const title = conversation.messages.some(item => item.role === 'user') || message.role !== 'user'
      ? conversation.title
      : message.content.slice(0, 42);
    await collections.conversations.updateOne(
      { _id: conversationId, userId },
      {
        $push: { messages: { $each: [{ ...message, createdAt: now }], $slice: -MAX_MESSAGES_PER_CONVERSATION } },
        $set: { title, updatedAt: now }
      }
    );
    return collections.conversations.findOne({ _id: conversationId, userId });
  }

  const conversation = memory.conversations.get(conversationId);
  if (!conversation || conversation.userId !== userId) return null;
  if (message.role === 'user' && !conversation.messages.some(item => item.role === 'user')) {
    conversation.title = message.content.slice(0, 42);
  }
  conversation.messages.push({ ...message, createdAt: now });
  if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
    conversation.messages.splice(0, conversation.messages.length - MAX_MESSAGES_PER_CONVERSATION);
  }
  conversation.updatedAt = now;
  return cloneConversation(conversation);
}

export async function removeConversation(userId, conversationId) {
  if (collections) {
    const result = await collections.conversations.deleteOne({ _id: conversationId, userId });
    return result.deletedCount > 0;
  }
  const conversation = memory.conversations.get(conversationId);
  if (!conversation || conversation.userId !== userId) return false;
  return memory.conversations.delete(conversationId);
}
