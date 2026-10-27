// Her motion, keyed on the beat: named poses, the choreography timeline (rest, the sword move, rest again), a
// Catmull-Rom spline through the keys, per-channel spring smoothing, applying a pose to the rig, the backflip's
// timing, and the idle she rests in between.
import * as THREE from 'three';
import { V, ease } from './util.js';
import { girl, FACE, HIP_Y, hips, spine, head, arms, legs, THIGH, SHIN } from './character.js';

export const BPM = 104;

// ---- dance: keyframed choreography (from the reference clip), blended on the beat ----
// arm: [abduct, forward raise, elbow bend, forearm in]   leg: [hip flex, knee bend, abduct]
// index 0 = her right side (-x), 1 = her left (+x). With the arm raised, a negative forearm-in curls it over the head. Hip height is solved from the legs so feet stay on the floor.
const P = o => ({ hx: 0, hy: 0, hrz: 0, hry: 0, srz: 0, sry: 0, lean: 0, hdz: 0, hdx: 0, spin: 0,
  arm: [[0.15, 0, 0.2, 0], [0.15, 0, 0.2, 0]], leg: [[0, 0.05, 0.06], [0, 0.05, 0.06]],
  wrist: [[0, 0], [0, 0]], ...o });
export const TO_FOE = Math.PI / 4;   // she turns this far to face the robot for the sword move (diagonal to the camera)
const ON_HIP = [0.65, 0, 0.3, 1.9], DOWN = [0.2, 0, 0.3, 0], CHEST = [0.5, 0.6, 2.2, 0.6], CHIN = [0.8, 0.5, 2.3, 0.4];
const POSES = {
  neutral:   P({}),
  headTouch: P({ hx: 0.05, hrz: -0.08, srz: 0.1, hdz: -0.15, arm: [[2.6, 0.2, 0.3, -1.5], CHEST], leg: [[0.15, 0.3, 0.15], [0.03, 0.05, 0.15]] }),
  headTouch2:P({ hx: -0.05, hrz: 0.08, srz: -0.1, hdz: 0.15, arm: [[2.6, 0.2, 0.3, -1.5], CHIN], leg: [[0.03, 0.05, 0.15], [0.15, 0.3, 0.15]] }),
  chinHands: P({ hdz: 0.12, hdx: 0.1, arm: [CHIN, CHIN], leg: [[0.05, 0.1, 0.03], [0.05, 0.1, 0.03]] }),
  hipLean:   P({ hx: -0.05, srz: -0.16, spin: 0.3, hdz: 0.1, arm: [ON_HIP, DOWN], leg: [[0, 0.05, 0.1], [0.4, 0.6, 0.1]] }),
  kneeUp:    P({ hy: 0.04, hdx: -0.1, arm: [[2.2, 0.3, 1.8, -0.3], [2.2, 0.3, 1.8, -0.3]], leg: [[0.05, 0.1, 0.05], [1.4, 1.7, 0.2]] }),
  chest:     P({ hdz: -0.1, arm: [CHEST, CHEST], leg: [[0, 0.05, 0.04], [0, 0.05, 0.04]] }),
  flip:      P({ spin: 0.8, hdz: 0.35, hdx: -0.2, srz: 0.1, arm: [ON_HIP, [0.5, 0, 0.3, 0]], leg: [[0.1, 0.2, 0.08], [0.1, 0.2, 0.08]] }),
  sideWalk:  P({ spin: 1.1, hdx: 0.05, arm: [DOWN, ON_HIP], leg: [[0.35, 0.4, 0], [-0.2, 0.3, 0]] }),
  archUp:    P({ hx: 0.04, hrz: -0.06, arm: [[2.8, 0.1, 0.5, -0.9], [2.8, 0.1, 0.5, -0.9]], leg: [[0.03, 0.05, 0.08], [0.2, 0.4, -0.05]] }),
  open:      P({ hx: 0.06, hrz: -0.1, srz: 0.08, hdz: -0.12, arm: [[0.9, 0.3, 0.6, 0], [0.9, 0.3, 0.6, 0]], leg: [[0.03, 0.05, 0.18], [0.1, 0.25, 0.18]] }),
  point:     P({ hx: -0.06, srz: -0.08, hdz: 0.1, arm: [[0.6, 1.2, 2.2, 0.3], DOWN], leg: [[0.3, 0.6, 0.25], [0, 0.05, 0.3]] }),
  kneeIn:    P({ srz: 0.06, arm: [CHEST, CHEST], leg: [[0.35, 0.7, -0.1], [0.35, 0.7, -0.1]] }),
  squat:     P({ lean: 0.08, arm: [CHIN, CHIN], leg: [[0.45, 0.9, 0.25], [0.45, 0.9, 0.25]] }),
  turnBack:  P({ spin: Math.PI, hdz: 0.15, arm: [[2.5, 0.2, 1.2, -0.6], [1.2, 0, 0.3, 0]], leg: [[0.05, 0.1, 0.12], [0.05, 0.1, 0.12]] }),
  salute:    P({ hdz: -0.08, arm: [[1.4, 1.0, 2.4, 0.4], DOWN], leg: [[0.03, 0.05, 0.2], [0.1, 0.2, 0.2]] }),
  leanUp:    P({ hx: 0.06, hrz: -0.08, srz: 0.12, hdz: -0.1, arm: [[2.4, 0.3, 1.6, -0.3], ON_HIP], leg: [[0.03, 0.05, 0.1], [0.15, 0.3, 0.1]] }),
  wave:      P({ hx: 0.04, srz: -0.06, arm: [[2.9, 0, 0.3, 0], ON_HIP], leg: [[0.1, 0.15, -0.12], [0.05, 0.1, -0.1]] }),
  lunge:     P({ hx: 0.08, hrz: -0.06, srz: 0.1, arm: [[2.2, 0.3, 1.2, 0], [0.5, 0, 0.3, 0]], leg: [[0, 0.05, 0.45], [0.4, 0.9, 0.05]] }),
  // the sword move, turned to face the robot that walked up (see updateFoe): draw over the shoulder, blade low at
  // her side, crouch with the arms back, spring up swinging the blade forward-low, tuck through the backflip with
  // the sword arm out (the blade sweeps up through the robot), unfold, land low, flick the blade, sheathe it
  draw:      P({ spin: TO_FOE, hdz: -0.1, arm: [[2.5, 0.1, 1.9, -0.7], ON_HIP], leg: [[0.1, 0.25, 0.18], [0.25, 0.45, 0.18]] }),
  ready:     P({ spin: TO_FOE, lean: 0.12, hdx: 0.1, arm: [[0.5, -0.2, 0.3, 0], [0.5, 0.5, 1.6, 0.6]], leg: [[0.3, 0.6, 0.22], [0.15, 0.4, 0.22]] }),
  crouch:    P({ spin: TO_FOE, lean: 0.4, hdx: 0.2, arm: [[0.45, -1.0, 0.2, 0], [0.35, -0.7, 0.3, 0]], wrist: [[0.9, 0], [0, 0]], leg: [[0.75, 1.5, 0.12], [0.75, 1.5, 0.12]] }),
  takeoff:   P({ spin: TO_FOE, lean: -0.15, hdx: -0.35, arm: [[0.25, 0.55, 0.1, 0], [0.3, 2.6, 0.2, 0]], leg: [[0, 0.05, 0.06], [0, 0.05, 0.06]] }),
  tuck:      P({ spin: TO_FOE, lean: 0.45, hdx: 0.3, arm: [[0.3, 1.4, 0.1, 0], [0.35, 1.3, 1.9, 0.5]], leg: [[1.8, 2.4, 0.15], [1.8, 2.4, 0.15]] }),
  unfold:    P({ spin: TO_FOE, lean: 0.1, arm: [[1.2, 0.3, 0.2, 0], [1.3, 0.3, 0.3, 0]], leg: [[0.4, 0.7, 0.12], [0.4, 0.7, 0.12]] }),
  land:      P({ spin: TO_FOE, lean: 0.3, hdx: 0.15, arm: [[0.9, 0.6, 0.2, 0], [1.1, 0.2, 0.4, 0]], leg: [[0.65, 1.3, 0.2], [0.65, 1.3, 0.2]] }),
  // ...then, as the other two machines close in on her flanks: wind up low with the blade across her body, whirl a
  // full clockwise turn with the sword arm out at waist height (blade leading), and come out of it crouched
  spinWind:  P({ spin: TO_FOE + 0.5, lean: 0.25, hdx: 0.1, arm: [[0.5, 1.1, 1.7, -0.7], [0.6, 0.3, 0.6, 0]], leg: [[0.55, 1.05, 0.28], [0.55, 1.05, 0.28]] }),
  spinCut:   P({ spin: TO_FOE - 0.3, lean: 0.2, arm: [[0.95, 0.25, 0.1, 0], [1.2, 0.1, 0.4, 0]], leg: [[0.6, 1.2, 0.3], [0.6, 1.2, 0.3]] }),
  spinEnd:   P({ spin: TO_FOE - 0.6, lean: 0.2, hdx: 0.05, arm: [[1.0, 0.4, 0.2, 0], [1.1, 0.2, 0.4, 0]], leg: [[0.5, 1.0, 0.3], [0.5, 1.0, 0.3]] }),
  flourish:  P({ spin: TO_FOE, hdz: -0.1, arm: [[1.2, 0.1, 0.25, 0], ON_HIP], leg: [[0.05, 0.1, 0.2], [0.15, 0.3, 0.2]] }),
  // resting, the cartoon idle from the user's reference: arms nearly straight, angled down and out, hands bent up
  // at the wrists so the fingers point outward, feet close with her left one a little in front and crossed in,
  // weight on the back foot, a small head tilt (livePose moves the hands up and down)
  rest:      P({ hx: -0.015, lean: -0.03, hdz: 0.08, hdx: 0.02, arm: [[0.45, 0.05, 0.12, 0], [0.45, 0.05, 0.12, 0]],
               wrist: [[0, -0.9], [0, 0.9]], leg: [[0.02, 0.06, 0.01], [0.16, 0.14, -0.07]] }),
  sheathe:   P({ spin: TO_FOE, hdz: -0.1, arm: [[2.5, 0.1, 1.9, -0.7], ON_HIP], leg: [[0.1, 0.25, 0.18], [0.25, 0.45, 0.18]] }),
};
// [pose, beats to reach it, full turns added on the way in]
// DANCE is the old dance loop (transcribed from the user's clip). It isn't played since they asked her to stop
// dancing; put it back at the start of CHOREO, and the groove back into livePose, to make her dance again.
const DANCE = [
  ['headTouch', 2], ['headTouch2', 2], ['chinHands', 2], ['hipLean', 2], ['kneeUp', 1], ['chest', 2],
  ['flip', 2, 1], ['sideWalk', 2], ['archUp', 2], ['open', 2], ['point', 2], ['neutral', 2],
  ['open', 2], ['kneeIn', 1], ['squat', 2], ['kneeIn', 1], ['neutral', 2], ['turnBack', 2],
  ['salute', 2], ['leanUp', 2], ['wave', 2], ['lunge', 2],
];
// she rests with floating hands, the robot walks up, she cuts it down with the backflip slash and rests again
const CHOREO = [
  ['rest', 2], ['rest', 10],
  ['draw', 2], ['ready', 1], ['crouch', 1], ['takeoff', 0.35], ['tuck', 0.6], ['unfold', 0.55], ['land', 0.45],
  ['spinWind', 0.45], ['spinCut', 0.6, -1], ['spinEnd', 0.4], ['flourish', 1.2], ['sheathe', 2], ['rest', 2], ['rest', 4],
];
export const CHOREO_BEATS = CHOREO.reduce((a, k) => a + k[1], 0);

// poses as flat vectors so they can be splined and spring-smoothed channel by channel
const SCAL = ['hx', 'hy', 'hrz', 'hry', 'srz', 'sry', 'lean', 'hdz', 'hdx', 'spin'];
export const toVec = p => [...SCAL.map(k => p[k]), ...p.arm.flat(), ...p.leg.flat(), ...p.wrist.flat()];
export const fromVec = v => {
  const p = {}; SCAL.forEach((k, i) => p[k] = v[i]);
  p.arm = [v.slice(10, 14), v.slice(14, 18)]; p.leg = [v.slice(18, 21), v.slice(21, 24)];
  p.wrist = [v.slice(24, 26), v.slice(26, 28)];
  return p;
};
const N_TURNS = CHOREO.reduce((a, k) => a + (k[2] || 0), 0), KEY_START = [], KEY_TURNS = [];
CHOREO.reduce(([b, tr], [, len, add = 0]) => { KEY_START.push(b); KEY_TURNS.push(tr + add); return [b + len, tr + add]; }, [0, 0]);
function keyVec(g) {   // key g on an endless timeline; spin keeps accumulating turns so it never unwinds
  const n = CHOREO.length, i = ((g % n) + n) % n, v = toVec(POSES[CHOREO[i][0]]);
  v[9] += (KEY_TURNS[i] + Math.floor(g / n) * N_TURNS) * Math.PI * 2;
  return v;
}
export function choreo(b) {
  // Catmull-Rom through the keys: segment i flows from key i-1 into key i without stopping
  const loop = Math.floor(b / CHOREO_BEATS), lb = b - loop * CHOREO_BEATS;
  let i = CHOREO.length - 1; while (KEY_START[i] > lb) i--;
  const g = loop * CHOREO.length + i;
  let u = (lb - KEY_START[i]) / CHOREO[i][1];
  u = u * 0.4 + ease(u) * 0.6;                       // keep some momentum through each key
  const [p0, p1, p2, p3] = [g - 2, g - 1, g, g + 1].map(keyVec), u2 = u * u, u3 = u2 * u;
  return p1.map((_, k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2
    + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * u3));
}
function groove(p, b) {
  const phase = b - Math.floor(b), beat = b * Math.PI * 2;
  const dip = 0.5 + 0.5 * Math.cos(beat), sway = Math.sin(b * Math.PI), late = Math.sin(b * Math.PI - 0.8);
  const hit = Math.pow(Math.max(0, Math.cos(beat - 0.35)), 6);                // a small, clean accent on the beat
  const swing = Math.floor(b) % 2, step = phase < 0.18 ? ease(phase / 0.18)
    : phase < 0.48 ? 1 : phase < 0.76 ? 1 - ease((phase - 0.48) / 0.28) : 0;
  p.leg.forEach(l => { l[1] += 0.055 * dip; });                                // settle through both knees on each beat
  p.hx += 0.022 * sway + (swing === 0 ? 0.012 : -0.012) * step;                // hips travel over the standing foot
  p.hrz -= 0.035 * sway; p.hry += 0.025 * Math.sin(beat - 0.7);                // pelvis counters the step
  p.srz += 0.045 * late + 0.018 * hit; p.sry += 0.04 * late;                   // ribcage answers after the hips
  p.lean += 0.018 * Math.sin(beat - 0.45);
  p.hdx += 0.04 * dip; p.hdz -= 0.028 * late;                                  // head nods and counter-tilts
  p.arm.forEach((a, i) => {
    a[1] += 0.035 * Math.sin(b * Math.PI + i * 2);
    a[2] += 0.045 * dip;
    p.wrist[i][0] += 0.045 * Math.sin(beat - 0.5 + i * Math.PI);               // relaxed hand articulation
    p.wrist[i][1] += 0.06 * Math.sin(b * Math.PI + i * Math.PI);
  });
  return p;
}
// Keep the pose changes tidy while preserving a little delay in the shoulders and wrists.
const W = [16, 16, 16, 14, 14, 14, 14, 12, 12, 12, ...Array(8).fill(12), ...Array(6).fill(18), ...Array(4).fill(15)];
const Z = [0.92, 0.92, 0.92, 0.9, 0.9, 0.9, 0.9, 0.85, 0.85, 0.95, ...Array(8).fill(0.82), ...Array(6).fill(0.95), ...Array(4).fill(1.0)];
let cur = null, vel = null;
export function follow(target, dt) {
  if (!cur) { cur = target.slice(); vel = target.map(() => 0); return cur; }
  const h = dt / 4;
  for (let n = 0; n < 4; n++) for (let k = 0; k < cur.length; k++) {
    vel[k] += (W[k] * W[k] * (target[k] - cur[k]) - 2 * Z[k] * W[k] * vel[k]) * h;
    cur[k] += vel[k] * h;
  }
  return cur;
}
const cuffAxis = V();
export function applyPose(p) {
  girl.rotation.y = FACE + p.spin;
  hips.rotation.set(0, p.hry, p.hrz);
  spine.rotation.set(p.lean, p.sry, p.srz);
  head.rotation.set(p.hdx, 0, p.hdz);
  arms.forEach(({ s, sh, el, wrist, cuff, cuffShape }, i) => {
    const [abd, fwd, bend, inward] = p.arm[i];
    sh.rotation.set(-fwd, 0, s * abd);
    el.rotation.set(-bend, 0, -s * inward);
    // the cuff sits on the bisector of the elbow (half the bend) and stretches across the fold so it still
    // covers both the upper arm and the forearm; at 90 degrees it's at 45, shared between the two
    const q = el.quaternion, ang = 2 * Math.acos(Math.min(1, Math.abs(q.w)));
    cuff.quaternion.identity().slerp(q, 0.5);
    if (ang > 1e-3) {
      cuffAxis.set(q.x, q.y, q.z).normalize();                               // bend axis (unchanged in the cuff's frame)
      cuffShape.rotation.set(0, Math.atan2(cuffAxis.z, -cuffAxis.x), 0);     // local z -> across the fold
      cuffShape.scale.set(1, 1, 1 / Math.max(0.82, Math.cos(ang / 2)));        // at most ~22% longer across the fold
    } else cuffShape.scale.set(1, 1, 1);
    wrist.rotation.set(p.wrist[i][0], 0, p.wrist[i][1]);
  });
  let reach = 0;
  legs.forEach(({ s, hip, knee, ankle }, i) => {
    const [flex, kn, abd] = p.leg[i];
    const side = -p.hx / (THIGH + SHIN) - p.hrz + s * abd;   // counter the hip shift, then splay outward
    hip.rotation.set(-flex, 0, side);
    knee.rotation.x = kn;
    ankle.rotation.set(flex - kn, 0, 0);
    reach = Math.max(reach, (THIGH * Math.cos(flex) + SHIN * Math.cos(kn - flex)) * Math.cos(side));
  });
  hips.position.set(p.hx, HIP_Y - THIGH - SHIN + reach + p.hy, 0);   // keyed hip height; updateFeet keeps feet reachable
}

// ---- the sword move: machines walk up while she rests; she draws, backflips and cuts the first in half on the way
// up, lands, whirls through the other two, flicks the blade and sheathes it. Timings (in beats within the loop) come from the CHOREO keys.
const keyAt = name => { const i = CHOREO.findIndex(k => k[0] === name); return KEY_START[i] + CHOREO[i][1]; };
const FLIP0 = keyAt('takeoff') + 0.1, FLIP_H = 0.5;   // +0.1: the pose follower runs a little late
export const FLIP_LEN = 1.3, FLIP_C = 1;
export const DRAW_AT = keyAt('draw') + 0.1, SHEATHE_AT = keyAt('sheathe') + 0.1;
export function flipAt(lb) {             // airborne: one full backward turn (fastest mid-air, tucked) on a jump arc,
  const u = (lb - FLIP0) / FLIP_LEN, r = Math.min(1, u / 0.9);   // upright again just before touchdown
  return u > 0 && u < 1 ? { u, pitch: -Math.PI * 2 * (0.3 * r + 0.7 * ease(r)), lift: FLIP_H * 4 * u * (1 - u) } : null;
}
// the spinning slash, and the fight's clock: beats from the takeoff (fightT), wrapped into (-half loop, half loop]
export const SPIN0 = keyAt('spinWind') - FLIP0, SPIN1 = keyAt('spinEnd') - FLIP0;
export const fightT = lb => { const t = lb - FLIP0; return t > CHOREO_BEATS / 2 ? t - CHOREO_BEATS : t < -CHOREO_BEATS / 2 ? t + CHOREO_BEATS : t; };

// ---- rest: between fights she stands in the grass in the cartoon idle, bobbing gently on her knees while her hands
// move slightly up and down, rising a touch as she dips (follow-through). It all fades out for the sword move. ----
const MOVE_IN = KEY_START[CHOREO.findIndex(k => k[0] === 'draw')], MOVE_OUT = keyAt('sheathe');
const restAt = lb => 1 - THREE.MathUtils.smoothstep(lb, MOVE_IN, MOVE_IN + 1) + THREE.MathUtils.smoothstep(lb, MOVE_OUT, MOVE_OUT + 1.5);
export function livePose(still, b, lb) { // keyed pose + the hands' up and down, bob and breathing at rest
  const k = restAt(lb), p = fromVec(still);
  p.arm.forEach((a, i) => {
    a[0] += k * 0.07 * Math.sin(b * Math.PI - 0.6 + i * 0.25);                                 // hands up and down
    p.wrist[i][1] += k * (i ? 1 : -1) * 0.1 * Math.sin(b * Math.PI - 1.2 + i * 0.25);          // the bent hands follow
  });
  p.lean += k * 0.012 * Math.sin(b * Math.PI / 4);                                  // breathing
  p.hy -= k * 0.03 * (0.5 - 0.5 * Math.cos(b * Math.PI));                           // bob: dips on the knees every 2 beats
  return p;
}
