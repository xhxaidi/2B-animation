// Secondary motion: the bust on springs driven by the torso's acceleration, the skirt as a Verlet cloth that collides
// with the thighs, and the hair and blindfold tails as Verlet strands that stay off the face.
import * as THREE from 'three';
import { scene } from './stage.js';
import { V, mesh } from './util.js';
import { hips, skirt, skRest, SK_ROWS, SK_COLS, skirtGeo, legs, chest, bust, BUST_BASE, breasts, head, HAIR, DRESS2,
  HAIR_STRANDS, TAIL_STRANDS } from './character.js';

// ---- springs: secondary motion driven by the anchor's acceleration ----
class Spring {
  constructor(k, c, max) { Object.assign(this, { k, c, max, x: V(), v: V(), prev: null, prevVel: V() }); }
  update(p, dt) {
    if (!this.prev) { this.prev = p.clone(); return this.x; }
    const vel = p.clone().sub(this.prev).divideScalar(dt);
    const acc = vel.clone().sub(this.prevVel).divideScalar(dt).clampLength(0, 40);
    this.prev.copy(p); this.prevVel.copy(vel);
    this.v.addScaledVector(this.x, -this.k * dt).addScaledVector(this.v, -this.c * dt).addScaledVector(acc, -dt);
    this.x.addScaledVector(this.v, dt).clampLength(0, this.max);
    return this.x;
  }
}
const bustSpring = new Spring(120, 9, 0.04),
  breastSprings = breasts.map(() => new Spring(145, 11, 0.025));
const toLocal = (obj, v) => v.clone().applyQuaternion(obj.getWorldQuaternion(new THREE.Quaternion()).invert());
const wp = V();
export function updateBust(dt) {
  // Damp the chest with the torso, then let each side settle independently from its own anchor motion.
  bust.position.copy(BUST_BASE).add(toLocal(chest, bustSpring.update(chest.getWorldPosition(wp), dt)));
  breasts.forEach(({ s, b, base }, i) => {
    const anchor = bust.localToWorld(base.clone());
    const lag = toLocal(bust, breastSprings[i].update(anchor, dt));
    b.position.copy(base).addScaledVector(lag, 0.72);
    b.rotation.set(-lag.z * 2.2, 0, s * lag.y * 2.0);
  });
}

// ---- skirt cloth: Verlet particles + distance links, pulled toward the pleated rest shape ----
const SK_N = SK_COLS + 1, SK_SUB = 4, SK_THIGH_R = 0.118;   // thigh collider radius: thigh (0.094) + fabric + margin
const skPos = skRest.map(() => V()), skPrev = skRest.map(() => V()), skGoal = skRest.map(() => V());
const skLinks = [];                               // [i, j, rest length]: weft, warp and shear
for (let r = 0; r <= SK_ROWS; r++) for (let c = 0; c <= SK_COLS; c++) {
  const i = r * SK_N + c;
  const link = j => { if (i >= SK_N || j >= SK_N) skLinks.push([i, j, skRest[i].distanceTo(skRest[j])]); };
  if (c < SK_COLS) link(i + 1);
  if (r < SK_ROWS) { link(i + SK_N); if (c < SK_COLS) link(i + SK_N + 1); if (c > 0) link(i + SK_N - 1); }
}
let skReady = false, thighsPrev = null;
const sv = V(), sa = V(), sb = V(), sc = V(), sa2 = V(), hipC = V(), sr = V();
// flare (0..1) is set during her attacks: the pull back to the rest shape loosens toward the hem and a twirl force
// throws the hem out and up, most at the back (behind her facing, yaw), so it flies up and shows her thong
export function stepSkirt(dt, flare = 0, yaw = 0) {
  skRest.forEach((p, i) => skGoal[i].copy(p).applyMatrix4(skirt.matrixWorld));
  if (!skReady) { skPos.forEach((p, i) => { p.copy(skGoal[i]); skPrev[i].copy(p); }); skReady = true; }
  const thighs = legs.map(L => [L.hip.getWorldPosition(V()), L.knee.getWorldPosition(V())]);
  thighsPrev = thighsPrev || thighs;
  hips.getWorldPosition(hipC);
  const h = dt / SK_SUB;
  for (let n = 0; n < SK_SUB; n++) {
    const f = (n + 1) / SK_SUB;                   // sweep the thighs across the frame so fast kicks can't tunnel
    for (let i = 0; i < skPos.length; i++) {
      const p = skPos[i], q = skPrev[i];
      if (i < SK_N) { p.lerp(skGoal[i], 1 / (SK_SUB - n)); q.copy(p); continue; }   // waistband follows the hips
      const row = Math.floor(i / SK_N) / SK_ROWS;                                  // 0 at the waist, 1 at the hem
      sv.subVectors(p, q).multiplyScalar(0.985).clampLength(0, 0.025 + 0.015 * flare); q.copy(p);   // cap speed: no flinging
      p.add(sv); p.y -= 9.8 * h * h;
      if (flare > 0) {
        sr.set(p.x - hipC.x, 0, p.z - hipC.z).normalize();
        const back = 0.5 + 0.5 * Math.max(0, -(sr.x * Math.sin(yaw) + sr.z * Math.cos(yaw)));
        p.addScaledVector(sr, 18 * flare * row * h * h).y += 24 * flare * row * back * h * h;
      }
      p.lerp(skGoal[i], (0.3 - 0.27 * row) * (1 - 0.92 * flare));                // stiff at the waist, free at the hem
    }
    for (let it = 0; it < 3; it++) for (const [i, j, len] of skLinks) {
      const a = skPos[i], b = skPos[j];
      sv.subVectors(b, a); const d = sv.length() || 1e-6, k = (d - len) / d;
      if (i < SK_N) b.addScaledVector(sv, -k);    // waistband end is fixed
      else { a.addScaledVector(sv, k * 0.5); b.addScaledVector(sv, -k * 0.5); }
    }
    // thighs are solid: push fabric out of each thigh capsule
    legs.forEach((_, li) => {
      sa.lerpVectors(thighsPrev[li][0], thighs[li][0], f); sb.lerpVectors(thighsPrev[li][1], thighs[li][1], f);
      sb.sub(sa);
      for (let i = SK_N; i < skPos.length; i++) {
        const p = skPos[i];
        const t = THREE.MathUtils.clamp(sv.subVectors(p, sa).dot(sb) / sb.lengthSq(), 0, 1);
        sc.copy(sa).addScaledVector(sb, t); sv.subVectors(p, sc);
        const d = sv.length();
        if (d >= SK_THIGH_R) continue;
        if (d < 1e-5) sv.set(sc.x - hipC.x, 0, sc.z - hipC.z);       // dead centre: push away from the body
        sa2.copy(p); p.copy(sc).addScaledVector(sv.normalize(), SK_THIGH_R);
        skPrev[i].addScaledVector(sa2.subVectors(p, sa2), 0.75);      // the push mostly isn't kept as velocity
      }
    });
  }
  thighsPrev = thighs;
  const attr = skirtGeo.attributes.position;
  skPos.forEach((p, i) => attr.setXYZ(i, p.x, p.y, p.z));
  attr.needsUpdate = true;
  skirtGeo.computeVertexNormals();
}

// ---- hair strands: Verlet chains rooted on the scalp, pulled toward their rest shape, kept out of the head ----
// Each strand is drawn as a ribbon with a raised spine (3 verts per point), rebuilt in world space every frame.
function strandSystem(defs, material) {
  const RING = 3, rest = [];
  defs.forEach(d => { d.base = rest.length; d.len = d.pts.map((p, i) => i ? p.distanceTo(d.pts[i - 1]) : 0); rest.push(...d.pts); });
  const pos = new Float32Array(rest.length * RING * 3), uv = [], index = [];
  defs.forEach(d => {
    const m = d.pts.length;
    for (let i = 0; i < m; i++) for (let k = 0; k < RING; k++) uv.push(d.u + k * 0.03, 1 - i / (m - 1));
    for (let i = 0; i < m - 1; i++) for (let k = 0; k < RING - 1; k++) {
      const a = (d.base + i) * RING + k, b = a + RING;
      index.push(a, a + 1, b, a + 1, b + 1, b);                  // wound so the outside faces out (lit by the sun)
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  mesh(geo, material, scene).frustumCulled = false;                 // written in world space every frame
  const cur = rest.map(() => V()), prev = rest.map(() => V()), goal = rest.map(() => V());
  const hc = V(), t = V(), nrm = V(), side = V(), was = V(), SUB = 3, HEAD_R = 0.1;
  let ready = false;
  return { step(dt) {
    rest.forEach((p, i) => goal[i].copy(p).applyMatrix4(head.matrixWorld));
    if (!ready) { cur.forEach((c, i) => { c.copy(goal[i]); prev[i].copy(c); }); ready = true; }
    head.getWorldPosition(hc);
    const h = dt / SUB;
    for (let n = 0; n < SUB; n++) defs.forEach(d => {
      const m = d.pts.length, B = d.base;
      for (let i = 0; i < m; i++) {
        const c = cur[B + i], q = prev[B + i];
        if (i === 0) { c.lerp(goal[B], 1 / (SUB - n)); q.copy(c); continue; }   // root rides the scalp
        t.subVectors(c, q).multiplyScalar(0.96).clampLength(0, 0.02); q.copy(c);
        c.add(t); c.y -= 9.8 * h * h;
        c.lerp(goal[B + i], 0.02 + 0.33 * (1 - i / (m - 1)) ** 1.5);              // firm at the root, loose toward the tip
      }
      for (let it = 0; it < 2; it++) for (let i = 1; i < m; i++) {               // keep each segment's length
        const a = cur[B + i - 1], b = cur[B + i];
        t.subVectors(b, a); const L = t.length() || 1e-6, k = (L - d.len[i]) / L;
        if (i === 1) b.addScaledVector(t, -k); else { a.addScaledVector(t, k * 0.5); b.addScaledVector(t, -k * 0.5); }
      }
      for (let i = 1; i < m; i++) {                                              // never inside the head
        const c = cur[B + i]; t.subVectors(c, hc); const L = t.length();
        if (L < HEAD_R) { was.copy(c); c.copy(hc).addScaledVector(t, HEAD_R / (L || 1)); prev[B + i].addScaledVector(t.subVectors(c, was), 0.75); }
      }
    });
    defs.forEach(d => {                                                        // ribbons: edges across, spine outward
      const m = d.pts.length, B = d.base;
      for (let i = 0; i < m; i++) {
        const c = cur[B + i];
        t.subVectors(cur[B + Math.min(m - 1, i + 1)], cur[B + Math.max(0, i - 1)]).normalize();
        nrm.subVectors(c, hc).normalize();
        side.crossVectors(t, nrm).normalize().multiplyScalar(d.w[i] / 2);
        const o = (B + i) * RING * 3;
        pos[o] = c.x - side.x; pos[o + 1] = c.y - side.y; pos[o + 2] = c.z - side.z;
        pos[o + 3] = c.x + nrm.x * d.th; pos[o + 4] = c.y + nrm.y * d.th; pos[o + 5] = c.z + nrm.z * d.th;
        pos[o + 6] = c.x + side.x; pos[o + 7] = c.y + side.y; pos[o + 8] = c.z + side.z;
      }
    });
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  } };
}
export const hairSim = strandSystem(HAIR_STRANDS, HAIR), tailSim = strandSystem(TAIL_STRANDS, DRESS2);
