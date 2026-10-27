// Sound (Web Audio, all generated, no files): a wind bed, an ambient score at the scene's BPM (a slow Dm9 - Bbmaj7 -
// Fmaj7 - Cadd9 pad, a soft arpeggio and a sub pulse, with a kick and hat that come in for the fight) and effects tied
// to the action: machine footsteps, the sword draw and sheathe, whooshes, lightning crackle, the clang of each cut and
// the blasts, panned to where they are on screen. Browsers only allow sound after a click or key press, so it starts
// on the first one (the audio graph is built then too); recordings carry the same mix. M mutes.
import * as THREE from 'three';
import { viewCam } from './stage.js';
import { V } from './util.js';
import { BPM } from './choreo.js';

let AC = null, master, verbIn, padBus, arpBus, scoreBus, NOISE, nextBeat = 0, beatN = 0;
export let soundOn = false, recDest;
const midi = m => 440 * Math.pow(2, (m - 69) / 12), sndV = V();
function initSound() {
  if (soundOn || !(window.AudioContext || window.webkitAudioContext)) return;
  AC = new (window.AudioContext || window.webkitAudioContext)(); soundOn = true;
  master = AC.createGain(); recDest = AC.createMediaStreamDestination();
  const comp = AC.createDynamicsCompressor(); master.connect(comp); comp.connect(AC.destination); comp.connect(recDest);
  const verb = AC.createConvolver(), len = AC.sampleRate * 2.8, ir = AC.createBuffer(2, len, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
  verb.buffer = ir; verbIn = AC.createGain(); verbIn.gain.value = 0.35; verbIn.connect(verb); verb.connect(master);
  NOISE = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const nd = NOISE.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  padBus = out(0, 0.6); padBus.gain.value = 1; arpBus = out(0, 0.9); arpBus.gain.value = 1; scoreBus = out(0, 0.1); scoreBus.gain.value = 1;
  // wind: band-passed noise, its colour and level drifting on two slow LFOs
  const n = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  n.buffer = NOISE; n.loop = true; f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7; g.gain.value = 0.05;
  [[0.07, 250, f.frequency], [0.11, 0.025, g.gain]].forEach(([hz, depth, param]) => {
    const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = hz; lg.gain.value = depth; l.connect(lg); lg.connect(param); l.start();
  });
  n.connect(f); f.connect(g); g.connect(master); n.start();
  nextBeat = AC.currentTime + 0.1;
}
addEventListener('pointerdown', initSound); addEventListener('keydown', initSound);
addEventListener('keydown', e => { if (soundOn && (e.key === 'm' || e.key === 'M')) master.gain.value = master.gain.value > 0 ? 0 : 1; });
// an output for one sound: gain -> stereo pan -> master, with a send to the reverb
function out(pan = 0, wet = 0.3) {
  const g = AC.createGain(), p = AC.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(master);
  if (wet) { const w = AC.createGain(); w.gain.value = wet; p.connect(w); w.connect(verbIn); }
  return g;
}
function env(g, t, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}
function tone(type, freq, t, peak, attack, decay, dest, freqEnd) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + attack + decay);
  env(g, t, peak, attack, decay); o.connect(g); g.connect(dest); o.start(t); o.stop(t + attack + decay + 0.05);
}
function noise(t, peak, attack, decay, dest, type, f0, f1, q = 1) {
  const n = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  n.buffer = NOISE; n.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
  env(g, t, peak, attack, decay); n.connect(f); f.connect(g); g.connect(dest); n.start(t, Math.random() * 1.5); n.stop(t + attack + decay + 0.05);
}
const CHORDS = [[50, 57, 60, 64, 65], [46, 53, 57, 62, 65], [41, 48, 57, 60, 64], [48, 55, 62, 64, 67]];   // Dm9 Bbmaj7 Fmaj7 Cadd9
export function scheduleScore(fight) {                             // schedules a quarter second ahead on the audio clock
  const SPB = 60 / BPM;
  while (nextBeat < AC.currentTime + 0.25) {
    const t = nextBeat, chord = CHORDS[Math.floor(beatN / 8) % 4];
    if (beatN % 8 === 0) chord.forEach(m => [-7, 7].forEach(cents => {   // pad: two detuned saws per note, slow swell
      const o = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
      o.type = 'sawtooth'; o.frequency.value = midi(m); o.detune.value = cents; f.type = 'lowpass'; f.frequency.value = 800;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.011, t + 1.6);
      g.gain.setValueAtTime(0.011, t + 8 * SPB - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + 8 * SPB + 1.4);
      o.connect(f); f.connect(g); g.connect(padBus); o.start(t); o.stop(t + 8 * SPB + 1.5);
    }));
    if (beatN % 4 === 0) tone('sine', midi(chord[0] - 12), t, 0.16, 0.01, 1.2, scoreBus);   // sub pulse
    [0, 0.5].forEach((h, k) => {                                     // arpeggio in eighths, a few notes left out
      if (Math.random() < 0.85) tone('triangle', midi(chord[1 + (beatN * 2 + k) % 4] + 12), t + h * SPB, 0.035, 0.005, 0.5, arpBus);
    });
    if (fight) {                                                     // the fight brings in a kick and a hat
      tone('sine', 120, t, 0.3, 0.003, 0.28, scoreBus, 42);
      noise(t + 0.5 * SPB, 0.025, 0.002, 0.05, scoreBus, 'highpass', 7000);
    }
    nextBeat += SPB; beatN++;
  }
}
const panOf = v => v ? THREE.MathUtils.clamp(sndV.copy(v).project(viewCam).x, -1, 1) * 0.7 : 0;
export const sfx = {
  step(f) {                                                        // footsteps: a clank (heavy for the big one), a rattle for treads
    const t = AC.currentTime, o = out(panOf(f.root.position), 0.15), big = f.type === 'medium';
    if (f.tracks.length) noise(t, 0.045, 0.002, 0.06, o, 'bandpass', 1400, 0, 3);
    else { noise(t, big ? 0.13 : 0.07, 0.002, 0.09, o, 'bandpass', big ? 500 : 900, 0, 2); tone('sine', big ? 70 : 110, t, big ? 0.3 : 0.12, 0.003, 0.15, o, 40); }
  },
  draw() {                                                         // a scrape into a bright metallic ring
    const t = AC.currentTime, o = out(0, 0.5);
    noise(t, 0.08, 0.02, 0.35, o, 'bandpass', 2500, 6000, 4);
    [2093, 3136, 4410].forEach((fq, i) => tone('sine', fq, t + 0.12, 0.05 / (i + 1), 0.005, 1.6, o));
  },
  sheathe() { const t = AC.currentTime, o = out(0, 0.3); noise(t, 0.06, 0.01, 0.25, o, 'bandpass', 5000, 2000, 4); tone('sine', 1800, t + 0.25, 0.05, 0.003, 0.12, o); },
  whoosh(len) { noise(AC.currentTime, 0.16, len * 0.4, len * 0.6, out(0, 0.25), 'bandpass', 350, 2600, 1.5); },
  cut(at) {                                                        // the blade through steel: a clang and an electric snap
    const t = AC.currentTime, o = out(panOf(at), 0.4);
    [470, 1180, 1730, 2650, 3510].forEach((fq, i) => tone(i % 2 ? 'square' : 'sine', fq, t, (i % 2 ? 0.025 : 0.06) / (1 + i * 0.4), 0.002, 0.7 + 0.2 * i, o));
    noise(t, 0.2, 0.002, 0.12, o, 'highpass', 2500); sfx.zap(at, 0.12);
  },
  zap(at, peak) {                                                  // lightning crackle: a few tiny bursts of fizz
    const t = AC.currentTime, o = out(panOf(at), 0.2);
    for (let k = 0; k < 4; k++) noise(t + 0.02 * Math.random(), peak * (0.5 + Math.random()), 0.002, 0.03 + 0.04 * Math.random(), o, 'bandpass', 2000 + 4000 * Math.random(), 0, 2);
  },
  boom(at, size) {                                                 // a deep thump, a roar that darkens, and debris
    const t = AC.currentTime, o = out(panOf(at), 0.5);
    tone('sine', 85, t, 0.6 * size, 0.005, 1.4, o, 28);
    noise(t, 0.35 * size, 0.005, 1.6, o, 'lowpass', 1800, 150);
    noise(t + 0.05, 0.08 * size, 0.01, 0.9, o, 'bandpass', 3000, 800);
  },
};
