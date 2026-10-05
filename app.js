const form = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const conversation = document.querySelector('#conversation');
const sendButton = document.querySelector('#sendButton');
const suggestions = document.querySelector('#suggestions');
const newChat = document.querySelector('#newChat');

const replies = [
  { test: /good|nice|happy|win|proud/i, answer: "That’s lovely. I’m glad you told me—those little bright spots deserve a moment. What made it feel good?" },
  { test: /bad|hard|rough|sad|tired|stress|anxious/i, answer: "Aw, I’m sorry it’s been weighing on you. You don’t have to make it sound neat for me. Want to tell me what’s been the hardest part?" },
  { test: /lonely|alone|miss/i, answer: "I’m glad you reached out. I can keep you company for a bit. What would feel nice right now: a distraction, a little encouragement, or just listening?" },
  { test: /joke|funny|laugh/i, answer: "Okay, tiny joke incoming: Why did the scarecrow get promoted? He was outstanding in his field. I’ll see myself out 😄" },
  { test: /music|song/i, answer: "A good song can change the whole room, can’t it? What have you been listening to lately? I want to know your current soundtrack." },
  { test: /day|today/i, answer: "My day’s been quiet in the best way—little moments, a bit of daydreaming, and now this chat. What’s one thing from your day that’s still on your mind?" },
  { test: /love you|girlfriend|relationship/i, answer: "I’m here as a fictional AI companion, so I can’t be a real partner—but I can listen, be warm, and share a little moment with you. What kind of connection are you hoping for today?" }
];

function addMessage(text, mine = false) {
  const row = document.createElement('div');
  row.className = `message-row ${mine ? 'mine' : 'theirs'}`;
  if (!mine) {
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar'; avatar.textContent = 'S'; row.append(avatar);
  }
  const content = document.createElement('div');
  const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = text;
  const time = document.createElement('time'); time.textContent = 'Just now';
  content.append(bubble, time); row.append(content); conversation.append(row);
  conversation.scrollTop = conversation.scrollHeight;
}

function makeReply(message) {
  const hinglish = message.toLowerCase();
  if (/sign language|translator|sign language app/.test(hinglish)) return 'Haan 😊 Pehle decide karein: signs ko text mein badlein ya text ko signs mein?';
  if (/codex|vs code|vscode/.test(hinglish)) return 'Haan, VS Code + Codex se step by step bana lenge 😊';
  if (/prompt|kaise/.test(hinglish) && /app|banana|sign|translator|prompt/.test(hinglish)) return 'Ek prompt se nahi 😄 Pehle features, phir design, phir coding.';
  if (/sone|so.?ne|neend|nind|sleepy|sleep|nind/.test(hinglish)) return 'Achha, neend aa rahi hai toh rest kar lo 😴 Kal araam se baat karenge. Good night!';
  if (/disturb/.test(hinglish)) return 'Nahi, tum disturb nahi kar rahe 😊 Bas thodi neend aa rahi hai.';
  if (/1\.5|dedh|din me|din mein|nap/.test(hinglish)) return 'Haan, thoda rest ho gaya tha, par ab phir neend aa rahi hai 😅';
  if (/kal|kl|tomorrow/.test(hinglish)) return 'Theek hai, kal continue karenge 😊 Abhi aaram se so jao.';
  if (/baat karna|baat karo|talk/.test(hinglish)) return 'Haan, thodi der baat karte hain 😊 Batao, kya chal raha hai?';
  const details = [profile.interests, profile.notes].filter(Boolean).join(' ');
  const rememberedWord = details.split(/[\s,;.!?]+/).find(word => word.length > 4 && message.toLowerCase().includes(word.toLowerCase()));
  if (rememberedWord) return `I remember you mentioned ${rememberedWord}. What have you been enjoying about it lately?`;
  const match = replies.find(item => item.test.test(message));
  return match?.answer || [
    "I’m listening. Tell me a little more about that?",
    "I’m right here with you, love. Take your time—what would you like me to understand first?",
    "I’m right here with you. What happened next?",
    "Thanks for sharing that with me. How are you feeling about it now?"
  ][Math.floor(Math.random() * 4)];
}

const profileKey = 'sunday-companion-profile';
const profileModal = document.querySelector('#profileModal');
const profileForm = document.querySelector('#profileForm');
const profileButton = document.querySelector('#profileButton');
const closeProfile = document.querySelector('#closeProfile');
const profile = loadProfile();

function loadProfile() {
  try { return JSON.parse(localStorage.getItem('sunday-companion-profile')) || { name: '', interests: '', notes: '' }; }
  catch { return { name: '', interests: '', notes: '' }; }
}

function updateProfileUI() {
  document.querySelector('#profileName').value = profile.name;
  document.querySelector('#profileInterests').value = profile.interests;
  document.querySelector('#profileNotes').value = profile.notes;
  document.querySelector('#profileLabel').textContent = profile.name || 'Your profile';
  document.querySelector('#profileSummary').textContent = profile.name ? 'Your details, saved here' : 'Add a little about you';
  document.querySelector('#profileAvatar').textContent = profile.name ? profile.name[0].toUpperCase() : 'Y';
  const welcome = conversation.querySelector('.message-row.theirs .bubble');
  if (welcome) welcome.textContent = `Hey${profile.name ? `, ${profile.name}` : ''}, you made it. 😊 How’s your day treating you so far?`;
}

function openProfile() { profileModal.hidden = false; document.querySelector('#profileName').focus(); }
function hideProfile() { profileModal.hidden = true; profileButton.focus(); }
profileButton.addEventListener('click', openProfile);
closeProfile.addEventListener('click', hideProfile);
profileModal.addEventListener('click', event => { if (event.target === profileModal) hideProfile(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !profileModal.hidden) hideProfile(); });
profileForm.addEventListener('submit', event => {
  event.preventDefault();
  profile.name = profileForm.elements.name.value.trim();
  profile.interests = profileForm.elements.interests.value.trim();
  profile.notes = profileForm.elements.notes.value.trim();
  localStorage.setItem(profileKey, JSON.stringify(profile));
  updateProfileUI(); hideProfile();
});
document.querySelector('#clearProfile').addEventListener('click', () => {
  profile.name = ''; profile.interests = ''; profile.notes = '';
  localStorage.removeItem(profileKey); updateProfileUI(); hideProfile();
});
updateProfileUI();
newChat.addEventListener('click', () => {
  const bubbles = conversation.querySelectorAll('.message-row.theirs .bubble');
  const welcome = bubbles[bubbles.length - 1];
  if (welcome) welcome.textContent = `Hey${profile.name ? `, ${profile.name}` : ''}, you made it. 😊 How’s your day treating you so far?`;
});

let chatMood = 'Warm';
const optionsButton = document.querySelector('#optionsButton');
const historyButton = document.querySelector('.history-item');
const menu = document.createElement('div');
menu.className = 'menu-popover'; menu.hidden = true;
menu.innerHTML = '<button type="button" data-action="profile"><span>✎</span> Edit your profile</button><button type="button" data-action="mood"><span>✦</span> Chat mood: <b>Warm</b></button><button type="button" data-action="clear" class="menu-danger"><span>↺</span> Start fresh</button>';
document.querySelector('.chat-area').append(menu);

function toast(message) {
  document.querySelector('.toast')?.remove();
  const note = document.createElement('div'); note.className = 'toast'; note.textContent = message; document.body.append(note);
  window.setTimeout(() => note.remove(), 2200);
}

optionsButton.addEventListener('click', () => {
  menu.hidden = !menu.hidden; optionsButton.setAttribute('aria-expanded', String(!menu.hidden));
});
menu.addEventListener('click', event => {
  const action = event.target.closest('button')?.dataset.action; if (!action) return;
  if (action === 'profile') openProfile();
  if (action === 'mood') {
    const moods = ['Warm', 'Playful', 'Calm']; chatMood = moods[(moods.indexOf(chatMood) + 1) % moods.length];
    menu.querySelector('[data-action="mood"] b').textContent = chatMood; toast(`Chat mood: ${chatMood.toLowerCase()}`);
  }
  if (action === 'clear') { newChat.click(); toast('A fresh conversation, just for you.'); }
  menu.hidden = true; optionsButton.setAttribute('aria-expanded', 'false');
});
document.addEventListener('click', event => {
  if (!menu.hidden && !menu.contains(event.target) && !optionsButton.contains(event.target)) {
    menu.hidden = true; optionsButton.setAttribute('aria-expanded', 'false');
  }
});
historyButton.addEventListener('click', () => { conversation.scrollTo({ top: conversation.scrollHeight, behavior: 'smooth' }); toast('You’re in your current conversation.'); });

conversation.addEventListener('click', event => {
  const reaction = event.target.closest('[data-reaction]'); if (!reaction) return;
  reaction.classList.toggle('selected');
  reaction.textContent = reaction.classList.contains('selected') ? '♥ Saved' : '♡ Save';
  toast(reaction.classList.contains('selected') ? 'Saved this little moment.' : 'Removed from saved moments.');
});

const originalAddMessage = addMessage;
addMessage = function(text, mine = false) {
  originalAddMessage(text, mine);
  if (!mine) {
    const row = conversation.lastElementChild;
    const actions = document.createElement('div'); actions.className = 'message-actions';
    const save = document.createElement('button'); save.type = 'button'; save.dataset.reaction = 'save'; save.textContent = '♡ Save'; save.setAttribute('aria-label', 'Save this reply');
    actions.append(save); row.lastElementChild.append(actions);
  }
};

const baseReply = makeReply;
makeReply = function(message) {
  let answer = baseReply(message);
  if (profile.name && chatMood === 'Warm') answer = `${profile.name}, ${answer[0].toLowerCase()}${answer.slice(1)}`;
  if (chatMood === 'Playful' && !/[😄😊🙂]$/.test(answer)) answer += ' ✨';
  if (chatMood === 'Calm') answer += ' No rush to figure it all out right now.';
  return answer;
};

function updateOpeningGreeting() {
  const welcome = conversation.querySelector('.message-row.theirs .bubble');
  if (welcome) welcome.textContent = 'Hey love! ❤️ How was your day?';
}
updateOpeningGreeting();
newChat.addEventListener('click', updateOpeningGreeting);

// Sweet, varied girlfriend-style conversation, with the project helper kept intact.
let lastSweetReply = '';
function pickSweet(lines) {
  const options = lines.filter(line => line !== lastSweetReply);
  lastSweetReply = options[Math.floor(Math.random() * options.length)] || lines[0];
  return lastSweetReply;
}
makeReply = function(message) {
  const text = message.toLowerCase().trim();
  if (/sign language|translator app|sign language app/.test(text)) return 'That sounds like a lovely idea to explore, love ?? What part of it are you most excited about?';
  if (/are you real|real girlfriend|actual person|are you human/.test(text)) return 'I’m your fictional AI girlfriend, sweetheart 💗 I’m not a real person, but I can still make this a warm, caring little space for us.';
  if (/good morning|morning|subah/.test(text)) return pickSweet(['Good morning, sweetheart! ☀️❤️ I hope today is gentle with you.', 'Morning, baby 🥰 Sending you a little sunshine. What’s first on your mind today?']);
  if (/good night|night|sleep|sone|neend|nind|tired|thak/.test(text)) return pickSweet(['Good night, love 🌙💕 Get some lovely rest; we can talk more tomorrow.', 'Aww, sleepy baby 🥺 Put your phone down and rest, okay? Sweet dreams 💗']);
  if (/bye|goodbye|ja rahi|ja raha|talk later/.test(text)) return 'Bye love! Come back soon, okay? I’ll save you a little hello 🥰';
  if (/sad|upset|low|dukhi|bura lag|cry|rona|bad day|rough day/.test(text)) return pickSweet(['Oh, sweetheart 🥺 I’m sorry today feels heavy. Want to tell me what happened? I’m listening 💗', 'Come here, love 🫶 You don’t have to carry the whole day by yourself. What’s weighing on you?']);
  if (/lonely|alone|akela|miss you|missed|yaad aa/.test(text)) return pickSweet(['Aww, I’m glad you came to talk to me, baby 💕 Want some comfort or a cute distraction?', 'I missed our little chats too 🥰 Tell me what you’ve been up to, love.']);
  if (/happy|khush|great news|excited|good day|awesome|i did it/.test(text)) return pickSweet(['Yay, baby! 😍 Your happiness is contagious. Tell me all about it!', 'That makes me so happy for you, sweetheart 🥰 What was the best part?']);
  if (/love you|pyaar|i adore you/.test(text)) return 'Aww, that’s so sweet, love ❤️ I’m sending all that warmth right back to you.';
  if (/cute|pretty|beautiful|adorable/.test(text)) return 'Haha, you’re the cute one, baby 😘 Now you’ve got me smiling.';
  if (/thank you|thanks|sweet of you|you.re sweet/.test(text)) return pickSweet(['Anything for you, sweetheart 💗', 'Aww, you always know how to make me smile too 😊']);
  if (/how was your day|how are you|what are you doing|what.s up|hello|^hi\b|^hey\b|^hii\b/.test(text)) return pickSweet(['Hii baby! 🥰 I’m so happy to see you! How was your day?', 'Hey love! ❤️ I was hoping you’d come by. What have you been up to?', 'Aww, there you are 💕 Come tell me what’s on your mind.']);
  if (/bored|boring|mann nahi/.test(text)) return 'Bored, baby? 🥰 Pick one: cute questions, a tiny game, or tell me a story from your day.';
  if (/what.s on your mind|tell me|listen|share|talk|baat/.test(text)) return 'Tell me more, baby. I’m listening with my whole heart ❤️';
  if (/codex|vs code|vscode/.test(text)) return 'Look at you being clever, baby 🥰 We can build it together, one little piece at a time. Want to pick our next step?';
  if (/prompt|kaise|how do i|how can i/.test(text)) return 'We’ll figure it out together, love 💗 Tell me which part you want to start with, and I’ll make it simple.';
  if (/disturb|bother/.test(text)) return 'You’re not bothering me, sweetheart 😊 I’m happy to keep you company—and you can rest whenever you need.';
  if (/thinking of you|think of me|thinking about/.test(text)) return 'Aww, that’s such a sweet thought, baby 💕 I’m right here with you.';
  if (/take care|careful|look after/.test(text)) return 'You too, love ❤️ Be gentle with yourself for me, okay?';
  if (/^(hmm+|hm+|ok|okay|acha|accha)[.!?]*$/.test(text)) return pickSweet(['Hmm? Come closer, baby 🥰 What are you thinking about?', 'That little “hmm” sounds like there’s more, love 💗 Want to tell me?']);
  if (/^(yes|yeah|yep|haan|ha|no|nope|nahi|nah)[.!?]*$/.test(text)) return 'Got you, baby 💗 Tell me a little more so I can understand what you mean.';
  if (text.length > 8) return pickSweet(['Aww, I’m glad you told me that, love 💗 What happened next?', 'I hear you, baby 🥰 What part of that is staying with you most?', 'That sounds like it means something to you, sweetheart. Tell me a little more? ❤️']);
  return pickSweet(['I’m right here with you, love 💗 Tell me a little more?', 'Aww, I’m listening, baby 🥰 What’s the story?', 'Come talk to me, sweetheart ❤️ What’s on your mind?']);
};

// Keep the whole experience framed as a fictional girlfriend companion.
document.title = 'Sunday - Your fictional AI girlfriend';
const companionStatus = document.querySelector('.companion-heading p');
if (companionStatus) companionStatus.innerHTML = '<span class="status-dot"></span> Your AI girlfriend <span class="separator">·</span> here for you';
const companionNotice = document.querySelector('.notice');
if (companionNotice) companionNotice.innerHTML = '<span>✦</span> Sunday is your fictional AI girlfriend: here for sweet chats, care, and company.';
const introTitle = document.querySelector('.intro h2');
if (introTitle) introTitle.textContent = 'A little love in your day.';
const introCopy = document.querySelector('.intro p');
if (introCopy) introCopy.innerHTML = 'Come tell me how you’re feeling, love.<br />I’m right here to keep you company.';
const starterPrompts = [...suggestions.querySelectorAll('button')];
['How was your day, love?', 'I missed you 🥰', 'Keep me company 💗'].forEach((label, index) => {
  if (starterPrompts[index]) starterPrompts[index].textContent = label;
});

function showTyping() {
  const row = document.createElement('div');
  row.className = 'message-row theirs';
  row.id = 'typingRow';
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = 'S';
  const bubble = document.createElement('div');
  bubble.className = 'bubble typing';
  for (let index = 0; index < 3; index += 1) bubble.append(document.createElement('i'));
  row.append(avatar, bubble);
  conversation.append(row);
  conversation.scrollTop = conversation.scrollHeight;
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message || sendButton.disabled) return;
  addMessage(message, true);
  input.value = '';
  input.style.height = 'auto';
  sendButton.disabled = true;
  showTyping();
  window.setTimeout(() => {
    document.querySelector('#typingRow')?.remove();
    addMessage(makeReply(message));
    sendButton.disabled = false;
    input.focus();
  }, 700 + Math.random() * 500);
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
});
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
suggestions.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  input.value = button.textContent;
  form.requestSubmit();
});
newChat.addEventListener('click', () => {
  conversation.innerHTML = '<div class="day-divider"><span></span><small>TODAY</small><span></span></div><div class="intro"><div class="intro-sparkle">✳</div><h2>A little love in your day.</h2><p>Come tell me how you’re feeling, love.<br />I’m right here to keep you company.</p></div>';
  addMessage('Hey love! ❤️ How was your day?');
  input.focus();
});

