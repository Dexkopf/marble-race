"use client";

import { useRef, useCallback, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// All synthesis is procedural — no audio files needed.
// The AudioContext is lazily created on first user interaction.
// ─────────────────────────────────────────────────────────────────────────────

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedCtx;
}

// ── Helper: create a gain node connected to destination ───────────────────────
// vol is the sound's own base level; prefs.volume is the user's master volume (0–1)
function masterGain(ctx: AudioContext, vol: number): GainNode {
  const g = ctx.createGain();
  g.gain.value = vol * prefs.volume;
  g.connect(ctx.destination);
  return g;
}

// ── Short envelope ──────────────────────────────────────────────────────────
function envelope(
  param: AudioParam,
  ctx: AudioContext,
  now: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  peak = 1
) {
  param.setValueAtTime(0, now);
  param.linearRampToValueAtTime(peak, now + attack);
  param.linearRampToValueAtTime(sustain * peak, now + attack + decay);
  param.setValueAtTime(sustain * peak, now + attack + decay);
  param.linearRampToValueAtTime(0, now + attack + decay + release);
}

// ─────────────────────────────────────────────────────────────────────────────
// SOUND EFFECTS
// ─────────────────────────────────────────────────────────────────────────────

/** Peg bounce — high short click */
export function playBounce(vol = 0.18) {
  if (prefs.muted) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const g   = masterGain(ctx, vol);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(900 + Math.random() * 400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

    const eg = ctx.createGain();
    eg.gain.setValueAtTime(1, now);
    eg.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(eg); eg.connect(g);
    osc.start(now); osc.stop(now + 0.1);
  } catch {}
}

/** Pad fire — low whoosh + pitch rise */
export function playPadFire(dir: "left" | "right" | "up", vol = 0.28) {
  if (prefs.muted) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const g   = masterGain(ctx, vol);

    // Noise burst
    const bufLen = ctx.sampleRate * 0.15;
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;

    // Band-pass filter pitched by direction
    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.value = dir === "up" ? 1200 : 600;
    bpf.Q.value = 4;

    const eg = ctx.createGain();
    eg.gain.setValueAtTime(1, now);
    eg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    src.connect(bpf); bpf.connect(eg); eg.connect(g);
    src.start(now); src.stop(now + 0.16);

    // Synth tone sweep
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    const baseFreq = dir === "up" ? 120 : 80;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 3, now + 0.14);

    const og = ctx.createGain();
    og.gain.setValueAtTime(0.5, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(og); og.connect(g);
    osc.start(now); osc.stop(now + 0.16);
  } catch {}
}

/** Countdown beep — clean sine tick */
export function playCountdownBeep(n: number, vol = 0.45) {
  if (prefs.muted) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const g   = masterGain(ctx, vol);

    const freq = n === 0 ? 1200 : 660; // GO! is higher
    const dur  = n === 0 ? 0.35 : 0.18;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    const eg = ctx.createGain();
    envelope(eg.gain, ctx, now, 0.005, 0.05, 0.6, dur - 0.06);

    osc.connect(eg); eg.connect(g);
    osc.start(now); osc.stop(now + dur);
  } catch {}
}

/** Shuffle whoosh — quick pitch sweep */
export function playShuffle(vol = 0.22) {
  if (prefs.muted) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const g   = masterGain(ctx, vol);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.22);

    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0, now);
    eg.gain.linearRampToValueAtTime(1, now + 0.04);
    eg.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

    osc.connect(eg); eg.connect(g);
    osc.start(now); osc.stop(now + 0.25);
  } catch {}
}

/** Winner fanfare — ascending arp + reverby tail */
export function playWinnerFanfare(vol = 0.45) {
  if (prefs.muted) return;
  try {
    const ctx  = getCtx();
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.1;
      const g = masterGain(ctx, vol * (1 - i * 0.05));

      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const eg = ctx.createGain();
      envelope(eg.gain, ctx, t, 0.01, 0.08, 0.5, 0.4 + i * 0.05);

      // Simple reverb via delay
      const delay = ctx.createDelay(0.5);
      delay.delayTime.value = 0.15;
      const dfb = ctx.createGain(); dfb.gain.value = 0.3;
      delay.connect(dfb); dfb.connect(delay);

      osc.connect(eg);
      eg.connect(g);
      eg.connect(delay); delay.connect(g);

      osc.start(t); osc.stop(t + 1.2);
    });
  } catch {}
}

/** Finish line crossing — quick upward ding */
export function playFinish(rank: number, vol = 0.3) {
  try {
    const ctx  = getCtx();
    const now  = ctx.currentTime;
    // Higher rank = lower, dimmer sound
    const freq = Math.max(400, 900 - rank * 60);
    const g    = masterGain(ctx, vol * Math.max(0.3, 1 - rank * 0.08));

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.06);

    const eg = ctx.createGain();
    envelope(eg.gain, ctx, now, 0.005, 0.06, 0.4, 0.25);

    osc.connect(eg); eg.connect(g);
    osc.start(now); osc.stop(now + 0.35);
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND MUSIC  — procedural minimal techno loop
//
// Structure: kick + hi-hat + bass synth + chord pad, all running in sync
// via ScriptProcessor-free scheduling. A recurring setTimeout schedules
// 1-bar chunks 200 ms ahead (Tone.js pattern, but hand-rolled).
// ─────────────────────────────────────────────────────────────────────────────

const BPM      = 128;
const BEAT     = 60 / BPM;          // seconds per beat
const BAR      = BEAT * 4;          // seconds per 4/4 bar
const LOOKAHEAD = BAR + 0.2;        // schedule this many seconds ahead

// Scale: A minor pentatonic (bass & chord notes)
const SCALE     = [55, 58, 62, 65, 69]; // A1 Bb1 D2 F2 A2 (MIDI-style Hz via 440*2^((n-69)/12))
const toHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

interface MusicState {
  ctx:          AudioContext;
  masterGain:   GainNode;
  nextBarTime:  number;
  timeoutId:    ReturnType<typeof setTimeout> | null;
  stopped:      boolean;
  bar:          number; // bar counter, for variation
}

let musicState: MusicState | null = null;

function scheduleBar(s: MusicState) {
  if (s.stopped) return;
  const ctx = s.ctx;
  const t   = s.nextBarTime;
  const mg  = s.masterGain;

  // ── Kick drum (beats 1 & 3) ─────────────────────────────────────────────
  [0, 2].forEach(beat => {
    const bt = t + beat * BEAT;

    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(180, bt);
    osc.frequency.exponentialRampToValueAtTime(40, bt + 0.08);

    const eg = ctx.createGain();
    eg.gain.setValueAtTime(1.2, bt);
    eg.gain.exponentialRampToValueAtTime(0.001, bt + 0.22);

    osc.connect(eg); eg.connect(mg);
    osc.start(bt); osc.stop(bt + 0.23);
  });

  // ── Snare/clap (beats 2 & 4) ───────────────────────────────────────────
  [1, 3].forEach(beat => {
    const bt = t + beat * BEAT;
    const bufLen = Math.floor(ctx.sampleRate * 0.12);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    const src = ctx.createBufferSource(); src.buffer = buf;

    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass"; bpf.frequency.value = 2200; bpf.Q.value = 0.8;

    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0.7, bt);
    eg.gain.exponentialRampToValueAtTime(0.001, bt + 0.12);

    src.connect(bpf); bpf.connect(eg); eg.connect(mg);
    src.start(bt); src.stop(bt + 0.13);
  });

  // ── Hi-hat (every 8th note) ─────────────────────────────────────────────
  for (let eighth = 0; eighth < 8; eighth++) {
    const bt  = t + eighth * BEAT / 2;
    const vol = eighth % 2 === 0 ? 0.25 : 0.14; // downbeats louder

    const bufLen = Math.floor(ctx.sampleRate * 0.05);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;

    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass"; hpf.frequency.value = 8000;

    const eg = ctx.createGain();
    eg.gain.setValueAtTime(vol, bt);
    eg.gain.exponentialRampToValueAtTime(0.001, bt + 0.045);

    src.connect(hpf); hpf.connect(eg); eg.connect(mg);
    src.start(bt); src.stop(bt + 0.06);
  }

  // ── Bass synth (offbeat pattern, varies every 2 bars) ───────────────────
  const bassPat = s.bar % 2 === 0
    ? [0, 1.5, 2.5, 3]
    : [0, 1, 2, 3.5];
  const bassNotes = s.bar % 4 === 0
    ? [0, 2, 4, 2]
    : [0, 0, 2, 4];

  bassPat.forEach((beat, idx) => {
    const bt   = t + beat * BEAT;
    const freq = toHz(SCALE[bassNotes[idx] % SCALE.length]);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;

    const flt = ctx.createBiquadFilter();
    flt.type = "lowpass";
    flt.frequency.setValueAtTime(400, bt);
    flt.frequency.exponentialRampToValueAtTime(1200, bt + 0.06);
    flt.frequency.exponentialRampToValueAtTime(350, bt + 0.25);
    flt.Q.value = 3;

    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0, bt);
    eg.gain.linearRampToValueAtTime(0.55, bt + 0.01);
    eg.gain.exponentialRampToValueAtTime(0.001, bt + 0.28);

    osc.connect(flt); flt.connect(eg); eg.connect(mg);
    osc.start(bt); osc.stop(bt + 0.3);
  });

  // ── Chord pad (every 2 bars, pad in with slow attack) ───────────────────
  if (s.bar % 2 === 0) {
    const chordRoot = SCALE[s.bar % SCALE.length];
    const chord     = [chordRoot, chordRoot + 7, chordRoot + 12]; // root + 5th + octave

    chord.forEach(midi => {
      const freq = toHz(midi);
      const osc  = ctx.createOscillator();
      osc.type   = "sine";
      osc.frequency.value = freq;

      // Slight detune for warmth
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = freq * 1.003;

      const eg = ctx.createGain();
      eg.gain.setValueAtTime(0, t);
      eg.gain.linearRampToValueAtTime(0.07, t + BAR * 0.3);  // slow attack
      eg.gain.linearRampToValueAtTime(0.05, t + BAR * 1.4);  // sustain into next bar
      eg.gain.linearRampToValueAtTime(0, t + BAR * 2);       // fade at end of 2-bar phrase

      osc.connect(eg); osc2.connect(eg); eg.connect(mg);
      osc.start(t);  osc.stop(t + BAR * 2 + 0.1);
      osc2.start(t); osc2.stop(t + BAR * 2 + 0.1);
    });
  }

  s.nextBarTime += BAR;
  s.bar += 1;

  // Schedule next bar slightly before it's needed
  const msUntilNextBar = (s.nextBarTime - ctx.currentTime - 0.1) * 1000;
  s.timeoutId = setTimeout(() => scheduleBar(s), Math.max(0, msUntilNextBar));
}

// ── Persistent audio prefs (localStorage) ────────────────────────────────────
const PREFS_KEY = "marble-race-audio";

interface AudioPrefs { muted: boolean; volume: number; }

function loadPrefs(): AudioPrefs {
  if (typeof window === "undefined") return { muted: false, volume: 0.8 };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...{ muted: false, volume: 0.8 }, ...JSON.parse(raw) };
  } catch {}
  return { muted: false, volume: 0.8 };
}

function savePrefs(p: AudioPrefs) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
}

// Module-level prefs (shared across the whole app)
let prefs: AudioPrefs = loadPrefs();

export function getMuted()  { return prefs.muted; }
export function getVolume() { return prefs.volume; }

export function setMuted(muted: boolean) {
  prefs = { ...prefs, muted };
  savePrefs(prefs);
  if (muted) {
    stopMusic(200);
  } else if (musicState === null) {
    // don't auto-start — caller decides when to start
  } else {
    // already playing but was muted? restore volume
    try {
      const ctx = musicState.ctx;
      const now = ctx.currentTime;
      musicState.masterGain.gain.cancelScheduledValues(now);
      musicState.masterGain.gain.linearRampToValueAtTime(prefs.volume * 0.22, now + 0.3);
    } catch {}
  }
}

export function setMusicVolume(vol: number) {
  vol = Math.max(0, Math.min(1, vol));
  prefs = { ...prefs, volume: vol };
  savePrefs(prefs);
  // Apply live if music is playing
  if (musicState) {
    try {
      const ctx = musicState.ctx;
      const now = ctx.currentTime;
      musicState.masterGain.gain.cancelScheduledValues(now);
      musicState.masterGain.gain.setValueAtTime(musicState.masterGain.gain.value, now);
      musicState.masterGain.gain.linearRampToValueAtTime(vol * 0.22, now + 0.1);
    } catch {}
  }
}

export function startMusic(vol?: number) {
  if (prefs.muted) return;
  if (musicState && !musicState.stopped) return; // already playing
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();

    const mg = ctx.createGain();
    mg.gain.value = (vol ?? 0.22) * prefs.volume;
    mg.connect(ctx.destination);

    const state: MusicState = {
      ctx,
      masterGain:  mg,
      nextBarTime: ctx.currentTime + 0.05,
      timeoutId:   null,
      stopped:     false,
      bar:         0,
    };
    musicState = state;
    scheduleBar(state);
  } catch {}
}

export function stopMusic(fadeMs = 800) {
  if (!musicState) return;
  musicState.stopped = true;
  if (musicState.timeoutId) clearTimeout(musicState.timeoutId);

  // Fade out master gain
  try {
    const g   = musicState.masterGain;
    const ctx = musicState.ctx;
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
  } catch {}
  musicState = null;
}

export function isMusicPlaying() {
  return !!musicState && !musicState.stopped;
}

// ─────────────────────────────────────────────────────────────────────────────
// React hook — manages music lifecycle tied to component
// ─────────────────────────────────────────────────────────────────────────────
export function useAudio() {
  const bounceCooldownRef = useRef<number>(0);

  const triggerBounce = useCallback(() => {
    const now = Date.now();
    // Throttle bounces to max ~15/s to avoid audio crackle
    if (now - bounceCooldownRef.current < 65) return;
    bounceCooldownRef.current = now;
    playBounce();
  }, []);

  const triggerPadFire = useCallback((dir: "left" | "right" | "up") => {
    playPadFire(dir);
  }, []);

  const triggerCountdownBeep = useCallback((n: number) => {
    playCountdownBeep(n);
  }, []);

  const triggerShuffle = useCallback(() => {
    playShuffle();
  }, []);

  const triggerWinner = useCallback(() => {
    stopMusic(400);
    setTimeout(() => playWinnerFanfare(), 450);
  }, []);

  const triggerFinish = useCallback((rank: number) => {
    playFinish(rank);
  }, []);

  const resumeCtx = useCallback(() => {
    try {
      getCtx().resume();
    } catch {}
  }, []);

  return {
    triggerBounce,
    triggerPadFire,
    triggerCountdownBeep,
    triggerShuffle,
    triggerWinner,
    triggerFinish,
    resumeCtx,
    startMusic,
    stopMusic,
    isMusicPlaying,
    getMuted,
  