// Feet: plant, step, pop the heel and pivot like a dancer.
// The keyed pose (FK, applyPose) only says where each foot *wants* to be. Feet stay planted on the floor until the pose
// pulls them far enough away, then step with a lifted, pointed foot; legs are solved with 2-bone IK every frame.
import * as THREE from 'three';
import { V, ease } from './util.js';
import { hips, legs, HIP_W, THIGH, SHIN } from './character.js';

const BALL = new THREE.Vector3(0, -0.1, 0.105);  // ball-of-foot contact relative to the ankle, heel down
const TURNOUT = 0.18, STEP_DIST = 0.07, LIFTED = 0.035;
const X_AXIS = new THREE.Vector3(1, 0, 0), m4 = new THREE.Matrix4(), eu = new THREE.Euler(0, 0, 0, 'YXZ');
const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion();
const tA = V(), tH = V(), tD = V(), tP = V(), xb = V(), yb = V(), zb = V();
const footQuat = (yaw, lift, q) => q.setFromEuler(eu.set(lift, yaw, 0));        // yaw, then heel lift about the ball
const ankleFor = (ball, yaw, lift, out) => out.copy(ball).sub(tA.copy(BALL).applyQuaternion(footQuat(yaw, lift, qc)));

function fkBall(L, out) {                       // where the keyed pose would put the ball of this foot (girl space)
  L.hip.updateMatrix(); L.knee.updateMatrix(); L.ankle.updateMatrix();
  m4.copy(hips.matrix).multiply(L.hip.matrix).multiply(L.knee.matrix).multiply(L.ankle.matrix);
  return out.setFromMatrixPosition(m4).add(tA.copy(BALL).applyQuaternion(footQuat(L.s * TURNOUT, 0, qc)));
}
function solveLeg(L, A, yaw, lift) {
  tH.set(L.s * HIP_W, -0.02, 0).applyMatrix4(hips.matrix);                      // hip joint
  tD.subVectors(A, tH); const d = THREE.MathUtils.clamp(tD.length(), 0.1, THIGH + SHIN - 1e-3); tD.normalize();
  tP.set(Math.sin(yaw) + L.s * 0.2, 0.15, Math.cos(yaw)); tP.addScaledVector(tD, -tP.dot(tD)).normalize(); // knee over the toes
  const a = Math.acos(THREE.MathUtils.clamp((THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d), -1, 1));
  const bend = Math.PI - Math.acos(THREE.MathUtils.clamp((THIGH * THIGH + SHIN * SHIN - d * d) / (2 * THIGH * SHIN), -1, 1));
  yb.copy(tD).multiplyScalar(-Math.cos(a)).addScaledVector(tP, -Math.sin(a));   // hip +y points back up the thigh
  zb.copy(tP).multiplyScalar(Math.cos(a)).addScaledVector(tD, -Math.sin(a));    // hip +z: the way the knee faces
  xb.crossVectors(yb, zb);
  qa.setFromRotationMatrix(m4.makeBasis(xb, yb, zb));
  L.hip.quaternion.copy(qb.copy(hips.quaternion).invert()).multiply(qa);
  L.knee.rotation.set(bend, 0, 0);
  qa.multiply(qb.setFromAxisAngle(X_AXIS, bend));                               // knee frame in girl space
  L.ankle.quaternion.copy(qa.invert()).multiply(footQuat(yaw, lift, qc));
}
let hipDrop = 0;
export function updateFeet(dt, b, spinRate, air) {
  hips.updateMatrix();
  const D = legs.map(L => fkBall(L, V()));
  const phase = b - Math.floor(b), tapC = Math.floor(b) % 2 ? 0 : phase < 0.2 ? ease(phase / 0.2)
    : phase < 0.45 ? 1 : phase < 0.7 ? 1 - ease((phase - 0.45) / 0.25) : 0;
  // weight: where the pelvis sits between the two feet (0 = all on the right foot, 1 = all on the left)
  const b0 = legs[0].ball || D[0], b1 = legs[1].ball || D[1];
  tD.subVectors(b1, b0).setY(0);
  const wLeft = THREE.MathUtils.clamp(tD.dot(tH.set(hips.position.x - b0.x, 0, hips.position.z - b0.z)) / Math.max(1e-4, tD.lengthSq()), 0, 1);
  const releve = Math.min(0.45, spinRate * 0.1);                               // rise onto the balls while turning
  const smooth = 1 - Math.exp(-dt * 20);                                        // heel lift + tap never jump between states
  const targets = legs.map((L, i) => {
    const want = D[i], yaw = L.s * TURNOUT, weight = i ? wLeft : 1 - wLeft;
    if (!L.ball) { L.ball = want.clone().setY(0); L.lift = 0; L.tap = 0; }
    const vel = tP.subVectors(want, L.prevD).divideScalar(dt).setY(0).clampLength(0, 0.7); L.prevD.copy(want);
    let lift = releve, tap = 0;
    if (want.y > LIFTED || air) {                                               // keyed off the floor or airborne: follow, toe pointed
      L.step = null;
      L.ball.lerp(want, 1 - Math.exp(-dt * 25));
      lift += 0.7 * THREE.MathUtils.smoothstep(want.y, LIFTED, 0.15) + (air ? 0.5 : 0);
    } else {
      const other = legs[1 - i];
      const off = Math.hypot(want.x - L.ball.x, want.z - L.ball.z);
      if (!L.step && (L.ball.y > 0.005 || (off > STEP_DIST && (!other.step || off > 0.15)))) {
        // step to where the foot is heading, not where it is
        L.step = { from: L.ball.clone(), to: want.clone().addScaledVector(vel, 0.12).setY(0), u: 0,
                   dur: L.ball.y > 0.005 ? 0.12 : 0.2, arc: L.ball.y > 0.005 ? 0 : 0.05 };
      }
      if (L.step) {
        const st = L.step; st.u = Math.min(1, st.u + dt / st.dur);
        L.ball.lerpVectors(st.from, st.to, ease(st.u)); L.ball.y += st.arc * Math.sin(Math.PI * st.u);
        lift += 0.55 * Math.sin(Math.PI * st.u);                                // toe points mid-step
        if (st.u >= 1) L.step = null;
      } else {
        // planted: the unweighted foot pops its heel, and taps on alternate beats (fading in as weight leaves it)
        lift += 0.45 * (1 - THREE.MathUtils.smoothstep(weight, 0.12, 0.42));
        tap = tapC * (1 - THREE.MathUtils.smoothstep(weight, 0.25, 0.45));
        lift += 0.3 * tap;
      }
    }
    L.lift += (lift - L.lift) * smooth; L.tap += (tap - L.tap) * smooth;
    return [ankleFor(V().set(0, 0.025 * L.tap, 0.01 * L.tap).add(L.ball), yaw, L.lift, V()), yaw, L.lift];
  });
  // lower the hips (smoothly) if a foot on the floor would be out of reach, then solve both legs
  let drop = 0;
  legs.forEach((L, i) => {
    if (D[i].y > LIFTED || air) return;
    const A = targets[i][0];
    tH.set(L.s * HIP_W, -0.02, 0).applyMatrix4(hips.matrix);
    const dxz = Math.hypot(A.x - tH.x, A.z - tH.z), reach = THIGH + SHIN - 0.005;
    if (dxz < reach) drop = Math.max(drop, tH.y - A.y - Math.sqrt(reach * reach - dxz * dxz));
  });
  hipDrop += (drop - hipDrop) * (1 - Math.exp(-dt * 25));
  hips.position.y -= hipDrop; hips.updateMatrix();
  legs.forEach((L, i) => solveLeg(L, ...targets[i]));
}
