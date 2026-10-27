// The fight: three machines walk up while she rests. The first stops in front of her (she faces FACE + TO_FOE
// for the whole move) and is split by the backflip's rising slash at a fixed beat; the other two close in on her
// flanks as she lands and are split by the spinning slash, each the moment the blade actually sweeps past it (or at
// the end of the spin at the latest). Times are beats from the takeoff (fightT). Also the blade's slash trail, its
// purple lightning, and the blast each machine goes up in.
import * as THREE from 'three';
import { scene } from './stage.js';
import { V, UP, wrapAng } from './util.js';
import { FACE, handSword } from './character.js';
import { foes } from './machines.js';
import { BPM, TO_FOE, FLIP_LEN, SPIN0, SPIN1 } from './choreo.js';
import { soundOn, sfx } from './sound.js';

const FOE_YAW = FACE + TO_FOE, FOE_AT = V().set(Math.sin(FOE_YAW), 0, Math.cos(FOE_YAW)).multiplyScalar(0.7);
const FIGHT = [
  { from: V().set(Math.cos(1.1) * 2.05, 0, Math.sin(1.1) * 2.05), at: FOE_AT, tIn: -11, tStop: -3.5, raise: [-2.5, -0.5],
    cutAt: 0.1 * FLIP_LEN, tOut: 7.1, boom: 0.25, boomSize: 1 },
  { from: V().set(-2.05, 0, -0.45), at: V().set(-0.75, 0, -0.25), tIn: -9, tStop: FLIP_LEN + 0.15, raise: [FLIP_LEN - 0.5, SPIN0 + 0.1],
    cutAt: null, tOut: SPIN1 + 6.5, boom: 0.15, boomSize: 0.75 },
  { from: V().set(Math.cos(-1) * 2.05, 0, Math.sin(-1) * 2.05), at: V().set(0.72, 0, -0.32), tIn: -8, tStop: FLIP_LEN + 0.3,
    raise: [FLIP_LEN - 0.3, SPIN0 + 0.15], cutAt: null, tOut: SPIN1 + 6.6, boom: 0.15, boomSize: 0.75 },
].map((f, i) => Object.assign(foes[i], f, { chest: V() }));
const HOT = new THREE.Color(0xfff0c0), WARM = new THREE.Color(0xff6a20), COLD = new THREE.Color(0x3a2a26);
const tipW = V(), tiltAxis = V();
let strike = null, prevBlade = null;     // strike: the latest cut { at, t }, for the lightning to hit
export function updateFoes(t, dt) {
  handSword.localToWorld(tipW.set(0, -0.4, 0));
  const blade = Math.atan2(tipW.x, tipW.z);                         // where the blade points around her
  const sweep = t > SPIN0 && t < SPIN1 + 0.3 && prevBlade != null ? [prevBlade, blade] : null;
  prevBlade = blade;
  FIGHT.forEach(f => updateFoe(f, t, dt, sweep));
}
function updateFoe(f, t, dt, sweep) {
  const { root, eye, cut, halves, legs, arms, faces, bits } = f;
  const blink = (t < f.tIn + 1 || t > f.tOut - 1.5) && Math.floor(t * 8) % 2;   // blinks in and out like a game enemy
  root.visible = t > f.tIn && t < f.tOut && !blink;
  if (t <= f.tIn || t >= f.tOut) { f.cutT = null; bits.forEach(p => p.m.visible = false); return; }
  // walk up through the grass, turning to face her at the end; the arms come up as she gets ready
  const w = THREE.MathUtils.clamp((t - f.tIn) / (f.tStop - f.tIn), 0, 1), gait = 1 - THREE.MathUtils.smoothstep(w, 0.88, 1);
  const heavy = f.type === 'medium', ph = (t - f.tIn) * Math.PI * (heavy ? 0.75 : 1), raise = THREE.MathUtils.smoothstep(t, f.raise[0], f.raise[1]);
  root.position.lerpVectors(f.from, f.at, w);
  const stepSign = Math.sign(Math.sin(ph * (f.tracks.length ? 4 : 1)));   // a footstep (or a tread clatter) each half cycle
  if (soundOn && root.visible && gait > 0.3 && f.stepSign && stepSign !== f.stepSign) sfx.step(f);
  f.stepSign = stepSign;
  root.position.y = f.tracks.length ? 0 : (heavy ? 0.022 : 0.012) * gait * Math.abs(Math.cos(ph));   // the big one stomps
  const dist = f.from.distanceTo(f.at) * w / f.size;                                               // the tracked one drives:
  f.tracks.forEach(tr => { tr.place(-dist); tr.wheels.forEach(([wh, r]) => wh.rotation.x = dist / r); });   // belt creeps, wheels turn
  root.rotation.y = THREE.MathUtils.lerp(Math.atan2(f.at.x - f.from.x, f.at.z - f.from.z),
    Math.atan2(-f.at.x, -f.at.z), THREE.MathUtils.smoothstep(w, 0.7, 1));
  legs.forEach(([l, kn], i) => {
    l.rotation.x = -(heavy ? 0.24 : 0.3) * gait * Math.sin(ph + i * Math.PI);
    kn.rotation.x = 0.5 * gait * Math.max(0, Math.cos(ph + i * Math.PI));     // knee bends on the swing
  });
  arms.forEach((a, i) => a.rotation.set(0.3 * gait * Math.sin(ph + i * Math.PI) - 2.4 * raise, 0, (i ? 1 : -1) * 0.25 * raise));
  // the cut: at its beat (backflip), or when the spinning blade crosses its direction; sparks fly from the cut
  const crossed = sweep && (() => {
    const ra = Math.atan2(f.at.x, f.at.z), d0 = wrapAng(sweep[0] - ra), d1 = wrapAng(sweep[1] - ra);
    return Math.sign(d0) !== Math.sign(d1) && Math.abs(d0 - d1) < 1.5;
  })();
  if (f.cutT == null && (f.cutAt != null ? t >= f.cutAt : crossed || t > SPIN1 + 0.3)) {
    f.cutT = f.cutAt ?? t;
    if (soundOn) sfx.cut(root.position);
    root.localToWorld(f.chest.set(0, 0.62 + f.lift, 0)); strike = { at: f.chest, t: f.cutT };
    f.slide.set(-f.at.z, 0, f.at.x).normalize().applyAxisAngle(UP, -root.rotation.y);   // the way a clockwise sweep carries the top
    bits.forEach(p => {
      const a = Math.random() * Math.PI * 2;
      p.m.position.copy(root.localToWorld(f.split === 'vertical' ? V().set(0, 0.45 + f.lift + Math.random() * 0.45, (Math.random() - 0.5) * 0.1)
        : V().set(Math.cos(a) * 0.13, f.cutY, Math.sin(a) * 0.13)));
      p.v.set(Math.random() - 0.5, 0.6 + Math.random(), Math.random() - 0.5).multiplyScalar(2.2);
      p.life = 0.5 + Math.random() * 0.4; p.m.visible = true;
    });
  }
  bits.forEach(p => {
    if (!p.m.visible) return;
    p.life -= dt; p.v.y -= 9.8 * dt; p.m.position.addScaledVector(p.v, dt);
    if (p.m.position.y < 0) { p.m.position.y = 0; p.v.multiplyScalar(0.4); p.v.y = Math.abs(p.v.y); }
    p.m.visible = p.life > 0;
  });
  const ts = f.cutT == null ? -1 : t - f.cutT;
  if (f.split === 'vertical') {          // both halves hang there a moment, then fall apart from their feet
    const fall = Math.min(1, (Math.max(0, ts - 0.35) / 0.9) ** 2), slide = THREE.MathUtils.clamp(ts - 0.35, 0, 1);
    halves.forEach((h, i) => { const s = i ? 1 : -1; h.rotation.z = -s * 1.35 * fall; h.position.x = s * (0.12 + 0.04 * slide); });
  } else {                               // the top slides off along the sweep and tips over into the grass, then the legs buckle
    const [bottom, top] = halves, k = Math.min(1, (Math.max(0, ts - 0.12) / 0.7) ** 2), k2 = Math.min(1, (Math.max(0, ts - 0.45) / 0.8) ** 2);
    top.position.set(f.slide.x * 0.3 * k, f.cutY - (f.cutY - 0.13) * k, f.slide.z * 0.3 * k);
    top.quaternion.setFromAxisAngle(tiltAxis.set(f.slide.z, 0, -f.slide.x), 1.4 * k);
    bottom.rotation.x = -1.25 * k2;
  }
  faces.forEach(fc => fc.visible = ts > 0);
  eye.color.setHex(ts > 0 ? 0x2a1a18 : 0xfff0c8);
  if (ts > 0) cut.color.lerpColors(ts < 1 ? HOT : WARM, ts < 1 ? WARM : COLD, ts < 1 ? ts : Math.min(1, (ts - 1) / 3));
}

// slash trail: where the blade was over the last few frames, a band that narrows toward the tip as it trails off
// (the samples are splined, so a fast swing still draws a smooth arc instead of straight facets)
const TRAIL_N = 10, TRAIL_PTS = 40, trailHist = [], trailPos = new Float32Array(TRAIL_PTS * 6), trailGeo = new THREE.BufferGeometry(), tq = V(), tq2 = V();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
trailGeo.setIndex(Array.from({ length: TRAIL_PTS - 1 }, (_, i) => [2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2]).flat());
const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: 0xd9c2ff, side: THREE.DoubleSide }));
trail.frustumCulled = false; trail.visible = false; scene.add(trail);
export function updateTrail(on) {
  if (!on) { trailHist.length = 0; trail.visible = false; return; }
  trailHist.unshift([handSword.localToWorld(V().set(0, -0.12, 0)), handSword.localToWorld(V().set(0, -0.49, 0))]);
  if (trailHist.length > TRAIL_N) trailHist.pop();
  trail.visible = trailHist.length > 2;
  if (!trail.visible) return;
  const inner = new THREE.CatmullRomCurve3(trailHist.map(h => h[0])), tip = new THREE.CatmullRomCurve3(trailHist.map(h => h[1]));
  for (let i = 0; i < TRAIL_PTS; i++) {
    const u = i / (TRAIL_PTS - 1);
    tip.getPoint(u, tq2); inner.getPoint(u, tq).lerp(tq2, u);
    trailPos.set([tq.x, tq.y, tq.z, tq2.x, tq2.y, tq2.z], i * 6);
  }
  trailGeo.attributes.position.needsUpdate = true;
}

// ---- purple lightning off the blade: jagged bolts (1-pixel lines in the low-res target, so they come out as crisp
// art pixels) re-rolled every frame. They crackle as she crouches, rage through the backflip and the spin (two
// strike each machine as it's cut) and die out after; a violet light flickers with them. Colours above 1 glow after tone mapping.
const BOLTS = 10, BOLT_SEG = 6, boltPos = new Float32Array(BOLTS * BOLT_SEG * 6), boltGeo = new THREE.BufferGeometry();
boltGeo.setAttribute('position', new THREE.BufferAttribute(boltPos, 3));
const bolts = new THREE.LineSegments(boltGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(0.85, 0.28, 1.9) }));
bolts.frustumCulled = false; bolts.visible = false; scene.add(bolts);
const boltLight = new THREE.PointLight(0xa45cff, 0, 1.8); scene.add(boltLight);
const bA = V(), bB = V(), bP = V(), bQ = V();
export function updateBolts(t) {         // t: beats from takeoff
  const power = !handSword.visible ? 0 : t < 0 ? 0.35 * THREE.MathUtils.smoothstep(t, -1.2, -0.2)
    : 1 - THREE.MathUtils.smoothstep(t, SPIN1, SPIN1 + 0.5);                      // full through the flip and the spin
  bolts.visible = power > 0; boltLight.intensity = 0;
  if (!bolts.visible) return;
  const striking = strike && t - strike.t > -0.05 && t - strike.t < 0.4;           // two bolts hit each machine as it's cut
  for (let k = 0, o = 0; k < BOLTS; k++) {
    const hit = striking && k < 2, live = hit || Math.random() < power;
    handSword.localToWorld(bA.set(0, -0.49 + Math.random() * 0.55, 0));             // somewhere along the blade
    bB.copy(hit ? strike.at : bA).add(bP.randomDirection().multiplyScalar(hit ? 0.08 : 0.12 + 0.3 * power * Math.random()));
    const jag = bA.distanceTo(bB) * 0.35;
    bQ.copy(bA);
    for (let n = 1; n <= BOLT_SEG; n++, o += 6) {
      bP.lerpVectors(bA, bB, n / BOLT_SEG);
      if (n < BOLT_SEG) bP.add(V().set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(jag));
      if (!live) bP.copy(bA), bQ.copy(bA);
      boltPos.set([bQ.x, bQ.y, bQ.z, bP.x, bP.y, bP.z], o);
      bQ.copy(bP);
    }
  }
  boltGeo.attributes.position.needsUpdate = true;
  handSword.localToWorld(boltLight.position.set(0, -0.2, 0));
  boltLight.intensity = power * (1.5 + Math.random() * 1.5);
  return power;
}

// ---- each machine blows up a moment after its cut: a lumpy fireball of separate puffs flashes white-hot, swells and
// cools through yellow to red, then the glow (emissive) dies and they roll up as sunlit grey smoke, billowing away
// from her; a shockwave ring skims the grass tops; an orange light flashes at the brightest blast ----
const BLACK = new THREE.Color(0, 0, 0);
const FIRE = [new THREE.Color(1.6, 1.4, 1), new THREE.Color(1.3, 0.6, 0.1), new THREE.Color(0.7, 0.12, 0.02)];
const blasts = FIGHT.map(() => {
  const puffs = Array.from({ length: 14 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshLambertMaterial({ color: 0x2a2624 })), off = V().randomDirection();
    m.visible = false; scene.add(m); off.y = Math.abs(off.y) * 0.8;
    return { m, off: off.multiplyScalar(0.06 + 0.2 * Math.random()), size: 0.09 + Math.random() * 0.14, delay: i * 0.02 };
  });
  const shock = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 4, 40), new THREE.MeshBasicMaterial());
  shock.rotation.x = Math.PI / 2; shock.visible = false; scene.add(shock);
  return { puffs, shock };
});
const blastLight = new THREE.PointLight(0xffa040, 0, 3); scene.add(blastLight);
const away = V(), po = V();
export function updateBlasts(t) {
  let flash = 0;
  FIGHT.forEach((f, i) => {
    const { puffs, shock } = blasts[i], c = f.chest, z = f.boomSize;
    const s = f.cutT == null ? -1 : (t - f.cutT - f.boom) * 60 / BPM;          // seconds since this blast
    away.set(c.x, 0, c.z).normalize();
    puffs.forEach(p => {
      const a = s - p.delay; p.m.visible = a > 0 && a < 1.4;
      if (!p.m.visible) return;
      p.m.scale.setScalar(Math.max(1e-3, z * p.size * (1 - Math.exp(-a * 14)) * (a < 0.5 ? 1 : 1 - (a - 0.5) / 0.9)));
      po.copy(p.off); if (po.dot(away) < 0) po.addScaledVector(away, -2 * po.dot(away));
      p.m.position.copy(c).addScaledVector(po, z * (1 + a * 1.2)).addScaledVector(away, a * 0.3).y += a * 0.45;
      const glow = p.m.material.emissive;
      if (a < 0.05) glow.copy(FIRE[0]);
      else if (a < 0.2) glow.lerpColors(FIRE[0], FIRE[1], (a - 0.05) / 0.15);
      else if (a < 0.4) glow.lerpColors(FIRE[1], FIRE[2], (a - 0.2) / 0.2);
      else glow.lerpColors(FIRE[2], BLACK, Math.min(1, (a - 0.4) / 0.3));
    });
    shock.visible = s > 0 && s < 0.3;
    if (shock.visible) {
      shock.position.set(c.x, 0.22, c.z); shock.scale.setScalar(z * (0.1 + 0.9 * (1 - Math.exp(-s * 9))));
      shock.material.color.lerpColors(FIRE[1], BLACK, s / 0.3);
    }
    if (s > 0 && !f.boomed && soundOn) sfx.boom(c, z);
    f.boomed = s > 0;
    const e = s > 0 ? 5 * z * Math.exp(-s * 7) : 0;
    if (e > flash) { flash = e; blastLight.position.copy(c); }
  });
  blastLight.intensity = flash;
}
