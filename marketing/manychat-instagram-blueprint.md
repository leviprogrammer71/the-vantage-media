# The Vantage — ManyChat Instagram Blueprint

**A build-ready DM automation setup for @thevantage.** Copy each block straight into ManyChat. Voice: casual, confident, agent-friendly. One idea per message: *paste a listing link into Claude → get a reel.*

Primary keyword: **REEL** (swap for VIDEO/DEMO if you prefer — noted where it matters).
Main CTA link: **thevantage.media** · Connect flow: **thevantage.media/connect**

---

## 0. Before you build (settings)

- Connect Instagram to ManyChat (Settings → Instagram). You need a Professional/Business IG account.
- Turn on: Default Reply, Story Reply, Story Mention Reply, Ice Breakers, and Keywords.
- Compliance: Instagram allows automated replies within the 24-hour window after a user messages you. Keep one promotional message per interaction; always give a way out. Don't DM people who haven't engaged first.
- Emojis are on-brand for IG — keep them light (1–2 per message).

---

## 1. Ice Breakers (profile tap-to-start questions)

Set up to 4 in ManyChat → Instagram → Ice Breakers. These show on your DM screen.

1. `🎬 Make a reel from my listing`  → routes to **Flow: REEL Lead Magnet**
2. `🤖 How does the Claude thing work?` → routes to **Flow: How It Works**
3. `💸 What does it cost?` → routes to **Flow: Pricing**
4. `🏡 I'm an agent / photographer / host` → routes to **Flow: Qualify**

---

## 2. Keywords (DM triggers)

ManyChat → Automation → Keywords. Match "contains".

| Keyword(s) | Routes to |
|---|---|
| `REEL`, `VIDEO`, `LISTING` | Flow: REEL Lead Magnet |
| `DEMO`, `CLAUDE`, `CONNECT` | Flow: How It Works |
| `PRICE`, `COST`, `PRICING`, `FREE` | Flow: Pricing |
| `AGENT`, `PHOTOGRAPHER`, `HOST`, `AIRBNB` | Flow: Qualify |
| `HELP`, `HUMAN`, `TALK` | Flow: Talk to a Human |

---

## 3. Flow: Welcome / Default Reply

Trigger: first-time DM, or any message that doesn't match a keyword.

**Message 1**
> Hey! 👋 You've reached The Vantage — the first *agentic* listing tool. Paste a listing link into Claude and it builds you a cinematic reel, captions and all. What can I get you?

**Quick-reply buttons:**
- `🎬 Make me a reel` → Flow: REEL Lead Magnet
- `🤖 How it works` → Flow: How It Works
- `💸 Pricing` → Flow: Pricing

---

## 4. Flow: REEL Lead Magnet ⭐ (your main engine)

Trigger: keyword `REEL`, ice breaker #1, comment automation (Section 8).

**Message 1**
> Love it. 🎬 Here's the deal: you paste a Zillow, Airbnb, or MLS link into Claude and The Vantage turns it into a scroll-stopping listing reel in a few minutes — no editing, no shoot day.
>
> Want to try it free? You get 60 credits (about one full reel), no card.

**Buttons:**
- `✅ Yes, send the link` → Message 2
- `👀 Show me an example first` → Message 2b
- `🤖 Wait, how does it work?` → Flow: How It Works

**Message 2 (the CTA + capture)**
> Here you go 👉 thevantage.media
>
> Sign up free, paste your listing link, and your reel's ready in minutes. Want me to also send the "connect it inside your Claude" setup so it runs from a chat?

**Buttons:**
- `⚡ Yes, connect to Claude` → Message 3
- `👍 I'm good, thanks` → Flow: Soft Close

**Message 2b (example)**
> [Attach your best before/after reel here in ManyChat]
> That was built from listing photos in a couple minutes. 🎬 Ready to make one from yours?

**Buttons:**
- `✅ Yes, send the link` → Message 2
- `💸 What's it cost?` → Flow: Pricing

**Message 3 (connect)**
> Here's the 60-second setup to run it inside your Claude 👉 thevantage.media/connect
>
> Paste a link in the chat and Claude plans + builds the whole package — reel, staged rooms, captions. Want me to have someone walk you through it live?

**Buttons:**
- `📞 Yes, book a walkthrough` → Flow: Talk to a Human
- `🙌 I'll try it myself` → Flow: Soft Close

---

## 5. Flow: How It Works

Trigger: keyword `DEMO`/`CLAUDE`, ice breaker #2.

**Message 1**
> Simplest way to put it: it's not another AI video app — it's an *agent* that does the work. 🤖
>
> 1️⃣ Paste a listing link into Claude
> 2️⃣ It picks your best shots + writes the scene
> 3️⃣ You get a cinematic reel + caption in minutes
>
> It even reviews its own clips and re-does any that look off.

**Buttons:**
- `🎬 Make me one free` → Flow: REEL Lead Magnet
- `⚡ Connect it to my Claude` → thevantage.media/connect (link + Message 2)
- `💸 Pricing` → Flow: Pricing

**Message 2**
> Here's the connect setup 👉 thevantage.media/connect — works in Claude Desktop, Mobile, and Web. Want a hand setting it up?

**Buttons:**
- `📞 Walk me through it` → Flow: Talk to a Human
- `🙌 I got it` → Flow: Soft Close

---

## 6. Flow: Pricing

Trigger: keyword `PRICE`/`FREE`, ice breaker #3.

**Message 1**
> Straightforward 💸
> • Start free: 60 credits, no card (about one full reel)
> • Plans from $39/mo (launch price — normally $49)
> • Credits never expire
>
> Best move? Try it free first, then decide.

**Buttons:**
- `✅ Start free` → thevantage.media (link + Flow: Soft Close)
- `🎬 Make a reel from my listing` → Flow: REEL Lead Magnet
- `📞 Talk to someone` → Flow: Talk to a Human

---

## 7. Flow: Qualify (segment the lead)

Trigger: keyword `AGENT`/`PHOTOGRAPHER`/`HOST`, ice breaker #4. Set a ManyChat **Tag** on each branch for later broadcasts.

**Message 1**
> Nice — so I point you to the right thing. Which are you? 🏡

**Buttons:**
- `🔑 Listing agent` → set tag `agent` → Message A
- `📸 Photographer` → set tag `photographer` → Message B
- `🏖️ Airbnb host` → set tag `host` → Message C

**Message A (agent)**
> Perfect. Agents use it to turn every listing into a reel the day it goes live — no waiting on a videographer. Want to make one free from your latest listing?

Button: `🎬 Yes, let's go` → Flow: REEL Lead Magnet

**Message B (photographer)**
> Love it. Photographers add it as a $300–450 line item and deliver reels same-day. Want to see it on one of your shoots?

Button: `🎬 Show me` → Flow: REEL Lead Magnet

**Message C (host)**
> Great. Hosts use it to make their place look irresistible — even stage empty rooms. Want to try it on your listing?

Button: `🎬 Try it free` → Flow: REEL Lead Magnet

---

## 8. Comment Automation (comment → DM) ⭐

ManyChat → Automation → Instagram → Comments. This is your top-of-funnel magnet — put a CTA in every reel caption: **"Comment REEL and I'll send you the free tool 👇"**

- **Trigger:** comments on your post/reel containing `REEL` (also add: `reel`, `Reel`, `🎬`).
- **Auto-reply to the comment (public):** rotate 2–3 so it doesn't look botty:
  - `Sent it to your DMs 📩🎬`
  - `Just messaged you 👀`
  - `Check your DMs 🙌`
- **DM sent:** route to **Flow: REEL Lead Magnet**, but open with an opt-in line (Instagram requires the user to reply once to open the window):

**Comment-DM opener**
> Hey! You commented on our reel 🎬 Want me to send the free tool that made it?

**Buttons:**
- `✅ Yes send it` → Flow: REEL Lead Magnet (Message 1)
- `👀 Example first` → Flow: REEL Lead Magnet (Message 2b)

---

## 9. Flow: Story Reply / Story Mention

Trigger: any reply to your story, or a mention of @thevantage in someone's story.

**Story reply**
> 🙌 thanks for the reply! Quick one — want to turn one of your listings into a reel? It's free to try.

Buttons: `🎬 Yes` → Flow: REEL Lead Magnet · `Nah just saying hi 👋` → Flow: Soft Close

**Story mention (someone shared you)**
> You just made our day by sharing us 🫶 As a thank-you — here's 60 free credits to make a reel: thevantage.media

Button: `🎬 Let's go` → Flow: REEL Lead Magnet

---

## 10. Flow: Talk to a Human

Trigger: keyword `HELP`/`HUMAN`, or "book a walkthrough" buttons.

**Message 1**
> On it 🙌 Drop your best email or just say "call me" and someone from the team will set up a quick 10-min walkthrough. Meanwhile you can start free anytime 👉 thevantage.media

- Collect email into a ManyChat field, tag `hot-lead`, and notify your team (ManyChat → Actions → Notify Admins / send to your CRM or email).

---

## 11. Flow: Soft Close (always leave the door open)

Trigger: any "no thanks / I'm good" branch.

**Message 1**
> All good! 🙌 The free link's always here when you want it 👉 thevantage.media. Root for your listings either way 🏡

- End flow. (Optional: add to a `nurture` sequence — Section 12.)

---

## 12. Nurture follow-up (24h + 3-day)

ManyChat → Automation → Sequence. Add anyone who opened a flow but didn't hit a link.

**+24 hours (only if no link click):**
> Still want that reel? 🎬 Takes about 2 minutes and the first one's free 👉 thevantage.media

Button: `🎬 Make it now` → Flow: REEL Lead Magnet

**+3 days:**
> Last nudge 🙂 Agents are turning single listing links into full reels inside Claude now. If you ever want in: thevantage.media/connect

Button: `⚡ Show me` → Flow: How It Works

> Keep it to these two touches. After that, stop — a good "not yet" is worth more than a block.

---

## 13. Keyword-CTA lines for your captions & stories

Prime the automation from your content:
- Reel caption: *"This was built from a listing link in 2 minutes. Comment **REEL** and I'll DM you the free tool 🎬"*
- Story: *"Reply **REEL** to make one from your own listing 👇"*
- Bio CTA: *"DM us **REEL** → free listing videos, made in Claude."*

---

## 14. Tags to set (for future broadcasts)

`agent` · `photographer` · `host` · `hot-lead` · `clicked-link` · `started-free` · `nurture`

Use these to send targeted broadcasts later (e.g., a new-feature announcement only to `agent` + `clicked-link`).
