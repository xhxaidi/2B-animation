// Cinematic "robot cam": a motion-control camera (perspective) that sweeps, orbits and pushes in around her in
// one unbroken move timed to the loop, with smooth slow-motion speed ramps on the cuts, framed 4:3 (CINE_ASPECT;
// bars fill the rest of a wider or taller window). O switches to a steady wide orbit of the whole scene instead
// (?orbit). C toggles it; R records one full loop to a video file (?cine opens in it; ?cine&rec records the first
// loop straight away).
import * as THREE from 'three';
import { renderer, cam, cineCam, PX, setPX, useCamera, bars } from './stage.js';
import { V } from './util.js';
import { FACE, hips } from './character.js';
import { CHOREO_BEATS, FLIP_LEN, SPIN0, SPIN1 } from './choreo.js';
import { soundOn, recDest } from './sound.js';

const REC_PX = 2;                                                  // art pixel size while recording (see startRec)
const Q = new URLSearchParams(location.search);
let cine = Q.has('cine') || Q.has('orbit'), orbit = Q.has('orbit'), rec = null, lastLb = 0, ticked = false;
const CINE_ASPECT = 4 / 3;                                         // the user wanted the video in 4:3
const aim = V(), ORIGIN = V();
const around = (out, yaw, r, h, c = ORIGIN) => out.set(c.x + Math.sin(yaw) * r, h, c.z + Math.cos(yaw) * r);
// one continuous take, no cuts, like a single motion-control move: it opens high and wide on the whole island, then
// orbits the scene exactly once (yaw keeps travelling clockwise from above, a full turn per loop), swooping in close
// for the fight and climbing back out, so the end meets the start. [beat, yaw, distance, height, aim x, y, z, fov,
// roll]; the keys are joined by a looping Catmull-Rom spline (each wrap carries the yaw on by a further full turn).
const CAM_KEYS = [
  [0, FACE, 6.5, 4.6, 0, 0.4, 0, 38, 0],                            // wide on the whole island, from high up
  [3, FACE - 0.45, 4.8, 3.0, 0, 0.7, 0, 36, 0],                     // drifting round and down...
  [6, FACE - 0.95, 3.0, 1.6, 0, 1.1, 0, 34, 0],                     // ...in toward her as the machines appear
  [9, FACE - 1.6, 2.6, 1.3, 0.2, 0.85, 0.2, 36, 0],                 // round past them as they walk in
  [12, FACE - 2.3, 2.9, 1.6, 0, 0.9, 0, 36, 0.04],                  // behind her, over the machines as they close in
  [14.5, FACE - 2.9, 2.8, 1.7, 0, 1.2, 0, 34, 0],                   // the draw
  [16.4, FACE - 3.5, 2.4, 0.7, 0, 1.0, 0, 38, -0.05],               // low, side-on for the takeoff
  [17.4, FACE - 3.95, 2.6, 1.6, 0, 1.5, 0, 40, 0.1],                // riding up with the backflip (aim follows her)
  [18.4, FACE - 4.4, 2.3, 0.6, 0, 0.9, 0, 40, 0],                   // down low for the landing
  [19.4, FACE - 4.9, 2.2, 0.75, 0, 0.85, 0, 42, -0.08],             // wheeling round through the spin
  [21, FACE - 5.3, 1.9, 1.4, 0, 1.35, 0, 32, 0],                    // in on her as the wrecks burn
  [24, FACE - 5.75, 3.6, 2.6, 0, 0.8, 0, 36, 0],                    // pulling back out...
  [CHOREO_BEATS, FACE - Math.PI * 2, 6.5, 4.6, 0, 0.4, 0, 38, 0],   // ...to the wide shot it started on, one turn later
];
const CAM_TURN = CAM_KEYS[CAM_KEYS.length - 1][1] - CAM_KEYS[0][1];
const camV = new Array(8).fill(0), herHips = V();
function updateCine(lb, tf) {
  if (orbit) {                                                     // steady wide orbit: one turn per loop, whole island in frame
    const a = lb / CHOREO_BEATS * Math.PI * 2;
    around(cineCam.position, FACE - a, 7.2, 3.7 + 0.45 * Math.sin(a * 2));   // the user wanted it a bit further out
    cineCam.fov = 38; cineCam.updateProjectionMatrix(); cineCam.lookAt(aim.set(0, 0.7, 0));
    return;
  }
  const K = CAM_KEYS, n = K.length - 1;
  const at = j => { const w = Math.floor(j / n), k = K[j - w * n]; return w ? k.map((v, c) => c === 1 ? v + w * CAM_TURN : v) : k; };
  let i = 0; while (i < n - 1 && K[i + 1][0] <= lb) i++;
  const u = THREE.MathUtils.clamp((lb - K[i][0]) / (K[i + 1][0] - K[i][0]), 0, 1), u2 = u * u, u3 = u2 * u;
  const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
  for (let c = 1; c <= 8; c++) camV[c - 1] = 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * u + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u2
    + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * u3);
  const [yaw, r, h, ax, ay, az, fov, roll] = camV;
  around(cineCam.position, yaw, Math.max(1.3, r), Math.max(0.3, h));
  aim.set(ax, ay, az);
  const wf = THREE.MathUtils.smoothstep(tf, -0.3, 0) * (1 - THREE.MathUtils.smoothstep(tf, FLIP_LEN, FLIP_LEN + 0.4));
  if (wf > 0) aim.lerp(hips.getWorldPosition(herHips), 0.6 * wf);   // keep her in frame through the flip
  cineCam.fov = fov; cineCam.updateProjectionMatrix();
  cineCam.lookAt(aim); cineCam.rotateZ(roll);                      // a little dutch tilt on the action
}
const cineSpeed = tf => {                                          // slow motion through the backflip cut and the spin
  const w = (a, b) => THREE.MathUtils.smoothstep(tf, a - 0.12, a) * (1 - THREE.MathUtils.smoothstep(tf, b, b + 0.15));
  return 1 - 0.7 * w(-0.15, 0.55) - 0.62 * w(SPIN0 + 0.3, SPIN1 - 0.05);
};
export const frameSpeed = tf => cine && !orbit ? cineSpeed(tf) : 1;   // the wide orbit runs at real speed
// pick this frame's camera, move the robot cam, and crop to the cinematic aspect: side bars if wider, top/bottom if taller
export function updateCamera(lb, tf) {
  useCamera(cine ? cineCam : cam);
  if (cine) updateCine(lb, tf);
  const A = innerWidth / innerHeight;
  bars.set(cine && A > CINE_ASPECT ? (1 - CINE_ASPECT / A) / 2 : 0, cine && A < CINE_ASPECT ? (1 - A / CINE_ASPECT) / 2 : 0);
}
const hint = document.getElementById('hint'), HINT = hint.textContent;
function startRec() {                                              // records from the top of the next loop to the one after
  const type = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']
    .find(t => MediaRecorder.isTypeSupported(t));
  const stream = new MediaStream([...renderer.domElement.captureStream(60).getVideoTracks(), ...(soundOn ? recDest.stream.getAudioTracks() : [])]);
  // finer art pixels while recording (the same dither look, twice the detail each way) and a high bitrate so the
  // encoder keeps the dither crisp instead of smearing it
  const livePX = PX; setPX(Math.min(PX, REC_PX));
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 50e6, audioBitsPerSecond: 256000 }), chunks = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(chunks, { type }));
    a.download = (orbit ? 'pixel-dance-orbit.' : 'pixel-dance-cinematic.') + (type.startsWith('video/mp4') ? 'mp4' : 'webm');
    a.click(); rec = null; hint.textContent = HINT; setPX(livePX);
  };
  rec = { recorder, rolling: !ticked };                            // before the first frame we're already at the top of the loop
  if (rec.rolling) recorder.start();
  hint.textContent = rec.rolling ? '● recording one loop' : '● recording starts at the top of the loop';
}
addEventListener('keydown', e => {
  if (e.key === 'c' || e.key === 'C') { cine = !cine; orbit = false; }
  if (e.key === 'o' || e.key === 'O') { orbit = !orbit || !cine; cine = true; }
  if ((e.key === 'r' || e.key === 'R') && !rec && window.MediaRecorder) { cine = true; startRec(); }
});
// ?rec waits for a click (browsers only allow sound after one), then records the loop from its start, sound and all
export let holdForClick = cine && Q.has('rec') && !!window.MediaRecorder;
if (holdForClick) {
  hint.textContent = 'click to start recording (with sound)';
  addEventListener('pointerdown', () => { if (holdForClick) { holdForClick = false; startRec(); } });
}
// once per frame: when the loop wraps, start rolling, or stop after one full loop
export function recordTick(lb) {
  ticked = true;
  if (rec && lb < lastLb) {
    if (!rec.rolling) { rec.recorder.start(); rec.rolling = true; hint.textContent = '● recording one loop'; }
    else rec.recorder.stop();
  }
  lastLb = lb;
}
