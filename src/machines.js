// The live machines she fights, rusty ones like the game's small-type enemy (the user's reference sheet): a round head
// with two glowing eyes on a riveted barrel body (rounded shoulders and base), a hatch with a round gauge, thin arms
// with clamp hands and thin legs. Three walk up to fight her (see fight.js). Each is built in two pieces so a cut can
// split it: 'vertical' = left and right halves (split by her backflip's rising slash), 'horizontal' = top and
// bottom at CUT_Y (split by her spinning slash). Each cut face is the shell's real cross-section: a glowing rim
// that cools, around a dark hollow with a gear and torn wires poking out.
import * as THREE from 'three';
import { scene } from './stage.js';
import { V, lam, lathe, pivot, mesh } from './util.js';
import { paintRust, WIRES, SPARK, cyl, box, ball } from './wrecks.js';

const TAN = paintRust([176, 160, 128]), DARKJ = paintRust([92, 88, 80]);
const HOLLOW = new THREE.MeshBasicMaterial({ color: 0x18120f, side: THREE.DoubleSide });   // inside the shell
// barrel body profile [radius, y], bottom to top, with rounded shoulders and base like the reference
const BARREL = [[0, 0.43], [0.09, 0.432], [0.122, 0.445], [0.133, 0.47], [0.136, 0.58], [0.133, 0.69], [0.122, 0.715], [0.09, 0.728], [0, 0.73]];
const barrelR = y => {
  for (let i = 1; i < BARREL.length; i++) {
    const [r0, y0] = BARREL[i - 1], [r1, y1] = BARREL[i];
    if (y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0);
  }
  return 0;
};
const clipBarrel = (y0, y1) => [[0, y0], [barrelR(y0), y0], ...BARREL.filter(([, y]) => y > y0 && y < y1), [barrelR(y1), y1], [0, y1]];
const CUT_Y = 0.6;
// vertical cut (shape x = z, shape y = y): the barrel profile mirrored, and the head's disc; inset = the hollow
const section = inset => {
  const k = 1 - inset / 0.136, pts = BARREL.map(([r, y]) => [r * k, 0.58 + (y - 0.58) * k]);
  const body = new THREE.Shape(pts.map(([r, y]) => new THREE.Vector2(r, y)).concat(pts.slice().reverse().map(([r, y]) => new THREE.Vector2(-r, y))));
  return [body, new THREE.Shape().absarc(0.01, 0.84, 0.118 - inset, 0, Math.PI * 2)];
};
const V_RIM = new THREE.ShapeGeometry(section(0), 24), V_CORE = new THREE.ShapeGeometry(section(0.014), 24);
const H_RIM = new THREE.CircleGeometry(barrelR(CUT_Y), 24), H_CORE = new THREE.CircleGeometry(barrelR(CUT_Y) - 0.014, 24);
// a cut face (hidden until the cut): the rim, the hollow core just in front of it on side s of the face's local z,
// and the guts poking out that way, the wire tips glowing with the rim
function cutFace(parent, rimGeo, coreGeo, cut, s, [gx, gy], wires) {
  const face = pivot(parent); face.visible = false;
  mesh(rimGeo, cut, face).castShadow = false;
  mesh(coreGeo, HOLLOW, face, 0, 0, s * 0.0008).castShadow = false;
  mesh(new THREE.TorusGeometry(0.034, 0.008, 4, 10), DARKJ, face, gx, gy, s * 0.003);
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), DARKJ, face, gx, gy, s * 0.004).rotation.x = Math.PI / 2;
  wires.forEach(([wx, wy], k) => {
    const len = 0.03 + 0.012 * k, wire = pivot(face, wx, wy, s * len / 2);
    wire.rotation.set(Math.PI / 2 + (k - 1.5) * 0.25, 0, (k % 2 - 0.5) * 0.4);
    cyl(0.0045, len, WIRES[k % 3], wire, 0, 0, 0, 5);
    mesh(new THREE.SphereGeometry(0.007, 6, 4), cut, wire, 0, s * len / 2, 0).castShadow = false;
  });
  return face;
}
// parts; th/len pick the slice of a turn (half for a vertical half, all of it otherwise), side 0 = whole head
const band = (o, th, len, y) => mesh(new THREE.CylinderGeometry(0.139, 0.139, 0.022, 16, 1, false, th, len), DARKJ, o, 0, y, 0);
const rivets = (o, th, len, n) => { for (let k = 0; k < n; k++) { const a = th + (k + 0.5) / n * len; ball(0.008, DARKJ, o, Math.sin(a) * 0.141, 0.685, Math.cos(a) * 0.141); } };
const head = (o, side) => mesh(new THREE.SphereGeometry(0.12, 16, 12, side < 0 ? -Math.PI / 2 : Math.PI / 2, side ? Math.PI : Math.PI * 2), TAN, o, 0, 0.84, 0.01);
const eyeAt = (o, eye, s) => { ball(0.016, eye, o, s * 0.045, 0.855, 0.12).castShadow = false; };
const hatch = o => {                                                     // hatch with the round gauge
  box(0.062, 0.08, 0.01, DARKJ, o, 0.032, 0.54, 0.128);
  cyl(0.021, 0.008, TAN, o, 0.032, 0.54, 0.135, 12).rotation.x = Math.PI / 2;
  box(0.034, 0.005, 0.004, DARKJ, o, 0.032, 0.54, 0.14).rotation.z = 0.8;
};
// the three types from the sheet that fight her; lift raises (or lowers) the barrel and head from where the
// small type has them
const TYPES = {
  small:   { lift: 0, legs: 'thin', arms: 'thin' },          // thin arms with clamp hands, thin legs
  medium:  { lift: 0.12, legs: 'thick', arms: 'big' },       // big armoured arms and hands, thick legs, tread feet
  tracked: { lift: -0.2, legs: 'tracks', arms: 'none' },     // sits between two WALL-E style tank treads
};
const RUBBER = lam(0x1c1c1e), TREAD = lam(0x40342a);
// tank tread (the user's WALL-E reference): a knobbly rubber belt looped round two road wheels and a top sprocket,
// a rounded triangle in the track's (z, y) plane; the lugs creep round the loop as it drives (track.place)
const TREAD_WHEELS = [[0.06, 0.065, 0.12], [0.06, 0.065, -0.12], [0.07, 0.24, -0.02]];   // [r, y, z]
const TREAD_PATH = (() => {                                              // the convex hull of the wheels, lug height out
  const pts = [];
  TREAD_WHEELS.forEach(([r, y, z]) => { for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; pts.push([z + Math.cos(a) * (r + 0.012), y + Math.sin(a) * (r + 0.012)]); } });
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = list => { const h = []; list.forEach(p => { while (h.length > 1 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); }); h.pop(); return h; };
  const hull = [...half(pts), ...half(pts.slice().reverse())];         // counter-clockwise, points are [z, y]
  const len = [0]; hull.forEach((p, i) => { const q = hull[(i + 1) % hull.length]; len.push(len[i] + Math.hypot(q[0] - p[0], q[1] - p[1])); });
  return { hull, len, total: len[hull.length] };
})();
const LUGS = 26;
function placeLugs(lugs, phase) {
  const { hull, len, total } = TREAD_PATH;
  lugs.forEach((lug, k) => {
    const d = ((k / LUGS * total + phase) % total + total) % total;
    let i = 0; while (len[i + 1] < d) i++;
    const p = hull[i], q = hull[(i + 1) % hull.length], u = (d - len[i]) / (len[i + 1] - len[i]);
    lug.position.set(0, p[1] + (q[1] - p[1]) * u, p[0] + (q[0] - p[0]) * u);
    lug.rotation.x = Math.atan2(-(q[1] - p[1]), q[0] - p[0]);           // lying along the belt
  });
}
// arms hang off the body (body coordinates); legs or wheels stand on the ground (piece coordinates)
function limbs(f, type, body, ground, s) {
  if (type.arms === 'thin') {
    ball(0.028, DARKJ, body, s * 0.142, 0.68, 0);                       // shoulder
    const a = pivot(body, s * 0.15, 0.68, 0);
    cyl(0.016, 0.16, DARKJ, a, 0, -0.08, 0); ball(0.022, DARKJ, a, 0, -0.165, 0);
    const fa = pivot(a, 0, -0.165, 0); fa.rotation.x = -0.4;
    cyl(0.015, 0.15, DARKJ, fa, 0, -0.075, 0); ball(0.018, DARKJ, fa, 0, -0.155, 0);
    [-1, 1].forEach(z => box(0.01, 0.05, 0.012, TAN, fa, 0, -0.18, z * 0.013).rotation.x = z * 0.25);   // clamp
    f.arms.push(a);
  } else if (type.arms === 'big') {
    ball(0.052, DARKJ, body, s * 0.15, 0.66, 0);                        // big shoulder joint
    const a = pivot(body, s * 0.18, 0.66, 0);
    cyl(0.036, 0.2, TAN, a, 0, -0.1, 0); ball(0.04, DARKJ, a, 0, -0.21, 0);
    const fa = pivot(a, 0, -0.21, 0); fa.rotation.x = -0.3;
    cyl(0.044, 0.2, TAN, fa, 0, -0.1, 0);                               // armoured forearm
    box(0.075, 0.07, 0.065, DARKJ, fa, 0, -0.24, 0);                    // big hand, three fingers
    [-0.024, 0, 0.024].forEach(z => box(0.018, 0.05, 0.018, DARKJ, fa, 0, -0.295, z));
    f.arms.push(a);
  }
  if (type.legs === 'thin') {
    const l = pivot(ground, s * 0.065, 0.43, 0);
    cyl(0.02, 0.19, DARKJ, l, 0, -0.095, 0); ball(0.026, DARKJ, l, 0, -0.2, 0);
    const kn = pivot(l, 0, -0.2, 0);
    cyl(0.019, 0.17, DARKJ, kn, 0, -0.09, 0); box(0.05, 0.022, 0.09, TAN, kn, 0, -0.2, 0.015);   // small flat foot
    f.legs.push([l, kn]);
  } else if (type.legs === 'thick') {
    const l = pivot(ground, s * 0.075, 0.55, 0);
    ball(0.05, DARKJ, l); cyl(0.042, 0.24, DARKJ, l, 0, -0.12, 0); ball(0.048, DARKJ, l, 0, -0.25, 0);
    const kn = pivot(l, 0, -0.25, 0);
    cyl(0.046, 0.22, TAN, kn, 0, -0.11, 0); ball(0.03, DARKJ, kn, 0, -0.23, 0);
    box(0.11, 0.05, 0.17, DARKJ, kn, 0, -0.27, 0.02);                   // tread foot
    [-0.05, 0, 0.05].forEach(z => box(0.115, 0.012, 0.022, RUBBER, kn, 0, -0.298, 0.02 + z));
    f.legs.push([l, kn]);
  } else {                                                               // tank tread on this side
    const trk = pivot(ground, s * 0.2, 0, 0), wheels = [], lugs = [];
    box(0.03, 0.15, 0.2, DARKJ, trk, 0, 0.12, 0);                         // frame plate inside the loop
    TREAD_WHEELS.forEach(([r, y, z], k) => {
      const wh = pivot(trk, 0, y, z);
      cyl(r, 0.06, k === 2 ? TAN : DARKJ, wh, 0, 0, 0, 14).rotation.z = Math.PI / 2;
      box(0.006, r * 1.5, 0.014, RUBBER, wh, s * 0.031, 0, 0); box(0.006, 0.014, r * 1.5, RUBBER, wh, s * 0.031, 0, 0);   // so the turn shows
      wheels.push([wh, r]);
    });
    for (let k = 0; k < LUGS; k++) lugs.push(box(0.08, 0.02, 0.03, TREAD, trk, 0, 0, 0));
    placeLugs(lugs, 0);
    if (s > 0) {                                                         // the body sits on a solid chassis
      box(0.36, 0.08, 0.18, DARKJ, ground, 0, 0.17, 0);                   // joining both treads under it,
      cyl(0.11, 0.07, DARKJ, ground, 0, 0.235, 0, 14);                    // with a collar up into the barrel's base
    }
    f.tracks.push({ wheels, place: phase => placeLugs(lugs, phase) });
  }
}
function liveMachine(typeName, split, size) {
  const type = TYPES[typeName], lift = type.lift;
  const eye = new THREE.MeshBasicMaterial({ color: 0xfff0c8 }), cut = new THREE.MeshBasicMaterial({ color: 0xfff0c0, side: THREE.DoubleSide });
  const root = new THREE.Group(); root.scale.setScalar(size); root.visible = false; scene.add(root);
  const f = { root, eye, cut, split, type: typeName, lift, size, cutY: CUT_Y + lift,
              halves: [], legs: [], arms: [], tracks: [], faces: [], bits: [], cutT: null, slide: V() };
  if (split === 'vertical') [-1, 1].forEach(s => {
    const h = pivot(root, s * 0.12, 0, 0), o = pivot(h, -s * 0.12, 0, 0), b = pivot(o, 0, lift, 0);   // h hinges at the outer foot
    const th = s < 0 ? Math.PI : 0;                                       // this side's half of a turn
    mesh(lathe(BARREL, 16, th, Math.PI), TAN, b);
    band(b, th, Math.PI, 0.685); band(b, th, Math.PI, 0.475); rivets(b, th, Math.PI, 5);
    head(b, s); eyeAt(b, eye, s);
    if (s > 0) hatch(b);
    const face = cutFace(b, V_RIM, V_CORE, cut, s, [0.03 * s, 0.62], [[-0.06, 0.52], [-0.02, 0.66], [0.05, 0.5], [0.075, 0.57]]);
    face.position.x = -s * 0.001; face.rotation.y = -Math.PI / 2;
    limbs(f, type, b, o, s);
    f.halves.push(h); f.faces.push(face);
  });
  else {
    const bottom = pivot(root), bb = pivot(bottom, 0, lift, 0);
    const top = pivot(root, 0, CUT_Y + lift, 0), ot = pivot(top, 0, -CUT_Y, 0);   // the top pivots at the cut
    mesh(lathe(clipBarrel(0.43, CUT_Y), 16), TAN, bb); band(bb, 0, Math.PI * 2, 0.475); hatch(bb);
    mesh(lathe(clipBarrel(CUT_Y, 0.73), 16), TAN, ot); band(ot, 0, Math.PI * 2, 0.685); rivets(ot, 0, Math.PI * 2, 10);
    head(ot, 0); eyeAt(ot, eye, -1); eyeAt(ot, eye, 1);
    const guts = [[0.03, 0.02], [[-0.06, -0.03], [-0.02, 0.06], [0.05, -0.05], [0.07, 0.03]]];
    const fb = cutFace(bb, H_RIM, H_CORE, cut, 1, ...guts), ft = cutFace(ot, H_RIM, H_CORE, cut, -1, ...guts);
    fb.position.y = CUT_Y + 0.001; ft.position.y = CUT_Y - 0.001; fb.rotation.x = ft.rotation.x = -Math.PI / 2;
    [-1, 1].forEach(s => limbs(f, type, ot, bottom, s));
    f.halves.push(bottom, top); f.faces.push(fb, ft);
  }
  for (let k = 0; k < 16; k++) {                                         // sparks thrown off by the cut
    const m = box(0.014, 0.014, 0.014, SPARK, scene, 0, 0, 0); m.castShadow = false; m.visible = false;
    f.bits.push({ m, v: V(), life: 0 });
  }
  return f;
}
// each one a different type: the big medium type in front, the small type and the tracked type on her flanks
export const foes = [liveMachine('medium', 'vertical', 1.2), liveMachine('small', 'horizontal', 1.15), liveMachine('tracked', 'horizontal', 1.35)];
