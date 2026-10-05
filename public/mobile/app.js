/*
 * Citizen Bank mobile app — client runtime.
 *
 * Built from the "Citizen AI — Immersive Banking" prototype. The animation,
 * voice and step-flow engines are the prototype's own; the data layer, flows
 * and assistant are wired to Citizen Bank Core through /api (proxied to Core by
 * next.config.ts, so the session cookie stays first-party).
 */
(function(){
  'use strict';

  /* ------------------------------------------------------------ API client */
  function api(path, opts){
    opts = opts || {};
    var headers = { 'Accept': 'application/json' };
    var hasBody = opts.body !== undefined;
    if(hasBody) headers['Content-Type'] = 'application/json';
    if(opts.idem) headers['Idempotency-Key'] = opts.idem;
    return fetch(path, {
      method: opts.method || (hasBody ? 'POST' : 'GET'),
      headers: headers,
      body: hasBody ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store'
    }).then(function(res){
      return res.json().catch(function(){ return null; }).then(function(json){
        if(res.status === 401 && !opts.allow401){
          window.location.replace('/login?next=' + encodeURIComponent(window.location.pathname));
          throw new Error('Please sign in again.');
        }
        if(!res.ok){
          if(json && json.code === 'KYC_REQUIRED') window.dispatchEvent(new CustomEvent('citizen:kyc-required', {detail:json.kyc}));
          if(json && json.code === 'REAUTH_REQUIRED') window.dispatchEvent(new CustomEvent('citizen:reauth-required'));
          var err = new Error((json && json.error) || 'Something went wrong. Please try again.');
          err.code = json && json.code; err.status = res.status;
          throw err;
        }
        return json;
      });
    });
  }
  function newIdem(){ return 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12); }

  /* Best-effort country guess for the local-currency hint when the edge
     doesn't supply one (Core prefers Vercel's IP-country header). */
  function guessCountry(){
    try{
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if(tz === 'Africa/Maseru') return 'LS';
      if(tz === 'Africa/Johannesburg') return 'ZA';
      if(tz === 'Africa/Gaborone') return 'BW';
      if(tz === 'Africa/Mbabane') return 'SZ';
      if(tz === 'Africa/Harare') return 'ZW';
      if(tz === 'Africa/Maputo') return 'MZ';
      if(tz === 'Africa/Windhoek') return 'NA';
      if(tz === 'Europe/London') return 'GB';
      var region = (navigator.language || '').split('-')[1];
      return region ? region.toUpperCase() : 'LS';
    }catch(e){ return 'LS'; }
  }

  function boot(){
    api('/api/me?country=' + guessCountry())
      .then(function(data){
        document.documentElement.classList.remove('booting');
        start(data);
      })
      .catch(function(err){
        var el = document.getElementById('bootError');
        if(el){ el.textContent = err.message + ' '; var a = document.createElement('a'); a.href = '/'; a.textContent = 'Retry'; el.appendChild(a); el.hidden = false; }
      });
  }

  if('serviceWorker' in navigator && location.protocol === 'https:'){
    window.addEventListener('load', function(){ navigator.serviceWorker.register('/sw.js').catch(function(){}); });
  }

  function start(BOOT){
  if(typeof anime === 'undefined'){
    console.error('Citizen AI: anime.js failed to load — animations are disabled.');
    return;
  }

  const orb = document.getElementById('orb');
  const orbImg = orb.querySelector('img');
  const logoCoin = document.getElementById('logoCoin');
  const coinTrailDots = Array.from(document.querySelectorAll('#coinTrail span'));
  const orbWrap = document.getElementById('orbWrap');
  const halo = document.getElementById('halo');
  const thinkingRing = document.getElementById('thinkingRing');
  const rings = [document.getElementById('ring1'), document.getElementById('ring2'), document.getElementById('ring3')];
  const flash = document.getElementById('flash');
  const particleField = document.getElementById('particleField');
  const waveParticles = document.getElementById('waveParticles');
  const orbitRingLine = document.getElementById('orbitRingLine');
  const statusText = document.getElementById('statusText');
  const waveIcon = document.getElementById('waveIcon');
  const sideWaveLeft = document.getElementById('sideWaveLeft');
  const sideWaveRight = document.getElementById('sideWaveRight');
  const greetingBlock = document.getElementById('greetingBlock');
  const greetLead = document.getElementById('greetLead');
  const greetName = document.getElementById('greetName');
  const greetSub = document.getElementById('greetSub');
  const cinematicText = document.getElementById('cinematicText');
  const micBtn = document.getElementById('micBtn');
  const micPulseEl = micBtn.querySelector('.pulse');
  const requestInput = document.getElementById('requestInput');
  const sendBtn = document.getElementById('sendBtn');
  const inputBar = document.getElementById('inputBar');
  const avatarBtn = document.getElementById('avatarBtn');
  const menuBtn = document.getElementById('menuBtn');
  const profilePanel = document.getElementById('profilePanel');
  const profileScrim = document.getElementById('profileScrim');
  const profileClose = document.getElementById('profileClose');
  const voiceStatusText = document.getElementById('voiceStatusText');
  const quickActionsEl = document.getElementById('quickActions');
  const clipBtn = document.getElementById('clipBtn');
  const attachmentPanel = document.getElementById('attachmentPanel');
  const quickActionsWrapEl = document.getElementById('quickActionsWrap');
  const hiddenFileInput = document.getElementById('hiddenFileInput');
  const cameraModal = document.getElementById('cameraModal');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraClose = document.getElementById('cameraClose');
  const cameraCapture = document.getElementById('cameraCapture');
  const cameraHint = document.getElementById('cameraHint');

  const PALETTE = ['#6a4cff', '#d6349b', '#ff6a3d', '#ffc93c'];
  let currentState = 'idle';

  /* ==========================================================
     Language + voice profile
     -----------------------------------------------------------
     Each language maps to an ElevenLabs voice_id — in production
     these are Professional Voice Clones trained on recordings of
     native isiZulu and Sesotho speakers, served through a
     multilingual speech model (e.g. eleven_v3 / eleven_v3_conversational).
     Every string below (greeting, buttons, nav, status, UI chrome)
     is a best-effort draft translation and should be reviewed by a
     native-speaking linguist before shipping to real customers.
     ========================================================== */
  const LANGUAGES = {
    en: {
      label: 'English',
      elevenVoiceId: 'REPLACE_WITH_ENGLISH_VOICE_ID',
      greetLead: 'Good morning', greetSub: 'How can I help you with your banking today?',
      buttons: {
        sendMoney: 'Send money', checkBalance: 'Check balance', manageCards: 'Manage cards',
        payBills: 'Pay bills', crossBorder: 'Cross-border transfer', insights: 'Financial insights'
      },
      buttonSubs: {
        sendMoney: 'Transfer to anyone', checkBalance: 'View your balances', manageCards: 'Control your cards',
        payBills: 'Pay your bills', crossBorder: 'Send internationally', insights: 'Analyze & grow'
      },
      nav: { ai: 'AI Assistant', accounts: 'Accounts', transfers: 'Payments', cards: 'Cards', more: 'More' },
      status: { idle: 'Idle', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…', confirm: 'Confirm to proceed', success: 'Done!' },
      ui: {
        micTitle: 'Speak to Citizen AI', sendTitle: 'Send', avatarTitle: 'Profile', menuTitle: 'Menu',
        placeholder: 'Speak or type your request…', navHandleTitle: 'Show menu',
        langSectionLabel: 'AI Voice Language',
        appearanceLabel: 'Appearance', darkMode: 'Dark', lightMode: 'Light',
        langHint: 'Citizen AI will speak and greet you in the language you choose here. Setting is saved to your profile.',
        aboutLabel: 'About this voice',
        aboutHint: "Native isiZulu and Sesotho voices are produced with ElevenLabs' professional voice cloning, trained on recordings of native speakers, then served through the multilingual speech model. Translations shown are drafts and should be reviewed by a native-speaking linguist before going live.",
        voiceStatusDefault: 'Citizen AI uses an AI-generated voice, with browser speech as a fallback.',
        speakingWith: 'Citizen AI is speaking ({voice}).',
        totalBalance: 'Total balance', availableBalance: 'Available Balance', currentAccount: 'Current Account', savingsAccount: 'Savings Account',
        quickActionsLabel: 'Quick actions', internalTransfer: 'Transfer between accounts',
        internalTransferSub: 'Move money between your own accounts instantly', recentActivity: 'Recent activity',
        beneficiaries: 'Beneficiaries', scheduled: 'Scheduled payments', airtime: 'Airtime & data',
        recentRecipients: 'Recent recipients', cardActive: 'Active', cardFrozenLabel: 'Frozen', freezeCard: 'Freeze', viewPin: 'View PIN',
        setLimit: 'Set limit', orderCard: 'Order a card', orderCardSub: 'Get a physical card, or issue a new virtual one', cardDetails: 'Card details', cardType: 'Card type', cardStatus: 'Status',
        cardExpiry: 'Expiry', dailyLimit: 'Daily limit', settingsLanguage: 'Settings & AI language', statements: 'Statements',
        security: 'Security & privacy', notifications: 'Notifications', help: 'Help & support',
        branchLocator: 'Branch locator', logOut: 'Log out',
        attachLocation: 'Location', attachFile: 'Upload file', attachContact: 'Contact',
        attachCamera: 'Camera', attachVoice: 'Voice note', attachScan: 'Scan & pay'
      }
    },
    st: {
      label: 'Sesotho',
      elevenVoiceId: 'REPLACE_WITH_SESOTHO_VOICE_ID',
      greetLead: 'Dumela', greetSub: 'Nka o thusa jwang le dipuisano tsa hao tsa banka kajeno?',
      buttons: {
        sendMoney: 'Romela chelete', checkBalance: 'Sheba tekanyo', manageCards: 'Laola dikarete',
        payBills: 'Lefa ditefello', crossBorder: 'Fetisetso ya moeli', insights: 'Temoho ya lichelete'
      },
      buttonSubs: {
        sendMoney: 'Romela mang kapa mang', checkBalance: 'Sheba dikadimo tsa hao', manageCards: 'Laola dikarete tsa hao',
        payBills: 'Lefa ditefello tsa hao', crossBorder: 'Romela ka ntle ho naha', insights: 'Hlahloba le ho hola'
      },
      nav: { ai: 'Mothusi wa AI', accounts: 'Diakhaonto', transfers: 'Ditefo', cards: 'Dikarete', more: 'Tse ding' },
      status: { idle: 'E emetse', listening: 'E a mamela…', thinking: 'E a nahana…', speaking: 'E a bua…', confirm: 'Netefatsa ho tsoela pele', success: 'E phethiloe!' },
      ui: {
        micTitle: 'Bua le Citizen AI', sendTitle: 'Romela', avatarTitle: 'Boemo ba hao', menuTitle: 'Menyu',
        placeholder: 'Bua kapa o ngole kopo ya hao…', navHandleTitle: 'Bontsha menyu',
        langSectionLabel: 'Puo ya Lentswe la AI',
        appearanceLabel: 'Ponahalo', darkMode: 'E lefifi', lightMode: 'E khanyang',
        langHint: 'Citizen AI e tla bua le ho o dumedisa ka puo eo o e khethang mona. Boitlhophelo bo bolokoa profaeleng ya hao.',
        aboutLabel: 'Mabapi le lentswe lena',
        aboutHint: 'Mantswe a tlhaho a Sezulu le Sesotho a hlahiswa ka thekenoloji ya ElevenLabs ya ho kopitsa lentswe, a koetlisitswe ka direkoto tsa babui ba tlhaho, ebe a fanwa ka mofuta wa lentswe wa dipuo tse ngata. Diphetolelo tse bontshitsweng ke tsa boiteko mme di lokela ho hlahlojwa ke setsebi sa puo pele di sebediswa ke bareki ba nnete.',
        voiceStatusDefault: 'E sebedisa lentswe la mokgwa wa tekolo — hokela sistimi ya lentswe bakeng sa modumo wa nnete.',
        speakingWith: 'E bua ka lentswe la ElevenLabs ({voice}).',
        totalBalance: 'Tekanyo yohle', availableBalance: 'Tekanyo e fumanehang', currentAccount: 'Akhaonto ya Ka Nako', savingsAccount: 'Akhaonto ya Poloko',
        quickActionsLabel: 'Diketso tse potlakileng', internalTransfer: 'Fetisetsa pakeng tsa diakhaonto',
        internalTransferSub: 'Fetisetsa chelete pakeng tsa diakhaonto tsa hao ka potlako', recentActivity: 'Ditshebetso tsa morao-rao',
        beneficiaries: 'Bafumani', scheduled: 'Ditefo tse hlophisitsoeng', airtime: 'Airtime le data',
        recentRecipients: 'Bafumani ba morao-rao', cardActive: 'E sebetsa', cardFrozenLabel: 'E kentsoe leqhoa', freezeCard: 'Emisa', viewPin: 'Bona PIN',
        setLimit: 'Beha moeli', orderCard: 'Odara karete', orderCardSub: 'Fumana karete ya sebele, kapa o hlahise ya bonyane e ntjha', cardDetails: 'Lintlha tsa karete', cardType: 'Mofuta wa karete', cardStatus: 'Boemo',
        cardExpiry: 'Nako ya ho fela', dailyLimit: 'Moeli wa letsatsi', settingsLanguage: 'Litlhophiso le puo ya AI', statements: 'Ditlaleho',
        security: 'Tshireletso le lekunutu', notifications: 'Ditsebiso', help: 'Thuso le tshehetso',
        branchLocator: 'Fumana lekala', logOut: 'Tsoa',
        attachLocation: 'Sebaka', attachFile: 'Kenya faele', attachContact: 'Motho oa boikopanyo',
        attachCamera: 'Khamera', attachVoice: 'Molaetsa oa lentswe', attachScan: 'Skena o lefe'
      }
    },
    zu: {
      label: 'isiZulu',
      elevenVoiceId: 'REPLACE_WITH_ISIZULU_VOICE_ID',
      greetLead: 'Sawubona', greetSub: 'Ngingakusiza kanjani nezindaba zakho zasebhange namuhla?',
      buttons: {
        sendMoney: 'Thumela imali', checkBalance: 'Hlola ibhalansi', manageCards: 'Phatha amakhadi',
        payBills: 'Khokha izikweletu', crossBorder: 'Ukudlulisa phesheya kwemingcele', insights: 'Ulwazi lwezezimali'
      },
      buttonSubs: {
        sendMoney: 'Thumela noma ubani', checkBalance: 'Buka amabhalansi akho', manageCards: 'Lawula amakhadi akho',
        payBills: 'Khokha izikweletu zakho', crossBorder: 'Thumela phesheya kwezwe', insights: 'Hlaziya futhi ukhule'
      },
      nav: { ai: 'Umsizi we-AI', accounts: 'Ama-akhawunti', transfers: 'Izinkokhelo', cards: 'Amakhadi', more: 'Okunye' },
      status: { idle: 'Kumile', listening: 'Iyalalela…', thinking: 'Iyacabanga…', speaking: 'Iyakhuluma…', confirm: 'Qinisekisa ukuqhubeka', success: 'Kwenziwe!' },
      ui: {
        micTitle: 'Khuluma no-Citizen AI', sendTitle: 'Thumela', avatarTitle: 'Iphrofayela yakho', menuTitle: 'Imenyu',
        placeholder: 'Khuluma noma ubhale isicelo sakho…', navHandleTitle: 'Bonisa imenyu',
        langSectionLabel: 'Ulimi Lwezwi le-AI',
        appearanceLabel: 'Ukubukeka', darkMode: 'Emnyama', lightMode: 'Ekhanyayo',
        langHint: 'I-Citizen AI izokhuluma futhi ikubingelele ngolimi oluwukhethile lapha. Okukhethiwe kulondolozwa kuphrofayela yakho.',
        aboutLabel: 'Mayelana nalelizwi',
        aboutHint: 'Amazwi emvelo esiZulu naseSesotho akhiqizwa ngobuchwepheshe be-ElevenLabs bokulingisa izwi, aqeqeshwe ngokuqoshiwe kwabakhulumi bemvelo, abesesethulwa ngemodeli yezwi yezilimi eziningi. Ukuhunyushwa okuboniswayo ukuhlaka futhi kufanele kubuyekezwe ochwepheshe wolimi lwemvelo ngaphambi kokuthi kusetshenziswe amakhasimende angempela.',
        voiceStatusDefault: 'Isebenzisa izwi lokuhlola elilingisiwe — xhuma isistimu yezwi ukuze uthole umsindo wangempela.',
        speakingWith: 'Ikhuluma ngezwi le-ElevenLabs ({voice}).',
        totalBalance: 'Ibhalansi eyonke', availableBalance: 'Ibhalansi etholakalayo', currentAccount: 'I-Current Account', savingsAccount: 'I-Savings Account',
        quickActionsLabel: 'Izenzo ezisheshayo', internalTransfer: 'Dlulisela phakathi kwama-akhawunti',
        internalTransferSub: 'Hambisa imali phakathi kwama-akhawunti akho ngokushesha', recentActivity: 'Umsebenzi wakamuva',
        beneficiaries: 'Abazuzi', scheduled: 'Izinkokhelo ezihleliwe', airtime: 'I-Airtime ne-data',
        recentRecipients: 'Abamukeli bakamuva', cardActive: 'Iyasebenza', cardFrozenLabel: 'Iqandisiwe', freezeCard: 'Misa', viewPin: 'Bona i-PIN',
        setLimit: 'Setha umkhawulo', orderCard: 'Oda ikhadi', orderCardSub: 'Thola ikhadi elibonakalayo, noma ukhiphe elisha lango-virtual', cardDetails: 'Imininingwane yekhadi', cardType: 'Uhlobo lwekhadi', cardStatus: 'Isimo',
        cardExpiry: 'Isikhathi sokuphelelwa', dailyLimit: 'Umkhawulo wosuku', settingsLanguage: 'Izilungiselelo nolimi lwe-AI', statements: 'Amastatimenti',
        security: 'Ukuphepha nobumfihlo', notifications: 'Izaziso', help: 'Usizo nokusekelwa',
        branchLocator: 'Thola igatsha', logOut: 'Phuma',
        attachLocation: 'Indawo', attachFile: 'Layisha ifayela', attachContact: 'Oxhumana naye',
        attachCamera: 'Ikhamera', attachVoice: 'Umlayezo wezwi', attachScan: 'Skena ukhokhe'
      }
    }
  };
  let currentLanguage = 'en';

  /* Applies the current language to every static label in the UI:
     greeting, quick-action buttons, bottom nav, status pill, and
     the input/profile chrome. */
  function applyLanguage(lang){
    const cfg = LANGUAGES[lang];
    greetLead.textContent = greetingLead();
    greetSub.textContent = cfg.greetSub;

    document.querySelectorAll('.qa-chip').forEach(function(chip){
      const key = chip.getAttribute('data-i18n');
      const title = chip.querySelector('.qa-title');
      const sub = chip.querySelector('.qa-sub');
      if(key && title && cfg.buttons[key]) title.textContent = cfg.buttons[key];
      if(key && sub && cfg.buttonSubs[key]) sub.textContent = cfg.buttonSubs[key];
    });
    document.querySelectorAll('.feature-tile[data-i18n]').forEach(function(tile){
      const key = tile.getAttribute('data-i18n');
      const title = tile.querySelector('.feature-tile-title');
      if(key && title && cfg.buttons[key]) title.textContent = cfg.buttons[key];
    });
    document.querySelectorAll('span[data-i18n]').forEach(function(span){
      const key = span.getAttribute('data-i18n');
      if(cfg.buttons[key]) span.textContent = cfg.buttons[key];
    });
    document.querySelectorAll('[data-i18n-nav]').forEach(function(el){
      const key = el.getAttribute('data-i18n-nav');
      if(cfg.nav[key]) el.textContent = cfg.nav[key];
    });
    document.querySelectorAll('[data-i18n-ui]').forEach(function(el){
      const key = el.getAttribute('data-i18n-ui');
      if(cfg.ui[key]) el.textContent = cfg.ui[key];
    });
    requestInput.placeholder = cfg.ui.placeholder;
    micBtn.title = cfg.ui.micTitle;
    sendBtn.title = cfg.ui.sendTitle;
    avatarBtn.title = cfg.ui.avatarTitle;
    menuBtn.title = cfg.ui.menuTitle;
    voiceStatusText.textContent = cfg.ui.voiceStatusDefault;
    statusText.textContent = cfg.status[currentState] || cfg.status.idle;
    if(typeof updateTopbarAccent === 'function') updateTopbarAccent();
  }

  /* ---------------- Profile panel open/close ---------------- */
  function openProfile(){
    profilePanel.classList.add('open');
    profileScrim.classList.add('open');
  }
  function closeProfile(){
    profilePanel.classList.remove('open');
    profileScrim.classList.remove('open');
  }
  avatarBtn.addEventListener('click', openProfile);
  menuBtn.addEventListener('click', openProfile);
  profileClose.addEventListener('click', closeProfile);
  profileScrim.addEventListener('click', closeProfile);

  document.querySelectorAll('.lang-option').forEach(function(btn){
    btn.addEventListener('click', function(){
      const lang = btn.getAttribute('data-lang');
      document.querySelectorAll('.lang-option').forEach(function(b){ b.classList.toggle('active', b === btn); });
      saveProfile({ preferredLanguage: lang });
      const cfg = LANGUAGES[lang];
      const changed = lang !== currentLanguage;
      currentLanguage = lang;
      applyLanguage(lang);
      closeProfile(); // selecting anything in the menu auto-hides it
      if(changed){
        setState('speaking');
        speakLines([greetingLead() + ', ' + FIRST_NAME + '.', cfg.greetSub], function(){ setState('idle'); });
      }
    });
  });

  /* ---------------- Light / dark theme ---------------- */
  let currentTheme = 'dark';
  function applyTheme(theme, silent){
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
    document.querySelectorAll('.theme-option').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-theme-choice') === theme);
    });
    if(!silent) saveProfile({ preferredTheme: theme });
  }
  document.querySelectorAll('.theme-option').forEach(function(btn){
    btn.addEventListener('click', function(){
      applyTheme(btn.getAttribute('data-theme-choice'));
      closeProfile(); // selecting anything in the menu auto-hides it
    });
  });

  /* ---------------- Ambient dust motes ---------------- */
  const drift = document.getElementById('drift');
  for(let i=0;i<22;i++){
    const m = document.createElement('div');
    m.className = 'mote';
    const size = 1 + Math.random()*2.2;
    m.style.width = size+'px';
    m.style.height = size+'px';
    m.style.left = Math.random()*100+'%';
    m.style.bottom = '-10px';
    m.style.animationDuration = (14 + Math.random()*16)+'s';
    m.style.animationDelay = (Math.random()*18)+'s';
    drift.appendChild(m);
  }

  /* ---------------- Ambient particle field (loose, freely drifting) ---------------- */
  const PARTICLE_COUNT = 16;
  const FIELD_R_MIN = 82, FIELD_R_MAX = 160;
  for(let i=0;i<PARTICLE_COUNT;i++){
    const angle = Math.random()*Math.PI*2;
    const radius = FIELD_R_MIN + Math.random()*(FIELD_R_MAX-FIELD_R_MIN);
    const x = Math.cos(angle)*radius;
    const y = Math.sin(angle)*radius;
    const size = 2 + Math.random()*3.2;
    const color = PALETTE[i % PALETTE.length];

    const el = document.createElement('div');
    el.className = 'particle';
    el.style.width = size+'px';
    el.style.height = size+'px';
    el.style.left = 'calc(50% + ' + x.toFixed(1) + 'px)';
    el.style.top = 'calc(50% + ' + y.toFixed(1) + 'px)';
    el.style.background = 'radial-gradient(circle, ' + color + ' 0%, transparent 72%)';
    particleField.appendChild(el);

    anime({
      targets: el,
      translateX: function(){ return Math.random()*24 - 12; },
      translateY: function(){ return Math.random()*24 - 12; },
      opacity: function(){ return 0.15 + Math.random()*0.5; },
      scale: function(){ return 0.7 + Math.random()*0.8; },
      duration: function(){ return 2600 + Math.random()*3400; },
      delay: Math.random()*2000,
      direction: 'alternate',
      loop: true,
      easing: 'easeInOutSine'
    });
  }

  function setParticleIntensity(state){
    const intensity = { idle:0.5, listening:0.85, thinking:0.6, speaking:1, confirm:0.75, success:0.95 }[state];
    anime({ targets: particleField, opacity: intensity !== undefined ? intensity : 0.6, duration: 600, easing: 'easeOutQuad' });
  }

  /* ---------------- Persistent orbit ring (slow rotation, decorative) ---------------- */
  anime({ targets: orbitRingLine, rotate: '1turn', duration: 11000, loop: true, easing: 'linear' });

  /* ==========================================================
     Wave particles — concentric rings around the orb producing
     two effects: a continuous bee-style shimmer sweep, and a
     periodic outward pond-ripple pulse while idle.
     ========================================================== */
  const WAVE_RANKS = [
    { radius: 76,  count: 12 },
    { radius: 108, count: 16 },
    { radius: 140, count: 20 },
    { radius: 172, count: 24 }
  ];
  const waveParticleData = [];

  WAVE_RANKS.forEach(function(rank, rankIndex){
    for(let i=0;i<rank.count;i++){
      const angle = (i / rank.count) * Math.PI*2 + rankIndex*0.28;
      const x = Math.cos(angle)*rank.radius;
      const y = Math.sin(angle)*rank.radius;
      const size = 2 + rankIndex*0.4;
      const color = PALETTE[(rankIndex + i) % PALETTE.length];

      const el = document.createElement('div');
      el.className = 'wave-particle';
      el.style.width = size+'px';
      el.style.height = size+'px';
      el.style.left = 'calc(50% + ' + x.toFixed(1) + 'px)';
      el.style.top = 'calc(50% + ' + y.toFixed(1) + 'px)';
      el.style.background = 'radial-gradient(circle, ' + color + ' 0%, transparent 72%)';
      waveParticles.appendChild(el);

      waveParticleData.push({ el: el, angle: angle, rank: rankIndex });
    }
  });

  const SHIMMER_CYCLE = 3200;
  waveParticleData.forEach(function(p){
    const phase = p.angle / (Math.PI*2);
    anime({
      targets: p.el,
      opacity: [0.2, 0.2, 0.82, 0.2],
      scale: [1, 1, 1.9, 1],
      duration: SHIMMER_CYCLE,
      delay: phase * SHIMMER_CYCLE,
      loop: true,
      easing: 'easeInOutSine'
    });
  });

  const waveRanksGrouped = WAVE_RANKS.map(function(_, idx){
    return waveParticleData.filter(function(p){ return p.rank === idx; }).map(function(p){ return p.el; });
  });

  function playPondRipple(){
    waveRanksGrouped.forEach(function(els, rankIndex){
      anime({
        targets: els,
        opacity: [
          { value: 0.95, duration: 260, easing: 'easeOutSine' },
          { value: 0.22, duration: 680, easing: 'easeInSine' }
        ],
        scale: [
          { value: 2.1, duration: 260, easing: 'easeOutSine' },
          { value: 1, duration: 680, easing: 'easeInSine' }
        ],
        delay: rankIndex * 190
      });
    });
  }

  let idleRippleTimer = null;
  function scheduleIdleRipple(){
    clearTimeout(idleRippleTimer);
    const delay = 6500 + Math.random()*6000;
    idleRippleTimer = setTimeout(function(){
      if(currentState === 'idle'){
        playPondRipple();
        scheduleIdleRipple();
      }
    }, delay);
  }
  function stopIdleRipple(){ clearTimeout(idleRippleTimer); }

  /* ==========================================================
     Logo coin spiral — the gold "coin" already sits baked into the
     centre of the orb artwork at rest. This animates a matching
     gold disc starting at the top of the ring, sweeping around in
     a tightening circular path, and settling exactly on top of
     where the static coin already is — then fades, leaving the
     artwork looking untouched. Runs once on load, then periodically
     while idle, as a quiet "the logo is alive" flourish.
     ========================================================== */
  function playCoinSpiral(){
    const startRadius = 58;
    const totalTurns = 1.75;
    const startAngleDeg = -90; // top of the ring
    const proxy = { t: 0 };
    const TRAIL_STEP = 0.045;

    function coinXY(t){
      const angle = (startAngleDeg + t * totalTurns * 360) * Math.PI / 180;
      const radius = startRadius * (1 - t);
      return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    }

    // 1) The logo artwork AND its glow both fade away, leaving clear space.
    //    The idle breathing loop is paused first since it drives the halo's
    //    opacity every frame and would otherwise fight this fade.
    if(ampAnim) ampAnim.pause();
    anime({
      targets: [orbImg, halo],
      opacity: 0,
      duration: 380,
      easing: 'easeInQuad',
      complete: function(){
        // 2) With the logo gone, the coin appears at the top and spirals in,
        //    trailing a fading string of sparks like a comet's tail.
        anime.set(logoCoin, { opacity: 1, scale: 1, translateX: 0, translateY: 0 });
        anime.set(coinTrailDots, { opacity: 0 });

        anime({
          targets: proxy,
          t: 1,
          duration: 2600,
          easing: 'easeInOutCubic',
          update: function(){
            const pos = coinXY(proxy.t);
            anime.set(logoCoin, { translateX: pos.x, translateY: pos.y });

            coinTrailDots.forEach(function(dot, i){
              const dt = Math.max(0, proxy.t - (i + 1) * TRAIL_STEP);
              const p = coinXY(dt);
              const rank = (i + 1) / (coinTrailDots.length + 1); // 0 (near coin) → 1 (tail end)
              const fadeIn = Math.min(1, proxy.t / ((i + 1) * TRAIL_STEP + 0.05));
              anime.set(dot, {
                translateX: p.x,
                translateY: p.y,
                scale: 1 - rank * 0.75,
                opacity: (1 - rank) * 0.7 * fadeIn
              });
            });
          },
          complete: function(){
            // 3) Coin settles with a little pulse — it has now stopped moving.
            anime({
              targets: logoCoin,
              scale: [1, 1.3, 1],
              duration: 380,
              easing: 'easeOutQuad',
              complete: function(){
                // 4) Only now does the logo (and its glow) fade back in, crossfading with the coin and its trail.
                anime({ targets: logoCoin, opacity: 0, duration: 500, easing: 'easeInQuad' });
                anime({ targets: coinTrailDots, opacity: 0, duration: 300, easing: 'easeInQuad' });
                anime({ targets: orbImg, opacity: [0, 1], duration: 500, easing: 'easeOutQuad' });
                anime({
                  targets: halo,
                  opacity: [0, 0.5],
                  duration: 500,
                  easing: 'easeOutQuad',
                  complete: function(){
                    driveAmp(AMP_PROFILES[currentState] || AMP_PROFILES.idle); // hand halo control back to normal breathing
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  let coinSpinTimer = null;
  function scheduleCoinSpin(){
    clearTimeout(coinSpinTimer);
    const delay = 20000 + Math.random() * 12000;
    coinSpinTimer = setTimeout(function(){
      if(currentState === 'idle'){
        playCoinSpiral();
        scheduleCoinSpin();
      }
    }, delay);
  }
  function stopCoinSpin(){ clearTimeout(coinSpinTimer); }

  /* ---------------- Side waveform bars flanking the orb ---------------- */
  function buildSideWave(container, count){
    const bars = [];
    for(let i=0;i<count;i++){
      const bar = document.createElement('span');
      const base = 8 + Math.random()*36;
      bar.style.height = base.toFixed(0) + 'px';
      container.appendChild(bar);
      bars.push(bar);
      anime({
        targets: bar,
        height: [base, 6 + Math.random()*10, base*0.8 + Math.random()*20, base],
        duration: 900 + Math.random()*900,
        delay: Math.random()*500,
        loop: true,
        easing: 'easeInOutSine'
      });
    }
    return bars;
  }
  buildSideWave(sideWaveLeft, 9);
  buildSideWave(sideWaveRight, 9);

  /* ==========================================================
     Orb amplitude engine — anime.js drives a proxy value (0..1)
     standing in for a Web Audio AnalyserNode reading.
     ========================================================== */
  const amp = { v: 0 };
  let ampAnim = null;

  function renderOrb(){
    const v = amp.v;
    const scaleBoost = currentState === 'speaking' ? 0.46 : 0.24;
    const scale = 1 + v * scaleBoost;
    const glow = 20 + v * 74;

    orb.style.transform = 'scale(' + scale.toFixed(4) + ')';
    orbImg.style.filter =
      'drop-shadow(0 0 ' + glow.toFixed(0) + 'px rgba(106,76,255,' + (0.4 + v*0.4).toFixed(2) + ')) ' +
      'drop-shadow(0 0 ' + (glow*1.6).toFixed(0) + 'px rgba(255,106,61,' + (0.16 + v*0.32).toFixed(2) + '))';
    halo.style.opacity = (0.38 + v*0.55).toFixed(2);
    halo.style.transform = 'scale(' + (0.6 + v*0.34).toFixed(3) + ')';
    waveParticles.style.filter = 'brightness(' + (1 + v*0.7).toFixed(2) + ')';
  }

  function driveAmp(config){
    if(ampAnim) ampAnim.pause();
    ampAnim = anime(Object.assign({
      targets: amp,
      update: renderOrb,
      easing: 'easeInOutSine',
      loop: true,
      direction: 'alternate'
    }, config));
  }

  const AMP_PROFILES = {
    idle:      { v: [0.03, 0.14], duration: 2000 },
    listening: { v: function(){ return 0.16 + Math.random()*0.2; }, duration: function(){ return 240 + Math.random()*240; } },
    thinking:  { v: [0.04, 0.12], duration: 1300 },
    confirm:   { v: [0.16, 0.36], duration: 1050 },
    success:   { v: [0.14, 0.22], duration: 850 }
  };
  // 'speaking' has no ambient profile — it is driven word-by-word by speakWordPulses() below.

  /* ---------------- Thinking ring (continuous rotation) ---------------- */
  anime({ targets: thinkingRing, rotate: '1turn', duration: 2000, loop: true, easing: 'linear' });

  /* ---------------- Confirmation sonar rings ---------------- */
  let ringsAnim = null;
  function playConfirmRings(){
    ringsAnim = anime({
      targets: rings,
      scale: [0.9, 1.25],
      opacity: [0.5, 0],
      duration: 1700,
      delay: anime.stagger(320),
      loop: true,
      easing: 'easeOutSine'
    });
  }
  function stopConfirmRings(){
    if(ringsAnim) ringsAnim.pause();
    anime.set(rings, { opacity: 0, scale: 1 });
  }

  /* ---------------- Success flash ---------------- */
  function playSuccessFlash(){
    anime.set(flash, { opacity: 0, scale: 0.6 });
    anime({ targets: flash, opacity: [0, 1, 0], scale: [0.6, 1.15, 1.5], duration: 900, easing: 'easeOutSine' });
  }

  /* ---------------- Mic pulse ---------------- */
  let micPulseAnim = null;
  function startMicPulse(){
    micPulseAnim = anime({ targets: micPulseEl, scale: [0.9, 1.6], opacity: [0.7, 0], duration: 1500, loop: true, easing: 'easeOutSine' });
  }
  function stopMicPulse(){
    if(micPulseAnim) micPulseAnim.pause();
    anime.set(micPulseEl, { opacity: 0 });
  }

  /* ---------------- Waveform status icon (subtle constant motion) ---------------- */
  waveIcon.querySelectorAll('span').forEach(function(bar, i){
    anime({
      targets: bar,
      scaleY: [0.5, 1.3, 0.6, 1],
      duration: 900 + i*120,
      loop: true,
      easing: 'easeInOutSine'
    });
  });

  /* ---------------- Word-by-word speech pulses ---------------- */
  let wordTimeline = null;
  function stopWordPulses(){
    if(wordTimeline){ wordTimeline.pause(); wordTimeline = null; }
  }
  function speakWordPulses(text, totalDuration){
    stopWordPulses();
    const words = text.split(/\s+/).filter(Boolean);
    if(!words.length) return;
    const weights = words.map(function(w){ return w.length + 2; });
    const totalWeight = weights.reduce(function(a,b){ return a + b; }, 0);
    const tl = anime.timeline({ easing: 'easeInOutSine' });
    words.forEach(function(w, i){
      const dur = Math.max(110, totalDuration * (weights[i] / totalWeight));
      const peak = 0.38 + Math.min(w.length, 9) / 9 * 0.56 + Math.random() * 0.08;
      tl.add({ targets: amp, v: peak, duration: dur * 0.55, easing: 'easeOutSine', update: renderOrb });
      tl.add({ targets: amp, v: 0.06 + Math.random() * 0.05, duration: dur * 0.45, easing: 'easeInSine', update: renderOrb });
    });
    wordTimeline = tl;
    return tl;
  }

  /* ---------------- State transitions ---------------- */
  function setState(state){
    currentState = state;
    statusText.textContent = (LANGUAGES[currentLanguage].status[state]) || state;

    anime({ targets: thinkingRing, opacity: state === 'thinking' ? 1 : 0, duration: 320, easing: 'easeOutQuad' });
    micBtn.classList.toggle('active', state === 'listening');
    state === 'listening' ? startMicPulse() : stopMicPulse();
    state === 'confirm' ? playConfirmRings() : stopConfirmRings();
    setParticleIntensity(state);
    state === 'idle' ? scheduleIdleRipple() : stopIdleRipple();
    state === 'idle' ? scheduleCoinSpin() : stopCoinSpin();
    sideWaveLeft.classList.toggle('active', state === 'speaking');
    sideWaveRight.classList.toggle('active', state === 'speaking');

    // Cinematic text replaces the greeting while speaking — and stays up while the
    // customer decides on a confirmation, so the amount and payee remain visible.
    if(state === 'speaking' || state === 'confirm'){
      anime({ targets: greetingBlock, opacity: 0, duration: 200, easing: 'easeOutQuad' });
      anime({ targets: cinematicText, opacity: 1, duration: 280, easing: 'easeOutQuad' });
    } else {
      anime({ targets: cinematicText, opacity: 0, duration: 200, easing: 'easeOutQuad' });
      anime({ targets: greetingBlock, opacity: 1, duration: 280, easing: 'easeOutQuad' });
    }

    if(state === 'speaking'){
      if(ampAnim) ampAnim.pause();
      anime.set(amp, { v: 0.1 });
      renderOrb();
    } else {
      stopWordPulses();
      driveAmp(AMP_PROFILES[state] || AMP_PROFILES.idle);
    }

    if(state === 'success'){
      playSuccessFlash();
      setTimeout(function(){ setState('idle'); }, 1000);
    }
  }

  /* ==========================================================
     ElevenLabs voice integration — calls a backend proxy; never
     call ElevenLabs directly from the browser (exposes the API
     key). Real audio is analysed live via a Web Audio AnalyserNode
     so the orb reacts to actual voice. With no backend present (as
     in this standalone prototype) it fails fast and falls back to
     the simulated word-pulse animation.
     ========================================================== */
  const TTS_CONFIG = { endpoint: '/api/tts', modelId: 'eleven_v3_conversational' };
  const USE_REAL_TTS = true;
  let ttsUnavailable = false; // set after the first 501 so we stop asking
  let audioCtx = null, analyser = null, analyserData = null;
  let activeVoice = null, voiceRequest = null, cancelVoice = null, speechVersion = 0;

  function stopVoice(){
    speechVersion++;
    if(voiceRequest){ voiceRequest.abort(); voiceRequest = null; }
    if(activeVoice){ activeVoice.pause(); activeVoice = null; }
    if(cancelVoice){ cancelVoice(); cancelVoice = null; }
    if(window.speechSynthesis) window.speechSynthesis.cancel();
  }

  function speakWithBrowser(text, lang, version){
    return new Promise(function(resolve){
      if(version !== speechVersion || !window.speechSynthesis){ resolve(); return; }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'st' ? 'st-ZA' : lang === 'zu' ? 'zu-ZA' : 'en-ZA';
      const finish = function(){ utterance.onend = utterance.onerror = null; cancelVoice = null; stopWordPulses(); resolve(); };
      cancelVoice = finish;
      utterance.onstart = function(){ speakWordPulses(text, Math.max(1500, text.length * 62)); };
      utterance.onend = utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    });
  }

  function ensureAudioGraph(){
    if(audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    audioCtx = new Ctx();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserData = new Uint8Array(analyser.frequencyBinCount);
  }

  function speakWithElevenLabs(text, lang){
    return new Promise(function(resolve){
      ensureAudioGraph();
      const version = speechVersion;
      voiceRequest = new AbortController();
      const cfg = LANGUAGES[lang] || LANGUAGES.en;

      fetch(TTS_CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, language_code: lang }),
        credentials: 'same-origin', signal: voiceRequest.signal
      })
        .then(function(res){ if(res.status === 501 || res.status === 401) ttsUnavailable = true; if(!res.ok) throw new Error('TTS request failed: ' + res.status); return res.blob(); })
        .then(function(blob){
          if(version !== speechVersion){ resolve('cancelled'); return; }
          const url = URL.createObjectURL(blob);
          const audioEl = new Audio(url);
          activeVoice = audioEl;
          let source = null;
          if(audioCtx){
            source = audioCtx.createMediaElementSource(audioEl);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            audioCtx.resume().catch(function(){});
          }
          const finish = function(result){
            audioEl.pause();
            if(source) source.disconnect();
            URL.revokeObjectURL(url);
            if(activeVoice === audioEl){ activeVoice = null; cancelVoice = null; }
            resolve(result);
          };
          cancelVoice = function(){ finish('cancelled'); };

          function tick(){
            if(!analyser) return;
            analyser.getByteFrequencyData(analyserData);
            let sum = 0;
            for(let i=0;i<analyserData.length;i++) sum += analyserData[i];
            amp.v = Math.min(1, (sum / analyserData.length) / 130);
            renderOrb();
            if(!audioEl.paused && !audioEl.ended) requestAnimationFrame(tick);
          }
          audioEl.addEventListener('play', function(){
            voiceStatusText.textContent = cfg.ui.speakingWith.replace('{voice}', cfg.label);
            requestAnimationFrame(tick);
          });
          audioEl.addEventListener('ended', function(){ finish('played'); });
          audioEl.addEventListener('error', function(){ finish('fallback'); });
          audioEl.play().catch(function(){ finish('fallback'); });
        })
        .catch(function(){
          voiceStatusText.textContent = cfg.ui.voiceStatusDefault;
          resolve(version === speechVersion ? 'fallback' : 'cancelled');
        });
    });
  }

  /* ---------------- Cinematic speech (replaces the greeting while speaking) ---------------- */
  let speechTimer = null;
  function speakLines(lines, onDone){
    let i = 0;
    clearTimeout(speechTimer);
    stopVoice();
    const version = speechVersion;

    function next(){
      if(version !== speechVersion) return;
      if(i >= lines.length){ if(onDone) onDone(); return; }
      const text = lines[i];
      anime({ targets: cinematicText, opacity: [1, 0], translateY: [0, -6], duration: 180, easing: 'easeInQuad',
        complete: function(){
          cinematicText.textContent = text;
          anime.set(cinematicText, { translateY: 8 });
          anime({ targets: cinematicText, opacity: [0, 1], translateY: [8, 0], duration: 320, easing: 'easeOutQuad' });
        }
      });

      const duration = Math.max(1500, text.length * 62);
      if(currentState === 'speaking'){
        const playback = USE_REAL_TTS && !ttsUnavailable ? speakWithElevenLabs(text, currentLanguage) : Promise.resolve('fallback');
        playback.then(function(result){
          if(version !== speechVersion) return;
          return result === 'fallback' ? speakWithBrowser(text, currentLanguage, version) : undefined;
        }).then(function(){ if(version === speechVersion){ i++; next(); } });
        return;
      }
      speechTimer = setTimeout(function(){ i++; next(); }, duration);
    }
    next();
  }

  /* ==========================================================
     Step-flow engine
     -----------------------------------------------------------
     Multi-field actions (send money, pay bills, etc.) are declared
     as a list of "slots" rather than a hardcoded script. Each slot
     picks whichever input is fastest for that specific question —
     chips for a short pick-list, choice buttons for a fixed set,
     a text field for a free value — and typing or speaking an
     answer always works too, via activeFlowResolver. skipIf lets a
     slot be skipped entirely when context already answers it, which
     is what keeps the number of steps to a minimum.
     ========================================================== */
  const flowCanvas = document.getElementById('flowCanvas');
  let activeFlowResolver = null;
  let activeFlowCancel = null;

  /* ==========================================================
     Data layer — everything below is hydrated from Citizen Bank
     Core (/api/me) and refreshed after every successful action.
     ========================================================== */
  const FIRST_NAME = BOOT.user.firstName;
  let ACCOUNTS = [];        // { id, name ('Current'), fullName, type, balance, last4, spendable }
  let BENEFICIARIES = [];   // { id, name, type, bankName, accountLast4, country }
  let CARDS = [];           // mapped for the wallet stack (see mapCard)
  let BILLERS = [];
  let SCHEDULED = [];
  let LOANS = [];
  let RECENT = [];
  let LOCALE = BOOT.locale || { rate: null };
  const FEES = BOOT.fees || { localTransferCents: 500, intlPercent: 1, intlMinCents: 5000 };
  const LOCAL_BANKS = BOOT.localBanks || ['Citizen Bank'];
  const XB_COUNTRIES = BOOT.crossBorderCountries || [];
  const USER_PHONE = BOOT.user.phone || null;
  let activeCardIndex = 0;
  let LAST_LOCATION = null;

  function shortName(n){ return String(n).replace(/ Account$/i, ''); }

  function mapCard(c){
    const acc = ACCOUNTS.filter(function(a){ return a.id === c.accountId; })[0];
    const cls = c.kind === 'CRYPTO' ? 'bank-card-crypto' : (acc && acc.type === 'SAVINGS' ? 'bank-card-savings' : 'bank-card-current');
    return {
      id: c.id, key: c.id, cls: cls, label: c.label, last4: c.last4,
      network: c.brand === 'VISA' ? 'a' : c.brand === 'MASTERCARD' ? 'b' : 'c',
      type: c.kind === 'CRYPTO' ? 'Crypto' : (c.kind === 'CREDIT' ? 'Credit' : 'Debit') + ' — ' + (acc ? acc.name : c.label),
      expiry: c.expiry, accountId: c.accountId, accountName: acc ? acc.name : null,
      cryptoBalance: null, frozen: c.status === 'FROZEN', status: c.status,
      dailyLimit: Number(c.dailyLimit), monthlyLimit: Number(c.monthlyLimit),
      form: c.form === 'PHYSICAL' ? 'physical' : 'virtual', kind: c.kind
    };
  }

  function hydrate(d){
    ACCOUNTS = d.accounts.map(function(a){
      return { id: a.id, name: shortName(a.name), fullName: a.name, type: a.type, balance: Number(a.balance),
               last4: a.last4, spendable: a.type !== 'FIXED_DEPOSIT', maturesAt: a.maturesAt, interestRate: a.interestRate };
    });
    BENEFICIARIES = d.beneficiaries.slice();
    BILLERS = d.billers.slice();
    SCHEDULED = d.scheduled.slice();
    LOANS = d.loans.slice();
    RECENT = d.recent.slice();
    if(d.locale) LOCALE = d.locale;
    CARDS = d.cards.filter(function(c){ return c.status !== 'BLOCKED'; }).map(mapCard);
    if(activeCardIndex >= CARDS.length) activeCardIndex = 0;
  }

  function refreshData(){
    return api('/api/me?country=' + guessCountry()).then(function(d){ hydrate(d); renderAll(); });
  }

  /* ---------------- Formatting ---------------- */
  function formatRand(n){ // kept the prototype's name; formats maloti
    if(n === null || n === undefined || isNaN(n)) return '—';
    const v = Number(n);
    return (v < 0 ? '-' : '') + 'M ' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function money(n){ return formatRand(n).replace('M ', 'M'); } // compact form for speech captions
  function localEquiv(n){
    if(!LOCALE || !LOCALE.rate) return '';
    try{
      return '≈ ' + new Intl.NumberFormat(undefined, { style: 'currency', currency: LOCALE.localCurrency, maximumFractionDigits: 2 }).format(Number(n) * LOCALE.rate);
    }catch(e){ return ''; }
  }
  function parseAmount(v){
    if(v === null || v === undefined) return NaN;
    const s = String(v);
    if(/-/.test(s)) return NaN;
    const n = parseFloat(s.replace(/[^\d.]/g, ''));
    return isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function initials(name){ return String(name).split(/\s+/).filter(Boolean).map(function(w){ return w[0]; }).join('').slice(0, 2).toUpperCase(); }
  function fmtDate(d){
    const dt = new Date(d); const now = new Date();
    const y = new Date(now); y.setDate(now.getDate() - 1);
    const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if(dt.toDateString() === now.toDateString()) return 'Today · ' + time;
    if(dt.toDateString() === y.toDateString()) return 'Yesterday · ' + time;
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + time;
  }
  function fmtDay(d){ return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }); }

  /* ---------------- Lookups (tolerant of how people say names) ---------------- */
  function norm(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function fuzzyFind(list, value, key){
    const v = norm(value); if(!v) return null;
    key = key || 'name';
    return list.filter(function(x){ return norm(x[key]) === v; })[0]
        || list.filter(function(x){ return norm(x[key]).indexOf(v) === 0; })[0]
        || list.filter(function(x){ return norm(x[key]).indexOf(v) >= 0 || v.indexOf(norm(x[key])) >= 0; })[0]
        || null;
  }
  function findAccount(v){ return fuzzyFind(ACCOUNTS, v) || fuzzyFind(ACCOUNTS, v, 'fullName'); }
  function findBeneficiary(v){ return fuzzyFind(BENEFICIARIES, v); }
  function payBillers(){ return BILLERS.filter(function(b){ return !b.isAirtime; }); }
  function networks(){ return BILLERS.filter(function(b){ return b.isAirtime; }); }
  function networkLabel(b){ return b.name.replace(/ (Telecom )?Lesotho$/i, ''); }
  function findBiller(v){ return fuzzyFind(payBillers(), v) || fuzzyFind(payBillers(), v, 'code'); }
  function findNetwork(v){
    const n = networks();
    return n.filter(function(b){ return norm(networkLabel(b)) === norm(v); })[0] || fuzzyFind(n, v) || null;
  }
  function findCountry(v){ return fuzzyFind(XB_COUNTRIES, v) || fuzzyFind(XB_COUNTRIES, v, 'code'); }
  function findCard(v){ return fuzzyFind(CARDS, v, 'label') || CARDS.filter(function(c){ return c.last4 === String(v); })[0] || null; }
  function feeFor(kind, amount){
    if(kind === 'LOCAL') return FEES.localTransferCents / 100;
    if(kind === 'INTERNATIONAL') return Math.max(FEES.intlMinCents / 100, Math.round(amount * FEES.intlPercent) / 100);
    return 0;
  }
  function feeLine(fee){ return fee > 0 ? ' A ' + money(fee) + ' fee applies.' : ''; }

  /* ==========================================================
     Step-flow definitions. Each flow declares its slots; the
     engine (runStepFlow) asks only for what's missing, validates
     every answer (typed, tapped, spoken or pre-filled by the AI),
     then calls `execute` — the only place money actually moves —
     after the customer taps Confirm.
     ========================================================== */
  function eligibleAccounts(total){
    return ACCOUNTS.filter(function(a){ return a.spendable && a.balance >= total; });
  }
  function fromAccountStep(feeKind){
    function total(ctx){ const amt = parseAmount(ctx.amount) || 0; return amt + (feeKind ? feeFor(typeof feeKind === 'function' ? feeKind(ctx) : feeKind, amt) : 0); }
    return {
      key: 'fromAccount', type: 'choice',
      prompt: 'Which account should this come from?',
      options: function(ctx){ return eligibleAccounts(total(ctx)).map(function(a){ return a.name; }); },
      normalize: function(v, ctx){
        const a = findAccount(v);
        return a && a.spendable && a.balance >= total(ctx) ? a.name : null;
      },
      validate: function(v, ctx){
        const a = findAccount(v);
        if(!a || !a.spendable) return 'Please choose one of your transactional accounts.';
        if(a.balance < total(ctx)) return 'Your ' + a.name + ' account only has ' + money(a.balance) + ' available. Pick another account or a smaller amount.';
        return null;
      },
      guard: function(ctx){
        if(eligibleAccounts(total(ctx)).length === 0){
          return "You don't have enough available balance in any account to cover " + money(total(ctx)) + '. Try a smaller amount.';
        }
        return null;
      },
      skipIf: function(ctx){
        const eligible = eligibleAccounts(total(ctx));
        if(eligible.length === 1){ ctx.fromAccount = eligible[0].name; return true; }
        return false;
      }
    };
  }
  function amountStep(prompt, placeholder){
    return {
      key: 'amount', type: 'text', inputType: 'number',
      prompt: prompt, placeholder: placeholder || 'Amount (M)',
      normalize: function(v){ const n = parseAmount(v); return n > 0 ? String(n) : null; },
      validate: function(v){
        const n = parseAmount(v);
        if(!(n > 0)) return 'Please enter an amount greater than zero.';
        if(BOOT.dailyLimit && n > BOOT.dailyLimit) return 'That is above your daily payment limit of ' + money(BOOT.dailyLimit) + '.';
        return null;
      }
    };
  }
  function acc(ctx, key){ return findAccount(ctx[key || 'fromAccount']); }
  function sayRef(res){ return res && res.reference ? ' Reference ' + res.reference.split('-')[1] + '.' : ''; }

  const FLOW_DEFS = {
    sendMoney: {
      steps: [
        {
          key: 'beneficiary', type: 'chips',
          prompt: 'Who would you like to send to?',
          options: function(){ return BENEFICIARIES.slice(0, 6).map(function(b){ return b.name; }); },
          allowOther: true, otherPlaceholder: 'Type a saved beneficiary name…',
          normalize: function(v){ const b = findBeneficiary(v); return b ? b.name : null; },
          redirect: function(v){
            if(findBeneficiary(v)) return null;
            return { flow: 'addBeneficiary', prefill: { name: v }, intro: v + " isn't saved yet — let's add them first.",
                     then: function(ctx){ runStepFlow('sendMoney', { beneficiary: ctx.name }); } };
          }
        },
        amountStep(function(ctx){ return 'How much would you like to send to ' + ctx.beneficiary + '?'; }),
        fromAccountStep(function(ctx){ const b = findBeneficiary(ctx.beneficiary); return b ? b.type : 'CITIZEN'; }),
        {
          key: 'confirm', type: 'confirm',
          prompt: function(ctx){
            const b = findBeneficiary(ctx.beneficiary);
            return "You're sending " + money(parseAmount(ctx.amount)) + ' to ' + b.name + (b.bankName && b.type !== 'CITIZEN' ? ' at ' + b.bankName : '') +
              ' from your ' + ctx.fromAccount + ' account.' + feeLine(feeFor(b.type, parseAmount(ctx.amount))) + ' Proceed?';
          }
        }
      ],
      execute: function(ctx){
        return api('/api/payments/beneficiary', { idem: ctx._idem, body: {
          fromAccountId: acc(ctx).id, beneficiaryId: findBeneficiary(ctx.beneficiary).id, amount: parseAmount(ctx.amount), reference: ctx.reference
        }});
      },
      successMessage: function(ctx, res){ return 'Sent. ' + money(parseAmount(ctx.amount)) + ' is on its way to ' + ctx.beneficiary + '.' + sayRef(res); }
    },

    payBills: {
      steps: [
        {
          key: 'biller', type: 'chips',
          prompt: 'Which bill would you like to pay?',
          options: function(){ return payBillers().slice(0, 6).map(function(b){ return b.name; }); },
          allowOther: true, otherPlaceholder: 'Type a biller name…',
          normalize: function(v){ const b = findBiller(v); return b ? b.name : null; },
          validate: function(v){ return findBiller(v) ? null : "I couldn't find that biller. Try LEC, WASCO, DStv or the Revenue Authority."; }
        },
        {
          key: 'reference', type: 'text',
          prompt: function(ctx){ const b = findBiller(ctx.biller); return 'What is your ' + (b ? b.refLabel.toLowerCase() : 'account number') + ' for ' + ctx.biller + '?'; },
          placeholder: 'Reference',
          validate: function(v){ return String(v).trim().length >= 3 ? null : 'That reference looks too short — please check it.'; }
        },
        amountStep(function(ctx){ return 'How much would you like to pay ' + ctx.biller + '?'; }),
        fromAccountStep(),
        {
          key: 'confirm', type: 'confirm',
          prompt: function(ctx){ return 'Pay ' + money(parseAmount(ctx.amount)) + ' to ' + ctx.biller + ' (' + ctx.reference + ') from your ' + ctx.fromAccount + ' account?'; }
        }
      ],
      execute: function(ctx){
        return api('/api/payments/bill', { idem: ctx._idem, body: {
          fromAccountId: acc(ctx).id, billerId: findBiller(ctx.biller).id, amount: parseAmount(ctx.amount), customerRef: String(ctx.reference).trim()
        }});
      },
      successMessage: function(ctx, res){ return 'Paid. ' + ctx.biller + ' has received ' + money(parseAmount(ctx.amount)) + '.' + sayRef(res); }
    },

    crossBorder: {
      steps: [
        {
          key: 'country', type: 'chips',
          prompt: 'Which country are you sending to?',
          options: function(){ return XB_COUNTRIES.slice(0, 5).map(function(c){ return c.name; }); },
          allowOther: true, otherPlaceholder: 'Type a country…',
          normalize: function(v){ const c = findCountry(v); return c ? c.name : null; },
          validate: function(v){
            return findCountry(v) ? null : "I can't send to that country yet. I can send to " + XB_COUNTRIES.map(function(c){ return c.name; }).join(', ') + '.';
          }
        },
        {
          key: 'recipient', type: 'chips',
          prompt: function(ctx){ return 'Who are you sending to in ' + ctx.country + '?'; },
          options: function(ctx){
            const cc = findCountry(ctx.country).code;
            return BENEFICIARIES.filter(function(b){ return b.type === 'INTERNATIONAL' && b.country === cc; }).map(function(b){ return b.name; });
          },
          allowOther: true, otherPlaceholder: 'Recipient full name',
          validate: function(v){ return String(v).trim().length >= 2 ? null : "Please enter the recipient's full name."; }
        },
        {
          key: 'bankName', type: 'text', prompt: function(ctx){ return 'Which bank does ' + ctx.recipient + ' use?'; }, placeholder: 'Bank name',
          skipIf: function(ctx){ return !!savedIntl(ctx); }
        },
        {
          key: 'accountNumber', type: 'text', prompt: 'And their account number or IBAN?', placeholder: 'Account number / IBAN',
          skipIf: function(ctx){ return !!savedIntl(ctx); },
          validate: function(v){ return /^[A-Za-z0-9 ]{6,34}$/.test(String(v).trim()) ? null : 'That doesn’t look like a full account number — please check it.'; }
        },
        amountStep(function(ctx){
          const c = findCountry(ctx.country);
          return 'How much would you like to send, in maloti? M1 is about ' + c.rate + ' ' + c.currency + ' today.';
        }),
        fromAccountStep('INTERNATIONAL'),
        {
          key: 'confirm', type: 'confirm',
          prompt: function(ctx){
            const c = findCountry(ctx.country); const amt = parseAmount(ctx.amount);
            const dest = (amt * c.rate).toLocaleString('en-US', { maximumFractionDigits: 2 });
            return 'Send ' + money(amt) + ' (about ' + dest + ' ' + c.currency + ') to ' + ctx.recipient + ' in ' + c.name + ' from your ' + ctx.fromAccount + ' account?' + feeLine(feeFor('INTERNATIONAL', amt));
          }
        }
      ],
      execute: function(ctx){
        const saved = savedIntl(ctx);
        if(saved){
          return api('/api/payments/beneficiary', { idem: ctx._idem, body: { fromAccountId: acc(ctx).id, beneficiaryId: saved.id, amount: parseAmount(ctx.amount) } });
        }
        return api('/api/payments/cross-border', { idem: ctx._idem, body: {
          fromAccountId: acc(ctx).id, amount: parseAmount(ctx.amount), country: findCountry(ctx.country).code,
          recipientName: String(ctx.recipient).trim(), bankName: String(ctx.bankName).trim(), accountNumber: String(ctx.accountNumber).replace(/\s/g, '')
        }});
      },
      successMessage: function(ctx, res){ return 'Done. Your transfer to ' + ctx.recipient + ' is on its way — it usually arrives within one to two business days.' + sayRef(res); }
    },

    airtime: {
      steps: [
        {
          key: 'network', type: 'chips',
          prompt: 'Which network is this for?',
          options: function(){ return networks().map(networkLabel); },
          normalize: function(v){ const n = findNetwork(v); return n ? networkLabel(n) : null; },
          validate: function(v){ return findNetwork(v) ? null : 'Please choose Vodacom or Econet.'; }
        },
        {
          key: 'number', type: 'chips',
          prompt: 'Which number should I top up?',
          options: function(){ return USER_PHONE ? ['My number'] : []; },
          allowOther: true, otherPlaceholder: 'Enter a phone number…',
          validate: function(v){ return v === 'My number' || /^\+?[0-9 ]{8,15}$/.test(String(v).trim()) ? null : 'Please enter a valid phone number.'; }
        },
        {
          key: 'amount', type: 'chips',
          prompt: function(ctx){ return 'How much airtime for ' + ctx.network + '?'; },
          options: function(){ return ['M10', 'M20', 'M50', 'M100']; },
          allowOther: true, otherPlaceholder: 'Custom amount (M)',
          normalize: function(v){ const n = parseAmount(v); return n > 0 ? String(n) : null; },
          validate: function(v){ const n = parseAmount(v); return n >= 5 && n <= 1000 ? null : 'Airtime can be between M5 and M1,000.'; }
        },
        fromAccountStep(),
        {
          key: 'confirm', type: 'confirm',
          prompt: function(ctx){ return 'Buy ' + money(parseAmount(ctx.amount)) + ' of ' + ctx.network + ' airtime for ' + (ctx.number === 'My number' ? 'your number' : ctx.number) + '?'; }
        }
      ],
      execute: function(ctx){
        return api('/api/payments/airtime', { idem: ctx._idem, body: {
          fromAccountId: acc(ctx).id, billerId: findNetwork(ctx.network).id, amount: parseAmount(ctx.amount),
          phone: ctx.number === 'My number' ? USER_PHONE : String(ctx.number).trim()
        }});
      },
      successMessage: function(ctx){ return 'Done — ' + money(parseAmount(ctx.amount)) + ' of ' + ctx.network + ' airtime is on its way.'; }
    },

    internalTransfer: {
      steps: [
        {
          key: 'fromAccount', type: 'choice',
          prompt: 'Which account would you like to move money from?',
          options: function(){ return ACCOUNTS.filter(function(a){ return a.spendable; }).map(function(a){ return a.name; }); },
          normalize: function(v){ const a = findAccount(v); return a && a.spendable ? a.name : null; }
        },
        {
          key: 'toAccount', type: 'choice',
          prompt: 'And which account should receive it?',
          options: function(ctx){ return ACCOUNTS.map(function(a){ return a.name; }).filter(function(n){ return n !== ctx.fromAccount; }); },
          normalize: function(v, ctx){ const a = findAccount(v); return a && a.name !== ctx.fromAccount ? a.name : null; },
          skipIf: function(ctx){
            const remaining = ACCOUNTS.filter(function(a){ return a.name !== ctx.fromAccount; });
            if(remaining.length === 1){ ctx.toAccount = remaining[0].name; return true; }
            return false;
          }
        },
        {
          key: 'amount', type: 'text', inputType: 'number', placeholder: 'Amount (M)',
          prompt: function(ctx){ return 'How much would you like to move from ' + ctx.fromAccount + ' to ' + ctx.toAccount + '?'; },
          normalize: function(v){ const n = parseAmount(v); return n > 0 ? String(n) : null; },
          validate: function(value, ctx){
            const amt = parseAmount(value); const a = acc(ctx);
            if(!(amt > 0)) return 'Please enter an amount greater than zero.';
            if(a && amt > a.balance) return 'Your ' + ctx.fromAccount + ' account only has ' + money(a.balance) + ' available — try a smaller amount.';
            return null;
          }
        },
        {
          key: 'confirm', type: 'confirm',
          prompt: function(ctx){ return 'Move ' + money(parseAmount(ctx.amount)) + ' from ' + ctx.fromAccount + ' to ' + ctx.toAccount + '?'; }
        }
      ],
      execute: function(ctx){
        return api('/api/transfers/internal', { idem: ctx._idem, body: { fromAccountId: acc(ctx).id, toAccountId: acc(ctx, 'toAccount').id, amount: parseAmount(ctx.amount) } });
      },
      successMessage: function(ctx){ return 'Done. ' + money(parseAmount(ctx.amount)) + ' moved to your ' + ctx.toAccount + ' account.'; }
    },

    setLimit: {
      steps: [
        {
          key: 'amount', type: 'text', inputType: 'number',
          prompt: function(){
            const card = CARDS[activeCardIndex];
            return 'Your daily limit on the ' + card.label + ' card is ' + money(card.dailyLimit) + '. What would you like the new limit to be?';
          },
          placeholder: 'New daily limit (M)',
          normalize: function(v){ const n = parseAmount(v); return n > 0 ? String(n) : null; },
          validate: function(value){
            const amt = parseAmount(value);
            if(!(amt > 0)) return 'Please enter an amount greater than zero.';
            if(amt > 100000) return "That's higher than I can set here — try an amount up to M100,000.";
            return null;
          }
        },
        {
          key: 'confirm', type: 'confirm',
          prompt: function(ctx){ return 'Set your ' + CARDS[activeCardIndex].label + ' card’s daily spending limit to ' + money(parseAmount(ctx.amount)) + '?'; }
        }
      ],
      execute: function(ctx){
        const card = CARDS[activeCardIndex]; const amt = parseAmount(ctx.amount);
        return api('/api/cards/' + card.id + '/limits', { method: 'PATCH', body: { daily: amt, monthly: Math.max(card.monthlyLimit, amt) } });
      },
      successMessage: function(ctx){ return 'Updated. Your ' + CARDS[activeCardIndex].label + ' card now has a daily limit of ' + money(parseAmount(ctx.amount)) + '.'; }
    },

    addBeneficiary: {
      steps: [
        { key: 'name', type: 'text', prompt: "What's the beneficiary's full name?", placeholder: 'Full name',
          validate: function(v){ return String(v).trim().length >= 2 ? null : 'Please enter their full name.'; } },
        {
          key: 'bank', type: 'chips',
          prompt: function(ctx){ return 'Which bank does ' + ctx.name + ' use?'; },
          options: function(){ return LOCAL_BANKS.slice(); },
          allowOther: true, otherPlaceholder: 'Type the bank name…'
        },
        {
          key: 'accountNumber', type: 'text', inputType: 'number',
          prompt: 'And their account number?', placeholder: 'Account number',
          validate: function(value){
            return /^[0-9]{6,20}$/.test(String(value).replace(/\s/g, '')) ? null : 'That doesn’t look like a full account number — please check and try again.';
          }
        },
        {
          key: 'confirm', type: 'confirm',
          prompt: function(ctx){ return 'Save ' + ctx.name + ' (' + ctx.bank + ', account ending ' + String(ctx.accountNumber).replace(/\s/g, '').slice(-4) + ') as a beneficiary?'; }
        }
      ],
      execute: function(ctx){
        return api('/api/beneficiaries', { body: { name: String(ctx.name).trim(), bankName: ctx.bank, accountNumber: String(ctx.accountNumber).replace(/\s/g, '') } });
      },
      successMessage: function(ctx){ return ctx.name + ' is saved as a beneficiary.'; }
    },

    removeBeneficiary: {
      steps: [
        { key: 'confirm', type: 'confirm', prompt: function(ctx){ return 'Remove ' + ctx.beneficiary + ' from your beneficiaries?'; } }
      ],
      execute: function(ctx){ return api('/api/beneficiaries/' + findBeneficiary(ctx.beneficiary).id, { method: 'DELETE' }); },
      successMessage: function(ctx){ return ctx.beneficiary + ' has been removed.'; }
    },

    orderCard: {
      steps: [
        {
          key: 'cardChoice', type: 'chips',
          prompt: 'Which card would you like?',
          options: function(){ return cardChoices().map(function(c){ return c.label; }); },
          normalize: function(v){ const c = fuzzyFind(cardChoices(), v, 'label'); return c ? c.label : null; }
        },
        {
          key: 'form', type: 'choice',
          prompt: function(ctx){ return 'Would you like the ' + ctx.cardChoice.replace(/^New /, '') + ' as virtual or physical?'; },
          options: function(){ return ['Virtual', 'Physical']; },
          normalize: function(v){ return /virt/i.test(v) ? 'Virtual' : /phys/i.test(v) ? 'Physical' : null; }
        },
        {
          key: 'address', type: 'text',
          prompt: 'What address should we deliver it to?',
          placeholder: 'Delivery address',
          skipIf: function(ctx){ return ctx.form === 'Virtual'; },
          validate: function(v){ return String(v).trim().length >= 8 ? null : 'Please give a full delivery address, including your town.'; }
        },
        {
          key: 'confirm', type: 'confirm',
          prompt: function(ctx){
            return ctx.form === 'Virtual'
              ? 'Issue a virtual ' + ctx.cardChoice.replace(/^New /, '') + ' right away?'
              : 'Order a physical ' + ctx.cardChoice.replace(/^New /, '') + ', delivered to "' + ctx.address + '"? Delivery takes 3–5 business days.';
          }
        }
      ],
      execute: function(ctx){
        const c = fuzzyFind(cardChoices(), ctx.cardChoice, 'label');
        return api('/api/cards', { body: {
          kind: c.kind, accountId: c.accountId || undefined, replacesCardId: c.replacesCardId || undefined,
          form: ctx.form === 'Physical' ? 'PHYSICAL' : 'VIRTUAL', deliveryAddress: ctx.address || undefined
        }});
      },
      successMessage: function(ctx){ return ctx.form === 'Virtual' ? 'Your new card is ready to use — you’ll find it in Cards.' : 'Your card is ordered. I’ll let you know when it’s on its way.'; }
    },

    freezeCard: {
      steps: [{ key: 'confirm', type: 'confirm', prompt: function(){ return 'Freeze your ' + CARDS[activeCardIndex].label + ' card ending ' + CARDS[activeCardIndex].last4 + '?'; } }],
      execute: function(){ return api('/api/cards/' + CARDS[activeCardIndex].id + '/status', { body: { action: 'freeze' } }); },
      successMessage: function(){ return 'Your ' + CARDS[activeCardIndex].label + ' card is frozen — no new transactions will go through.'; }
    },
    unfreezeCard: {
      steps: [{ key: 'confirm', type: 'confirm', prompt: function(){ return 'Unfreeze your ' + CARDS[activeCardIndex].label + ' card ending ' + CARDS[activeCardIndex].last4 + '?'; } }],
      execute: function(){ return api('/api/cards/' + CARDS[activeCardIndex].id + '/status', { body: { action: 'unfreeze' } }); },
      successMessage: function(){ return 'Your ' + CARDS[activeCardIndex].label + ' card is active again.'; }
    },

    schedulePayment: {
      steps: [
        {
          key: 'payee', type: 'chips',
          prompt: 'Who should the scheduled payment go to?',
          options: function(){ return payees().slice(0, 8).map(function(p){ return p.label; }); },
          allowOther: true, otherPlaceholder: 'Beneficiary or biller name…',
          normalize: function(v){ const p = fuzzyFind(payees(), v, 'label'); return p ? p.label : null; },
          validate: function(v){ return fuzzyFind(payees(), v, 'label') ? null : 'Please choose a saved beneficiary or a biller.'; }
        },
        {
          key: 'reference', type: 'text', placeholder: 'Reference',
          prompt: function(ctx){ const p = fuzzyFind(payees(), ctx.payee, 'label'); return 'What is your ' + p.refLabel.toLowerCase() + '?'; },
          skipIf: function(ctx){ const p = fuzzyFind(payees(), ctx.payee, 'label'); return !p || !p.billerId; }
        },
        amountStep(function(ctx){ return 'How much should I pay ' + ctx.payee + ' each time?'; }),
        {
          key: 'frequency', type: 'choice', prompt: 'How often?',
          options: function(){ return ['Once', 'Weekly', 'Monthly', 'Quarterly']; },
          normalize: function(v){ const m = String(v).match(/once|week|month|quarter/i); return m ? { once: 'Once', week: 'Weekly', month: 'Monthly', quarter: 'Quarterly' }[m[0].toLowerCase()] : null; }
        },
        {
          key: 'startDate', type: 'chips', prompt: 'When should the first payment go?',
          options: function(){ return ['Tomorrow', '1st of next month']; },
          allowOther: true, otherPlaceholder: 'Date, e.g. 2026-10-15',
          validate: function(v){ const d = resolveDate(v); return d && d >= new Date(new Date().toDateString()) ? null : 'Please give a date from today onwards, like 2026-10-15.'; }
        },
        {
          key: 'fromAccount', type: 'choice', prompt: 'Which account should it come from?',
          options: function(){ return ACCOUNTS.filter(function(a){ return a.spendable; }).map(function(a){ return a.name; }); },
          normalize: function(v){ const a = findAccount(v); return a && a.spendable ? a.name : null; },
          skipIf: function(ctx){ const s = ACCOUNTS.filter(function(a){ return a.spendable; }); if(s.length === 1){ ctx.fromAccount = s[0].name; return true; } return false; }
        },
        {
          key: 'confirm', type: 'confirm',
          prompt: function(ctx){
            return 'Schedule ' + money(parseAmount(ctx.amount)) + ' to ' + ctx.payee + ', ' + ctx.frequency.toLowerCase() + ', starting ' + fmtDay(resolveDate(ctx.startDate)) + ', from your ' + ctx.fromAccount + ' account?';
          }
        }
      ],
      execute: function(ctx){
        const p = fuzzyFind(payees(), ctx.payee, 'label'); const d = resolveDate(ctx.startDate);
        return api('/api/scheduled', { body: {
          fromAccountId: acc(ctx).id, beneficiaryId: p.beneficiaryId, billerId: p.billerId, amount: parseAmount(ctx.amount),
          frequency: ctx.frequency.toUpperCase(), startDate: d.toISOString(), reference: ctx.reference
        }});
      },
      successMessage: function(ctx){ return 'Scheduled. The first payment to ' + ctx.payee + ' goes on ' + fmtDay(resolveDate(ctx.startDate)) + '.'; }
    },

    cancelScheduled: {
      steps: [{ key: 'confirm', type: 'confirm', prompt: function(ctx){ return 'Cancel the scheduled payment "' + ctx.label + '"?'; } }],
      execute: function(ctx){ return api('/api/scheduled/' + ctx.id, { method: 'DELETE' }); },
      successMessage: function(){ return 'That scheduled payment is cancelled.'; }
    },

    scanPay: {
      steps: [
        amountStep(function(ctx){ return 'How much would you like to pay ' + ctx.name + '?'; }),
        fromAccountStep(),
        { key: 'confirm', type: 'confirm', prompt: function(ctx){ return 'Pay ' + money(parseAmount(ctx.amount)) + ' to ' + ctx.name + ' (Citizen Bank account ending ' + String(ctx.accountNumber).slice(-4) + ') from your ' + ctx.fromAccount + ' account?'; } }
      ],
      execute: function(ctx){
        return api('/api/beneficiaries', { body: { name: ctx.name, bankName: 'Citizen Bank', accountNumber: ctx.accountNumber } })
          .then(function(r){
            return api('/api/payments/beneficiary', { idem: ctx._idem, body: { fromAccountId: acc(ctx).id, beneficiaryId: r.beneficiary.id, amount: parseAmount(ctx.amount), reference: ctx.reference } });
          });
      },
      successMessage: function(ctx, res){ return 'Paid ' + money(parseAmount(ctx.amount)) + ' to ' + ctx.name + '.' + sayRef(res); }
    }
  };

  function savedIntl(ctx){
    const c = findCountry(ctx.country); if(!c) return null;
    return BENEFICIARIES.filter(function(b){ return b.type === 'INTERNATIONAL' && b.country === c.code && norm(b.name) === norm(ctx.recipient); })[0] || null;
  }
  function payees(){
    return BENEFICIARIES.map(function(b){ return { label: b.name, beneficiaryId: b.id, refLabel: 'Reference' }; })
      .concat(payBillers().map(function(b){ return { label: b.name, billerId: b.id, refLabel: b.refLabel }; }));
  }
  function cardChoices(){
    const out = [];
    if(!CARDS.some(function(c){ return c.kind === 'CRYPTO'; })) out.push({ label: 'Crypto card', kind: 'CRYPTO' });
    CARDS.filter(function(c){ return c.kind === 'DEBIT'; }).forEach(function(c){
      out.push({ label: 'Replacement ' + c.label + ' card', kind: 'DEBIT', accountId: c.accountId, replacesCardId: c.id });
    });
    ACCOUNTS.filter(function(a){ return a.spendable && !CARDS.some(function(c){ return c.accountId === a.id; }); }).forEach(function(a){
      out.push({ label: 'New ' + a.name + ' debit card', kind: 'DEBIT', accountId: a.id });
    });
    return out;
  }
  function resolveDate(v){
    const s = String(v || '').trim().toLowerCase();
    const d = new Date(); d.setHours(8, 0, 0, 0);
    if(s === 'tomorrow'){ d.setDate(d.getDate() + 1); return d; }
    if(s === 'today') return d;
    if(/1st of next month|next month/.test(s)){ d.setMonth(d.getMonth() + 1, 1); return d; }
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m){ const x = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 8); return isNaN(x) ? null : x; }
    const p = Date.parse(v); return isNaN(p) ? null : new Date(p);
  }

  /* ---------------- Rendering (Accounts / Payments / profile) ---------------- */
  const ACCOUNT_ICONS = {
    CURRENT: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/></svg>',
    SAVINGS: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7z"/><circle cx="12" cy="9" r="2.4"/></svg>',
    FIXED_DEPOSIT: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>'
  };
  const TX_ICON_IN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7 7 7-7"/></svg>';
  const TX_ICON_OUT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7-7 7 7"/></svg>';
  const TX_ICON_BILL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/></svg>';

  function renderAccounts(){
    const total = ACCOUNTS.reduce(function(s, a){ return s + a.balance; }, 0);
    document.getElementById('totalBalanceAmount').textContent = formatRand(total);
    const localEl = document.getElementById('totalBalanceLocal');
    if(localEl){ const eq = localEquiv(total); localEl.textContent = eq ? eq + ' (indicative)' : ''; localEl.hidden = !eq; }
    const list = document.getElementById('accountList');
    list.innerHTML = '';
    ACCOUNTS.forEach(function(a){
      const row = document.createElement('button');
      row.className = 'account-row';
      row.innerHTML = '<span class="account-icon">' + (ACCOUNT_ICONS[a.type] || ACCOUNT_ICONS.CURRENT) + '</span>' +
        '<span class="account-info"><span class="account-name">' + escapeHtml(a.fullName) + '</span><span class="account-number">•••• ' + escapeHtml(a.last4) + '</span></span>' +
        '<span class="account-amount">' + formatRand(a.balance) + '</span><span class="account-chevron">›</span>';
      row.addEventListener('click', function(){
        const extra = a.type === 'FIXED_DEPOSIT' && a.maturesAt ? ' It earns ' + a.interestRate + '% and matures on ' + fmtDay(a.maturesAt) + '.' : '';
        goSpeak(['Your ' + a.fullName + ' has ' + money(a.balance) + ' available.' + extra]);
      });
      list.appendChild(row);
    });
  }

  function renderTransactions(){
    const list = document.getElementById('txList');
    list.innerHTML = '';
    if(!RECENT.length){ list.innerHTML = '<div class="tx-empty">No transactions yet.</div>'; return; }
    RECENT.slice(0, 8).forEach(function(t){
      const amt = Number(t.amount); const incoming = amt > 0;
      const icon = incoming ? TX_ICON_IN : (t.type === 'BILL_PAYMENT' || t.type === 'AIRTIME') ? TX_ICON_BILL : TX_ICON_OUT;
      const row = document.createElement('div');
      row.className = 'tx-row';
      row.innerHTML = '<span class="tx-icon ' + (incoming ? 'tx-in' : 'tx-out') + '">' + icon + '</span>' +
        '<span class="tx-info"><span class="tx-name">' + escapeHtml(t.narrative) + '</span><span class="tx-date">' + fmtDate(t.createdAt) + ' · ' + escapeHtml(shortName(t.accountName)) + '</span></span>' +
        '<span class="tx-amount' + (incoming ? ' tx-positive' : '') + '">' + (incoming ? '+' : '') + formatRand(amt) + '</span>';
      list.appendChild(row);
    });
  }

  function renderRecipients(){
    const row = document.getElementById('recipientRow');
    row.innerHTML = '';
    BENEFICIARIES.slice(0, 8).forEach(function(b){
      const chip = document.createElement('button');
      chip.className = 'recipient-chip';
      chip.innerHTML = '<span class="recipient-avatar">' + escapeHtml(initials(b.name)) + '</span><span class="recipient-chip-name">' + escapeHtml(b.name.split(' ')[0] + (b.name.split(' ')[1] ? ' ' + b.name.split(' ')[1][0] + '.' : '')) + '</span>';
      chip.addEventListener('click', function(){
        switchScreen('ai');
        setTimeout(function(){
          if(b.type === 'INTERNATIONAL'){ const c = XB_COUNTRIES.filter(function(x){ return x.code === b.country; })[0]; runStepFlow('crossBorder', { country: c ? c.name : undefined, recipient: b.name }); }
          else runStepFlow('sendMoney', { beneficiary: b.name });
        }, 260);
      });
      row.appendChild(chip);
    });
    if(!BENEFICIARIES.length){ row.innerHTML = '<div class="tx-empty">No saved beneficiaries yet — tap Beneficiaries to add one.</div>'; }
  }
  function addRecipientChipUI(){ renderRecipients(); }
  function refreshAccountBalancesUI(){ renderAccounts(); }

  function renderProfile(){
    const u = BOOT.user;
    document.getElementById('greetName').textContent = FIRST_NAME;
    document.querySelector('.profile-avatar').textContent = initials(u.firstName + ' ' + u.lastName);
    document.querySelector('.profile-name').textContent = u.firstName + ' ' + u.lastName;
    document.querySelector('.profile-sub').textContent = u.email;
    const dot = document.querySelector('#avatarBtn .dot');
    if(dot) dot.style.display = BOOT.unreadNotifications ? '' : 'none';
  }

  function renderAll(){
    renderAccounts();
    renderTransactions();
    renderRecipients();
    buildCardStack(); // defined with the wallet stack below; renderAll only runs after init
  }

  function clearFlowCanvas(){
    flowCanvas.classList.remove('active');
    flowCanvas.innerHTML = '';
    activeFlowResolver = null;
  }

  function renderFlowStep(step, ctx, resolve){
    flowCanvas.innerHTML = '';
    flowCanvas.classList.add('active');
    const wrap = document.createElement('div');
    wrap.className = 'flow-step';

    function finishStep(value){
      clearFlowCanvas();
      resolve(value);
    }

    function renderTextFallback(placeholder, inputType){
      wrap.innerHTML = '';
      const row = document.createElement('div');
      row.className = 'flow-text-row';
      const input = document.createElement('input');
      input.className = 'flow-text-input';
      input.type = inputType === 'number' ? 'number' : 'text';
      input.placeholder = placeholder;
      const submit = document.createElement('button');
      submit.className = 'flow-text-submit';
      submit.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>';
      function submitText(){ if(input.value.trim()) finishStep(input.value.trim()); }
      submit.addEventListener('click', submitText);
      input.addEventListener('keydown', function(e){ if(e.key === 'Enter') submitText(); });
      row.appendChild(input); row.appendChild(submit);
      wrap.appendChild(row);
      setTimeout(function(){ input.focus(); }, 50);
    }

    if(step.type === 'chips'){
      const row = document.createElement('div');
      row.className = 'flow-options';
      step.options(ctx).forEach(function(label){
        const chip = document.createElement('button');
        chip.className = 'flow-chip';
        chip.textContent = label;
        chip.addEventListener('click', function(){ finishStep(label); });
        row.appendChild(chip);
      });
      if(step.allowOther){
        const ghost = document.createElement('button');
        ghost.className = 'flow-chip flow-chip-ghost';
        ghost.textContent = '+ New';
        ghost.addEventListener('click', function(){ renderTextFallback(step.otherPlaceholder || 'Type here…'); });
        row.appendChild(ghost);
      }
      wrap.appendChild(row);

    } else if(step.type === 'choice'){
      const row = document.createElement('div');
      row.className = 'flow-choice-row';
      step.options(ctx).forEach(function(label){
        const btn = document.createElement('button');
        btn.className = 'flow-choice';
        btn.textContent = label;
        btn.addEventListener('click', function(){ finishStep(label); });
        row.appendChild(btn);
      });
      wrap.appendChild(row);

    } else if(step.type === 'text'){
      renderTextFallback(step.placeholder || 'Type your answer…', step.inputType);

    } else if(step.type === 'confirm'){
      const row = document.createElement('div');
      row.className = 'flow-confirm-row';
      const yes = document.createElement('button');
      yes.className = 'flow-confirm-btn primary';
      yes.textContent = 'Confirm';
      yes.addEventListener('click', function(){ finishStep('yes'); });
      const no = document.createElement('button');
      no.className = 'flow-confirm-btn secondary';
      no.textContent = 'Cancel';
      no.addEventListener('click', function(){ finishStep('no'); });
      row.appendChild(yes); row.appendChild(no);
      wrap.appendChild(row);
    }

    // Every step except confirm gets its own persistent cancel link — the
    // confirm step already has a dedicated Cancel button among its choices.
    if(step.type !== 'confirm'){
      const cancelLink = document.createElement('button');
      cancelLink.className = 'flow-cancel-link';
      cancelLink.textContent = 'Cancel';
      cancelLink.addEventListener('click', function(){ if(activeFlowCancel) activeFlowCancel(); });
      wrap.appendChild(cancelLink);
    }

    flowCanvas.appendChild(wrap);
    // Voice or the main input bar can also answer this step directly.
    activeFlowResolver = finishStep;
  }

  /* Runs a flow: asks for each missing slot, validates, then — only after the
     customer taps Confirm — calls flow.execute() against Core. `prefill` may
     come from the AI assistant or a tapped chip; it's normalised and validated
     exactly like a typed answer. `then` runs after a successful execute. */
  function runStepFlow(flowKey, prefill, then){
    const flow = FLOW_DEFS[flowKey];
    if(!flow) return;
    const steps = flow.steps;
    const ctx = {};
    Object.keys(prefill || {}).forEach(function(k){
      if(prefill[k] !== undefined && prefill[k] !== null && prefill[k] !== '') ctx[k] = String(prefill[k]);
    });
    ctx._idem = newIdem(); // one key per flow run: a double-tap or retry can never pay twice
    let i = 0;

    activeFlowCancel = function(){
      clearFlowCanvas();
      activeFlowCancel = null;
      setState('speaking');
      speakLines(['Cancelled.'], function(){ setState('idle'); });
    };

    function execute(){
      setState('thinking');
      Promise.resolve()
        .then(function(){ return flow.execute(ctx); })
        .then(function(res){
          const msg = typeof flow.successMessage === 'function' ? flow.successMessage(ctx, res) : (flow.successMessage || 'Done.');
          return refreshData().catch(function(){}).then(function(){
            setState('speaking');
            speakLines([msg], function(){
              setState('success');
              if(then) setTimeout(function(){ then(ctx, res); }, 1100);
            });
          });
        })
        .catch(function(err){
          setState('speaking');
          speakLines([err.message || 'Something went wrong. Nothing was charged — please try again.'], function(){ setState('idle'); });
        });
    }

    function accept(step, value){
      if(step.redirect){
        const r = step.redirect(value, ctx);
        if(r){
          clearFlowCanvas(); activeFlowCancel = null;
          setState('speaking');
          speakLines([r.intro || 'One moment.'], function(){ runStepFlow(r.flow, r.prefill, r.then); });
          return;
        }
      }
      if(step.validate){
        const err = step.validate(value, ctx);
        if(err){ presentStep(step, err); return; }
      }
      ctx[step.key] = step.normalize ? (step.normalize(value, ctx) || value) : value;
      i++;
      askNext();
    }

    function presentStep(step, retryError){
      const promptText = retryError || (typeof step.prompt === 'function' ? step.prompt(ctx) : step.prompt);
      setState('speaking');
      speakLines([promptText], function(){
        if(step.key === 'confirm') setState('confirm'); // otherwise the prompt stays on screen as the caption
        renderFlowStep(step, ctx, function(value){
          if(step.key === 'confirm'){
            activeFlowCancel = null;
            const v = String(value).trim();
            const yes = /^(y|yes)$/i.test(v) || (/\b(yes|confirm|proceed|go ahead|sure|ok|okay|ee|yebo)\b/i.test(v) && !/\b(no|cancel|stop|don'?t)\b/i.test(v));
            if(!yes){
              setState('speaking');
              speakLines(['No problem — cancelled. Nothing was sent.'], function(){ setState('idle'); });
            } else {
              execute();
            }
            return;
          }
          accept(step, value);
        });
      });
    }

    function askNext(){
      if(i >= steps.length){ clearFlowCanvas(); activeFlowCancel = null; setState('idle'); return; }
      const step = steps[i];

      // Pre-filled (by the AI or a chip): normalise + validate it like any answer.
      if(ctx[step.key] !== undefined && step.key !== 'confirm'){
        const raw = ctx[step.key];
        const normalized = step.normalize ? step.normalize(raw, ctx) : raw;
        const err = step.validate ? step.validate(normalized || raw, ctx) : null;
        if(step.redirect && !normalized && step.redirect(raw, ctx)){ delete ctx[step.key]; accept(step, raw); return; }
        if(normalized && !err){ ctx[step.key] = normalized; i++; askNext(); return; }
        delete ctx[step.key];
        if(err){ presentStep(step, err); return; }
      }

      if(step.guard){
        const guardMessage = step.guard(ctx);
        if(guardMessage){
          clearFlowCanvas(); activeFlowCancel = null;
          setState('speaking');
          speakLines([guardMessage], function(){ setState('idle'); });
          return;
        }
      }
      if(step.skipIf && step.skipIf(ctx)){ i++; askNext(); return; }
      presentStep(step);
    }
    askNext();
  }

  /* ---------------- Quick actions ---------------- */
  function balanceSentence(){
    const spendable = ACCOUNTS.filter(function(a){ return a.spendable; });
    if(!spendable.length) return "You don't have any transactional accounts yet.";
    const parts = spendable.map(function(a){ return a.name + ' has ' + money(a.balance); });
    return (parts.length > 1 ? 'Your ' + parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1] : 'Your ' + parts[0]) + ' available.';
  }

  const FLOWS = {
    'send-money': function(){ runStepFlow('sendMoney'); },
    'check-balance': function(){
      setState('speaking');
      const lines = [balanceSentence()];
      const eq = localEquiv(ACCOUNTS.filter(function(a){ return a.spendable; }).reduce(function(s, a){ return s + a.balance; }, 0));
      if(eq) lines.push('That’s roughly ' + eq.replace('≈ ', '') + ' in total.');
      speakLines(lines, function(){ setState('idle'); });
    },
    'manage-cards': function(){
      const active = CARDS.filter(function(c){ return c.status === 'ACTIVE'; }).length;
      const frozen = CARDS.filter(function(c){ return c.frozen; }).length;
      setState('speaking');
      speakLines(['You have ' + active + ' active card' + (active === 1 ? '' : 's') + (frozen ? ' and ' + frozen + ' frozen' : '') + '. Opening your cards now.'], function(){
        setState('idle'); switchScreen('cards');
      });
    },
    'pay-bills': function(){ runStepFlow('payBills'); },
    'cross-border': function(){ runStepFlow('crossBorder'); },
    'insights': function(){
      setState('thinking');
      api('/api/insights').then(function(r){
        setState('speaking');
        if(!r.thisMonth){ speakLines(["You haven't spent anything yet this month."], function(){ setState('idle'); }); return; }
        const top = r.byCategory[0];
        const lines = ["So far this month you've spent " + money(r.thisMonth) + (top ? ', mostly on ' + top.category.toLowerCase() + ' (' + money(top.thisMonth) + ').' : '.')];
        if(r.lastMonth) lines.push('For comparison, you spent ' + money(r.lastMonth) + ' in all of last month.');
        speakLines(lines, function(){ setState('idle'); });
      }).catch(function(e){ setState('speaking'); speakLines([e.message], function(){ setState('idle'); }); });
    }
  };

  /* ==========================================================
     Usage-based reordering — buttons re-rank themselves after
     every tap: most-used climbs toward the top-left, reading
     left-to-right along each row; least-used drifts to the end.
     Placement is row-major (fills row 1 left-to-right, then row 2),
     computed manually since CSS Grid auto-flow can't do that with
     an unbounded, horizontally-scrolling column count. Falls back
     to a single scrolling row if the viewport is too short for two.
     ========================================================== */
  const qaChips = Array.from(document.querySelectorAll('.qa-chip'));
  const usage = {};
  qaChips.forEach(function(chip){
    usage[chip.getAttribute('data-flow')] = parseInt(chip.getAttribute('data-base-usage'), 10) || 0;
  });

  function layoutQuickActions(animate){
    const sorted = qaChips.slice().sort(function(a,b){
      return usage[b.getAttribute('data-flow')] - usage[a.getAttribute('data-flow')];
    });

    const oldRects = {};
    if(animate){
      sorted.forEach(function(chip){ oldRects[chip.getAttribute('data-flow')] = chip.getBoundingClientRect(); });
    }

    // single scrolling row, left-to-right — most-used first
    sorted.forEach(function(chip, idx){ chip.style.order = idx; });

    if(animate){
      requestAnimationFrame(function(){
        sorted.forEach(function(chip){
          const key = chip.getAttribute('data-flow');
          const oldRect = oldRects[key];
          const newRect = chip.getBoundingClientRect();
          const dx = oldRect.left - newRect.left;
          const dy = oldRect.top - newRect.top;
          if(Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5){
            anime.set(chip, { translateX: dx, translateY: dy });
            anime({ targets: chip, translateX: 0, translateY: 0, duration: 420, easing: 'easeOutCubic' });
          }
        });
      });
    }
  }

  qaChips.forEach(function(chip){
    chip.addEventListener('click', function(){
      const key = chip.getAttribute('data-flow');
      usage[key] += 1;              // this button just got more "frequently used"
      layoutQuickActions(true);     // re-rank with a smooth reorder animation
      const flow = FLOWS[key];
      if(flow) flow();
    });
  });

  let resizeTimer = null;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function(){ layoutQuickActions(false); }, 150);
  });

  layoutQuickActions(false);

  /* ---------------- Auto-scroll the action strip slowly while idle ----------------
     So the user notices there's more to see without having to swipe. Pauses the
     moment they touch/scroll it themselves, and again while the AI is not idle. */
  let qaAutoDir = 1;
  let qaUserTouching = false;
  let qaResumeTimer = null;
  function qaPauseForInteraction(){
    qaUserTouching = true;
    clearTimeout(qaResumeTimer);
    qaResumeTimer = setTimeout(function(){ qaUserTouching = false; }, 2200);
  }
  quickActionsEl.addEventListener('pointerdown', qaPauseForInteraction);
  quickActionsEl.addEventListener('wheel', qaPauseForInteraction, { passive: true });
  quickActionsEl.addEventListener('touchstart', qaPauseForInteraction, { passive: true });

  function qaAutoScrollTick(){
    if(currentState === 'idle' && !qaUserTouching){
      const maxScroll = quickActionsEl.scrollWidth - quickActionsEl.clientWidth;
      if(maxScroll > 1){
        let next = quickActionsEl.scrollLeft + qaAutoDir * 0.22; // slow drift
        if(next >= maxScroll){ next = maxScroll; qaAutoDir = -1; }
        else if(next <= 0){ next = 0; qaAutoDir = 1; }
        quickActionsEl.scrollLeft = next;
      }
    }
    requestAnimationFrame(qaAutoScrollTick);
  }
  requestAnimationFrame(qaAutoScrollTick);

  /* ==========================================================
     Citizen AI conversation — typed or spoken requests go to
     Core's /api/assistant (Claude). Read-only answers are spoken
     directly; anything that moves money comes back as a proposed
     flow, which runs through runStepFlow and its Confirm step.
     ========================================================== */
  const CHAT = [];
  const AI_FLOW_MAP = {
    sendMoney: 'sendMoney', payBills: 'payBills', crossBorder: 'crossBorder', airtime: 'airtime',
    internalTransfer: 'internalTransfer', setLimit: 'setLimit', addBeneficiary: 'addBeneficiary',
    orderCard: 'orderCard', freezeCard: 'freezeCard', unfreezeCard: 'unfreezeCard'
  };

  /* Splits a reply into caption-sized sentences without breaking "M56,707.50" or "e.g." */
  function splitSentences(text){
    const t = String(text).replace(/\s+/g, ' ').trim();
    const out = []; let start = 0;
    for(let k = 0; k < t.length; k++){
      const ch = t[k];
      if((ch === '.' || ch === '!' || ch === '?') && (k === t.length - 1 || (t[k + 1] === ' ' && /[A-Z0-9"'(\u00C0-\u024F]/.test(t[k + 2] || '')))){
        const piece = t.slice(start, k + 1).trim();
        if(piece) out.push(piece);
        start = k + 1;
      }
    }
    if(start < t.length && t.slice(start).trim()) out.push(t.slice(start).trim());
    const merged = []; // merge very short fragments so captions don't flicker
    out.forEach(function(p){ if(merged.length && merged[merged.length - 1].length < 28) merged[merged.length - 1] += ' ' + p; else merged.push(p); });
    return merged.slice(0, 5);
  }

  function interruptSpeech(){ clearTimeout(speechTimer); stopVoice(); stopWordPulses(); }

  function startActionFromAI(action){
    const flowKey = AI_FLOW_MAP[action.flow];
    if(!flowKey){ setState('idle'); return; }
    const prefill = Object.assign({}, action.prefill || {});
    if((flowKey === 'setLimit' || flowKey === 'freezeCard' || flowKey === 'unfreezeCard') && prefill.card){
      const c = findCard(prefill.card); if(c){ activeCardIndex = CARDS.indexOf(c); layoutStack(false); }
    }
    if(flowKey === 'airtime' && prefill.number && USER_PHONE && norm(prefill.number) === norm(USER_PHONE)) prefill.number = 'My number';
    runStepFlow(flowKey, prefill);
  }

  /* Offline fallback when the AI backend isn't configured: simple intents. */
  function localIntent(text){
    const t = text.toLowerCase();
    const amt = (t.match(/(?:m|r|maloti\s*)?\s?(\d[\d,]*(?:\.\d{1,2})?)/) || [])[1];
    if(/balance|how much (do|have) i/.test(t)) return FLOWS['check-balance']();
    if(/airtime|data|top ?up/.test(t)) return runStepFlow('airtime', { amount: amt });
    if(/bill|electric|lec|wasco|water|dstv/.test(t)) return runStepFlow('payBills', { amount: amt });
    if(/abroad|cross|international|south africa|botswana|zimbabwe|mozambique/.test(t)) return runStepFlow('crossBorder', { amount: amt });
    if(/between|to (my )?savings|to (my )?current|move/.test(t)) return runStepFlow('internalTransfer', { amount: amt });
    if(/freeze|lost|stolen/.test(t)) return runStepFlow('freezeCard');
    if(/limit/.test(t)) return runStepFlow('setLimit', { amount: amt });
    if(/card/.test(t)) return FLOWS['manage-cards']();
    if(/spend|insight/.test(t)) return FLOWS['insights']();
    if(/send|pay|transfer/.test(t)){
      const who = BENEFICIARIES.filter(function(b){ return t.indexOf(b.name.split(' ')[0].toLowerCase()) >= 0; })[0];
      return runStepFlow('sendMoney', { beneficiary: who ? who.name : undefined, amount: amt });
    }
    setState('speaking');
    speakLines(["I can help with balances, payments, bills, airtime, cross-border transfers and your cards. Try one of the buttons below."], function(){ setState('idle'); });
  }

  function askAI(text, extras){
    extras = extras || {};
    if(currentScreen !== 'ai') switchScreen('ai');
    setState('thinking');
    CHAT.push({ role: 'user', content: text });
    while(CHAT.length > 12) CHAT.shift();
    api('/api/assistant', { body: {
      messages: CHAT, language: currentLanguage,
      image: extras.image, location: extras.location || LAST_LOCATION || undefined
    }}).then(function(res){
      CHAT.push({ role: 'assistant', content: res.reply });
      setState('speaking');
      speakLines(splitSentences(res.reply), function(){
        if(res.action) startActionFromAI(res.action);
        else setState('idle');
      });
    }).catch(function(err){
      CHAT.pop();
      if(err.code === 'AI_OFFLINE' && !extras.image){ localIntent(text); return; }
      setState('speaking');
      speakLines([err.message], function(){ setState('idle'); });
    });
  }

  function submitUtterance(text){
    text = String(text || '').trim();
    if(!text) return;
    if(activeFlowResolver){
      if(/^(cancel|stop|never ?mind|khansela|emisa)$/i.test(text)){ if(activeFlowCancel) activeFlowCancel(); return; }
      activeFlowResolver(text);
      return;
    }
    if(activeFlowCancel){ activeFlowCancel = null; clearFlowCanvas(); }
    askAI(text);
  }

  /* ---------------- Voice input (Web Speech API where available) ---------------- */
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const SPEECH_LANG = { en: 'en-ZA', st: 'en-ZA', zu: 'zu-ZA' }; // no browser ships Sesotho recognition yet
  let recognizer = null;
  let listening = false;

  function startListening(){
    if(!SpeechRec){
      setState('speaking');
      speakLines(["Voice input isn't available in this browser — type your request below instead."], function(){ setState('idle'); requestInput.focus(); });
      return;
    }
    recognizer = new SpeechRec();
    recognizer.lang = SPEECH_LANG[currentLanguage] || 'en-ZA';
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    let finalText = '';
    const prevState = currentState;
    recognizer.onresult = function(e){
      let interim = '';
      for(let k = e.resultIndex; k < e.results.length; k++){
        if(e.results[k].isFinal) finalText += e.results[k][0].transcript; else interim += e.results[k][0].transcript;
      }
      requestInput.value = (finalText + ' ' + interim).trim();
    };
    recognizer.onerror = function(e){
      listening = false;
      if(e.error === 'not-allowed' || e.error === 'service-not-allowed'){
        setState('speaking'); speakLines(['I need microphone permission to hear you. You can type instead.'], function(){ setState('idle'); });
      }
    };
    recognizer.onend = function(){
      listening = false;
      const text = (finalText || requestInput.value).trim();
      requestInput.value = '';
      if(text) submitUtterance(text);
      else if(currentState === 'listening') setState(activeFlowResolver ? prevState : 'idle');
    };
    listening = true;
    setState('listening');
    try{ recognizer.start(); }catch(e){ listening = false; setState('idle'); }
  }
  function stopListening(){ if(recognizer && listening){ try{ recognizer.stop(); }catch(e){} } }

  micBtn.addEventListener('click', function(){
    if(currentScreen !== 'ai') switchScreen('ai');
    if(listening){ stopListening(); return; }
    if(currentState === 'thinking') return;
    if(currentState === 'speaking') interruptSpeech();
    startListening();
  });

  sendBtn.addEventListener('click', function(){
    const text = requestInput.value.trim();
    requestInput.value = '';
    if(!text){ requestInput.focus(); return; }
    if(!activeFlowResolver && currentState === 'thinking') return; // a request is already in flight
    if(currentState === 'speaking') interruptSpeech();
    submitUtterance(text);
  });
  requestInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter') sendBtn.click();
  });

  /* ==========================================================
     Attachment panel — clicking the money-clip icon lifts the
     input bar up and reveals a row of extra features in the
     space it vacates: location, files, contacts, camera, a
     voice note, and scan-to-pay.
     ========================================================== */
  let attachOpen = false;
  function openAttachPanel(){
    attachOpen = true;
    clipBtn.classList.add('open');
    attachmentPanel.classList.add('open');
    inputBar.classList.add('raised');
    if(currentScreen === 'ai') quickActionsWrapEl.classList.add('hidden');
  }
  function closeAttachPanel(){
    attachOpen = false;
    clipBtn.classList.remove('open');
    attachmentPanel.classList.remove('open');
    inputBar.classList.remove('raised');
    if(currentScreen === 'ai' && currentState === 'idle') quickActionsWrapEl.classList.remove('hidden');
  }
  clipBtn.addEventListener('click', function(){
    attachOpen ? closeAttachPanel() : openAttachPanel();
  });

  document.addEventListener('click', function(e){
    if(!attachOpen) return;
    if(clipBtn.contains(e.target) || attachmentPanel.contains(e.target)) return;
    closeAttachPanel();
  });

  function respondWithLine(text){
    if(currentScreen !== 'ai') switchScreen('ai');
    setState('speaking');
    speakLines([text], function(){ setState('idle'); });
  }

  function captionThen(text, then){
    if(currentScreen !== 'ai') switchScreen('ai');
    setState('speaking');
    speakLines([text], then || function(){ setState('idle'); });
  }

  /* Downscales an image (File, video frame…) to a JPEG the assistant can read. */
  function imageToPayload(source, w, h){
    const max = 1400;
    const scale = Math.min(1, max / Math.max(w, h));
    const canvas = document.getElementById('cameraCanvas');
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
    return { mediaType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.85).split(',')[1] };
  }

  function speakNearestBranches(lat, lng){
    setState('thinking');
    const q = lat !== undefined ? '?lat=' + lat + '&lng=' + lng : '';
    api('/api/branches' + q).then(function(list){
      if(!list.length) return captionThen("I couldn't find a branch near you yet.");
      const b = list[0];
      const dist = b.distanceKm !== null ? ', about ' + b.distanceKm + ' kilometres away' : '';
      captionThen('Your nearest is ' + b.name.replace(' (planned)', '') + ' on ' + b.address + ', ' + b.city + dist + '. ' + (b.name.indexOf('planned') >= 0 ? 'It opens once Citizen Bank is licensed.' : (b.hours || '')));
    }).catch(function(e){ captionThen(e.message); });
  }

  document.querySelectorAll('.attach-tile').forEach(function(tile){
    tile.addEventListener('click', function(){
      const kind = tile.getAttribute('data-attach');
      closeAttachPanel();

      if(kind === 'location'){
        if(!navigator.geolocation) return captionThen("This browser doesn't support sharing your location.");
        captionThen('Getting your location…', function(){});
        navigator.geolocation.getCurrentPosition(function(pos){
          LAST_LOCATION = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          askAI('I have shared my location. What is my nearest Citizen Bank branch?', { location: LAST_LOCATION });
        }, function(){
          captionThen("I wasn't able to access your location — check your browser's permission settings.");
        }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
      }

      else if(kind === 'file'){ hiddenFileInput.click(); }

      else if(kind === 'contact'){
        if(navigator.contacts && navigator.contacts.select){
          navigator.contacts.select(['name', 'tel'], { multiple: false }).then(function(contacts){
            if(!contacts || !contacts.length) return captionThen('No contact was selected.');
            const c = contacts[0];
            const name = (c.name && c.name[0]) || 'that contact';
            const tel = c.tel && c.tel[0];
            if(!tel) return captionThen(name + " doesn't have a phone number saved.");
            captionThen('Got ' + name + '. Let’s buy them some airtime.', function(){ runStepFlow('airtime', { number: tel.replace(/[^\d+ ]/g, '') }); });
          }).catch(function(){ captionThen("I couldn't access your contacts just now."); });
        } else {
          captionThen("Picking a contact isn't supported in this browser. You can type their number when I ask for it.");
        }
      }

      else if(kind === 'camera'){ openCameraModal('photo'); }
      else if(kind === 'voice'){ if(!listening) startListening(); }
      else if(kind === 'scan'){ openCameraModal('scan'); }
    });
  });

  hiddenFileInput.setAttribute('accept', 'image/*');
  hiddenFileInput.removeAttribute('multiple');
  hiddenFileInput.addEventListener('change', function(){
    const file = hiddenFileInput.files && hiddenFileInput.files[0];
    hiddenFileInput.value = '';
    if(!file) return;
    if(!/^image\//.test(file.type)) return captionThen("For now I can only look at photos — screenshots, receipts, invoices or QR codes.");
    const img = new Image();
    img.onload = function(){
      const payload = imageToPayload(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(img.src);
      askAI('I have attached an image (' + file.name + '). Please tell me what it shows and whether you can help me act on it.', { image: payload });
    };
    img.onerror = function(){ captionThen("I couldn't open that image."); };
    img.src = URL.createObjectURL(file);
  });

  /* ---------------- Camera: show Citizen AI something, or scan a QR to pay ---------------- */
  let cameraStream = null;
  let cameraMode = 'photo';
  let scanLoop = null;

  /* Citizen Bank pay QR: citizenbank://pay?acc=1057453449&name=Kwena%20Spaza&amount=150&ref=INV12 */
  function parsePayQR(raw){
    try{
      const u = new URL(raw.replace(/^citizenbank:\/\//i, 'https://citizenbank.local/'));
      const accNo = (u.searchParams.get('acc') || '').replace(/\D/g, '');
      if(!/pay/i.test(u.pathname) || accNo.length < 6) return null;
      return { accountNumber: accNo, name: (u.searchParams.get('name') || 'Merchant').slice(0, 60), amount: u.searchParams.get('amount') || undefined, reference: (u.searchParams.get('ref') || '').slice(0, 40) || undefined };
    }catch(e){ return null; }
  }

  function openCameraModal(mode){
    cameraMode = mode || 'photo';
    cameraModal.classList.toggle('scan-mode', cameraMode === 'scan');
    cameraHint.textContent = cameraMode === 'scan' ? 'Point the camera at a Citizen Bank QR code to pay' : "Point the camera at what you'd like Citizen AI to look at";
    cameraCapture.style.display = cameraMode === 'scan' ? 'none' : '';
    cameraModal.classList.add('open');
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ cameraHint.textContent = "This browser can't access the camera."; return; }
    if(cameraMode === 'scan' && !('BarcodeDetector' in window)){
      cameraHint.textContent = "QR scanning isn't supported in this browser yet — try Chrome on Android, or upload a photo of the code.";
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function(stream){
      cameraStream = stream;
      cameraVideo.srcObject = stream;
      if(cameraMode === 'scan' && 'BarcodeDetector' in window){
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        scanLoop = setInterval(function(){
          if(cameraVideo.readyState < 2) return;
          detector.detect(cameraVideo).then(function(codes){
            if(!codes.length) return;
            const pay = parsePayQR(codes[0].rawValue);
            closeCameraModal();
            if(!pay) return captionThen("That QR code isn't a Citizen Bank payment code.");
            captionThen("I've read the code — it's for " + pay.name + '.', function(){ runStepFlow('scanPay', pay); });
          }).catch(function(){});
        }, 400);
      }
    }).catch(function(){
      cameraHint.textContent = "Couldn't access the camera — check your browser's permission settings.";
    });
  }
  function closeCameraModal(){
    clearInterval(scanLoop); scanLoop = null;
    cameraModal.classList.remove('open');
    cameraModal.classList.remove('scan-mode');
    if(cameraStream){ cameraStream.getTracks().forEach(function(track){ track.stop(); }); cameraStream = null; }
  }
  cameraClose.addEventListener('click', closeCameraModal);
  cameraCapture.addEventListener('click', function(){
    if(!cameraVideo.videoWidth){ closeCameraModal(); return; }
    const payload = imageToPayload(cameraVideo, cameraVideo.videoWidth, cameraVideo.videoHeight);
    closeCameraModal();
    askAI("I've taken a photo. Please tell me what it shows and whether you can help me act on it.", { image: payload });
  });

  orbWrap.addEventListener('click', function(){
    if(currentState === 'idle' && !activeFlowResolver){
      const cfg = LANGUAGES[currentLanguage];
      setState('speaking');
      speakLines([greetingLead() + ', ' + FIRST_NAME + '.', cfg.greetSub], function(){ setState('idle'); });
    }
  });

  /* ==========================================================
     Screen navigation — Accounts / Payments / Cards / More are
     real, switchable screens. The input bar and nav stay outside
     the screens container, so they never move; each screen scrolls
     independently only if its own content is taller than the space.
     ========================================================== */
  let currentScreen = 'ai';

  function updateTopbarAccent(){
    // no-op: the topbar center is now the status pill, not a screen-name label
  }

  function switchScreen(key){
    if(key === currentScreen) return;
    if(attachOpen) closeAttachPanel();
    if(activeFlowCancel && currentScreen === 'ai' && key !== 'ai'){
      clearFlowCanvas();
      activeFlowCancel = null;
      setState('idle');
    }
    const outgoing = document.getElementById('screen-' + currentScreen);
    const incoming = document.getElementById('screen-' + key);
    if(!incoming) return;

    document.querySelectorAll('.navitem').forEach(function(item){
      item.classList.toggle('active', item.getAttribute('data-screen') === key);
    });

    anime({ targets: outgoing, opacity: [1, 0], duration: 140, easing: 'easeInQuad', complete: function(){
      outgoing.classList.remove('active');
      incoming.classList.add('active');
      anime.set(incoming, { opacity: 0 });
      anime({ targets: incoming, opacity: [0, 1], duration: 220, easing: 'easeOutQuad' });
    }});

    currentScreen = key;
    updateTopbarAccent();
    document.getElementById('quickActionsWrap').classList.toggle('hidden', key !== 'ai');
  }

  document.querySelectorAll('.navitem').forEach(function(item){
    item.addEventListener('click', function(){ switchScreen(item.getAttribute('data-screen')); });
  });

  /* Speaking/typing to the AI from any screen jumps to the AI screen,
     since that's where the orb visualises the response. */
  micBtn.addEventListener('click', function(){ if(currentScreen !== 'ai') switchScreen('ai'); });
  sendBtn.addEventListener('click', function(){ if(currentScreen !== 'ai') switchScreen('ai'); });

  /* Accounts screen: "Transfer between accounts" is a distinct feature
     from Payments' external transfers — it hands off to the AI to
     narrate moving money between the user's own accounts. */
  document.getElementById('internalTransferBtn').addEventListener('click', function(){
    switchScreen('ai');
    setTimeout(function(){ runStepFlow('internalTransfer'); }, 260);
  });

  /* Payments screen: Send money / Pay bills / Cross-border reuse the
     same FLOWS as the AI home quick actions. */
  document.querySelectorAll('.feature-tile[data-flow]').forEach(function(tile){
    tile.addEventListener('click', function(){
      const flow = FLOWS[tile.getAttribute('data-flow')];
      switchScreen('ai');
      if(flow) setTimeout(flow, 260);
    });
  });
  function goSpeak(lines, then){
    switchScreen('ai');
    setTimeout(function(){
      setState('speaking');
      speakLines(lines, function(){ setState(then || 'idle'); });
    }, 260);
  }

  /* Shows a row of tappable chips in the flow canvas (menus that aren't a flow). */
  function showChipMenu(items, opts){
    opts = opts || {};
    activeFlowCancel = function(){ clearFlowCanvas(); activeFlowCancel = null; setState('idle'); };
    flowCanvas.innerHTML = '';
    flowCanvas.classList.add('active');
    const wrap = document.createElement('div');
    wrap.className = 'flow-step';
    const row = document.createElement('div');
    row.className = 'flow-options';
    items.forEach(function(it){
      const chip = document.createElement('button');
      chip.className = 'flow-chip' + (it.ghost ? ' flow-chip-ghost' : '') + (it.danger ? ' flow-chip-danger' : '');
      chip.textContent = it.label;
      chip.addEventListener('click', function(){ clearFlowCanvas(); activeFlowCancel = null; it.onClick(); });
      row.appendChild(chip);
    });
    wrap.appendChild(row);
    const cancelLink = document.createElement('button');
    cancelLink.className = 'flow-cancel-link';
    cancelLink.textContent = opts.cancelLabel || 'Close';
    cancelLink.addEventListener('click', function(){ if(activeFlowCancel) activeFlowCancel(); });
    wrap.appendChild(cancelLink);
    flowCanvas.appendChild(wrap);
    activeFlowResolver = null; // chip-only menu; typing falls through to Citizen AI
  }

  function beneficiaryMenu(removeMode){
    const items = BENEFICIARIES.map(function(b){
      return { label: (removeMode ? '✕ ' : '') + b.name, danger: removeMode, onClick: function(){
        if(removeMode) return runStepFlow('removeBeneficiary', { beneficiary: b.name });
        if(b.type === 'INTERNATIONAL'){ const c = XB_COUNTRIES.filter(function(x){ return x.code === b.country; })[0]; return runStepFlow('crossBorder', { country: c && c.name, recipient: b.name }); }
        runStepFlow('sendMoney', { beneficiary: b.name });
      }};
    });
    if(!removeMode){
      items.push({ label: '+ Add new', ghost: true, onClick: function(){ runStepFlow('addBeneficiary'); } });
      if(BENEFICIARIES.length) items.push({ label: '− Remove', ghost: true, onClick: function(){ beneficiaryMenu(true); } });
    }
    showChipMenu(items, { cancelLabel: removeMode ? 'Done' : 'Close' });
  }

  document.getElementById('beneficiariesBtn').addEventListener('click', function(){
    switchScreen('ai');
    setTimeout(function(){
      setState('speaking');
      const msg = BENEFICIARIES.length
        ? 'Here are your saved beneficiaries — tap one to pay them, or add someone new.'
        : "You haven't saved any beneficiaries yet. Let's add one.";
      speakLines([msg], function(){
        if(!BENEFICIARIES.length) return runStepFlow('addBeneficiary');
        beneficiaryMenu(false);
      });
    }, 260);
  });

  document.getElementById('scheduledBtn').addEventListener('click', function(){
    switchScreen('ai');
    setTimeout(function(){
      setState('speaking');
      const lines = SCHEDULED.length
        ? ['You have ' + SCHEDULED.length + ' scheduled payment' + (SCHEDULED.length === 1 ? '' : 's') + '.'].concat(SCHEDULED.slice(0, 3).map(function(s){
            return money(Number(s.amount)) + ' to ' + s.description.replace(/^Payment to /, '') + ', ' + s.frequency.toLowerCase() + ', next on ' + fmtDay(s.nextRunAt) + '.';
          }))
        : ["You don't have any scheduled payments yet."];
      speakLines(lines, function(){
        const items = SCHEDULED.map(function(s){
          const label = s.description.replace(/^Payment to /, '') + ' · ' + money(Number(s.amount));
          return { label: '✕ ' + label, danger: true, onClick: function(){ runStepFlow('cancelScheduled', { id: s.id, label: label }); } };
        });
        items.unshift({ label: '+ Schedule a payment', ghost: true, onClick: function(){ runStepFlow('schedulePayment'); } });
        showChipMenu(items);
      });
    }, 260);
  });

  document.getElementById('airtimeBtn').addEventListener('click', function(){
    switchScreen('ai');
    setTimeout(function(){ runStepFlow('airtime'); }, 260);
  });

  /* ==========================================================
     Cards screen — wallet stack
     -----------------------------------------------------------
     Cards are rendered from CARDS/activeCardIndex rather than
     static markup, so Freeze / View PIN / Set limit all act on
     whichever card is currently on top. Swiping the front card
     left or right (Tinder-style drag, with rotation and a
     fling-off-screen release) cycles to the next card; tapping a
     dot does the same without a drag gesture.
     ========================================================== */
  const cardStackEl = document.getElementById('cardStack');
  const cardStackDots = document.getElementById('cardStackDots');
  const favIconSrc = document.querySelector('#navAI img').src; // reuse the already-embedded logo, no duplicate asset

  const NETWORK_SVG = {
    a: '<svg width="30" height="20" viewBox="0 0 30 20" fill="none"><rect x="0.5" y="0.5" width="29" height="19" rx="4" stroke="rgba(255,255,255,0.6)"/><path d="M6 14l3-8h2l-3 8H6zm7-8h2l1.4 5.6L18 6h2l-2.6 8h-2L14 8.4 12.6 14H10.6L13 6zm10 0c-1.7 0-2.9.9-2.9 2.2 0 1 .8 1.5 1.8 1.9.9.4 1.2.6 1.2 1s-.5.7-1.1.7c-.9 0-1.5-.2-2.1-.5l-.3 1.6c.6.3 1.6.4 2.5.4 1.9 0 3.1-.9 3.1-2.3 0-.8-.5-1.4-1.7-2-.8-.3-1.3-.5-1.3-.9s.5-.6 1-.6c.7 0 1.3.1 1.8.4l.3-1.5c-.5-.2-1.3-.4-2.3-.4z" fill="white"/></svg>',
    b: '<svg width="26" height="18" viewBox="0 0 26 18" fill="none"><circle cx="10" cy="9" r="7.2" fill="#ff8a3d" fill-opacity="0.92"/><circle cx="16" cy="9" r="7.2" fill="#ff5a5a" fill-opacity="0.75"/></svg>',
    c: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(120,240,220,0.9)" stroke-width="1.6"/><path d="M9 8.5h4.2a2 2 0 010 4H9m0-4v8m0-4h4.6a2 2 0 010 4H9m0-8V7m0 9.5V17" stroke="rgba(120,240,220,0.9)" stroke-width="1.4" stroke-linecap="round"/></svg>'
  };
  const CHIP_SVG = '<svg width="34" height="26" viewBox="0 0 34 26" fill="none"><rect x="1" y="1" width="32" height="24" rx="4" fill="#ffe9a8" stroke="#caa23a" stroke-width="1"/><path d="M9 1v24M25 1v24M1 9h32M1 17h32" stroke="#caa23a" stroke-width="1"/></svg>';
  const SNOWFLAKE_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/></svg>';

  function accountBalanceFor(card){
    if(!card.accountId) return card.cryptoBalance; // crypto wallet isn't live yet → shows "—"
    const a = ACCOUNTS.filter(function(x){ return x.id === card.accountId; })[0];
    return a ? a.balance : null;
  }

  function cardSubtitle(card){
    if(card.status === 'ORDERED') return 'Physical card on its way';
    if(card.kind === 'CRYPTO') return card.form === 'physical' ? 'Physical card issued' : 'Virtual only · wallet coming soon';
    return card.form === 'physical' ? 'Virtual + Physical' : 'Virtual only';
  }

  function buildCardEl(card, index){
    const el = document.createElement('div');
    el.className = 'bank-card ' + card.cls + (card.frozen ? ' frozen' : '');
    el.dataset.index = index;
    el.innerHTML =
      '<div class="bank-card-frozen-overlay">' + SNOWFLAKE_SVG + '<span data-i18n-ui="cardFrozenLabel">Frozen</span></div>' +
      '<div class="bank-card-top">' +
        '<span class="bank-card-name">' + escapeHtml(card.label) + '</span>' +
        '<span class="bank-card-brand"><img src="' + favIconSrc + '" alt=""><span class="bank-card-brand-text">Citizen Bank</span></span>' +
      '</div>' +
      '<div class="bank-card-sub" id="cardSub-' + card.key + '">' + cardSubtitle(card) + '</div>' +
      '<div class="bank-card-chip">' + CHIP_SVG + '</div>' +
      '<div class="bank-card-balance-label" data-i18n-ui="availableBalance">Available Balance</div>' +
      '<div class="bank-card-balance-row">' +
        '<span class="bank-card-balance">' + formatRand(accountBalanceFor(card)) + '</span>' +
        '<span class="network-mark" title="Card network">' + NETWORK_SVG[card.network] + '</span>' +
        '<span class="contactless-mark" title="Contactless"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.8"><path d="M8.5 8.5a5 5 0 010 7M5.5 5.5a9 9 0 010 13M11.5 11.5a1 1 0 010 1"/></svg></span>' +
      '</div>';
    return el;
  }

  function buildCardStack(){
    cardStackEl.innerHTML = '';
    CARDS.forEach(function(card, i){
      const el = buildCardEl(card, i);
      cardStackEl.appendChild(el);
      card.el = el;
    });
    attachDragHandlers();
    layoutStack(false);
  }

  function updateCardDots(){
    cardStackDots.innerHTML = '';
    CARDS.forEach(function(card, i){
      const dot = document.createElement('button');
      dot.className = 'card-dot' + (i === activeCardIndex ? ' active' : '');
      dot.title = card.label;
      dot.addEventListener('click', function(){
        if(i === activeCardIndex) return;
        activeCardIndex = i;
        layoutStack(true);
      });
      cardStackDots.appendChild(dot);
    });
  }


  function layoutStack(animate){
    const N = CARDS.length;
    CARDS.forEach(function(card, i){
      const el = card.el;
      const dist = (i - activeCardIndex + N) % N;
      const targetY = dist * 14;
      const targetScale = 1 - dist * 0.05;
      const targetOpacity = dist === 0 ? 1 : 0.6;
      el.style.zIndex = N - dist;
      el.style.cursor = dist === 0 ? 'grab' : 'default';
      el.style.pointerEvents = dist === 0 ? 'auto' : 'none';
      const config = { targets: el, translateX: 0, translateY: targetY, rotate: 0, scale: targetScale, opacity: targetOpacity, easing: 'easeOutCubic' };
      if(animate){ config.duration = 380; anime(config); }
      else { anime.set(el, { translateX: 0, translateY: targetY, rotate: 0, scale: targetScale, opacity: targetOpacity }); }
    });
    updateCardDots();
    refreshCardDetailUI();
  }

  function advanceCard(direction){
    const front = CARDS[activeCardIndex].el;
    anime({
      targets: front,
      translateX: direction * 520,
      translateY: '+=10',
      rotate: direction * 28,
      opacity: 0,
      duration: 320,
      easing: 'easeInQuad',
      complete: function(){
        activeCardIndex = (activeCardIndex + 1) % CARDS.length;
        layoutStack(true);
      }
    });
  }

  let dragHandlersAttached = false; // buildCardStack re-runs after every refresh
  function attachDragHandlers(){
    if(dragHandlersAttached) return;
    dragHandlersAttached = true;
    let drag = null;
    cardStackEl.addEventListener('pointerdown', function(e){
      const cardEl = e.target.closest('.bank-card');
      if(!cardEl || parseInt(cardEl.dataset.index, 10) !== activeCardIndex || CARDS.length < 2) return;
      drag = { el: cardEl, startX: e.clientX, dx: 0, pointerId: e.pointerId };
      cardEl.setPointerCapture(e.pointerId);
    });
    cardStackEl.addEventListener('pointermove', function(e){
      if(!drag || e.pointerId !== drag.pointerId) return;
      drag.dx = e.clientX - drag.startX;
      anime.set(drag.el, { translateX: drag.dx, rotate: drag.dx * 0.06 });
    });
    function release(e){
      if(!drag || e.pointerId !== drag.pointerId) return;
      const dx = drag.dx;
      const el = drag.el;
      drag = null;
      const THRESHOLD = 90;
      if(Math.abs(dx) > THRESHOLD){
        advanceCard(dx > 0 ? 1 : -1);
      } else {
        anime({ targets: el, translateX: 0, rotate: 0, duration: 300, easing: 'easeOutBack' });
      }
    }
    cardStackEl.addEventListener('pointerup', release);
    cardStackEl.addEventListener('pointercancel', release);
  }

  function refreshCardDetailUI(){
    const card = CARDS[activeCardIndex];
    if(!card){
      freezeCardLabel.textContent = 'Freeze';
      ['cardTypeValue', 'cardExpiryValue', 'dailyLimitValue'].forEach(function(id){ document.getElementById(id).textContent = '—'; });
      cardStatusValue.textContent = 'No cards yet';
      return;
    }
    freezeCardLabel.textContent = card.frozen ? 'Unfreeze' : 'Freeze';
    const statusText = { ACTIVE: 'Active', FROZEN: 'Frozen', ORDERED: 'Ordered — on its way' }[card.status] || card.status;
    cardStatusValue.textContent = statusText;
    cardStatusValue.classList.toggle('status-ok', card.status === 'ACTIVE');
    cardStatusValue.style.color = card.frozen ? '#ff9a5a' : '';
    document.getElementById('cardTypeValue').textContent = card.type;
    document.getElementById('cardExpiryValue').textContent = card.expiry;
    document.getElementById('dailyLimitValue').textContent = formatRand(card.dailyLimit);
  }

  /* Cards screen actions — all act on the card currently on top of the stack */
  const freezeCardBtn = document.getElementById('freezeCardBtn');
  const freezeCardLabel = document.getElementById('freezeCardLabel');
  const cardStatusValue = document.getElementById('cardStatusValue');

  freezeCardBtn.addEventListener('click', function(){
    const card = CARDS[activeCardIndex];
    if(!card) return;
    // Freezing is protective, so it happens instantly (no confirm step), like the prototype.
    const action = card.frozen ? 'unfreeze' : 'freeze';
    freezeCardBtn.disabled = true;
    api('/api/cards/' + card.id + '/status', { body: { action: action } }).then(function(){
      card.frozen = action === 'freeze'; card.status = card.frozen ? 'FROZEN' : 'ACTIVE';
      card.el.classList.toggle('frozen', card.frozen);
      refreshCardDetailUI();
      goSpeak([card.frozen ? 'Your ' + card.label + ' card is now frozen — no new transactions will go through.' : 'Your ' + card.label + ' card is active again.']);
    }).catch(function(e){ goSpeak([e.message]); })
      .then(function(){ freezeCardBtn.disabled = false; });
  });
  document.getElementById('viewPinBtn').addEventListener('click', function(){
    const card = CARDS[activeCardIndex]; if(!card) return;
    goSpeak(['For your security, card PINs are never shown or spoken in the app. You can reset your ' + card.label + ' card’s PIN at any Citizen Bank ATM or branch.']);
  });
  document.getElementById('setLimitBtn').addEventListener('click', function(){
    if(!CARDS[activeCardIndex]) return;
    switchScreen('ai');
    setTimeout(function(){ runStepFlow('setLimit'); }, 260);
  });
  document.getElementById('manageCardsBtn').addEventListener('click', function(){
    const card = CARDS[activeCardIndex];
    if(!card) return goSpeak(["You don't have any cards yet — tap Order a card to get one."]);
    goSpeak(['This is your ' + card.label + ' card, ending ' + card.last4 + ' — ' + ({ FROZEN: 'currently frozen', ORDERED: 'on its way to you', ACTIVE: 'currently active' }[card.status] || card.status.toLowerCase()) +
      ', with a daily limit of ' + money(card.dailyLimit) + '.']);
  });
  document.getElementById('orderCardBtn').addEventListener('click', function(){
    switchScreen('ai');
    setTimeout(function(){ runStepFlow('orderCard'); }, 260);
  });

  /* More screen rows */
  document.getElementById('statementsRow').addEventListener('click', function(){
    switchScreen('ai');
    setTimeout(function(){
      setState('speaking');
      speakLines(['Which account would you like a statement for? It opens as a page you can save as PDF or print.'], function(){
        showChipMenu(ACCOUNTS.map(function(a){
          return { label: a.fullName + ' ••' + a.last4, onClick: function(){
            window.open('/statements/' + encodeURIComponent(a.id), '_blank', 'noopener');
            setState('idle');
          }};
        }));
      });
    }, 260);
  });
  document.getElementById('securityRow').addEventListener('click', openProfile);
  document.getElementById('notificationsRow').addEventListener('click', function(){
    switchScreen('ai');
    setTimeout(function(){
      setState('thinking');
      api('/api/notifications').then(function(list){
        const unread = list.filter(function(n){ return !n.read; });
        const lines = unread.length
          ? ['You have ' + unread.length + ' new notification' + (unread.length === 1 ? '' : 's') + '.'].concat(unread.slice(0, 3).map(function(n){ return n.title + ': ' + n.body; }))
          : ["You're all caught up — no new notifications."];
        setState('speaking');
        speakLines(lines, function(){ setState('idle'); });
        if(unread.length) api('/api/notifications', { body: {} }).then(function(){ BOOT.unreadNotifications = 0; renderProfile(); }).catch(function(){});
      }).catch(function(e){ captionThen(e.message); });
    }, 260);
  });
  document.getElementById('helpRow').addEventListener('click', function(){
    goSpeak(["I'm here to help — just ask me anything about your accounts.", 'For disputes, fraud or anything I can’t sort out, visit a branch and our team will help you in person.']);
  });
  document.getElementById('loansRow').addEventListener('click', function(){
    switchScreen('ai');
    setTimeout(function(){
      setState('speaking');
      const active = LOANS.filter(function(l){ return l.status === 'ACTIVE'; });
      const lines = active.length
        ? active.slice(0, 3).map(function(l){
            return 'Your ' + l.type.toLowerCase() + ' loan has ' + money(Number(l.outstanding)) + ' outstanding; the next payment of ' + money(Number(l.monthlyPayment)) + ' is due on ' + fmtDay(l.nextPaymentDate) + '.';
          })
        : ["You don't have any active loans."];
      lines.push('Ask me for a quote any time — for example, "what would a M50,000 personal loan over three years cost?"');
      speakLines(lines, function(){ setState('idle'); });
    }, 260);
  });
  document.getElementById('branchRow').addEventListener('click', function(){
    switchScreen('ai');
    setTimeout(function(){
      setState('thinking');
      if(!navigator.geolocation) return speakNearestBranches();
      navigator.geolocation.getCurrentPosition(function(pos){
        LAST_LOCATION = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        speakNearestBranches(LAST_LOCATION.lat, LAST_LOCATION.lng);
      }, function(){ speakNearestBranches(); }, { timeout: 10000, maximumAge: 300000 });
    }, 260);
  });
  function logout(reason){
    api('/api/auth/logout', { body: {}, allow401: true }).catch(function(){}).then(function(){
      window.location.replace('/login' + (reason ? '?reason=' + reason : ''));
    });
  }
  document.getElementById('logoutRow').addEventListener('click', function(){
    if(window.confirm('Log out of Citizen Bank?')) logout();
  });

  /* More screen: Settings opens the language/profile panel directly. */
  document.getElementById('settingsRow').addEventListener('click', openProfile);

  /* ---------------- Profile preferences are saved to Core ---------------- */
  function saveProfile(patch){ api('/api/me', { method: 'PATCH', body: patch }).catch(function(){}); }

  function greetingLead(){
    if(currentLanguage !== 'en') return LANGUAGES[currentLanguage].greetLead;
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  /* ---------------- Idle timeout: sign out after 5 minutes without interaction ---------------- */
  const IDLE_LIMIT_MS = 5 * 60 * 1000;
  let lastActivity = Date.now();
  ['pointerdown', 'keydown', 'touchstart'].forEach(function(ev){ document.addEventListener(ev, function(){ lastActivity = Date.now(); }, { passive: true }); });
  setInterval(function(){
    if(Date.now() - lastActivity > IDLE_LIMIT_MS && currentState !== 'speaking' && currentState !== 'thinking') logout('timeout');
  }, 15000);
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible'){
      if(Date.now() - lastActivity > IDLE_LIMIT_MS) logout('timeout');
      else refreshData().catch(function(){});
    }
  });

  /* ---------------- Initial paint ---------------- */
  hydrate(BOOT);
  currentLanguage = LANGUAGES[BOOT.user.preferredLanguage] ? BOOT.user.preferredLanguage : 'en';
  document.querySelectorAll('.lang-option').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-lang') === currentLanguage); });
  applyTheme(BOOT.user.preferredTheme === 'light' ? 'light' : 'dark', true);
  applyLanguage(currentLanguage);
  greetLead.textContent = greetingLead();
  renderProfile();
  renderAccounts();
  renderTransactions();
  renderRecipients();
  buildCardStack();

  renderOrb();
  setState('idle');
  setParticleIntensity('idle');
  updateTopbarAccent();
  setTimeout(playCoinSpiral, 1000);
}

  boot();
})();
