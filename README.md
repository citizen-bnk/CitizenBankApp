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

## Where this fits in the Citizen Bank ecosystem

Citizen Bank is four hosts backed by six repositories, all deployed on Vercel. A person signs in once on the website; the website hands them to banking with a one-time signed token, so the banking apps never see the website's session. The full map is in [`docs/ECOSYSTEM.md`](https://github.com/citizen-bnk/CitizenBankWebsite/blob/claude/practical-volta-tqe0qk/docs/ECOSYSTEM.md) in the website repository.

| Host | Role | Repository |
|---|---|---|
| `citizenbank.co.ls` | Website, and for now the Citizen Hub for investors, board and back office | [CitizenBankWebsite](https://github.com/citizen-bnk/CitizenBankWebsite) |
| `hub.citizenbank.co.ls` | Citizen Hub frontend (to be split from the website) | [citizen-hub](https://github.com/citizen-bnk/citizen-hub) |
| `banking.citizenbank.co.ls` | Internet banking, desktop | [CitizenInternetBanking](https://github.com/citizen-bnk/CitizenInternetBanking) |
| `app.citizenbank.co.ls` | Mobile banking app (PWA) | [CitizenBankApp](https://github.com/citizen-bnk/CitizenBankApp) **(this repository)** |
| `(API only)` | Bank Core: the ledger and the rules | [CitizenBankCore](https://github.com/citizen-bnk/CitizenBankCore) |
| `(shared code)` | Person model, token handling, shared types | [citizen-platform](https://github.com/citizen-bnk/citizen-platform) |

_Status: the sign-in handoff between the website and banking is on the `claude/demo-sso` branches (and the website's pull request) and is not on `main` yet._

## Deploy on Vercel

1. Deploy **CitizenBankCore** first and note its URL.
2. Import this repo in Vercel and add the environment variable `CORE_API_URL=https://<your-core>.vercel.app`
   (no trailing slash). Optionally set `NEXT_PUBLIC_SHOW_DEMO_LOGIN=false` to hide the demo hint.
3. Deploy, then add this app's URL to Core's `ALLOWED_ORIGINS`.

`CORE_API_URL` is read at build time, so redeploy after changing it.

On a phone, open the URL and choose **Add to Home Screen** to install it.

## Sign-in through the Citizen Bank website

People can enter three ways: **explore** with one tap (a limited experience; products and payments ask only for the missing verification), **unlock with a passkey**, or **sign in with their Citizen account** on the website. Set `NEXT_PUBLIC_SIGN_IN_URL` to the website's sign-in page to show the third option. After signing in
there, the website's "Open Citizen Bank App" button opens `/sso?code=...&next=/`: this server passes the one-time code
to Core (`POST /api/auth/sso`), forwards Core's session cookie and continues to `next` (a path on this site only). A
refused or expired code returns to the website's sign-in page. The code is valid once for 60 seconds. Core must have
`PLATFORM_JWKS_URL` and `PLATFORM_ISSUER` set. The call to Core is server to server, so this host does not need to be
in Core's `ALLOWED_ORIGINS` for it. `NEXT_PUBLIC_DEMO_BANNER` shows a small label on every page. Run `npm test` for the tests.

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
