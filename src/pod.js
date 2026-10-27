// The companion: the small floating grey box robot (brought back at the user's request, with more detail): panel
// seams, a vent grille, a sensor slit, side rails and two little arms. It hovers off her right shoulder, a little
// behind, bobbing, and drifts after her when she turns.
import * as THREE from 'three';
import { scene } from './stage.js';
import { V, UP, lam, pivot, mesh, canvasTex, wrapAng } from './util.js';
import { FACE } from './character.js';

const PANEL = canvasTex(32, 48, (g, w, h) => {
  g.fillStyle = '#b8b8bc'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d2d2d6'; g.fillRect(0, 0, w, 2);                                                    // lit top edge
  g.fillStyle = '#8e8e94'; g.fillRect(0, 12, w, 1); g.fillRect(0, 36, w, 1); g.fillRect(15, 12, 1, 24);   // seams
  g.fillStyle = '#6a6a70'; for (let y = 40; y < 46; y += 2) g.fillRect(6, y, 20, 1);                 // vent grille
});
PANEL.minFilter = THREE.LinearMipmapLinearFilter;
export const pod = pivot(scene);
const PODDARK = lam(0x55555c), PODJOINT = lam(0x3a3a40);
pod.position.set(-0.42, 1.72, -0.12).applyAxisAngle(UP, FACE); pod.rotation.y = FACE;                // start in place
mesh(new THREE.BoxGeometry(0.15, 0.22, 0.11), new THREE.MeshLambertMaterial({ map: PANEL }), pod);   // body
mesh(new THREE.BoxGeometry(0.13, 0.02, 0.09), lam(0xc8c8cc), pod, 0, 0.12, 0);                        // top cap
mesh(new THREE.BoxGeometry(0.17, 0.03, 0.13), PODDARK, pod, 0, -0.12, 0);                              // lower band
mesh(new THREE.BoxGeometry(0.08, 0.012, 0.006), PODJOINT, pod, 0, 0.05, 0.057);                       // sensor slit
[-1, 1].forEach(s => mesh(new THREE.BoxGeometry(0.008, 0.16, 0.02), PODDARK, pod, s * 0.079, 0, 0));  // side rails
const podArms = [-1, 1].map(s => {
  const a = pivot(pod, s * 0.06, -0.135, 0);
  mesh(new THREE.BoxGeometry(0.025, 0.1, 0.025), PODJOINT, a, 0, -0.05, 0);
  mesh(new THREE.BoxGeometry(0.035, 0.03, 0.035), PODDARK, a, 0, -0.11, 0);                             // little hand
  return a;
});
const podGoal = V();
let podYaw = FACE;                       // a smoothed heading, so it circles after her turns (a fast spin can't drag it through her)
export function updatePod(t, dt, yaw) {
  podYaw += wrapAng(yaw - podYaw) * (1 - Math.exp(-dt * 2.5));
  podGoal.set(-0.42, 1.72 + 0.04 * Math.sin(t * 1.7), -0.12).applyAxisAngle(UP, podYaw);
  pod.position.lerp(podGoal, 1 - Math.exp(-dt * 4));
  const turn = Math.atan2(Math.sin(yaw - pod.rotation.y), Math.cos(yaw - pod.rotation.y));
  pod.rotation.set(0.06 * Math.sin(t * 1.3), pod.rotation.y + turn * (1 - Math.exp(-dt * 3)), 0.07 * Math.sin(t * 1.1));
  podArms.forEach((a, i) => a.rotation.x = 0.12 * Math.sin(t * 2 + i * 1.5));
}
