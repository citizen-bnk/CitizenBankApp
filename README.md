# Citizen Bank — Mobile App

An installable **PWA** built from the *Citizen AI — Immersive Banking* prototype: the animated orb assistant, voice
and typed requests, Accounts, Payments, Cards and More. It's wired to live data from
[Citizen Bank Core](https://github.com/citizen-bnk/CitizenBankCore).

- Balances, activity, beneficiaries, cards, scheduled payments and loans all come from Core.
- Payments run as step-by-step flows (send money, bills, airtime, cross-border, own-account transfers, card limits,
  beneficiaries, card orders, scheduling, scan-to-pay QR). Each one ends with an explicit **Confirm** step.
- **Citizen AI** (Claude, via Core) answers questions and pre-fills flows from requests like "send Thabo M200". Voice
  input uses the browser's speech recognition. Voice replies use ElevenLabs through Core, or fall back to the
  browser speech synthesis. Captions advance when playback ends, the orb reacts to ElevenLabs audio,
  and interrupting a reply stops its audio and remaining captions.
- Money is in **maloti (M / LSL)**. Outside Lesotho, the balance card also shows an indicative local-currency amount.
- Session timeout after 5 minutes of inactivity. Service worker caches the app shell only, never banking data.

## Deploy on Vercel

1. Deploy **CitizenBankCore** first and note its URL.
2. Import this repo in Vercel and add the environment variable `CORE_API_URL=https://<your-core>.vercel.app`
   (no trailing slash). Optionally set `NEXT_PUBLIC_SHOW_DEMO_LOGIN=false` to hide the demo hint.
3. Deploy, then add this app's URL to Core's `ALLOWED_ORIGINS`.

`CORE_API_URL` is read at build time, so redeploy after changing it.

On a phone, open the URL and choose **Add to Home Screen** to install it.

## Local development

On Windows PowerShell, run against the existing demo backend:

```powershell
npm ci
$env:CORE_API_URL = 'https://citizenbankcore.vercel.app'
npm run dev
```

`npm test`, `npm run typecheck`, and `npm run build` verify changes. GitHub Actions runs these checks
on pushes and pull requests. The existing Vercel Git integration publishes branch previews and deploys `main`.
Full conversational replies require a working `ANTHROPIC_API_KEY` on Core. ElevenLabs speech requires
`ELEVENLABS_API_KEY` and at least `ELEVENLABS_VOICE_EN`; otherwise the browser voice is used.

```bash
npm install
CORE_API_URL=http://localhost:4000 npm run dev   # with Core running on :4000
```

## Structure

| Path | What it is |
|---|---|
| `app/page.tsx` + `app/shell-html.ts` | The app shell (prototype markup) |
| `public/mobile/app.js` | Client runtime: animations/voice (prototype) + data layer, flows, assistant |
| `public/mobile/app.css` | Prototype styles + app additions |
| `app/login`, `app/register` | Sign-in and account opening |
| `app/statements/[accountId]` | Printable statement / CSV download |
| `public/sw.js`, `public/manifest.webmanifest` | PWA |

> Pre-licensing demonstration by Citizen Digital Ltd (Reg. 99073). Not a licensed bank.
