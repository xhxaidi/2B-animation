// Light in the air: warm motes drifting up and twinkling, and soft golden sun rays that land on the grass and never
// draw over her (her materials write the stencil, the rays skip those pixels).
import * as THREE from 'three';
import { scene, sun, viewCam } from './stage.js';
import { V, canvasTex } from './util.js';
import { girl, HAIR, DRESS2, skirtGeo } from './character.js';
import { pod } from './pod.js';

// ---- shimmer in the sunlight: warm motes drifting up through the light that twinkle now and then (additive, so
// they glow in the dark air and brighten whatever is behind them) ----
const MOTES = 160, motePos = new Float32Array(MOTES * 3), moteCol = new Float32Array(MOTES * 3), moteGeo = new THREE.BufferGeometry();
const motes = Array.from({ length: MOTES }, () => ({ a: Math.random() * 6.28, r: 0.3 + 1.6 * Math.sqrt(Math.random()),
  y: 0.15 + Math.random() * 2.1, up: 0.03 + Math.random() * 0.05, ph: Math.random() * 6.28, w: 1.5 + Math.random() * 2.5 }));
moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
moteGeo.setAttribute('color', new THREE.BufferAttribute(moteCol, 3));
const moteCloud = new THREE.Points(moteGeo, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true,
  transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
moteCloud.frustumCulled = false; scene.add(moteCloud);
export function updateMotes(t, dt) {
  motes.forEach((p, i) => {
    p.y += p.up * dt; p.a += 0.05 * dt; if (p.y > 2.3) p.y = 0.15;   // drift up and slowly around, then start low again
    motePos.set([Math.cos(p.a) * p.r + 0.05 * Math.sin(t * 0.7 + p.ph), p.y, Math.sin(p.a) * p.r], i * 3);
    const k = 0.55 + 3.5 * Math.pow(Math.max(0, Math.sin(t * p.w + p.ph)), 8);   // soft glow that flares to a glint
    moteCol.set([k, k * 0.88, k * 0.55], i * 3);
  });
  moteGeo.attributes.position.needsUpdate = moteGeo.attributes.color.needsUpdate = true;
}

// ---- sun rays: soft golden beams slanting down along the sun's direction (additive soft-edged planes, each turned
// about its own axis to face the camera). Each ray lands at a random spot on the patch and runs only upward from
// there (it ends on the ground, never through it), with a random width, length and a slightly different angle; it
// fades in, glows, fades out and comes back somewhere else, so the pattern keeps changing. Her materials write 1 to
// the stencil buffer and the rays skip those pixels, so she reads as standing in front of the light. ----
const SUN_DIR = sun.position.clone().normalize(), CAM_DIR = V();
const BEAM_TEX = canvasTex(64, 1, (g, w) => {                    // soft falloff across the beam
  for (let x = 0; x < w; x++) { const k = Math.sin(Math.PI * (x + 0.5) / w) ** 2 * 255 | 0; g.fillStyle = `rgb(${k},${k},${k})`; g.fillRect(x, 0, 1, 1); }
});
BEAM_TEX.magFilter = BEAM_TEX.minFilter = THREE.LinearFilter;
const BEAM_GEO = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);   // bottom edge on the ground point
function respawnRay(r, age = 0) {
  const a = Math.random() * Math.PI * 2, d = 1.9 * Math.sqrt(Math.random());
  r.m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
  r.axis.copy(SUN_DIR).add(V().randomDirection().multiplyScalar(0.11)).normalize();     // not quite parallel
  r.m.scale.set(0.12 + 0.5 * Math.random() ** 2, 7 + 5 * Math.random(), 1);            // width, length
  r.dur = 6 + 8 * Math.random(); r.life = age * r.dur; r.peak = 0.07 + 0.08 * Math.random(); r.ph = Math.random() * 6.28;
}
const rays = Array.from({ length: 7 }, () => {
  const m = new THREE.Mesh(BEAM_GEO, new THREE.MeshBasicMaterial({ map: BEAM_TEX, color: 0xffd49a, opacity: 0,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc }));
  m.frustumCulled = false; scene.add(m);
  const r = { m, axis: V() }; respawnRay(r, Math.random());      // start part-way through their lives
  return r;
});
const herMaterials = new Set([HAIR, DRESS2]);                    // strand meshes live in the scene, not under girl
[girl, pod].forEach(g => g.traverse(o => o.material && herMaterials.add(o.material)));   // her and her companion
scene.children.forEach(o => o.geometry === skirtGeo && herMaterials.add(o.material));
herMaterials.forEach(m => Object.assign(m, { stencilWrite: true, stencilRef: 1, stencilZPass: THREE.ReplaceStencilOp }));
const m4 = new THREE.Matrix4(), xb = V(), zb = V();
export function updateRays(t, dt) {
  viewCam.getWorldDirection(CAM_DIR);
  rays.forEach(r => {
    r.life += dt; if (r.life > r.dur) respawnRay(r);
    zb.copy(CAM_DIR).addScaledVector(r.axis, -CAM_DIR.dot(r.axis)).normalize().negate();
    r.m.quaternion.setFromRotationMatrix(m4.makeBasis(xb.crossVectors(r.axis, zb), r.axis, zb));
    r.m.material.opacity = r.peak * Math.sin(Math.PI * r.life / r.dur) ** 2 * (0.85 + 0.15 * Math.sin(t * 1.3 + r.ph));
  });
}
