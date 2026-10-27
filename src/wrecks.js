// Set dressing on the grass ring: three of the game's small machine robots lying broken, and three painted robots
// rusting through. Their eyes and status lights sputter and torn wiring sparks (driven from the loop in main.js).
import * as THREE from 'three';
import { scene } from './stage.js';
import { lam, pivot, mesh, canvasTex } from './util.js';

// ---- broken machines: the game's small stubby machine robots, wrecked among the rubble ----
export const flickerEyes = [];                     // eyes that still sputter on and off (see the loop)
{
  const RUSTY = lam(0x8a5a3a), DARKM = lam(0x2e3034), HATCH = lam(0x5a3a26);
  const EYE_ON = new THREE.MeshBasicMaterial({ color: 0xffa040 }), EYE_DEAD = lam(0x4a3020);
  function arm(parent) {                           // stubby arm with a clamp hand
    const a = pivot(parent);
    mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.16, 8), DARKM, a, 0, -0.08, 0);
    mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), RUSTY, a, 0, -0.17, 0);
    return a;
  }
  function machine(eye) {                          // ~0.47 tall, feet at the origin, facing +z
    const m = new THREE.Group(), body = pivot(m, 0, 0.17, 0);
    mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.22, 14), RUSTY, body);
    mesh(new THREE.TorusGeometry(0.115, 0.012, 6, 24), DARKM, body).rotation.x = Math.PI / 2;
    mesh(new THREE.BoxGeometry(0.1, 0.08, 0.02), HATCH, body, 0, 0.02, 0.115);                    // chest hatch
    const head = pivot(body, 0, 0.2, 0);
    mesh(new THREE.SphereGeometry(0.1, 16, 12), RUSTY, head);
    mesh(new THREE.TorusGeometry(0.1, 0.01, 6, 24), DARKM, head).rotation.x = Math.PI / 2;
    const e = mesh(new THREE.SphereGeometry(0.022, 10, 8), eye, head, 0, 0.015, 0.093); e.castShadow = false;
    const arms = [-1, 1].map(s => { const a = arm(body); a.position.set(s * 0.13, 0.05, 0); a.rotation.z = s * 0.25; return a; });
    const legs = [-1, 1].map(s => {
      const l = pivot(m, s * 0.06, 0.07, 0);
      mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.09, 8), DARKM, l, 0, -0.03, 0);
      mesh(new THREE.BoxGeometry(0.06, 0.025, 0.08), RUSTY, l, 0, -0.07, 0.01);
      return l;
    });
    scene.add(m);
    return { m, body, head, eye: e, arms, legs };
  }
  const at = (o, a, r, y = 0) => {                 // put a machine on the grass ring, facing the stage
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    o.position.set(x, y, z); return Math.atan2(-x, -z);
  };

  // 1) slumped sitting, leaning back, head lolling, eye still sputtering
  const A = machine(EYE_ON);
  A.m.rotation.set(-0.35, at(A.m, -0.4, 1.75, -0.06), 0, 'YXZ');
  A.head.rotation.set(0.45, 0.2, 0.45);
  A.arms[0].rotation.set(0.1, 0, -0.15); A.arms[1].rotation.set(-0.6, 0, 0.7);
  A.legs.forEach(l => l.rotation.x = -1.3);                                    // legs stuck out in front
  flickerEyes.push(A.eye);

  // 2) knocked over on its side, head and one leg broken off and lying nearby
  const B = machine(EYE_DEAD), bYaw = at(B.m, -1.6, 1.78, 0.12);
  B.m.rotation.set(0, bYaw, Math.PI / 2, 'YXZ');
  B.body.remove(B.head); scene.add(B.head);
  B.head.position.set(Math.cos(-1.25) * 1.95, 0.09, Math.sin(-1.25) * 1.95); B.head.rotation.set(0.6, 1.2, -0.3);
  B.m.remove(B.legs[1]); scene.add(B.legs[1]);
  B.legs[1].position.set(Math.cos(-1.9) * 1.62, 0.03, Math.sin(-1.9) * 1.62); B.legs[1].rotation.set(Math.PI / 2, 0.7, 0);

  // 3) kneeling, half sunk, slumped forward with its one arm still reaching up; the other arm on the grass
  const C = machine(EYE_DEAD);
  C.m.rotation.set(0.3, at(C.m, 0.8, 1.72, -0.07), 0, 'YXZ');
  C.head.rotation.x = 0.5;
  C.arms[0].rotation.set(-2.3, 0, -0.35);
  C.body.remove(C.arms[1]);
  const lost = arm(scene); lost.position.set(Math.cos(1.05) * 1.9, 0.03, Math.sin(1.05) * 1.9); lost.rotation.set(Math.PI / 2, 2.1, 0);
}

// ---- painted robots, rusting through: weathered paint with rust patches, drips and chipped edges ----
export const sparks = [];                          // torn wiring that spits a spark now and then (see the loop)
// paint texture: mottled paint, grime toward the bottom, panel seams, chips of bare metal, rust patches with
// dark cores and drips running down (canvas top = top of each part), rusted top edge; optional hazard stripes
export function paintRust([pr, pg, pb], hazard = false) {
  const tex = canvasTex(64, 64, (g, w, h) => {
    const px = (x, y, r, gg, b, a = 1) => { g.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${a})`; g.fillRect(x, y, 1, 1); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = 1 + (Math.random() - 0.5) * 0.08 - 0.25 * Math.max(0, y / h - 0.55);
      px(x, y, pr * k, pg * k, pb * k);
    }
    if (hazard) for (let y = 10; y < 18; y++) for (let x = 0; x < w; x++) if (((x + y) >> 2) % 2) px(x, y, 30, 30, 32);
    g.fillStyle = 'rgba(30,30,32,0.5)'; g.fillRect(0, 31, w, 1); g.fillRect(31, 0, 1, h);
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * w | 0, y = Math.random() * h | 0;
      px(x, y, 140, 142, 146); px(x + 1, y, 70, 70, 72, 0.7);
    }
    const RUSTC = [[138, 74, 34], [110, 58, 28], [163, 90, 42]];
    for (let i = 0; i < 8; i++) {
      const cx = Math.random() * w, cy = Math.random() * h * 0.85, r = 2 + Math.random() * 6;
      for (let k = 0; k < 6; k++) {
        const [rr, rg, rb] = RUSTC[Math.random() * 3 | 0];
        g.fillStyle = `rgb(${rr},${rg},${rb})`; g.beginPath();
        g.arc(cx + (Math.random() - 0.5) * r * 1.4, cy + (Math.random() - 0.5) * r, r * (0.4 + Math.random() * 0.6), 0, 7); g.fill();
      }
      g.fillStyle = 'rgb(74,38,20)'; g.beginPath(); g.arc(cx, cy, r * 0.35, 0, 7); g.fill();
      for (let d = 0; d < 3; d++) {
        const x = (cx + (Math.random() - 0.5) * r * 1.5) | 0, len = 6 + Math.random() * 18;
        for (let t = 0; t < len; t++) px(x, (cy + t) | 0, 128, 66, 30, 0.75 * (1 - t / len));
      }
    }
    for (let x = 0; x < w; x++) if (Math.random() < 0.5) px(x, 0, 120, 64, 30, 0.7);
  });
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return new THREE.MeshLambertMaterial({ map: tex });
}
const OLIVE = paintRust([104, 112, 80]), CREAM = paintRust([200, 192, 165]), YELLOW = paintRust([196, 158, 44], true);
const JOINT = paintRust([72, 74, 78]), VISOR = lam(0x1a1c20), LENS_DEAD = lam(0x40281c), SLAB = lam(0x8e8b84);
export const WIRES = [lam(0xb83226), lam(0xd8b030), lam(0x1e1e22)];
const LIGHT = new THREE.MeshBasicMaterial({ color: 0xff7a30 });
export const SPARK = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
const ring = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
const facing = (x, z) => Math.atan2(-x, -z);                // yaw that turns local +z toward the stage
export const cyl = (r, h, m, parent, x, y, z, seg = 10) => mesh(new THREE.CylinderGeometry(r, r, h, seg), m, parent, x, y, z);
export const box = (w, h, d, m, parent, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, parent, x, y, z);
export const ball = (r, m, parent, x, y, z) => mesh(new THREE.SphereGeometry(r, 10, 8), m, parent, x, y, z);
function wires(parent, x, y, z) {                           // torn end: dark cap, splayed wires, a spark
  const end = pivot(parent, x, y, z);
  cyl(0.034, 0.01, VISOR, end, 0, 0, 0);
  for (let k = 0; k < 4; k++) {
    const p = pivot(end), len = 0.04 + Math.random() * 0.04;
    p.rotation.set((Math.random() - 0.5) * 1.4, 0, (Math.random() - 0.5) * 1.4);
    cyl(0.004, len, WIRES[k % 3], p, 0, -len / 2, 0, 5);
  }
  const sp = mesh(new THREE.SphereGeometry(0.014, 6, 4), SPARK, end, 0, -0.06, 0);
  sp.castShadow = false; sparks.push(sp);
}

// 1) big olive worker robot slumped against a slab, legs out toward the stage; right arm torn off at the
//    elbow (forearm in the grass), left shin torn off at the knee (lying nearby)
{
  const [x, z] = ring(-2.35, 1.82), bot = new THREE.Group();
  bot.position.set(x, 0, z); bot.rotation.y = facing(x, z); scene.add(bot);
  box(0.42, 0.26, 0.1, SLAB, bot, 0, 0.12, -0.185).rotation.x = -0.35;
  box(0.2, 0.08, 0.14, JOINT, bot, 0, 0.07, 0);                                        // pelvis
  [-1, 1].forEach(s => {
    const leg = pivot(bot, s * 0.065, 0.07, 0.02); leg.rotation.set(-Math.PI / 2 + 0.08, s * 0.28, 0, 'YXZ');
    cyl(0.045, 0.17, OLIVE, leg, 0, -0.085, 0);
    ball(0.05, JOINT, leg, 0, -0.18, 0);
    if (s < 0) { cyl(0.042, 0.17, OLIVE, leg, 0, -0.27, 0); box(0.09, 0.05, 0.12, JOINT, leg, 0, -0.37, 0.04); }
    else wires(leg, 0, -0.21, 0);
  });
  const shin = new THREE.Group(), [sx, sz] = ring(-2.62, 1.62); scene.add(shin);
  shin.position.set(sx, 0.042, sz); shin.rotation.set(Math.PI / 2, 0.9, 0, 'YXZ');
  cyl(0.042, 0.17, OLIVE, shin, 0, 0, 0); box(0.09, 0.05, 0.12, JOINT, shin, 0, -0.1, 0.04);

  const torso = pivot(bot, 0, 0.11, -0.02); torso.rotation.set(-0.42, 0, 0.08);
  box(0.24, 0.26, 0.16, OLIVE, torso, 0, 0.13, 0);
  box(0.12, 0.08, 0.012, JOINT, torso, 0.03, 0.17, 0.084);                          // chest vent
  for (let k = 0; k < 3; k++) box(0.1, 0.008, 0.006, VISOR, torso, 0.03, 0.145 + k * 0.025, 0.092);
  [-1, 1].forEach(s => ball(0.055, JOINT, torso, s * 0.15, 0.23, 0));
  cyl(0.03, 0.05, JOINT, torso, 0, 0.285, 0);
  const head = pivot(torso, 0, 0.31, 0); head.rotation.set(0.55, 0.25, 0.35);       // lolled forward and aside
  box(0.14, 0.12, 0.13, OLIVE, head, 0, 0.06, 0);
  box(0.12, 0.035, 0.012, VISOR, head, 0, 0.07, 0.067);
  ball(0.014, LENS_DEAD, head, 0.03, 0.07, 0.072);
  cyl(0.006, 0.08, JOINT, head, -0.05, 0.15, 0, 5).rotation.z = 0.6;                 // bent antenna

  const la = pivot(torso, 0.15, 0.23, 0); la.rotation.set(0.5, 0, 0.18);            // left arm hangs limp
  cyl(0.035, 0.15, OLIVE, la, 0, -0.08, 0); ball(0.04, JOINT, la, 0, -0.16, 0);
  const lf = pivot(la, 0, -0.16, 0); lf.rotation.x = -0.6;
  cyl(0.032, 0.14, OLIVE, lf, 0, -0.07, 0); box(0.06, 0.06, 0.05, JOINT, lf, 0, -0.16, 0);
  const ra = pivot(torso, -0.15, 0.23, 0); ra.rotation.set(0.3, 0, -0.35);          // right arm torn at the elbow
  cyl(0.035, 0.15, OLIVE, ra, 0, -0.08, 0);
  wires(ra, 0, -0.16, 0);
  const fa = new THREE.Group(), [fx, fz] = ring(-2.05, 1.95); scene.add(fa);
  fa.position.set(fx, 0.034, fz); fa.rotation.set(Math.PI / 2, 2.2, 0, 'YXZ');
  cyl(0.032, 0.14, OLIVE, fa, 0, 0, 0); box(0.06, 0.06, 0.05, JOINT, fa, 0, -0.09, 0);
}

// 2) crashed cream quadcopter drone, nose-dived into the grass; one rotor arm bent down, its guard thrown off,
//    status light still sputtering
{
  const [x, z] = ring(0.2, 1.82), d = new THREE.Group();
  d.position.set(x, 0.11, z); d.rotation.set(0.85, facing(x, z) + 0.6, 0.15, 'YXZ'); scene.add(d);
  cyl(0.15, 0.06, CREAM, d, 0, 0, 0, 24);
  mesh(new THREE.SphereGeometry(0.09, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), CREAM, d, 0, 0.03, 0);
  ball(0.035, VISOR, d, 0, -0.035, 0);
  const light = ball(0.012, LIGHT, d, 0, 0.005, 0.15); light.castShadow = false; flickerEyes.push(light);
  for (let k = 0; k < 4; k++) {
    const arm = pivot(d), bent = k === 1; arm.rotation.y = -(Math.PI / 4 + k * Math.PI / 2);
    box(0.07, 0.02, 0.03, JOINT, arm, 0.165, 0, 0);
    const outer = pivot(arm, 0.2, 0, 0); outer.rotation.z = bent ? -0.7 : 0;
    box(0.08, 0.02, 0.03, JOINT, outer, 0.04, 0, 0);
    cyl(0.012, 0.03, JOINT, outer, 0.1, 0.01, 0, 8);                                // rotor hub
    box(bent ? 0.06 : 0.13, 0.004, 0.016, VISOR, outer, bent ? 0.085 : 0.1, 0.027, 0).rotation.y = k;   // blade
    if (!bent) mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 20), CREAM, outer, 0.1, 0.01, 0).rotation.x = Math.PI / 2;
  }
  const [gx, gz] = ring(0.42, 1.68), guard = mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 20), CREAM, scene, gx, 0.012, gz);
  guard.rotation.set(Math.PI / 2 + 0.15, 0, 0.3);
}

// 3) little tracked utility bot in hazard yellow, tipped onto its side, camera mast drooping, a wheel knocked loose
{
  const [x, z] = ring(1.45, 1.78), t = new THREE.Group();
  t.position.set(x, 0.145, z); t.rotation.set(0, facing(x, z) + 0.9, Math.PI / 2 * 0.94, 'YXZ'); scene.add(t);
  box(0.2, 0.1, 0.24, YELLOW, t, 0, 0.1, 0);
  [-1, 1].forEach(s => {
    box(0.05, 0.08, 0.28, JOINT, t, s * 0.125, 0.05, 0);
    for (let k = -1; k <= 1; k++) if (!(s > 0 && k === 1)) cyl(0.035, 0.055, JOINT, t, s * 0.13, 0.05, k * 0.09, 12).rotation.z = Math.PI / 2;
  });
  const mast = pivot(t, 0.04, 0.15, 0.06); mast.rotation.x = 0.4;
  cyl(0.012, 0.16, JOINT, mast, 0, 0.08, 0, 6);
  const eyeHead = pivot(mast, 0, 0.16, 0); eyeHead.rotation.x = 1.1;
  box(0.06, 0.04, 0.05, YELLOW, eyeHead, 0, 0.02, 0);
  ball(0.012, LENS_DEAD, eyeHead, 0, 0.02, 0.027);
  const [wx, wz] = ring(1.25, 1.62);
  cyl(0.035, 0.055, JOINT, scene, wx, 0.028, wz, 12).rotation.set(0.2, 0, 0.1);   // the loose wheel, lying flat
}
