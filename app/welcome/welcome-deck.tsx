"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const cards = [
  { image: "citizen-ai", title: "Banking that listens", copy: "Ask CitizenAI, explore your options, and stay in control." },
  { image: "accounts", title: "Everything in one place", copy: "See your accounts, cards, and activity at a glance." },
  { image: "future", title: "Make room for tomorrow", copy: "Plan, save, and discover what comes next." },
  { image: "opportunity", title: "Grow with Citizen", copy: "Explore opportunities across the Citizen ecosystem." },
  { image: "security", title: "Your device. Your choice.", copy: "Keep your banking close, with secure sign-in options." },
  { image: "connected", title: "One Citizen identity", copy: "Move between banking, investments, and the Hub." },
] as const;

const animations = ["fade", "fly", "type", "arrive"] as const;
const seenKey = "citizen-onboarding-seen-v1";
const replayKey = "citizen-onboarding-replay-v1";

function shuffledCards() {
  const hour = new Date().getHours();
  const lead = hour < 12 ? 0 : hour < 18 ? 2 : 4;
  const rest = cards.map((_, index) => index).filter((index) => index !== lead);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [lead, ...rest];
}

export default function WelcomeDeck() {
  const params = useSearchParams();
  const [order, setOrder] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [animation, setAnimation] = useState<(typeof animations)[number]>("fade");
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [showNextTime, setShowNextTime] = useState(false);
  const [splash, setSplash] = useState(true);
  const touchX = useRef<number | null>(null);
  const total = expanded ? cards.length : 3;
  const card = cards[order[index]];
  const last = index === total - 1;
  const returnTo = useMemo(() => {
    const next = params.get("next");
    return next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/welcome") ? next : "/login";
  }, [params]);

  useEffect(() => {
    setOrder(shuffledCards());
    setAnimation(animations[Math.floor(Math.random() * animations.length)]);
    const timer = window.setTimeout(() => setSplash(false), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  function finish(replay = showNextTime) {
    try {
      localStorage.setItem(seenKey, "1");
      sessionStorage.setItem("citizen-onboarding-shown-this-session-v1", "1");
      if (replay) localStorage.setItem(replayKey, "1");
      else localStorage.removeItem(replayKey);
    } catch { /* Storage may be disabled; navigation still works. */ }
    window.location.assign(returnTo);
  }

  function nextCard() {
    if (!last) setIndex((value) => value + 1);
    else finish();
  }

  return (
    <main className="welcome-shell">
      {splash ? (
        <div className="welcome-splash" aria-label="Citizen Bank is opening">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="" />
          <strong>Citizen Bank</strong>
        </div>
      ) : (
        <div className="welcome-deck" onTouchStart={(event) => { touchX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => {
          if (touchX.current === null) return;
          const delta = event.changedTouches[0].clientX - touchX.current;
          if (delta < -60) nextCard();
          if (delta > 60) setIndex((value) => Math.max(0, value - 1));
          touchX.current = null;
        }}>
          <header className="welcome-top"><span>Citizen Bank</span><button type="button" onClick={() => finish(false)}>Skip</button></header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="welcome-art" src={`/onboarding/${card.image}.png`} alt="" />
          <div key={index} className={`welcome-copy ${animation}`}>
            <p className="welcome-step">DISCOVER CITIZEN · {index + 1} / {total}</p>
            <h1>{card.title}</h1>
            <p>{card.copy}</p>
          </div>
          <div className="welcome-dots" aria-label={`Card ${index + 1} of ${total}`}>{Array.from({ length: total }, (_, dot) => <span key={dot} className={dot === index ? "active" : ""} />)}</div>
          <div className="welcome-actions">
            {last && !expanded && <button type="button" className="welcome-secondary" onClick={() => { setExpanded(true); setIndex(3); }}>See more</button>}
            {index > 0 && <button type="button" className="welcome-secondary" onClick={() => setIndex(index - 1)}>Back</button>}
            {last && <label className="welcome-replay"><input type="checkbox" checked={showNextTime} onChange={(event) => setShowNextTime(event.target.checked)} /> Show this next time</label>}
            <button type="button" className="welcome-primary" onClick={() => finish()} >Get started</button>
          </div>
        </div>
      )}
    </main>
  );
}
