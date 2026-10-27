// The character (fan art of 2B), built from lathes, reshaped spheres and capsules: materials and textures, hips and
// thong, the skirt's rest shape, waistband and bow, legs and boots, torso and bust, collar, face, hair rest shapes,
// arms and gloved hands, and the katana (on her back, and a twin in her hand). Local +z is her front.
import * as THREE from 'three';
import { scene } from './stage.js';
import { V, UP, lam, lathe, pivot, mesh, canvasTex } from './util.js';

// ---- materials ----
export const DRESS = lam(0x1e1e24), DRESS2 = lam(0x1e1e24, THREE.DoubleSide);
const BOOT = new THREE.MeshPhongMaterial({ color: 0x0f0f12, shininess: 28, specular: 0x232328 });   // soft sheen: a sharp one flashed white on the sunlit boot
const HAIR_TEX = canvasTex(64, 64, (g, w, h) => {   // u across a clump, v along it (top row = root)
  // silver base with clump-level brightness bands and fine strand lines, a broken bright sheen band across the
  // upper third ("angel ring"), and slightly deeper tone toward the roots
  const band = Array.from({ length: w / 8 }, () => (Math.random() - 0.5) * 0.08);
  for (let x = 0; x < w; x++) {
    const fine = Math.random() < 0.18 ? -0.07 : Math.random() < 0.25 ? 0.05 : 0;
    const ring = 0.25 * h + (Math.random() - 0.5) * 6, ringW = 0.07 * h + Math.random() * 3;
    for (let y = 0; y < h; y++) {
      let b = 1 + band[x >> 3] + fine - 0.06 * Math.max(0, 1 - y / (0.15 * h));          // deeper at the roots
      if (Math.abs(y - ring) < ringW && Math.random() > 0.12) b += 0.2;                  // sheen band
      g.fillStyle = `rgb(${Math.min(255, 214 * b) | 0},${Math.min(255, 215 * b) | 0},${Math.min(255, 222 * b) | 0})`;
      g.fillRect(x, y, 1, 1);
    }
  }
});
HAIR_TEX.minFilter = THREE.LinearMipmapLinearFilter;
const SKIN = lam(0xf2d9c9);
export const HAIR = new THREE.MeshLambertMaterial({ map: HAIR_TEX, side: THREE.DoubleSide });
const HAIR_SHADE = lam(0xa9adb8, THREE.DoubleSide), GLOVE = lam(0xd6d6dc);
const SILVER = new THREE.MeshPhongMaterial({ color: 0xd4d8de, shininess: 120, specular: 0x999999 });
// skirt: black with a silver hem trim and a row of small scroll motifs, drawn at about one texel per art
// pixel (lathe/cloth v = 0 at the hem = canvas bottom) and mipmapped so it reads crisp without sparkling
const SKIRT = new THREE.MeshLambertMaterial({ map: canvasTex(128, 32, (g, w, h) => {
  g.fillStyle = '#1e1e24'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#c9c9d0'; g.fillRect(0, h - 2, w, 1);                       // hem trim
  g.fillStyle = '#8e8e98';
  for (let x = 0; x < w; x += 8) {                                         // scroll motif: a little hooked diamond
    g.fillRect(x + 3, h - 9, 2, 1); g.fillRect(x + 2, h - 8, 1, 2); g.fillRect(x + 5, h - 8, 1, 2);
    g.fillRect(x + 3, h - 6, 2, 1); g.fillRect(x + 4, h - 5, 1, 2); g.fillRect(x + 1, h - 7, 1, 1); g.fillRect(x + 6, h - 7, 1, 1);
  }
}) });
SKIRT.map.minFilter = THREE.LinearMipmapLinearFilter;
// black lace over the chest window: scalloped top edge + centre triangle motif, transparent elsewhere
const LACE = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, alphaTest: 0.5, map: canvasTex(48, 32, (g) => {
  g.strokeStyle = '#1e1e24'; g.lineWidth = 2;
  g.beginPath(); for (let i = 0; i <= 4; i++) { g.moveTo(11 + i * 9, 3); g.arc(6 + i * 9, 3, 5, 0, Math.PI); } g.stroke();
  g.beginPath(); g.moveTo(24, 4); g.lineTo(13, 17); g.lineTo(35, 17); g.closePath(); g.moveTo(24, 4); g.lineTo(24, 17); g.stroke();
  g.beginPath(); g.moveTo(3, 10); g.quadraticCurveTo(10, 19, 13, 17); g.moveTo(45, 10); g.quadraticCurveTo(38, 19, 35, 17); g.stroke();
}) });
// katana grip: black/white diamond wrap
const GRIP = new THREE.MeshLambertMaterial({ map: canvasTex(4, 16, (g) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#eee'; g.fillRect(x, y, 1, 1); }
}) });

// ---- character (local +z is her front) ----
export const girl = pivot(scene);
girl.rotation.order = 'YXZ';             // turn (y) first, then the backflip pitches her in her own frame
export const FACE = -Math.PI / 4;        // turn her toward the camera
export const HIP_Y = 0.94;
export const hips = pivot(girl, 0, HIP_Y, 0);
// her hips are bare skin under the skirt (the skirt's waistband at hips +0.09 hides the top edge), with a white
// thong over them: a front panel narrowing toward the crotch, thin strings riding high over the hips and a thin
// strap down the back. It's carved out of a finely sampled lathe a hair outside the hips, so it follows them.
const BRIEFS = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x484848 });   // bright white, even in the skirt's shade
const HIPS = [[0, -0.108], [0.05, -0.104], [0.1, -0.085], [0.132, -0.055], [0.147, -0.02], [0.14, 0.04], [0.104, 0.085]];
mesh(lathe(HIPS, 20), SKIN, hips).scale.z = 0.76;
{
  const fine = HIPS.flatMap(([r, y], i) => i ? Array.from({ length: 12 }, (_, k) => {         // 12 rows per segment
    const [r0, y0] = HIPS[i - 1], u = (k + 1) / 12; return [r0 + (r - r0) * u, y0 + (y - y0) * u];
  }) : [[r, y]]);
  const stringY = phi => 0.03 + 0.035 * Math.abs(Math.sin(phi));                            // strings rise toward the hip bones
  const thong = carve(lathe(fine.map(([r, y]) => [r * 1.012 + 0.0015, y]), 160), new THREE.Matrix4(), (x, y, z) => {
    const phi = Math.atan2(x, z), top = stringY(phi), back = Math.abs(Math.atan2(Math.sin(phi - Math.PI), Math.cos(phi - Math.PI)));
    if (Math.abs(y - top) < 0.0045) return true;                                             // thin waist strings
    if (y > top) return false;
    return y < -0.096                                                                          // crotch
      || Math.abs(phi) < 0.09 + 0.36 * THREE.MathUtils.clamp((y + 0.1) / 0.13, 0, 1)            // small front panel, narrowing down
      || back < 0.035;                                                                         // thin back strap
  });
  mesh(thong, BRIEFS, hips).scale.z = 0.76;
}

// circle skirt: a grid of cloth particles (simulated in stepSkirt, physics.js), sewn to the waist. The rest shape flares
// from a narrow waist to a wide hem with a few soft folds that deepen toward the hem, a gently wavy hem, and
// edges that curve up toward the front slit. Row 0 is the waistband, the last row the hem.
export const skirt = pivot(hips, 0, 0.09, 0);    // waistband frame
export const SK_ROWS = 8, SK_COLS = 56;
const SK_PHI0 = 0.55, SK_PHI = Math.PI * 2 - 0.4;
const SK_PROFILE = [[0.112, 0], [0.16, -0.05], [0.222, -0.13], [0.273, -0.22], [0.305, -0.3]];   // [radius, y], waist -> hem
const SK_FOLDS = 9;
export const skRest = [];
{
  const seg = SK_PROFILE.slice(1).map((p, i) => Math.hypot(p[0] - SK_PROFILE[i][0], p[1] - SK_PROFILE[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  for (let r = 0; r <= SK_ROWS; r++) {           // rows evenly spaced along the profile
    let d = r / SK_ROWS * total, i = 0;
    while (i < seg.length - 1 && d > seg[i]) d -= seg[i++];
    const f = d / seg[i], [r0, y0] = SK_PROFILE[i], [r1, y1] = SK_PROFILE[i + 1];
    const rad = r0 + (r1 - r0) * f, y = y0 + (y1 - y0) * f, depth = r / SK_ROWS;   // 0 at the waist, 1 at the hem
    for (let c = 0; c <= SK_COLS; c++) {
      const a = SK_PHI0 + c / SK_COLS * SK_PHI, fold = Math.cos(a * SK_FOLDS + 0.4);
      const k = 1 + 0.085 * Math.pow(depth, 1.4) * fold;                        // soft rounded folds, deeper at the hem
      const edge = Math.min(a - SK_PHI0, SK_PHI0 + SK_PHI - a);                  // distance (rad) to the slit
      const len = 1 - 0.22 * (1 - THREE.MathUtils.smoothstep(edge, 0, 0.7));    // hem curves up into the slit
      const yy = y * len - 0.012 * depth * depth * fold;                         // outer folds hang a little lower
      const zs = 0.76 + 0.24 * THREE.MathUtils.smoothstep(depth, 0, 0.75);       // oval like her waist at the top, round at the hem
      skRest.push(new THREE.Vector3(Math.sin(a) * rad * k, yy, Math.cos(a) * rad * k * zs));
    }
  }
}
export const skirtGeo = new THREE.BufferGeometry();
skirtGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(skRest.length * 3), 3));
skirtGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(skRest.flatMap((_, i) =>
  [(i % (SK_COLS + 1)) / SK_COLS, 1 - Math.floor(i / (SK_COLS + 1)) / SK_ROWS])), 2));   // v = 0 at the hem (embroidery)
const skIndex = [];
for (let r = 0; r < SK_ROWS; r++) for (let c = 0; c < SK_COLS; c++) {
  const a = r * (SK_COLS + 1) + c, b = a + SK_COLS + 1;
  skIndex.push(a, b, a + 1, a + 1, b, b + 1);
}
skirtGeo.setIndex(skIndex);
mesh(skirtGeo, SKIRT, scene).frustumCulled = false;   // vertices are written in world space every frame
mesh(skirtGeo, lam(0x0c0c10, THREE.BackSide), scene).frustumCulled = false;   // inside of the skirt: in its own shade

// waistband (corset band) over the skirt join, oval like the waist; the skirt's top edge tucks under it
mesh(lathe([[0.118, 0.062], [0.123, 0.072], [0.121, 0.112], [0.11, 0.128]], 24), DRESS, hips).scale.z = 0.76;
const piping = mesh(new THREE.TorusGeometry(0.12, 0.004, 4, 28), SILVER, hips, 0, 0.064, 0);   // piping along its lower edge
piping.rotation.x = Math.PI / 2; piping.scale.set(1, 0.76, 1);                                    // lie flat; oval front-to-back

// sash bow on the left hip
const bow = pivot(hips, -0.13, 0.05, 0.12); bow.rotation.y = -0.7;
[-1, 1].forEach(s => {
  mesh(new THREE.TorusGeometry(0.024, 0.008, 4, 8), DRESS, bow, s * 0.024, 0, 0).scale.set(1, 0.7, 1);
  mesh(new THREE.BoxGeometry(0.018, 0.1, 0.004), DRESS, bow, s * 0.012, -0.055, 0.01).rotation.z = s * 0.15;
});
mesh(new THREE.SphereGeometry(0.012, 8, 6), SILVER, bow, 0, 0, 0.012); // polished bow clasp

// legs: full thighs (skin above a glossy thigh-high boot), knee, calf, heeled foot
export const HIP_W = 0.08, THIGH = 0.42, SHIN = 0.42;
export const legs = [-1, 1].map(s => {
  const hip = pivot(hips, s * HIP_W, -0.02, 0);
  mesh(lathe([[0.071, -0.3], [0.082, -0.21], [0.093, -0.11], [0.094, -0.04], [0.084, 0.03]]), SKIN, hip);
  mesh(lathe([[0.05, -0.43], [0.058, -0.37], [0.074, -0.3], [0.079, -0.285], [0.078, -0.272]]), BOOT, hip);
  mesh(new THREE.TorusGeometry(0.079, 0.008, 4, 16), DRESS, hip, 0, -0.28, 0).rotation.x = Math.PI / 2; // garter band
  const knee = pivot(hip, 0, -THIGH, 0);
  mesh(new THREE.SphereGeometry(0.052, 10, 8), BOOT, knee);
  mesh(lathe([[0.032, -0.43], [0.03, -0.39], [0.042, -0.27], [0.056, -0.12], [0.052, -0.03], [0.052, 0.01]]), BOOT, knee);
  const ankle = pivot(knee, 0, -SHIN, 0);
  const foot = pivot(ankle); foot.rotation.x = 0.55;  // toes pointed down into the heel
  mesh(new THREE.BoxGeometry(0.055, 0.035, 0.14), BOOT, foot, 0, -0.01, 0.06);
  mesh(new THREE.SphereGeometry(0.03, 8, 6), BOOT, foot, 0, -0.01, 0.13).scale.set(1, 0.7, 1.2);
  mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.1, 6), BOOT, ankle, 0, -0.05, -0.025);  // stiletto heel
  return { s, hip, knee, ankle, ball: null, prevD: V(), step: null };
});

// torso: narrow waist on the spine, ribcage + bust on the chest
export const spine = pivot(hips, 0, 0.1, 0);
mesh(lathe([[0.104, -0.01], [0.098, 0.06], [0.105, 0.14], [0.112, 0.17]]), DRESS, spine).scale.z = 0.74;
export const chest = pivot(spine, 0, 0.16, 0);
mesh(lathe([[0.112, 0], [0.124, 0.07], [0.13, 0.13], [0.12, 0.18], [0.085, 0.21], [0.05, 0.225]]), DRESS, chest).scale.z = 0.72;
// Small silver fasteners add definition to the dark bodice without changing its silhouette.
[[0.035, 0.088], [0.078, 0.092], [0.12, 0.095]].forEach(([y, z]) =>
  mesh(new THREE.SphereGeometry(0.006, 8, 6), SILVER, chest, 0, y, z));
export const BUST_BASE = new THREE.Vector3(0, 0.08, 0.075);
export const bust = pivot(chest, BUST_BASE.x, BUST_BASE.y, BUST_BASE.z);
// Each side is a sphere reshaped into a drop: the upper half becomes a straight, shallow slope that starts on
// the chest wall and sinks under it (so it merges with no ledge), the fullest point sits low and forward, the
// bottom tucks back into the underbust fold, and the back is pressed into the ribcage. Every layer (skin, bra
// edge, dress) gets the same reshaping relative to its own radius, so they stay nested.
function bustGeo(r, w = 18, h = 14) {
  const g = new THREE.SphereGeometry(r, w, h), p = g.attributes.position, u = V();
  for (let i = 0; i < p.count; i++) {
    u.fromBufferAttribute(p, i).divideScalar(r);
    const hgt = u.y;
    if (hgt > 0) {                                                     // upper slope:
      u.z = u.z * Math.sqrt(Math.max(0, 1 - hgt) / (1 + hgt)) - 0.35 * hgt * hgt; // round profile -> straight line, top sinks under the chest
      u.x *= 1 - 0.12 * hgt;
      u.y = hgt * 1.15;                                                // starts a little higher up the chest
    } else {
      u.y *= 1.1;                                                      // full, rounded lower curve
      if (hgt < -0.55) u.z *= 1 - 0.35 * ((-hgt - 0.55) / 0.45) ** 2; // tucks back into the underbust fold
    }
    u.y -= 0.16 * Math.max(0, u.z) ** 2;                               // fullest point low and forward: a drop
    if (u.z < -0.25) u.z = -0.25 + (u.z + 0.25) * 0.3;                 // back pressed into the ribcage
    p.setXYZ(i, u.x * r, u.y * r, u.z * r);
  }
  g.computeVertexNormals();
  return g;
}
// each side: skin, covered by the dress except for a rounded cleavage window — an oval across the upper inner
// curves (front view, bust space). The white bra edge is the crescent between that oval and the same oval
// nudged up, so it runs along the window's curved bottom. The dress + bra are fine meshes so the cut stays smooth.
const BRA = BRIEFS, R = 0.088;
const WIN_C = new THREE.Vector2(0, 0.028), WIN_R = new THREE.Vector2(0.092, 0.05);
const inWin = (x, y, dy = 0) => ((x - WIN_C.x) / WIN_R.x) ** 2 + ((y - WIN_C.y - dy) / WIN_R.y) ** 2 < 1;
function carve(geo, m, keep) {                    // keep only triangles whose centre (in bust space) passes keep()
  const p = geo.attributes.position, idx = geo.index.array, out = [], c = V(), t = V();
  for (let i = 0; i < idx.length; i += 3) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.add(t.fromBufferAttribute(p, idx[i + k]));
    c.divideScalar(3).applyMatrix4(m);
    if (keep(c.x, c.y, c.z)) out.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  geo.setIndex(out);
  return geo;
}
export const breasts = [-1, 1].map(s => {
  const base = new THREE.Vector3(s * 0.066, 0, 0), b = pivot(bust, base.x, base.y, base.z);   // b rides the springs
  const shape = pivot(b); shape.rotation.set(0.12, s * 0.22, 0);                             // angled slightly out and down
  const m = new THREE.Matrix4().compose(base, new THREE.Quaternion().setFromEuler(shape.rotation), V().setScalar(1));
  const front = z => z > 0.02;                                     // the window only cuts the forward-facing part
  mesh(bustGeo(R), SKIN, shape);
  mesh(carve(bustGeo(R * 1.015, 72, 50), m, (x, y, z) => front(z) && inWin(x, y) && !inWin(x, y, 0.016)), BRA, shape);
  mesh(carve(bustGeo(R * 1.03, 72, 50), m, (x, y, z) => !(front(z) && inWin(x, y))), DRESS, shape);
  return { s, b, base };
});
// lace over the cleavage window: one half per side, each projected onto that side's actual surface (just above
// the dress) and parented to it so it rides the same springs; the pattern stays continuous across the middle
breasts.forEach(({ s, b }) => {
  const shell = new THREE.Mesh(bustGeo(R * 1.03));                // stand-in for this side's outer layer
  shell.rotation.set(0.12, s * 0.22, 0); shell.updateMatrixWorld(true);
  const g = new THREE.PlaneGeometry(0.095, 0.1, 14, 14), p = g.attributes.position, uv = g.attributes.uv, ray = new THREE.Raycaster();
  for (let i = 0; i < p.count; i++) {
    const bx = s * 0.0475 + p.getX(i), by = WIN_C.y + p.getY(i), lx = bx - s * 0.066;   // bust space -> this side's space
    ray.set(V().set(lx, by, 1), V().set(0, 0, -1));
    const hit = ray.intersectObject(shell)[0];
    p.setXYZ(i, lx, by, (hit ? hit.point.z : 0.019) + 0.004);      // no hit = above the curve: lie on the chest
    uv.setXY(i, (bx + 0.095) / 0.19, (by - WIN_C.y + 0.05) / 0.1);
  }
  g.computeVertexNormals();
  mesh(g, LACE, b).castShadow = false;
});

// shoulders: a rounded cap at each shoulder joint and a sloping line from the neck out to it, both fixed to the
// chest, so the sleeves grow out of the body instead of hanging off a point beside it
[-1, 1].forEach(s => {
  mesh(new THREE.SphereGeometry(0.064, 16, 12), DRESS, chest, s * 0.132, 0.172, 0).scale.set(1, 0.85, 0.82);
  const line = mesh(new THREE.CapsuleGeometry(0.042, 0.08, 4, 12), DRESS, chest, s * 0.085, 0.195, 0);
  line.rotation.z = s * (Math.PI / 2 - 0.24); line.scale.z = 0.8;          // lies across, sloping down to the shoulder
});

// neck, high collar, head
const neck = pivot(chest, 0, 0.215, 0);
mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.08, 8), SKIN, neck, 0, 0.04, 0);
mesh(lathe([[0.052, -0.005], [0.047, 0.04], [0.043, 0.072]], 16), DRESS2, neck);   // high collar, up under the chin
mesh(new THREE.TorusGeometry(0.048, 0.003, 4, 18), SILVER, neck, 0, 0.002, 0).rotation.x = Math.PI / 2; // collar piping
export const head = pivot(neck, 0, 0.165, 0);   // head centre
// face: a sphere reshaped into a soft V-jaw with a small pointed chin (the top of the head is under the hair)
const FACE_R = 0.09, faceGeo = new THREE.SphereGeometry(FACE_R, 22, 18);
{
  const p = faceGeo.attributes.position, u = V();
  for (let i = 0; i < p.count; i++) {
    u.fromBufferAttribute(p, i).divideScalar(FACE_R).multiply(V().set(0.88, 1.03, 0.94));
    if (u.y < 0) {
      const t = Math.min(1, -u.y);                   // 0 at the eyes, 1 at the chin
      u.x *= 1 - 0.38 * t ** 1.4;                    // jaw narrows into a V
      if (u.z > 0) u.z += 0.12 * t * t * u.z;        // lower face comes slightly forward
      u.y *= 1 + 0.03 * t;                           // small, delicate chin
    }
    p.setXYZ(i, u.x * FACE_R, u.y * FACE_R, u.z * FACE_R);
  }
  faceGeo.computeVertexNormals();
}
mesh(faceGeo, SKIN, head);
// put small features right on the face surface (raycast the face shape from the front)
const faceZ = (x, y) => new THREE.Raycaster(V().set(x, y, 1), V().set(0, 0, -1)).intersectObject(new THREE.Mesh(faceGeo))[0].point.z;
mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 18, 1, true), DRESS2, head, 0, -0.004, 0.004);    // blindfold
mesh(new THREE.SphereGeometry(0.0085, 8, 6), SKIN, head, 0, -0.027, faceZ(0, -0.027) - 0.003).scale.set(0.75, 1.1, 1);   // nose tip under the blindfold
mesh(new THREE.SphereGeometry(0.01, 12, 8), lam(0xd98884), head, 0, -0.051, faceZ(0, -0.051) - 0.002).scale.set(1.15, 0.4, 0.45);  // soft pink lips
mesh(new THREE.SphereGeometry(0.003, 6, 4), lam(0x3a2622), head, 0.019, -0.065, faceZ(0.019, -0.065));                    // beauty mark, her left
// Silver bob: a scalp cap and a dark underlayer as the base, covered by strand clumps that each run unbroken
// from the crown to the tip (see strandSystem in physics.js: they're physics chains). The rest shape of every clump is
// the bob: round over the crown, fullest at the cheeks, tucking in at the chin; the fringe parts above her right
// eye (short and swept out on her right, longer over the blindfold on her left), and two longer locks frame the face.
const hair = pivot(head);
const FACE_OPEN = 0.85;                          // half-width (radians) of the face opening in the sides
mesh(lathe([[0.104, 0.028], [0.108, 0.05], [0.098, 0.078], [0.072, 0.1], [0.036, 0.114], [0, 0.118]], 24), HAIR, hair);
mesh(lathe([[0.078, -0.105], [0.094, -0.06], [0.098, -0.01], [0.096, 0.03]], 24,
  FACE_OPEN, Math.PI * 2 - FACE_OPEN * 2), HAIR_SHADE, hair);                 // darker underlayer inside the bob
const onHead = (phi, r, y) => V().set(Math.sin(phi) * r, y, Math.cos(phi) * r);
export const HAIR_STRANDS = [], TAIL_STRANDS = [];
{
  const BOB = [[0.058, 0.11], [0.104, 0.075], [0.113, 0.035], [0.116, -0.015], [0.111, -0.062], [0.098, -0.1], [0.084, -0.118]];
  const n = 23, span = Math.PI * 2 - FACE_OPEN * 2 - 0.1, dphi = span / (n - 1);
  for (let k = 0; k < n; k++) {                  // around the sides and back, uneven ends
    const phi = FACE_OPEN + 0.05 + k * dphi, tip = (Math.random() - 0.5) * 0.012;
    HAIR_STRANDS.push({ pts: BOB.map(([r, y], i) => onHead(phi, r, i === BOB.length - 1 ? y + tip : y)),
      w: BOB.map(([r], i) => 2.6 * r * dphi * (1 - 0.88 * (i / (BOB.length - 1)) ** 3)), th: 0.0035, u: Math.random() });   // pointed tips
  }
  // fringe parted above her right eye (PART, -x side): clumps on her right of the part sweep out toward her right
  // temple and stay short, above the blindfold; clumps on her left sweep the other way and fall longer over the
  // blindfold. The clumps nearest the part angle away from it the most, so the split opens and shows the blindfold.
  const PART = -0.36;
  const fringe = (a, dir, near, tip, dphi) => {   // dir: -1 sweeps to her right, +1 to her left; near: 1 at the part
    const pts = [[0.04, 0.115], [0.09, 0.09], [0.108, 0.06], [0.11, (0.06 + tip) / 2 + 0.005], [0.1, tip]];
    HAIR_STRANDS.push({ pts: pts.map(([r, y], i) => onHead(a + dir * (0.12 + 0.25 * near) * (i / (pts.length - 1)) ** 1.3, r, y)),
      w: pts.map(([r], i) => 2.3 * r * dphi * (1 - 0.82 * (i / (pts.length - 1)) ** 2.5)), th: 0.0035, u: Math.random() });
  };
  for (let k = 0; k < 4; k++) {                  // her right of the part: short, swept outward
    const a = PART - 0.07 - k * 0.17;
    fringe(a, -1, 1 - k / 3, 0.022 - 0.004 * k + (Math.random() - 0.5) * 0.004, 0.17);
  }
  for (let k = 0; k < 6; k++) {                  // her left of the part: longer, swept across, covering the blindfold
    const a = PART + 0.07 + k * 0.23, f = k / 5;
    fringe(a, 1, 1 - f, -0.006 + 0.022 * f * f + (Math.random() - 0.5) * 0.004, 0.23);
  }
  [-1, 1].forEach(s => {                         // face-framing locks; her left one longer, further over the cheek
    const long = s > 0, pts = [[0.07, 0.1], [0.104, 0.06], [0.11, 0.01], [0.105, -0.045], [0.096, -0.095], [0.087, long ? -0.15 : -0.135]];
    HAIR_STRANDS.push({ pts: pts.map(([r, y]) => onHead(s * (FACE_OPEN - (long ? 0.1 : 0.02)), r, y)),
      w: pts.map((_, i) => 0.04 * (1 - 0.85 * (i / (pts.length - 1)) ** 2)), th: 0.0035, u: Math.random() });
  });
  for (let k = 0; k < 8; k++) {                  // flyaways: thin loose strands floating just off the bob
    const phi = FACE_OPEN + 0.25 + Math.random() * (Math.PI * 2 - FACE_OPEN * 2 - 0.5), out = 0.002 + Math.random() * 0.004;
    const pts = [[0.06, 0.11], [0.107, 0.075], [0.118 + out * 0.5, 0.03], [0.122 + out, -0.02], [0.12 + out, -0.06], [0.11 + out * 1.4, -0.088 - Math.random() * 0.02]];
    HAIR_STRANDS.push({ pts: pts.map(([r, y], i) => onHead(phi + 0.06 * Math.sin(i * 1.3 + k), r, y)),
      w: pts.map((_, i) => 0.008 * (1 - 0.7 * i / (pts.length - 1))), th: 0.0015, u: Math.random() });
  }
  [-1, 1].forEach(s => {                         // blindfold tails hanging from the knot at the back
    const pts = [[0.126, 0], [0.13, -0.04], [0.128, -0.08], [0.122, -0.118]];
    TAIL_STRANDS.push({ pts: pts.map(([r, y]) => onHead(Math.PI + s * 0.13, r, y)), w: pts.map(() => 0.019), th: 0.002, u: 0 });
  });
}
// headband: traced along the actual hair surface from ear to ear over the crown, sitting forward near the hairline
{
  const outer = [[0.122, -0.015], [0.119, 0.035], [0.11, 0.075], [0.066, 0.11], [0.03, 0.12], [0, 0.122]];   // strand surface
  const hairR = y => {                           // outer radius of the bob at height y
    if (y <= outer[0][1]) return outer[0][0];
    for (let i = 1; i < outer.length; i++) if (y <= outer[i][1]) {
      const [r0, y0] = outer[i - 1], [r1, y1] = outer[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0);
    }
    return -1;                                   // above the crown
  };
  const o = V().set(0, -0.01, 0.03), pts = [];
  for (let k = 0; k <= 20; k++) {
    const th = k / 20 * Math.PI, d = V().set(Math.cos(th), Math.sin(th), 0).applyAxisAngle(V().set(1, 0, 0), -0.12);
    let r = 0.05, p = V();
    while (r < 0.2) { p.copy(o).addScaledVector(d, r); if (Math.hypot(p.x, p.z) >= hairR(p.y)) break; r += 0.001; }
    pts.push(p.addScaledVector(d, 0.005));
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0065, 5), DRESS, hair);
}

// arms: puffy sleeve with ruffled cuff, pale long glove, black hand
export const arms = [-1, 1].map(s => {
  const sh = pivot(chest, s * 0.14, 0.18, 0);
  mesh(lathe([[0.031, -0.25], [0.034, -0.2], [0.048, -0.12], [0.051, -0.04], [0.036, 0.03]]), DRESS2, sh);   // puffy upper sleeve (slimmed)
  mesh(new THREE.SphereGeometry(0.035, 14, 10), DRESS, sh, 0, -0.25, 0);                                       // rounded elbow joint
  const el = pivot(sh, 0, -0.25, 0);
  // rolled cuff band hugging the elbow joint (solid, so no angle sees through it); applyPose turns it by half the
  // elbow bend and stretches it slightly across the fold
  const cuff = pivot(sh, 0, -0.25, 0), cuffShape = pivot(cuff);
  mesh(new THREE.TorusGeometry(0.038, 0.011, 8, 24), DRESS, cuffShape).rotation.x = Math.PI / 2;
  mesh(lathe([[0, -0.248], [0.022, -0.244], [0.025, -0.235], [0.028, -0.2], [0.036, -0.05], [0.035, 0]]), GLOVE, el);   // closed at the wrist
  for (let k = 0; k < 8; k++) {                       // black feather ruffle at the wrist
    const a = k / 8 * Math.PI * 2;
    mesh(new THREE.ConeGeometry(0.013, 0.06, 4), DRESS, el, Math.sin(a) * 0.034, -0.19, Math.cos(a) * 0.034)
      .quaternion.setFromUnitVectors(UP, V().set(Math.sin(a) * 0.8, -0.6, Math.cos(a) * 0.8).normalize());
  }
  const wrist = pivot(el, 0, -0.255, 0);
  // gloved hand at real proportions (~0.16 long, about 9% of her height): a black cuff over the wrist joint so the
  // hand never separates from the forearm, a broad rounded palm facing the body, four two-jointed fingers (middle
  // longest) curled a little toward the palm, and a two-jointed thumb angled forward. Every segment is a capsule.
  const curl = -s;                                                     // bending toward the palm
  const seg = (parent, r, len) => mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 4, 8), DRESS, parent, 0, -len / 2, 0);
  mesh(new THREE.CylinderGeometry(0.021, 0.026, 0.036, 12), DRESS, wrist, 0, 0.008, 0);                     // glove cuff
  mesh(new THREE.SphereGeometry(1, 14, 12), DRESS, wrist, 0, -0.036, 0).scale.set(0.0145, 0.042, 0.034);   // palm
  [[0.025, 0.036, 0.028], [0.0085, 0.041, 0.031], [-0.0085, 0.039, 0.029], [-0.025, 0.031, 0.024]].forEach(([z, l1, l2], f) => {
    const k1 = pivot(wrist, 0, -0.072 + Math.abs(z) * 0.3, z); k1.rotation.z = curl * (0.25 + f * 0.06);   // knuckle
    seg(k1, 0.0078, l1);
    const k2 = pivot(k1, 0, -l1, 0); k2.rotation.z = curl * (0.3 + f * 0.05);                             // middle joint
    seg(k2, 0.007, l2);
  });
  const t1 = pivot(wrist, curl * 0.006, -0.024, 0.03); t1.rotation.set(-0.6, 0, curl * 0.3);                // thumb base
  seg(t1, 0.0088, 0.034);
  const t2 = pivot(t1, 0, -0.034, 0); t2.rotation.z = curl * 0.3;
  seg(t2, 0.0078, 0.027);
  return { s, sh, el, wrist, cuff, cuffShape };
});

// katana floating on her back, grip over the right shoulder; a twin in her right hand is shown while it's drawn
function katana(k) {                     // blade toward -y, grip toward +y
  mesh(new THREE.BoxGeometry(0.022, 0.62, 0.006), SILVER, k, 0, -0.18, 0);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 10), SILVER, k, 0, 0.13, 0);
  mesh(new THREE.BoxGeometry(0.028, 0.2, 0.028), GRIP, k, 0, 0.24, 0);
  return k;
}
export const sword = katana(pivot(chest, 0, 0.02, -0.13)); sword.rotation.z = 0.55;
// in the fist, the blade angles 40 degrees off the forearm line toward the thumb, so arm + blade read as one sweep
export const handSword = katana(pivot(arms[0].wrist, 0, -0.207, 0.115)); handSword.rotation.x = -0.7; handSword.visible = false;
