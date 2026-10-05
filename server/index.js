import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { addConversationMessage, closeStore, connectStore, createConversation, deleteProfile, getConversation, getProfile, getStorageStatus, listConversations, putProfile, removeConversation } from './store.js';
import { generateReply, hasOpenAI } from './chatService.js';

const app = express();
const port = Number(process.env.API_PORT || 3001);
const host = process.env.API_HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
app.use(express.json({ limit: '24kb' }));

function requireUser(req, res, next) {
  const userId = req.get('x-user-id')?.trim();
  if (!userId || userId.length > 80) return res.status(400).json({ error: 'A browser user ID is required.' });
  req.userId = userId;
  next();
}

function validProfile(body) {
  const fields = ['name', 'interests', 'notes'];
  const maxima = { name: 40, interests: 240, notes: 400 };
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const profile = {};
  for (const field of fields) {
    const value = body[field] ?? '';
    if (typeof value !== 'string' || value.length > maxima[field]) return null;
    profile[field] = value.trim();
  }
  return profile;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, storage: getStorageStatus(), ai: hasOpenAI() ? 'openai-configured' : 'local-replies' });
});

app.get('/api/profile', requireUser, async (req, res, next) => {
  try { res.json({ profile: await getProfile(req.userId) }); } catch (error) { next(error); }
});
app.put('/api/profile', requireUser, async (req, res, next) => {
  const profile = validProfile(req.body);
  if (!profile) return res.status(400).json({ error: 'Profile fields are invalid or too long.' });
  try { res.json({ profile: await putProfile(req.userId, profile) }); } catch (error) { next(error); }
});
app.delete('/api/profile', requireUser, async (req, res, next) => {
  try { await deleteProfile(req.userId); res.status(204).end(); } catch (error) { next(error); }
});

app.get('/api/conversations', requireUser, async (req, res, next) => {
  try { res.json({ conversations: await listConversations(req.userId) }); } catch (error) { next(error); }
});
app.post('/api/conversations', requireUser, async (req, res, next) => {
  try { res.status(201).json({ conversation: await createConversation(req.userId) }); } catch (error) { next(error); }
});
app.get('/api/conversations/:id', requireUser, async (req, res, next) => {
  try {
    const conversation = await getConversation(req.userId, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
    res.json({ conversation });
  } catch (error) { next(error); }
});
app.delete('/api/conversations/:id', requireUser, async (req, res, next) => {
  try {
    const removed = await removeConversation(req.userId, req.params.id);
    if (!removed) return res.status(404).json({ error: 'Conversation not found.' });
    res.status(204).end();
  } catch (error) { next(error); }
});
app.post('/api/conversations/:id/messages', requireUser, async (req, res, next) => {
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  const mood = ['Warm', 'Playful', 'Calm'].includes(req.body?.mood) ? req.body.mood : 'Warm';
  if (!content || content.length > 4000) return res.status(400).json({ error: 'Message must be between 1 and 4000 characters.' });

  try {
    const conversation = await getConversation(req.userId, req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
    const userMessage = { role: 'user', content };
    const withUserMessage = await addConversationMessage(req.userId, req.params.id, userMessage);
    const profile = await getProfile(req.userId);
    const reply = await generateReply({
      history: withUserMessage.messages,
      profile,
      mood
    });
    const updated = await addConversationMessage(req.userId, req.params.id, { role: 'assistant', content: reply.text });
    res.json({ conversation: updated, replyMode: reply.mode });
  } catch (error) { next(error); }
});

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const builtClient = path.resolve(currentDirectory, '../dist');
if (existsSync(builtClient)) {
  app.use(express.static(builtClient));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(builtClient, 'index.html')));
}

app.use((error, _req, res, _next) => {
  console.error('API error:', error.message);
  res.status(500).json({ error: 'The server could not complete that request.' });
});

await connectStore();
const server = app.listen(port, host, () => {
  const storage = getStorageStatus();
  console.log(`Sunday API listening on http://${host}:${port}`);
  console.log(`Storage: ${storage.mode}. AI: ${hasOpenAI() ? 'OpenAI configured' : 'local replies'}.`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(async () => {
    await closeStore();
    process.exit(0);
  }));
}
