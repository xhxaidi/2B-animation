// Renderer, scene, cameras, lights and the pixel look. The scene renders into a low-res target; a post pass tone-maps
// it, Bayer-dithers it down to a few colours per channel, masks the cinematic bars and upscales it nearest-neighbour.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export let PX = 4;   // screen pixels per "art" pixel (recordings drop to REC_PX for more detail, see startRec in cinema.js)
const LEVELS = 9.0;  // colour levels per channel after dithering

export const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.setClearColor(0x000000, 0); // black clear: the page is black so the model stands out
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
export const cam = new THREE.OrthographicCamera();
cam.position.set(-8, 6, 8);
// orbit around her: drag to rotate, scroll to zoom; never dip below the stage
export const controls = new OrbitControls(cam, renderer.domElement);
controls.target.set(0, 0.9, 0);
Object.assign(controls, { enableDamping: true, enablePan: false, minZoom: 0.6, maxZoom: 3, maxPolarAngle: Math.PI / 2 - 0.05 });
controls.update();

// same light rig as the court: golden sun (camera-left so she's front-lit), cool sky fill
scene.add(new THREE.HemisphereLight(0xa8c8ff, 0x7a6a50, 0.85));
export const sun = new THREE.DirectionalLight(0xffdcae, 5.6);   // strong, warm late-day sun
sun.position.set(-10, 8, 1);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 30 });
scene.add(sun);

// the cinematic camera (cinema.js moves it); viewCam is whichever camera is rendering this frame
export const cineCam = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
export let viewCam = cam;
export const useCamera = c => { viewCam = c; };

// ---- low-res target + dither pass (same as the court) ----
const rt = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType, stencilBuffer: true });
const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { tex: { value: rt.texture }, res: { value: new THREE.Vector2() }, levels: { value: LEVELS }, exposure: { value: 1.35 }, bars: { value: new THREE.Vector2() } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `
    uniform sampler2D tex; uniform vec2 res, bars; uniform float levels, exposure; varying vec2 vUv;
    vec3 aces(vec3 x){ return clamp(x * (2.51 * x + .03) / (x * (2.43 * x + .59) + .14), 0., 1.); }
    float bayer4(vec2 p){
      int x = int(mod(p.x, 4.)), y = int(mod(p.y, 4.));
      int m[16] = int[16](0,8,2,10, 12,4,14,6, 3,11,1,9, 15,7,13,5);
      return float(m[y * 4 + x]) / 16. - 0.5;
    }
    void main(){
      vec2 px = floor(vUv * res);
      vec4 s = texture2D(tex, (px + .5) / res);
      vec3 c = pow(aces(max(s.rgb, 0.) * exposure), vec3(1. / 2.2));   // no mask: additive light (rays, motes) shows in the dark air
      c = floor(c * (levels - 1.) + .5 + bayer4(px)) / (levels - 1.);
      c *= step(bars.x, vUv.x) * step(vUv.x, 1. - bars.x) * step(bars.y, vUv.y) * step(vUv.y, 1. - bars.y);   // cinematic frame
      gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
    }`,
}));
export const bars = post.material.uniforms.bars.value;   // cinematic bars: (side, top/bottom) as fractions of the screen
const postScene = new THREE.Scene(); postScene.add(post);
const postCam = new THREE.Camera();

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  const lw = Math.ceil(w / PX), lh = Math.ceil(h / PX);
  rt.setSize(lw, lh);
  post.material.uniforms.res.value.set(lw, lh);
  const zoom = 1.7, a = w / h, half = a > 1 ? zoom : zoom / a;
  Object.assign(cam, { left: -half * a, right: half * a, top: half, bottom: -half, near: 0.1, far: 100 });
  cam.updateProjectionMatrix();
  cineCam.aspect = a; cineCam.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
export function setPX(px) { PX = px; resize(); }

export function render() {
  renderer.setRenderTarget(rt); renderer.render(scene, viewCam);
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}
