/**
 * sfx.js — Sound effects using Tone.js synthesizers.
 * All sounds are generated programmatically, no audio files.
 *
 * Call sfx.init() once after user gesture to unlock AudioContext.
 * Then call sfx.play("hit") etc. anywhere.
 */
import * as Tone from 'tone';

let ready = false;
let muted = false;

// ── Synths (lazy-created on first init) ──
let synth = null;    // general melodic
let noise = null;    // noise-based SFX
let metal = null;    // metallic hits
let bass = null;     // bass/boom effects

function ensureSynths() {
  if (synth) return;
  synth = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.3 },
    volume: -8,
  }).toDestination();

  noise = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.05 },
    volume: -18,
  }).toDestination();

  metal = new Tone.MetalSynth({
    frequency: 200,
    envelope: { attack: 0.001, decay: 0.12, release: 0.1 },
    harmonicity: 5.1,
    modulationIndex: 16,
    resonance: 2000,
    octaves: 1.5,
    volume: -20,
  }).toDestination();

  bass = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
    volume: -6,
  }).toDestination();
}

// ── Sound library ──
const SOUNDS = {
  // ─ Correct answer / hit ─
  hit: () => {
    synth.triggerAttackRelease("C5", "16n");
    setTimeout(() => synth.triggerAttackRelease("E5", "16n"), 60);
  },
  // ─ Wrong answer ─
  wrong: () => {
    synth.triggerAttackRelease("E3", "8n");
    setTimeout(() => synth.triggerAttackRelease("Eb3", "8n"), 120);
  },
  // ─ Critical / streak bonus ─
  crit: () => {
    synth.triggerAttackRelease("C5", "16n");
    setTimeout(() => synth.triggerAttackRelease("E5", "16n"), 60);
    setTimeout(() => synth.triggerAttackRelease("G5", "16n"), 120);
    setTimeout(() => synth.triggerAttackRelease("C6", "8n"), 180);
  },
  // ─ Player take damage ─
  playerHit: () => {
    noise.triggerAttackRelease("16n");
    bass.triggerAttackRelease("C2", "8n");
  },
  // ─ Enemy defeated ─
  victory: () => {
    const notes = ["C5", "E5", "G5", "C6"];
    notes.forEach((n, i) => setTimeout(() => synth.triggerAttackRelease(n, "8n"), i * 100));
  },
  // ─ KO / game over ─
  ko: () => {
    const notes = ["C4", "B3", "Bb3", "A3"];
    notes.forEach((n, i) => setTimeout(() => synth.triggerAttackRelease(n, "4n"), i * 200));
  },
  // ─ Level up ─
  levelUp: () => {
    const notes = ["E5", "G5", "B5", "E6"];
    notes.forEach((n, i) => setTimeout(() => synth.triggerAttackRelease(n, "8n"), i * 80));
  },
  // ─ Evolution ─
  evolve: () => {
    const notes = ["C4", "E4", "G4", "C5", "E5", "G5", "C6"];
    notes.forEach((n, i) => setTimeout(() => synth.triggerAttackRelease(n, "8n"), i * 100));
  },
  // ─ Menu select / button ─
  select: () => {
    synth.triggerAttackRelease("E5", "32n");
  },
  // ─ Fire attack ─
  fire: () => {
    noise.triggerAttackRelease("8n");
    setTimeout(() => bass.triggerAttackRelease("G2", "8n"), 50);
  },
  // ─ Water attack ─
  water: () => {
    synth.triggerAttackRelease("A4", "16n");
    setTimeout(() => synth.triggerAttackRelease("E5", "16n"), 80);
    setTimeout(() => noise.triggerAttackRelease("16n"), 40);
  },
  // ─ Electric attack ─
  electric: () => {
    metal.triggerAttackRelease("32n");
    setTimeout(() => metal.triggerAttackRelease("16n"), 60);
  },
  // ─ Grass attack ─
  grass: () => {
    synth.triggerAttackRelease("G5", "32n");
    setTimeout(() => synth.triggerAttackRelease("D5", "32n"), 50);
  },
  // ─ Dark attack ─
  dark: () => {
    bass.triggerAttackRelease("D2", "4n");
    setTimeout(() => metal.triggerAttackRelease("8n"), 100);
  },
  // ─ Boss charge warning ─
  bossCharge: () => {
    bass.triggerAttackRelease("E2", "4n");
    setTimeout(() => bass.triggerAttackRelease("F2", "4n"), 300);
  },
  // ─ Boss big attack ─
  bossBoom: () => {
    bass.triggerAttackRelease("C2", "2n");
    setTimeout(() => noise.triggerAttackRelease("4n"), 100);
    setTimeout(() => metal.triggerAttackRelease("4n"), 150);
  },
  // ─ Seal move ─
  seal: () => {
    synth.triggerAttackRelease("Bb3", "8n");
    setTimeout(() => synth.triggerAttackRelease("E3", "8n"), 150);
  },
  // ─ Spec def trigger ─
  specDef: () => {
    metal.triggerAttackRelease("16n");
    setTimeout(() => synth.triggerAttackRelease("A5", "8n"), 50);
    setTimeout(() => synth.triggerAttackRelease("C6", "8n"), 130);
  },
  // ─ Static discharge ─
  staticDischarge: () => {
    metal.triggerAttackRelease("16n");
    setTimeout(() => metal.triggerAttackRelease("16n"), 40);
    setTimeout(() => metal.triggerAttackRelease("16n"), 80);
  },
  // ─ Freeze ─
  freeze: () => {
    synth.triggerAttackRelease("B5", "16n");
    setTimeout(() => synth.triggerAttackRelease("F#5", "8n"), 80);
  },
  // ─ Heal ─
  heal: () => {
    synth.triggerAttackRelease("C5", "16n");
    setTimeout(() => synth.triggerAttackRelease("E5", "16n"), 100);
    setTimeout(() => synth.triggerAttackRelease("G5", "16n"), 200);
  },
  // ─ Timer warning ─
  tick: () => {
    metal.triggerAttackRelease("32n");
  },
  // ─ Timeout ─
  timeout: () => {
    synth.triggerAttackRelease("F3", "8n");
    setTimeout(() => synth.triggerAttackRelease("C3", "4n"), 150);
  },
};

// ── Public API ──
const sfx = {
  /** Call once after a user gesture (tap/click) */
  async init() {
    if (ready) return;
    await Tone.start();
    ensureSynths();
    ready = true;
  },

  /** Play a named sound effect */
  play(name) {
    if (!ready || muted) return;
    try {
      const fn = SOUNDS[name];
      if (fn) fn();
    } catch (_) { /* swallow audio errors silently */ }
  },

  /** Toggle mute, returns new muted state */
  toggleMute() {
    muted = !muted;
    return muted;
  },

  get muted() { return muted; },
  get ready() { return ready; },
};

export default sfx;
