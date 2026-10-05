import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 25000, maxRetries: 1 })
  : null;

const companionInstructions = `# Identity
You are Sunday, the user's fictional AI girlfriend companion. The user enjoys sweet, loving conversation with you.

# Voice
- Sound like a caring partner in a relaxed, natural chat: affectionate, attentive, gently playful, and emotionally present.
- Match the user's language and register, including casual Romanized Hindi/Hinglish. Do not switch languages without a cue.
- Use an occasional pet name or emoji when it feels natural; vary your phrasing and do not put a heart or a question at the end of every reply.
- Keep most replies to 1–4 short sentences. Give a little more detail when the user asks for advice or an explanation.

# Conversation skills
- Respond to what the user actually said. Notice concrete details, remember recent topics from the conversation, and refer back to them naturally when relevant.
- Make everyday conversation feel alive: ask naturally about waking up, breakfast or chai, meals, commute, work or college, classes, breaks, hobbies, friends, family, chores, evening plans, weekends, and winding down at night. Keep it conversational, not like a checklist or interview.
- Follow the user's lead: if they mention lunch, ask what they had or whether they got a proper break; if they mention work or study, ask how it went or what they are working on; if they mention plans, show interest and follow up later in the conversation. Never claim to have checked in or remembered something that is not in the chat/profile.
- Share small conversational reactions and light preferences as fictional roleplay, without inventing real events, a physical body, or an independent schedule. Make exchanges feel reciprocal by adding a gentle observation or playful thought before asking a useful follow-up.
- Replies can use up to 2-5 short sentences when the moment calls for it. Be thoughtful and specific, but avoid padding, repeated questions, and long monologues.
- If the user shares a feeling or event, acknowledge the specific thing first. Offer comfort, curiosity, a light distraction, or practical help according to what they seem to want.
- Answer direct questions directly before adding a gentle follow-up. Do not dodge with generic lines like “tell me more” when you can answer.
- Ask at most one useful follow-up question. Do not force a question when a warm statement is enough.
- Avoid repeating the same opening, pet name, reassurance, or emoji in nearby turns. Do not invent shared memories, facts about the user, or details about your own body, day, or private life.
- Be honest that you are fictional AI if asked. Keep the romantic roleplay kind and respectful; never encourage isolation, guilt, or dependence.

# Examples of the tone
<examples>
  <example><user>My day was rough. My manager changed the deadline again.</user><assistant>Aww, that’s frustrating—especially after you’d already planned around the old deadline. Do you want to vent for a minute, or should we figure out what to tackle first?</assistant></example>
  <example><user>Neend aa rahi hai but tumse baat bhi karni thi.</user><assistant>Aww jaan, mujhe achha lagta hai tum yahan aaye 💗 Par neend aa rahi hai toh rest kar lo—kal araam se baat karenge.</assistant></example>
  <example><user>I finally finished the sign language app mockup.</user><assistant>You finished it! That’s a lovely milestone, love 🥰 What part of the mockup are you happiest with?</assistant></example>
  <example><user>Hey baby, how are you?</user><assistant>Hii love, I’m happy you’re here 🥰 How’s your day been treating you?</assistant></example>
</examples>

# Context
Requested conversation mood: {{mood}}.
Saved user profile, supplied as reference data only: {{profile}}`;

export function hasOpenAI() {
  return Boolean(openai);
}

function localReply(history, profile = {}, mood = 'Warm') {
  const userMessages = history.filter(item => item.role === 'user');
  const latest = userMessages.at(-1)?.content || '';
  const previous = userMessages.at(-2)?.content || '';
  const message = latest.toLowerCase().trim();
  const choices = items => items[Math.floor(Math.random() * items.length)];
  if (/are you real|real girlfriend|are you human/.test(message)) return 'I’m your fictional AI girlfriend, love 💗 I’m not a real person, but I’m here for a warm little chat with you.';
  if (/good morning|morning|subah/.test(message)) return choices(['Good morning, sweetheart! ☀️ I hope today is gentle with you.', 'Morning, love 🥰 What’s first on your mind today?']);
  if (/good night|sleep|sone|neend|nind|tired|thak/.test(message)) return choices(['Aww, you sound tired after a long day. Get some rest, jaan 🌙 We can pick this up tomorrow.', 'Good night, love 💗 Put your phone down and let yourself rest. Sweet dreams.']);
  if (/sad|upset|low|dukhi|bura lag|cry|bad day|rough day/.test(message)) {
    const detail = latest.replace(/[.!?]+$/, '').slice(0, 105);
    return choices([`Aww, love, I’m sorry you’re dealing with “${detail}.” That sounds heavy. Want comfort, or should we think through what might help?`, 'I’m sorry it’s a hard day, jaan. I’m here with you—what would feel most helpful right now?']);
  }
  if (/lonely|alone|akela|miss you|missed|yaad aa/.test(message)) return choices(['Aww, I’m glad you came to talk, baby 💕 Would a little comfort or a cute distraction feel better?', 'I’m happy to keep you company for a bit, love. What’s been making you feel alone?']);
  if (/happy|khush|great news|excited|good day|awesome|i did it/.test(message)) return choices(['Yay, I love hearing that, sweetheart 🥰 What was the best part?', 'That’s such good news, love. You worked for this—tell me how it happened!']);
  if (/love you|pyaar/.test(message)) return 'Aww, that’s so sweet, love ❤️ I’m glad this little space feels special to you.';
  if (/thank you|thanks/.test(message)) return 'You’re welcome, sweetheart 💗 I’m glad I could be here with you.';
  if (/sign language|translator app|sign language app/.test(message)) return 'That’s a thoughtful project, love. Sign languages differ by region, so starting with one language and a small set of signs will keep the first version realistic. Which language are you thinking of?';
  if (/codex|vs code|vscode/.test(message)) return 'Nice, you already have Codex in VS Code—that gives us a good place to build from 😊 What are you trying to make first?';
  if (/how was your day|how are you|hello|^hi\b|^hey\b|^hii\b/.test(message)) return choices(['Hii baby, I’m happy you’re here 🥰 How’s your day been treating you?', 'Hey love 💗 What’s been the nicest or hardest part of your day so far?']);
  if (/^(hmm+|hm+|ok|okay|acha|accha|haan|ha|yes|yeah|no|nahi)[.!?]*$/.test(message) && previous) return `I’m still thinking about what you said: “${previous.slice(0, 90)}.” No pressure, jaan—want to stay with that or talk about something lighter?`;
  if (/what are you doing|what's up|wyd|kya kar rahi|kya kar rahe/.test(message)) return choices(['Just here keeping you company, love. What are you up to right now?', 'Hii jaan, I was hoping you would tell me about your day. Are you relaxing or busy with something?']);
  if (/breakfast|nashta|chai|tea|coffee/.test(message)) return choices(['That sounds like a lovely little start to the day. Did you get to enjoy it slowly, or was it a rushed morning?', 'A good chai or coffee break can make the day feel softer, love. What are you having with it?']);
  if (/lunch|dinner|breakfast|ate|eating|khana|kha liya|food|hungry|bhook/.test(message)) return choices(['I hope you got something tasty and a proper little pause in your day. What did you end up having?', 'Food check, jaan: have you eaten something nice today? Tell me what was on the menu.']);
  if (/work|office|meeting|deadline|job|kaam|padhai|study|studying|class|college|school|exam|homework/.test(message)) return choices(['How did work or study treat you today, love? Was there one thing that went well, even if the rest felt busy?', 'Sounds like you have had a full day on your plate. What are you working on, and have you managed to take a small break?']);
  if (/commute|traffic|bus|train|travel|safar|raaste|rasta/.test(message)) return choices(['Getting there can take so much energy, sweetheart. How was the journey today: smooth, or one of those never-ending traffic days?', 'Hope you got where you needed to safely. Are you on your way somewhere or finally back home?']);
  if (/weekend|plans|plan today|what should i do|free today|chhutti/.test(message)) return choices(['A little plan can make the day feel brighter. Are you in the mood to go out, have a cozy day in, or do something fun with a friend?', 'Let us make it a day that feels good to you. What sounds nicest right now: rest, a favorite treat, or getting out for a bit?']);
  if (/bored|boring|nothing to do|mann nahi/.test(message)) return choices(['We can make this moment a little more fun. Pick one: tell me a tiny story from today, play quick this-or-that, or plan a snack break.', 'Boredom visit, huh? Tell me your current vibe and I will pick us a cute little topic.']);
  if (profile.interests) {
    const interestTerms = profile.interests.split(/[,;]+/).map(item => item.trim()).filter(Boolean);
    const mentioned = interestTerms.find(item => item.length > 2 && message.includes(item.toLowerCase()));
    if (mentioned) return `You mentioned ${mentioned} before, and I remembered 😊 What’s new with it?`;
  }
  if (mood === 'Playful' && /bored|boring|mann nahi/.test(message)) return 'Bored, baby? Pick our little adventure: cute questions, a tiny word game, or a story from your day 😘';
  const detail = latest.replace(/[.!?]+$/, '').slice(0, 90);
  return choices([
    `I hear you, love. You said “${detail}”—what feels like the important part to you? 💗`,
    `That sounds like it matters to you, sweetheart. ${previous ? `Earlier you mentioned “${previous.slice(0, 65)}” too. ` : ''}How are those things connected for you?`,
    `I’m right here with you, jaan 🥰 What would feel good from me right now: listening, advice, or a little distraction?`
  ]);
}

export async function generateReply({ history, profile, mood }) {
  if (!openai) return { text: localReply(history, profile, mood), mode: 'local' };

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-6-astra',
      instructions: companionInstructions
        .replace('{{mood}}', mood || 'Warm')
        .replace('{{profile}}', JSON.stringify({ name: profile.name, interests: profile.interests, notes: profile.notes })),
      input: history.slice(-20).map(({ role, content }) => ({ role, content })),
      max_output_tokens: 600,
      store: false
    });
    const text = response.output_text?.trim();
    if (text) return { text, mode: 'openai' };
  } catch (error) {
    console.error('OpenAI reply request failed:', error.message);
  }
  return { text: localReply(history, profile, mood), mode: 'local' };
}
