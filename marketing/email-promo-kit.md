# The Vantage — Email Promo Kit

The mass-send promo: what it says, the exact copy, and the Claude design prompt
that produces the branded HTML email (you drop in the photos).

---

## 1. The one promo to send (strategy in 30 seconds)

One email, one job: **show the transformation, hand them the free trial.**
Photos in → cinematic reel out, 60 free credits, no card. Everything else
(Claude connector, staging, pricing) is a footnote link, not the pitch — a
promo email with two ideas converts worse than one with one.

- **Audience:** agents / photographers / hosts from your Google-Business
  qualified list.
- **Goal click:** thevantage.media (free signup). Secondary: /examples.
- **From:** levi@thevantage.media works; for volume, send from a lookalike
  domain (e.g. hello@try-thevantage.com) so the main domain's reputation is
  never at risk. Name stays "Levi at The Vantage".
- **Compliance (non-negotiable for mass send):** a real mailing address in the
  footer + a working unsubscribe line. Both are in the design prompt below.

## 2. Subject lines (A/B/C — rotate, keep the winner)

- A: `Your listing photos are already a video`
- B: `8 photos in. One cinematic reel out.`
- C: `[First name], your next listing deserves better than stills`

Preheader (the gray preview text): `Turn listing photos into a cinematic reel
in ~3 minutes — first one's free, no card.`

## 3. The email copy (final, drop into the design)

**EYEBROW:** THE VANTAGE · CINEMATIC LISTING FILMS

**HEADLINE:** Your photos in. *A masterpiece out.*

**INTRO (2 lines):** You already have the listing photos. The Vantage turns
them into a cinematic reel — captioned, MLS-safe, ready for Instagram and
TikTok — in about three minutes. No editor, no shoot day.

**[PHOTO SLOT 1 — the proof strip: 4–6 listing photos → the reel frame]**

**SECTION LABEL:** THE INPUT → THE OUTPUT

**BODY (short):** Below is a real project — a handful of ordinary listing
photos, and the film that came out. Every listing you carry can look like
this, the night you sign it.

**[PHOTO SLOT 2 — one big still from a finished reel (house3 frame or the
Atwood reel), with a ▶ play badge, linked to /examples]**

**THE OFFER (boxed):** **60 free credits — about one full reel. No card.**
Upload your photos, pick a style, post it tonight.

**CTA BUTTON:** MAKE MY FIRST REEL FREE →  (link: https://thevantage.media)

**SECONDARY LINK:** or see what others made → thevantage.media/examples

**PS LINE:** P.S. — The Vantage now works inside Claude: paste a Zillow link
in a chat, get a reel back. First agentic listing tool. ⚡
thevantage.media/connect

**FOOTER (required):** The Vantage Media · [your mailing address] · You're
receiving this because your business is publicly listed. Reply "unsubscribe"
and we'll never email you again.

---

## 4. The Claude design prompt (paste this, then add your photos)

Copy everything in the block below into Claude and ask it to build the email.
Where you see `[PHOTO: …]`, replace with your image URLs after you upload them
(or ask Claude to leave those `<img>` src slots empty for you to fill).

```
Design a single-column promotional HTML email for The Vantage, a luxury AI
real-estate video studio. It must be email-client-safe: table-based layout,
inline CSS only, max width 600px, no external CSS, no JavaScript, no web
fonts — use Georgia (serif) for display headlines and Arial/Helvetica for
body text. All images need explicit width attributes and alt text. Must look
correct in Outlook, Gmail, and Apple Mail, on mobile and desktop.

BRAND (match exactly):
- Background: warm bone #F4EFE6. Card/panel: cream #EDE6D8.
- Ink (text): #1A1714. Accent rust: #8C3F2E. Champagne gold: #D9B37E.
- Hairline borders: #D9CFC2, 1px.
- Style: quiet luxury, editorial-magazine. Generous whitespace, thin rules,
  small uppercase letter-spaced labels (11px, letter-spacing 2px, rust or
  champagne), big serif headlines with an italic accent word. No rounded
  bubbly buttons — rectangular, sharp, rust background with bone text.
- Tone: confident, minimal. Never salesy-shouty, no exclamation marks.

STRUCTURE, top to bottom:
1. Slim top bar, ink #1A1714 background: tiny centered text in champagne,
   "THE VANTAGE · CINEMATIC LISTING FILMS · EST. 2026".
2. Hero block on bone: small rust eyebrow label "YOUR LISTING, IN MOTION",
   then a Georgia serif headline ~34px: "Your photos in." on line one and
   an italic line two in rust: "A masterpiece out." Below it, 15px Arial
   body, #1A1714, max 2 sentences: "You already have the listing photos.
   The Vantage turns them into a cinematic reel — captioned, MLS-safe,
   ready for Instagram and TikTok — in about three minutes."
3. Proof strip: a row of 4 small square listing photos side by side
   [PHOTO SLOTS: input-1.jpg … input-4.jpg, 130px each], then a centered
   rust arrow "↓ RENDERED INTO", then ONE large 560px-wide image
   [PHOTO SLOT: reel-frame.jpg] with a small centered ▶ play badge overlaid
   or below it, the whole image linked to https://thevantage.media/examples.
   Under it a tiny champagne caption: "REAL PROJECT · 6 PHOTOS IN, ONE FILM
   OUT · RENDERED IN 3 MINUTES".
4. Offer panel: cream #EDE6D8 box with 1px #D9CFC2 border, centered. Line 1
   small rust label "THE INVITATION". Line 2 Georgia 22px: "60 free credits —
   about one full reel." Line 3 Arial 14px: "No card. Upload your photos,
   pick a style, post it tonight." Then the button: rectangular, background
   #8C3F2E, text #F4EFE6, 14px bold Arial, letter-spacing 1px, padding
   16px 36px: "MAKE MY FIRST REEL FREE →" linking to https://thevantage.media
   (bulletproof VML button for Outlook).
5. Thin hairline rule, then a single centered 13px line: "P.S. The Vantage
   now works inside Claude — paste a Zillow link in a chat, get a reel back."
   with "See how →" linking to https://thevantage.media/connect in rust.
6. Footer on bone, 11px Arial #6E655C, centered: "The Vantage Media ·
   [MAILING ADDRESS]" on one line, and on the next: "You're receiving this
   because your business is publicly listed. Reply 'unsubscribe' and we'll
   never email you again." Keep both — they're legally required.

Leave clearly-marked <img> placeholders where photos go. Output ONLY the
complete HTML file.
```

## 5. How to use it

1. Paste the prompt into Claude → get the HTML file.
2. Upload 5 photos somewhere public (your site's /projects folder works —
   they're already live URLs) and swap them into the img slots. Best set:
   4 refs from 123 E Atwood or house3 + one reel frame.
3. Put your mailing address in the footer.
4. Send a test to yourself in Outlook + Gmail + phone before any batch.
5. Batch small: 25–40/day per inbox, personalize the first line when you can.
   Your signature block pastes below the footer as usual.
```
