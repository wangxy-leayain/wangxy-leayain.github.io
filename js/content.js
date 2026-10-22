/* All words on the site. Every fact here comes from Leayain's own info; nothing else is claimed. */
(function () {
  'use strict';

  // Ten universes. id matches assets/styles/<id>.webp
  const STYLES = [
    { id: 'comic', code: 'U-0001', sfx: 'POW!', ink: '#14121c', paper: '#fff6e0', accent: '#e5484d', name: 'Ink Comic' },
    { id: 'noir', code: 'U-1947', sfx: 'BANG.', ink: '#0c0c10', paper: '#f2efe6', accent: '#e5484d', name: 'Noir' },
    { id: 'pop', code: 'U-1962', sfx: 'WHAAM!', ink: '#101014', paper: '#fffbea', accent: '#ffd400', name: 'Pop Art' },
    { id: 'anime', code: 'U-0707', sfx: 'KIRA!', ink: '#3a2466', paper: '#f6f0ff', accent: '#ff7ac8', name: 'Pastel Anime' },
    { id: 'watercolor', code: 'U-0065', sfx: 'SPLASH~', ink: '#4a4660', paper: '#fffaf0', accent: '#5fb8b0', name: 'Watercolour' },
    { id: 'punk', code: 'U-0138', sfx: 'OI!', ink: '#0c0b10', paper: '#f8f400', accent: '#ff2e88', name: 'Punk Zine' },
    { id: 'neon', code: 'U-2099', sfx: 'BZZT!', ink: '#e8f6ff', paper: '#0d0a24', accent: '#00f0ff', name: 'Neon 2099' },
    { id: 'sketch', code: 'U-1504', sfx: 'SCRITCH', ink: '#3d2616', paper: '#e8d5ac', accent: '#a8402a', name: 'Renaissance Sketch' },
    { id: 'pixel', code: 'U-8BIT', sfx: 'BLIP!', ink: '#1a1c2c', paper: '#f4f4f4', accent: '#ef7d57', name: 'Arcade Pixel' },
    { id: 'void', code: 'U-0000', sfx: 'BLOT.', ink: '#111114', paper: '#fbfaf6', accent: '#ff5a1f', name: 'Ink Void' },
  ];

  // hotspot name (from the render) → what it does
  const HOTS = {
    board: { panel: 'about' },
    about: { panel: 'about' },
    monitor: { panel: 'js' },
    dice: { action: 'style' },
    badminton: { panel: 'badminton' },
    boardgames: { panel: 'boardgames' },
    valorant: { panel: 'valorant' },
    popmart: { panel: 'popmart' },
    vn: { panel: 'vn' },
    phd: { panel: 'phd' },
    lights: { action: 'lights' },
    walkie: { action: 'walkie' },
  };

  const LABELS = {
    board: 'Who is Leayain?',
    about: 'Who is Leayain?',
    monitor: 'JavaScript',
    dice: 'Roll the d20 · new universe',
    badminton: 'Badminton',
    boardgames: 'Board games',
    valorant: 'Valorant',
    popmart: 'Pop Mart · blind boxes',
    vn: 'Visual novels',
    phd: 'Next chapter: PhD',
    lights: 'The alphabet wall · click to make it talk',
    walkie: 'Walkie-talkie · channel 11',
  };

  const INTERESTS = [
    { panel: 'js', name: 'JavaScript', note: 'the monitor', c: '#ffd23f' },
    { panel: 'badminton', name: 'Badminton', note: 'the racket', c: '#7fb6ff' },
    { panel: 'boardgames', name: 'Board games', note: 'the game box', c: '#ffb36b' },
    { panel: 'valorant', name: 'Valorant', note: 'the headset', c: '#ff7a80' },
    { panel: 'popmart', name: 'Pop Mart', note: 'the blind boxes', c: '#ff9ccf' },
    { panel: 'vn', name: 'Visual novels', note: 'the handheld', c: '#b9a6ff' },
  ];

  const PANELS = {
    about: {
      kicker: 'WHO IS LEAYAIN?',
      title: 'Leayain',
      sub: 'Second-year Computer Science student at UNSW. Into Valorant and Pop Mart.',
      body: ['I study Computer Science at UNSW, and I want to do a PhD.'],
      facts: [['STUDYING', 'Computer Science'], ['AT', 'UNSW'], ['NEXT', 'PhD']],
      widget: 'interests',
    },
    js: {
      kicker: 'ON THE MONITOR',
      title: 'JavaScript',
      sub: 'The language on the screen. The console below runs in your browser.',
      widget: 'repl',
      wide: true,
    },
    badminton: {
      kicker: 'THE RACKET',
      title: 'Badminton',
      sub: 'Keep the shuttle in the air: move to aim, click or tap to swing.',
      widget: 'rally',
      wide: true,
    },
    boardgames: {
      kicker: 'THE GAME BOX',
      title: 'Board games',
      sub: 'Your turn. Roll the dice, pick a meeple.',
      widget: 'dice',
      wide: true,
    },
    valorant: {
      kicker: 'THE HEADSET',
      title: 'Valorant',
      sub: 'Warm up before one more round: 20 seconds, as many targets as you can.',
      widget: 'aim',
      wide: true,
    },
    popmart: {
      kicker: 'THE BLIND BOXES',
      title: 'Pop Mart',
      sub: 'Pick a box and open it. Figures here are drawn for this site.',
      widget: 'blindbox',
      wide: true,
    },
    vn: {
      kicker: 'THE HANDHELD',
      title: 'Visual novels',
      sub: 'A very short visual novel. Five endings, one of them secret.',
      widget: 'vn',
      wide: true,
    },
    phd: {
      kicker: 'NEXT CHAPTER',
      title: 'PhD',
      sub: 'Where this is going.',
      body: ['I want to do a PhD.'],
      widget: 'road',
    },
  };

  const READ_ORDER = ['about', 'js', 'phd', 'badminton', 'boardgames', 'valorant', 'popmart', 'vn'];

  // the JavaScript object shown on the monitor (and live in the console)
  const PROFILE = {
    name: 'Leayain',
    school: 'UNSW',
    study: 'Computer Science',
    year: 2,
    next: 'PhD',
    into: ['JavaScript', 'badminton', 'board games', 'Valorant', 'visual novels', 'Pop Mart'],
  };

  // visual novel script. Only facts Leayain gave; the jokes are jokes.
  // Fields: id, who, text (string or (scores, run) => string), per-universe variants (noir / upside …),
  // go (next id), choices [{ label, go, route, challenge, back, if }], route + enter (opens a topic), do (effects), ending.
  const endingsSeen = () => { try { return (localStorage.getItem('vn-endings') || '').split(','); } catch (e) { return []; } };
  const played = (s) => s.aimPlayed || s.rallyPlayed || s.boxes > 0;
  const VN = [
    // ── opening
    { id: 'start', text: 'Oh. You picked up my handheld.',
      noir: 'The handheld was warm. Someone had been playing. That someone was me.',
      upside: 'Why is everything blue. Why is it snowing indoors. Who touched the walkie-talkie.' },
    { text: 'Most people just click the d20 and leave.' },
    { text: "I'm Leayain. Computer Science at UNSW, year two." },
    { text: "On WeChat I'm El." },
    { text: 'Yes, El. Like Eleven.' },
    { text: "No, I can't flip a van with my mind. I've checked." },
    { text: "Pick a topic. Choose wisely. (Or don't. There's no wrong answer. Mostly.)", go: 'hub' },

    // ── topic menu
    { id: 'hub',
      text: (s, run) => !run.visited.length ? 'So. What do you want to talk about?'
        : run.visited.length === 4 ? "That's everything on the desk. Well. Almost everything." : 'Anything else?',
      choices: [
        { label: 'Valorant', go: 'v1', route: 'valorant' },
        { label: 'Badminton', go: 'b1', route: 'badminton' },
        { label: 'Board games', go: 'g1', route: 'boardgames' },
        { label: 'Pop Mart', go: 'm1', route: 'popmart' },
        { label: '11', go: 'u1', cls: 'vn-eleven', if: () => endingsSeen().includes('true') },
        { label: 'I should go', go: (s, run) => run.visited.length === 4 ? (played(s) ? 't1' : 'gd1') : 'n1' },
      ] },

    // ── Valorant
    { id: 'v1', route: 'valorant', enter: true, text: 'I play Sage.' },
    { text: 'Yes, the healer. Someone has to keep you alive.',
      choices: [{ label: 'I play duelist.', go: 'v2a' }, { label: 'I also play Sage.', go: 'v2b' }, { label: "What's Valorant?", go: 'v2c' }] },
    { id: 'v2a', text: "Great. You run in. I'll revive you. Twice, probably.", go: 'v3' },
    { id: 'v2b', text: 'Two Sages? Nobody dies today. Nobody wins either.', go: 'v3' },
    { id: 'v2c', text: 'A game where I mostly stand behind people and heal them.', go: 'v3' },
    { id: 'v3', text: 'Go on. Ask me something.', choices: [{ label: "What's your rank?", go: 'v4' }] },
    { id: 'v4', text: "No rank. I don't play ranked." },
    { text: 'Ranked is for people who enjoy suffering.' },
    { text: "Go warm up on the aim trainer. I'll wait. (I'm a healer. Waiting is my job.)",
      choices: [{ label: 'Open the aim trainer', challenge: 'valorant', back: 'vr' }, { label: 'I already did', go: 'vr' }] },
    { id: 'vr',
      text: (s) => !s.aimPlayed ? "You didn't even try. I can see the save data."
        : s.aim === 0 ? 'Zero. Okay. Resurrecting you.'
        : s.aim < 15 ? 'Not bad. Stay behind me.' : "Okay, you go first next round. I'll heal.",
      do: (fx) => { if (fx.s.aimPlayed && fx.s.aim === 0) fx.flash('#ffe27a'); },
      go: (s) => (s.aimPlayed && s.aim === 0 ? 'vr0' : 'hub') },
    { id: 'vr0', text: 'Try again. I only have one revive.', go: 'hub' },

    // ── Badminton
    { id: 'b1', route: 'badminton', enter: true, text: 'Badminton. The racket on my desk is not decoration.',
      choices: [{ label: "Isn't it just tennis, but small?", go: 'b2a' }, { label: 'I play too!', go: 'b2b' }] },
    { id: 'b2a', text: "Say that again and I'll smash it at you.", go: 'b3' },
    { id: 'b2b', text: 'Then you know the shuttle never goes where you want it to.', go: 'b3' },
    { id: 'b3', text: "Go keep the shuttle up. The racket's right there.",
      choices: [{ label: 'Pick up the racket', challenge: 'badminton', back: 'br' }, { label: 'I already did', go: 'br' }] },
    { id: 'br',
      text: (s) => !s.rallyPlayed ? 'The racket is still exactly where I left it. Suspicious.'
        : s.rally === 0 ? 'It hit the ground on the serve. Impressive, in a way.'
        : s.rally < 10 ? 'A rally! A short one, but a rally.' : "Okay, you're on my doubles team now.",
      go: 'hub' },

    // ── Board games
    { id: 'g1', route: 'boardgames', enter: true, text: 'Board games. The box on my desk says GAME NIGHT. It means it.' },
    { text: "Let's settle this the board game way.", choices: [{ label: 'Roll the dice', go: 'gr' }] },
    { id: 'gr',
      text: () => {
        const a = 1 + Math.floor(Math.random() * 6);
        const b = 1 + Math.floor(Math.random() * 6);
        const say = a === b ? "Doubles! The dice like you. That's rare. They hate me."
          : a + b >= 10 ? 'High roll. You get to go first.'
          : a + b <= 4 ? "Ouch. In most games that's when you start making enemies."
          : 'A perfectly average roll. Very balanced. Very boring.';
        return '[ ' + a + ' + ' + b + ' = ' + (a + b) + ' ]  ' + say;
      },
      do: (fx) => { fx.ctx.blip(330, 0.05, 'square'); },
      choices: [{ label: 'Want to play again?', go: 'gr' }, { label: 'Rules are hard.', go: 'g3' }] },
    { id: 'g3', text: 'Rules are a suggestion until someone reads the manual.', go: 'hub' },

    // ── Pop Mart
    { id: 'm1', route: 'popmart', enter: true, text: 'Pop Mart. My weakness.' },
    { text: 'Top five: Hirono, Labubu, Skullpanda, Zsiga, Dimoo.' },
    { text: "Don't ask me to pick one. I'll short-circuit." },
    { text: "El would do anything for waffles. I'd do anything for a blind box." },
    { text: 'Quick quiz. Which one is NOT on my list?',
      choices: [{ label: 'Labubu', go: 'm2a' }, { label: 'Dimoo', go: 'm2b' }, { label: 'Molly', go: 'm2c' }] },
    { id: 'm2a', text: 'Wrong. Labubu is on the list. Labubu is always on the list.', go: 'm3' },
    { id: 'm2b', text: 'Wrong! Dimoo is right there. Number five.', go: 'm3' },
    { id: 'm2c', text: 'Correct. You were actually listening. Suspicious.', go: 'm3' },
    { id: 'm3', text: 'Go open some blind boxes on my desk. For science.',
      choices: [{ label: 'Open the blind boxes', challenge: 'popmart', back: 'mr' }, { label: 'I already did', go: 'mr' }] },
    { id: 'mr',
      text: (s) => s.boxes === 0 ? 'Zero boxes opened. Do you have self-control? Teach me.'
        : s.boxes >= 6 ? 'All six. You need help. I mean that kindly.'
        : 'You found ' + s.boxes + ' of six. That\'s how it starts. That\'s how it always starts.',
      go: (s) => (s.secret ? 'mr2' : 'hub') },
    { id: 'mr2', text: 'Wait. You pulled the secret? On this desk?', do: (fx) => fx.flash('#ffd23f') },
    { text: "I'm so jealous right now.", go: 'hub' },

    // ── endings
    { id: 'n1', text: 'Leaving already? The desk has, like, nine other things on it.' },
    { ending: 'normal' },
    { id: 'gd1', text: 'You talked about everything and played nothing. Very theoretical of you.' },
    { text: "You'd make a good computer scientist." },
    { ending: 'good' },
    { id: 't1', text: "Okay. You actually played everything. So here's the real ending." },
    { text: "Year two isn't the final chapter." },
    { text: 'Next chapter: PhD.' },
    { text: "Long story. It hasn't been written yet." },
    { ending: 'true' },
    { id: 'wrong', text: 'Wait. Did the colours just change?' },
    { text: 'Did you press space? In the middle of a conversation?' },
    { text: "Rude. I'm restarting the game." },
    { text: 'Are you sure you\'re not from Hawkins?' },
    { ending: 'wrong' },

    // ── the Upside Down (unlocked after the true ending)
    { id: 'u1', who: '', text: '* The handheld goes quiet. Then the whole screen turns upside down. *',
      do: (fx) => { fx.flip(); fx.setDark(true); fx.setLights(true); } },
    { text: 'Okay. Who opened a gate to the Upside Down inside my handheld?' },
    { who: '', text: '* The bulbs flicker on, one by one. *', do: (fx) => fx.spellLights('HIEL', 650) },
    { text: '…The lights are spelling my name. Great. Love that. Very normal.' },
    { text: 'Close it. Close it before it eats my blind boxes.', choices: [{ label: 'Close the gate', go: 'u2' }] },
    { id: 'u2', who: '', text: '* The screen flips back. Everything is pink again. *',
      do: (fx) => { fx.flip(); fx.setDark(fx.look === 'upside'); fx.setLights(false); } },
    { ending: 'upside' },
  ];
  VN.forEach((n, i) => { if (!n.id) n.id = 'n' + i; });

  window.CONTENT = { STYLES, HOTS, LABELS, INTERESTS, PANELS, READ_ORDER, PROFILE, VN };
})();
