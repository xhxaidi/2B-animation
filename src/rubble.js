// Tech rubble on the grass around the stage (fixed seed, so the layout is the same every load).
import * as THREE from 'three';
import { scene } from './stage.js';
import { V, lam, mesh } from './util.js';

let seed = 7;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const range = (a, b) => a + (b - a) * rnd();
const CONCRETE = lam(0x8e8b84), RUST = lam(0x7a4e32), METAL = new THREE.MeshPhongMaterial({ color: 0x4b4f56, shininess: 30, specular: 0x222226 });
const DARK = lam(0x2e3034), MACHINE = lam(0x8a5a3a), EYE = new THREE.MeshBasicMaterial({ color: 0xffa040 });
const CAM_DIR = Math.atan2(8, -8);                       // default camera's direction around the stage
// a spot on the grass ring; big pieces stay to the sides/back of the default view so her feet stay visible
const spot = (big) => {
  for (;;) {
    const a = rnd() * Math.PI * 2, r = range(1.5, 1.95);
    if (!big || Math.cos(a - CAM_DIR) < 0.2) return [Math.cos(a) * r, Math.sin(a) * r, a];
  }
};
const place = (o, x, z, y, yaw) => { o.position.set(x, y, z); o.rotation.y = yaw; scene.add(o); return o; };
const part = (geo, m, parent, x = 0, y = 0, z = 0) => mesh(geo, m, parent, x, y, z);

for (let i = 0; i < 6; i++) {                            // broken concrete slabs, some with rebar sticking out
  const [x, z] = spot(true), g = new THREE.Group(), w = range(0.25, 0.5), h = range(0.08, 0.18), d = range(0.2, 0.4);
  part(new THREE.BoxGeometry(w, h, d), CONCRETE, g);
  if (rnd() < 0.6) for (let k = 0, n = 2 + (rnd() * 2 | 0); k < n; k++) {
    const bar = part(new THREE.CylinderGeometry(0.008, 0.008, range(0.15, 0.3), 5), RUST, g, range(-w / 3, w / 3), h / 2, range(-d / 3, d / 3));
    bar.rotation.set(range(-0.7, 0.7), 0, range(-0.7, 0.7)); bar.position.y += 0.07;
  }
  g.rotation.set(range(-0.35, 0.35), 0, range(-0.35, 0.35));
  place(g, x, z, h * 0.3, rnd() * Math.PI * 2);
}
for (let i = 0; i < 14; i++) {                           // rock-like concrete chunks
  const [x, z] = spot(false), c = part(new THREE.DodecahedronGeometry(range(0.04, 0.11), 0), CONCRETE, scene);
  c.scale.set(range(0.7, 1.3), range(0.5, 0.9), range(0.7, 1.3)); c.position.set(x, c.scale.y * 0.04, z);
  c.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
}
for (let i = 0; i < 5; i++) {                            // rusted / grey metal panels, leaning
  const [x, z] = spot(true), p = part(new THREE.BoxGeometry(range(0.22, 0.38), 0.012, range(0.16, 0.28)), rnd() < 0.5 ? RUST : METAL, scene);
  p.position.set(x, 0.07, z); p.rotation.set(range(0.6, 1.1), rnd() * Math.PI * 2, range(-0.3, 0.3), 'YXZ');
}
for (let i = 0; i < 4; i++) {                            // lengths of pipe lying in the grass
  const [x, z, a] = spot(true), r = range(0.03, 0.05), pipe = part(new THREE.CylinderGeometry(r, r, range(0.4, 0.7), 10), rnd() < 0.5 ? METAL : DARK, scene);
  pipe.position.set(x, r, z); pipe.rotation.set(0, a + range(-0.6, 0.6), Math.PI / 2, 'YXZ');
}
for (let i = 0; i < 3; i++) {                            // half-buried gears
  const [x, z] = spot(false), g = new THREE.Group(), r = range(0.08, 0.14);
  part(new THREE.CylinderGeometry(r, r, 0.03, 16), RUST, g);
  part(new THREE.CylinderGeometry(r * 0.3, r * 0.3, 0.045, 10), DARK, g);
  for (let k = 0; k < 10; k++) {
    const t = k / 10 * Math.PI * 2;
    part(new THREE.BoxGeometry(0.03, 0.03, 0.03), RUST, g, Math.cos(t) * (r + 0.012), 0, Math.sin(t) * (r + 0.012)).rotation.y = -t;
  }
  g.rotation.set(range(0.3, 1.3), 0, 0);
  place(g, x, z, r * 0.35, rnd() * Math.PI * 2);
}
for (let i = 0; i < 2; i++) {                            // wrecked little machine-robot heads, eye still glowing
  const [x, z, a] = spot(true), g = new THREE.Group();
  part(new THREE.SphereGeometry(0.12, 16, 12), MACHINE, g);
  part(new THREE.TorusGeometry(0.12, 0.012, 6, 24), DARK, g).rotation.x = Math.PI / 2;
  part(new THREE.SphereGeometry(0.026, 10, 8), EYE, g, 0, 0.02, 0.112).castShadow = false;
  part(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 5), DARK, g, 0.04, 0.15, -0.02).rotation.z = -0.5;   // bent antenna
  g.rotation.set(range(0.2, 0.5), 0, range(-0.4, 0.4));
  place(g, x, z, 0.06, a + Math.PI + range(-0.8, 0.8));   // roughly facing the stage
}
for (let i = 0; i < 3; i++) {                            // cables snaking through the grass
  const [x, z, a] = spot(false), pts = [];
  for (let k = 0; k < 5; k++) pts.push(V().set(x + Math.cos(a + 1.57) * (k - 2) * 0.12 + range(-0.05, 0.05), 0.012, z + Math.sin(a + 1.57) * (k - 2) * 0.12 + range(-0.05, 0.05)));
  part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 6), DARK, scene);
}
for (let i = 0; i < 20; i++) {                           // loose bolts and scrap bits
  const [x, z] = spot(false), b = part(new THREE.BoxGeometry(range(0.02, 0.045), range(0.015, 0.03), range(0.02, 0.045)), rnd() < 0.5 ? METAL : RUST, scene);
  b.position.set(x, 0.012, z); b.rotation.set(rnd(), rnd() * 3, rnd());
}
