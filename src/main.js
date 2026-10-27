// Pixel Dance: a pixel-art fan-art animation of 2B and her Pod cutting down three machines in a grassy wreck field.
// Modules build their part of the scene when imported, in this order; the loop below runs one frame of everything.
import * as THREE from 'three';
import { renderer, scene, controls, render } from './stage.js';
import { grassTime } from './grass.js';
import { flickerEyes, sparks } from './wrecks.js';
import './machines.js';
import './rubble.js';
import { girl, hips, sword, handSword } from './character.js';
import { updatePod } from './pod.js';
import { BPM, CHOREO_BEATS, toVec, fromVec, choreo, follow, livePose, applyPose, flipAt, FLIP_LEN, FLIP_C, DRAW_AT, SHEATHE_AT,
  SPIN0, SPIN1, fightT } from './choreo.js';
import { updateFeet } from './feet.js';
import { updateBust, stepSkirt, hairSim, tailSim } from './physics.js';
import { updateFoes, updateTrail, updateBolts, updateBlasts } from './fight.js';
import { updateMotes, updateRays } from './atmosphere.js';
import { soundOn, sfx, scheduleScore } from './sound.js';
import { holdForClick, frameSpeed, updateCamera, recordTick } from './cinema.js';

const clock = new THREE.Clock();
let simT = 0, lastSpin = 0, lastTf = -99, wasDrawn = false;
renderer.setAnimationLoop(() => {
  // sim time is real time (the first frame reports 0, hence the floor), slowed by the cinematic speed ramps
  const raw = clock.getDelta();
  if (holdForClick) return;                                         // ?rec: nothing runs until the click
  const dt = THREE.MathUtils.clamp(raw, 1e-3, 1 / 30) * frameSpeed(lastTf), t = (simT += dt);
  controls.update(); grassTime.value = t;
  const b = t * BPM / 60, lb = b - Math.floor(b / CHOREO_BEATS) * CHOREO_BEATS;
  const pose = fromVec(follow(toVec(livePose(choreo(b), b, lb)), dt));
  applyPose(pose);
  const spinRate = Math.abs(pose.spin - lastSpin) / dt, fl = flipAt(lb);
  updateFeet(dt, b, spinRate, !!fl);
  // backflip: the whole body turns about its centre (a little above the hips) while that centre rides the jump arc;
  // mid-air the centre is held at standing height (FLIP_C) so tucking doesn't pull her down toward the floor
  const yaw = girl.rotation.y;
  girl.position.set(0, 0, 0); girl.rotation.x = 0;
  if (fl) {
    const c = hips.position.y + 0.1, sp = Math.sin(fl.pitch);
    girl.rotation.x = fl.pitch;
    girl.position.y += fl.lift + (FLIP_C - c) * Math.sin(Math.PI * fl.u) + c * (1 - Math.cos(fl.pitch));
    girl.position.x -= c * sp * Math.sin(yaw); girl.position.z -= c * sp * Math.cos(yaw);
  }
  handSword.visible = lb > DRAW_AT && lb < SHEATHE_AT; sword.visible = !handSword.visible;
  updatePod(t, dt, yaw);
  scene.updateMatrixWorld();
  updateCamera(lb, fightT(lb));

  updateBust(dt);
  flickerEyes.forEach(e => { if (Math.random() < 0.12) e.visible = Math.random() < 0.7; });   // broken eye sputters
  sparks.forEach(sp => sp.visible = Math.random() < 0.06);                                     // torn wiring sparks
  const tf = fightT(lb);
  updateFoes(tf, dt); updateTrail((fl && fl.u < 0.7) || (tf > SPIN0 + 0.15 && tf < SPIN1 + 0.1));
  const boltPower = updateBolts(tf) || 0; updateBlasts(tf); updateMotes(t, dt); updateRays(t, dt);
  if (soundOn) {                                   // sound cues on the moves; the score follows the fight
    if (handSword.visible !== wasDrawn) handSword.visible ? sfx.draw() : sfx.sheathe();
    if (lastTf < 0 && tf >= 0) sfx.whoosh(0.5);
    if (lastTf < SPIN0 + 0.15 && tf >= SPIN0 + 0.15) sfx.whoosh(0.8);
    if (boltPower && Math.random() < 0.15 * boltPower) sfx.zap(null, 0.012 + 0.02 * boltPower);
    scheduleScore(tf > -5 && tf < SPIN1 + 1.5);
  }
  wasDrawn = handSword.visible;
  hairSim.step(dt); tailSim.step(dt);              // hair + blindfold tails swing, flare on spins, stay off the face
  // swings, flares on spins, drapes over lifted thighs; flies up through the backflip and the spinning slash
  const win = (a, b) => THREE.MathUtils.smoothstep(tf, a - 0.15, a) * (1 - THREE.MathUtils.smoothstep(tf, b, b + 0.4));
  stepSkirt(dt, Math.max(0.5 * win(0, FLIP_LEN), win(SPIN0 + 0.1, SPIN1 + 0.2)), yaw);
  lastSpin = pose.spin; lastTf = tf;
  recordTick(lb);
  render();
});
