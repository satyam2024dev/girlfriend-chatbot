import { useCallback, useEffect, useRef, useState } from 'react';

const USER_KEY = 'sunday-browser-user';
const MOODS = ['Warm', 'Playful', 'Calm'];
const SUGGESTIONS = ['How was your day, love?', 'I missed you 🥰', 'Keep me company 💗'];
const EMPTY_PROFILE = { name: '', interests: '', notes: '' };

function contextualSuggestions(messages) {
  const lastUser = [...messages].reverse().find(message => message.role === 'user')?.content?.toLowerCase() || '';
  if (!lastUser) return SUGGESTIONS;
  if (/breakfast|lunch|dinner|food|eat|hungry|chai|coffee/.test(lastUser)) return ['Tell me about your meal', 'Did you get a proper break?', 'What are you having later?'];
  if (/work|office|study|studying|class|college|school|exam|homework/.test(lastUser)) return ['What are you working on?', 'Have you had a little break?', 'Tell me one good thing from today'];
  if (/weekend|plans|free today|nothing to do/.test(lastUser)) return ['Plan a cozy day with me', 'Give me a fun idea', 'Let us play this or that'];
  if (/sad|upset|stress|rough|hard|dukhi|low/.test(lastUser)) return ['Just listen for a bit 💗', 'Help me feel lighter', 'Let’s talk about something sweet'];
  if (/tired|sleep|neend|nind|thak/.test(lastUser)) return ['Wish me sweet dreams 🌙', 'Tell me something soothing', 'Help me wind down'];
  if (/happy|excited|great|proud|khush/.test(lastUser)) return ['Ask me what happened 🥰', 'Celebrate with me', 'What should I do next?'];
  return ['Ask me something cute 💕', 'Help me unwind', 'Tell me more'];
}

function getBrowserUserId() {
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getBrowserUserId(),
      ...options.headers
    }
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(problem.error || `Request failed (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

function shortTitle(conversation) {
  return conversation.title || 'A little check-in';
}

function stamp(value) {
  if (!value) return 'Just now';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function App() {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [draftProfile, setDraftProfile] = useState(EMPTY_PROFILE);
  const [input, setInput] = useState('');
  const [mood, setMood] = useState('Warm');
  const [replyMode, setReplyMode] = useState('local');
  const [aiConfigured, setAiConfigured] = useState(false);
  const [storageMode, setStorageMode] = useState('checking');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [savedMessages, setSavedMessages] = useState(() => new Set());
  const messageList = useRef(null);
  const inputRef = useRef(null);
  const activeId = useRef(null);

  useEffect(() => { activeId.current = active?._id || null; }, [active]);

  const refreshConversations = useCallback(async () => {
    const result = await api('/api/conversations');
    setConversations(result.conversations);
    return result.conversations;
  }, []);

  useEffect(() => {
    let mounted = true;
    async function initialise() {
      try {
        const [health, profileResult, listResult] = await Promise.all([
          fetch('/api/health').then(response => response.json()),
          api('/api/profile'),
          api('/api/conversations')
        ]);
        if (!mounted) return;
        setStorageMode(health.storage?.mode || 'memory');
        setAiConfigured(health.ai === 'openai-configured');
        let currentProfile = profileResult.profile;

        // Import the profile from the original browser-only prototype once.
        const legacy = localStorage.getItem('sunday-companion-profile');
        if (legacy && !currentProfile.name && !currentProfile.interests && !currentProfile.notes) {
          try {
            const oldProfile = JSON.parse(legacy);
            const saved = await api('/api/profile', { method: 'PUT', body: JSON.stringify({ ...EMPTY_PROFILE, ...oldProfile }) });
            currentProfile = saved.profile;
            localStorage.removeItem('sunday-companion-profile');
          } catch { /* Keep the server profile if legacy data is malformed. */ }
        }
        setProfile({ ...EMPTY_PROFILE, ...currentProfile });
        setDraftProfile({ ...EMPTY_PROFILE, ...currentProfile });

        let list = listResult.conversations;
        if (!list.length) {
          const created = await api('/api/conversations', { method: 'POST', body: '{}' });
          list = [created.conversation];
        }
        if (!mounted) return;
        setConversations(list);
        const first = list[0];
        const full = await api(`/api/conversations/${first._id}`);
        if (mounted) setActive(full.conversation);
      } catch (exception) {
        if (mounted) setError(`Could not connect to the app server. ${exception.message}`);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    initialise();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (messageList.current) messageList.current.scrollTo({ top: messageList.current.scrollHeight, behavior: 'smooth' });
  }, [active?.messages?.length, sending]);

  async function createConversation() {
    setMenuOpen(false);
    setError('');
    try {
      const result = await api('/api/conversations', { method: 'POST', body: '{}' });
      setConversations(current => [result.conversation, ...current]);
      setActive(result.conversation);
      setSavedMessages(new Set());
      inputRef.current?.focus();
    } catch (exception) { setError(exception.message); }
  }

  async function openConversation(id) {
    setError('');
    try {
      const result = await api(`/api/conversations/${id}`);
      setActive(result.conversation);
      setSavedMessages(new Set());
    } catch (exception) { setError(exception.message); }
  }

  async function deleteCurrentConversation() {
    if (!active) return;
    setMenuOpen(false);
    try {
      await api(`/api/conversations/${active._id}`, { method: 'DELETE' });
      const remaining = (await refreshConversations());
      if (remaining.length) {
        const result = await api(`/api/conversations/${remaining[0]._id}`);
        setActive(result.conversation);
      } else {
        const result = await api('/api/conversations', { method: 'POST', body: '{}' });
        setActive(result.conversation);
        setConversations([result.conversation]);
      }
    } catch (exception) { setError(exception.message); }
  }

  async function sendMessage(rawText) {
    const content = rawText.trim();
    if (!content || !active || sending) return;
    setInput('');
    setSending(true);
    setError('');
    try {
      const result = await api(`/api/conversations/${active._id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, mood })
      });
      setReplyMode(result.replyMode);
      if (activeId.current === result.conversation._id) setActive(result.conversation);
      setConversations(current => {
        const updated = result.conversation;
        return [updated, ...current.filter(item => item._id !== updated._id)];
      });
    } catch (exception) {
      setInput(content);
      setError(exception.message);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      const result = await api('/api/profile', { method: 'PUT', body: JSON.stringify(draftProfile) });
      setProfile({ ...EMPTY_PROFILE, ...result.profile });
      setDraftProfile({ ...EMPTY_PROFILE, ...result.profile });
      setProfileOpen(false);
    } catch (exception) { setError(exception.message); }
  }

  async function clearProfile() {
    try {
      await api('/api/profile', { method: 'DELETE' });
      setProfile(EMPTY_PROFILE);
      setDraftProfile(EMPTY_PROFILE);
      setProfileOpen(false);
    } catch (exception) { setError(exception.message); }
  }

  function cycleMood() {
    setMood(current => MOODS[(MOODS.indexOf(current) + 1) % MOODS.length]);
  }

  if (loading) return <main className="app-loading"><span className="loading-mark">s</span><p>Opening your little space…</p></main>;

  const messages = active?.messages || [];
  const isFirstGreeting = messages.length <= 1;

  return (
    <main className="app-shell">
      <aside className="side-panel">
        <a className="brand" href="#" onClick={event => event.preventDefault()} aria-label="Sunday home">
          <span className="brand-mark">s</span><span>sunday</span>
        </a>
        <div className="side-label">YOUR SPACE</div>
        <button className="new-chat" type="button" onClick={createConversation}><span>＋</span> New conversation</button>
        <div className="side-label recent-label">RECENT</div>
        <nav className="history-list" aria-label="Recent conversations">
          {conversations.map(conversation => (
            <button key={conversation._id} type="button" className={`history-item ${active?._id === conversation._id ? 'active' : ''}`} onClick={() => openConversation(conversation._id)}>
              <span className="history-dot" />
              <span className="history-title">{shortTitle(conversation)}</span>
            </button>
          ))}
          {!conversations.length && <p className="empty-history">Your chats will show up here.</p>}
        </nav>
        <div className="side-bottom">
          <div className="privacy-card"><span className="lock-icon">⌑</span><div><strong>Your space, your pace</strong><p>Your fictional AI girlfriend. You’re always in control.</p></div></div>
          <button className="profile" type="button" onClick={() => { setDraftProfile(profile); setProfileOpen(true); }}>
            <span className="avatar-mini">{profile.name ? profile.name[0].toUpperCase() : 'Y'}</span>
            <span><strong>{profile.name || 'Your profile'}</strong><small>{profile.name ? 'Your details, saved' : 'Add a little about you'}</small></span>
            <span className="more">···</span>
          </button>
        </div>
      </aside>

      <section className="chat-area">
        <header className="topbar">
          <div className="companion-heading">
            <div className="avatar-wrap"><div className="avatar">S</div><i className="online" /></div>
            <div><h1>Sunday</h1><p><span className="status-dot" /> Your AI girlfriend <span className="separator">·</span> {replyMode === 'openai' ? 'AI replies' : 'here for you'}</p></div>
          </div>
          <button className="menu-button" type="button" aria-label="Conversation options" aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>···</button>
          {menuOpen && <div className="menu-popover">
            <button type="button" onClick={createConversation}>＋ New conversation</button>
            <button type="button" onClick={() => { setDraftProfile(profile); setProfileOpen(true); setMenuOpen(false); }}>✎ Edit your profile</button>
            <button type="button" onClick={cycleMood}>✦ Chat mood: <b>{mood}</b></button>
            <button type="button" className="menu-danger" onClick={deleteCurrentConversation}>⌫ Delete conversation</button>
          </div>}
        </header>

        <div className="notice"><span>✦</span> Sunday is your fictional AI girlfriend: here for sweet chats, care, and company.</div>
        {!aiConfigured && <div className="ai-setup-banner">For more natural, open-ended replies, add your OpenAI key to the server’s <code>.env</code>. Local replies work without it.</div>}
        {aiConfigured && replyMode === 'local' && <div className="ai-setup-banner">The AI service is unavailable right now, so Sunday is using her local replies.</div>}
        {storageMode !== 'mongodb' && <div className="storage-banner">MongoDB isn’t connected. Chats are temporary until you set <code>MONGODB_URI</code>.</div>}
        {error && <div className="error-banner" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss">×</button></div>}

        <div className="conversation" id="conversation" ref={messageList} aria-live="polite">
          {isFirstGreeting && <>
            <div className="day-divider"><span /><small>TODAY</small><span /></div>
            <div className="intro"><div className="intro-sparkle">✳</div><h2>A little love in your day.</h2><p>Come tell me how you’re feeling, love.<br />I’m right here to keep you company.</p></div>
          </>}
          {messages.map((message, index) => {
            const key = `${message.role}-${index}-${message.createdAt || ''}`;
            const saved = savedMessages.has(key);
            return <div className={`message-row ${message.role === 'user' ? 'mine' : 'theirs'}`} key={key}>
              {message.role === 'assistant' && <div className="message-avatar">S</div>}
              <div><div className="bubble">{message.content}</div><time>{stamp(message.createdAt)}</time>
                {message.role === 'assistant' && <div className="message-actions"><button type="button" className={saved ? 'selected' : ''} onClick={() => setSavedMessages(current => { const next = new Set(current); saved ? next.delete(key) : next.add(key); return next; })}>{saved ? '♥ Saved' : '♡ Save'}</button></div>}
              </div>
            </div>;
          })}
          {sending && <div className="message-row theirs"><div className="message-avatar">S</div><div className="bubble typing"><i /><i /><i /></div></div>}
        </div>

        <div className="composer-wrap">
          <div className="suggestions">{contextualSuggestions(messages).map(prompt => <button type="button" key={prompt} disabled={sending} onClick={() => sendMessage(prompt)}>{prompt}</button>)}</div>
          <form className="composer" onSubmit={event => { event.preventDefault(); sendMessage(input); }}>
            <textarea ref={inputRef} rows="1" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(input); } }} placeholder="Message Sunday…" aria-label="Message Sunday" maxLength={4000} />
            <div className="composer-footer"><span><span className="sparkle">✦</span> A little space to be yourself · {mood}</span><button className="send-button" type="submit" aria-label="Send message" disabled={sending || !input.trim()}>↑</button></div>
          </form>
          <p className="disclaimer">Sunday can get things wrong. This chat is for companionship, not professional advice.</p>
        </div>
      </section>

      {profileOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setProfileOpen(false); }}>
        <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profileTitle">
          <button className="modal-close" type="button" onClick={() => setProfileOpen(false)} aria-label="Close">×</button>
          <div className="modal-sparkle">✳</div><h2 id="profileTitle">A little about you</h2>
          <p className="modal-copy">Share only what you’re comfortable with. Sunday uses these details to make this chat feel more personal.</p>
          <form onSubmit={saveProfile}>
            <label htmlFor="profileName">What should Sunday call you?</label>
            <input id="profileName" maxLength="40" value={draftProfile.name} onChange={event => setDraftProfile({ ...draftProfile, name: event.target.value })} placeholder="Your name or nickname" />
            <label htmlFor="profileInterests">What do you enjoy?</label>
            <textarea id="profileInterests" rows="2" maxLength="240" value={draftProfile.interests} onChange={event => setDraftProfile({ ...draftProfile, interests: event.target.value })} placeholder="Music, films, football, baking…" />
            <label htmlFor="profileNotes">Anything else you’d like Sunday to know?</label>
            <textarea id="profileNotes" rows="3" maxLength="400" value={draftProfile.notes} onChange={event => setDraftProfile({ ...draftProfile, notes: event.target.value })} placeholder="Your goals, favorite things, or how you like to be supported…" />
            <div className="privacy-note">⌑ Saved to your configured chat storage. Clear it any time.</div>
            <div className="modal-actions"><button className="clear-profile" type="button" onClick={clearProfile}>Clear details</button><button className="save-profile" type="submit">Save details</button></div>
          </form>
        </section>
      </div>}
    </main>
  );
}

export default App;
