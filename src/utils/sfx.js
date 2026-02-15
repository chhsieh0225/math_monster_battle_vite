/**
 * sfx.js — Sound effects using native Web Audio API.
 * All sounds are generated programmatically, no audio files.
 * Replaces Tone.js (~300KB) with zero-dependency Web Audio (~3KB).
 *
 * Call sfx.init() once after user gesture to unlock AudioContext.
 * Then call sfx.play("hit") etc. anywhere.
 */
import { readText, writeText } from './storage';

let ctx = null;   // AudioContext
let ready = false;
const SFX_MUTED_KEY = "mathMonsterBattle_sfxMuted";
let muted = readText(SFX_MUTED_KEY, "0") === "1";

// ── Note → frequency lookup (pre-computed, avoids runtime Math) ──
const NOTE_FREQ = {
  C2:65.41,D2:73.42,E2:82.41,F2:87.31,G2:98,
  A2:110,Bb2:116.54,B2:123.47,
  C3:130.81,Eb3:155.56,E3:164.81,F3:174.61,
  A3:220,Bb3:233.08,B3:246.94,
  C4:261.63,E4:329.63,G4:392,
  A4:440,
  C5:523.25,D5:587.33,E5:659.26,"F#5":739.99,G5:783.99,
  A5:880,B5:987.77,
  C6:1046.5,E6:1318.51,
};

// ── Duration name → seconds (at ~120bpm) ──
const DUR = { "32n":0.03, "16n":0.06, "8n":0.13, "4n":0.25, "2n":0.5 };

// ── Core synth functions ──

/** Play a pitched tone (triangle or sine oscillator with envelope). */
function playNote(freq, dur, { type = "triangle", vol = 0.35, attack = 0.01, decay = 0.15 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, t + attack + decay + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + attack + decay + dur + 0.05);
}

/** Play a melodic note by name. */
function melodic(note, dur) {
  const f = NOTE_FREQ[note];
  if (f) playNote(f, DUR[dur] || 0.13, { type: "triangle", vol: 0.3 });
}

/** Play a bass note by name. */
function bass(note, dur) {
  const f = NOTE_FREQ[note];
  if (f) playNote(f, DUR[dur] || 0.25, { type: "sine", vol: 0.45, decay: 0.3 });
}

/** Play white noise burst (for hit/impact SFX). */
function noiseBurst(dur = 0.08) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const bufSize = ctx.sampleRate * Math.max(dur + 0.1, 0.15);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
  src.stop(t + dur + 0.1);
}

/** Play metallic ping (high-freq modulated tone). */
function metalPing(dur = 0.1) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  const gain = ctx.createGain();
  mod.frequency.value = 1400;
  modGain.gain.value = 800;
  mod.connect(modGain);
  modGain.connect(osc.frequency);
  osc.frequency.value = 200;
  osc.type = "square";
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  mod.start(t);
  osc.stop(t + dur + 0.1);
  mod.stop(t + dur + 0.1);
}

// ── Sound library ──
const SOUNDS = {
  hit: () => {
    melodic("C5", "16n");
    setTimeout(() => melodic("E5", "16n"), 60);
  },
  wrong: () => {
    melodic("E3", "8n");
    setTimeout(() => melodic("Eb3", "8n"), 120);
  },
  crit: () => {
    melodic("C5", "16n");
    setTimeout(() => melodic("E5", "16n"), 60);
    setTimeout(() => melodic("G5", "16n"), 120);
    setTimeout(() => melodic("C6", "8n"), 180);
  },
  playerHit: () => {
    noiseBurst(0.06);
    bass("C2", "8n");
  },
  victory: () => {
    ["C5","E5","G5","C6"].forEach((n,i) => setTimeout(() => melodic(n,"8n"), i*100));
  },
  ko: () => {
    ["C4","B3","Bb3","A3"].forEach((n,i) => setTimeout(() => melodic(n,"4n"), i*200));
  },
  levelUp: () => {
    ["E5","G5","B5","E6"].forEach((n,i) => setTimeout(() => melodic(n,"8n"), i*80));
  },
  evolve: () => {
    ["C4","E4","G4","C5","E5","G5","C6"].forEach((n,i) => setTimeout(() => melodic(n,"8n"), i*100));
  },
  select: () => { melodic("E5", "32n"); },
  fire: () => {
    noiseBurst(0.13);
    setTimeout(() => bass("G2", "8n"), 50);
  },
  water: () => {
    melodic("A4", "16n");
    setTimeout(() => melodic("E5", "16n"), 80);
    setTimeout(() => noiseBurst(0.06), 40);
  },
  electric: () => {
    metalPing(0.03);
    setTimeout(() => metalPing(0.06), 60);
  },
  grass: () => {
    melodic("G5", "32n");
    setTimeout(() => melodic("D5", "32n"), 50);
  },
  dark: () => {
    bass("D2", "4n");
    setTimeout(() => metalPing(0.13), 100);
  },
  light: () => {
    melodic("C6", "16n");
    setTimeout(() => melodic("E6", "16n"), 80);
    setTimeout(() => melodic("G5", "16n"), 160);
  },
  bossCharge: () => {
    bass("E2", "4n");
    setTimeout(() => bass("F2", "4n"), 300);
  },
  bossBoom: () => {
    bass("C2", "2n");
    setTimeout(() => noiseBurst(0.25), 100);
    setTimeout(() => metalPing(0.25), 150);
  },
  seal: () => {
    melodic("Bb3", "8n");
    setTimeout(() => melodic("E3", "8n"), 150);
  },
  specDef: () => {
    metalPing(0.06);
    setTimeout(() => melodic("A5", "8n"), 50);
    setTimeout(() => melodic("C6", "8n"), 130);
  },
  staticDischarge: () => {
    metalPing(0.06);
    setTimeout(() => metalPing(0.06), 40);
    setTimeout(() => metalPing(0.06), 80);
  },
  freeze: () => {
    melodic("B5", "16n");
    setTimeout(() => melodic("F#5", "8n"), 80);
  },
  heal: () => {
    melodic("C5", "16n");
    setTimeout(() => melodic("E5", "16n"), 100);
    setTimeout(() => melodic("G5", "16n"), 200);
  },
  tick: () => { metalPing(0.03); },
  timeout: () => {
    melodic("F3", "8n");
    setTimeout(() => melodic("C3", "4n"), 150);
  },
};

// ── Public API ──
const sfx = {
  async init() {
    if (ready) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") await ctx.resume();
      ready = true;
    } catch { /* audio not available */ }
  },
  play(name) {
    if (!ready || muted) return;
    try { const fn = SOUNDS[name]; if (fn) fn(); } catch { /* best-effort SFX */ }
  },
  setMuted(next) {
    muted = !!next;
    writeText(SFX_MUTED_KEY, muted ? "1" : "0");
    return muted;
  },
  toggleMute() {
    return sfx.setMuted(!muted);
  },
  get muted() { return muted; },
  get ready() { return ready; },
};

export default sfx;
