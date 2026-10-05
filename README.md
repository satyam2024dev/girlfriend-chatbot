# Sunday Companion

A full-stack fictional AI girlfriend chat built with React, Vite, Express, MongoDB, and the OpenAI Responses API. The backend also has local replies for development when no OpenAI key is configured.

## Requirements

- Node.js 20.19+ (the current project runtime is Node 24)
- npm
- MongoDB Community running locally, MongoDB Atlas, or another MongoDB deployment
- Optional: an OpenAI API key for open-ended AI responses

## Setup on Windows

PowerShell may block the `npm.ps1` script, so use `npm.cmd`:

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` in `.env` to your local MongoDB or Atlas connection string.
3. Set `OPENAI_API_KEY` for model-powered responses. Leave it blank to use local scripted replies.
4. Install and start the app:

   ```powershell
   npm.cmd install
   npm.cmd run dev
   ```

5. Open <http://127.0.0.1:5173>.

The API runs at <http://127.0.0.1:3001>. Visit `/api/health` to see whether MongoDB and OpenAI are configured. If MongoDB is not connected, the app uses temporary in-memory storage and shows a notice in the chat. Each conversation keeps its latest 1,500 messages.

## Production

```powershell
npm.cmd run build
npm.cmd start
```

The Express server serves the built React app and the API. Configure `MONGODB_URI`, `MONGODB_DB_NAME`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and `API_PORT` in the runtime environment. In production, the server listens on `0.0.0.0`; set `API_HOST` to override this. Put the app behind HTTPS and configure your hosting provider's health check to use `/api/health`.

## Data and privacy

Conversations and profile details are scoped to a random ID stored in the browser and saved in MongoDB when configured. There is no account or login system yet; this is intended for local development and personal use, not a public multi-user deployment without adding authentication and access controls. When OpenAI is configured, recent conversation messages and the saved profile are sent to the OpenAI API to produce a reply. Without a key, replies stay on the local server. Do not put API keys in client-side code or commit `.env`.
