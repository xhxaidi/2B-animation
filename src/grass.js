// The ground: a ragged grass patch with dead spots, 16000 wind-blown blades over it, and tiny purple flowers.
import * as THREE from 'three';
import { scene } from './stage.js';
import { V, lam } from './util.js';

// dead spots: a few ragged patches where the grass has died back to straw over bare dirt (0 = alive, 1 = dead)
const DEAD = [[-0.95, 0.55, 0.42], [1.25, -0.45, 0.36], [0.35, -1.45, 0.4], [-1.55, -0.85, 0.3], [1.05, 1.35, 0.33], [-0.3, 1.6, 0.26]];
function deadAt(x, z) {
  let d = 0;
  DEAD.forEach(([cx, cz, r], i) => {
    const a = Math.atan2(z - cz, x - cx), rr = r * (1 + 0.22 * Math.sin(a * 4 + i * 1.7) + 0.12 * Math.sin(a * 9 + i));
    d = Math.max(d, 1 - THREE.MathUtils.smoothstep(Math.hypot(x - cx, z - cz) / rr, 0.55, 1));
  });
  return d;
}
const grassTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 200;
  const g = c.getContext('2d'), img = g.createImageData(200, 200);
  for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) {
    const dx = x / 100 - 1, dy = y / 100 - 1, a = Math.atan2(dy, dx);
    const keep = Math.hypot(dx, dy) < 0.82 + Math.sin(a * 5) * 0.05 + Math.sin(a * 11 + 2) * 0.04 + Math.random() * 0.06;
    const r = Math.random(), DIRT = [[122, 98, 62], [104, 82, 50], [140, 114, 72]];   // canvas x, y -> world x, z
    const col = Math.random() < deadAt(dx * 2.6, dy * 2.6) ? DIRT[r * 3 | 0] : r < 0.33 ? [86, 128, 54] : r < 0.66 ? [112, 154, 66] : [62, 98, 42];
    img.data.set([...col, keep ? 255 : 0], (y * 200 + x) * 4);
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter;
  return t;
})();
const grass = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), new THREE.MeshLambertMaterial({ map: grassTex, alphaTest: 0.5 }));
grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);
// tall grass over the whole patch: instanced blades (dark at the root, sunlit toward the tip) inside the same
// ragged outline as the grass texture, in taller and shorter swathes, shortest at the edge so it blends in. The vertex shader bends each blade in the wind, more toward the tip,
// in waves that roll across the patch, with slow gusts. Normals point up so blades light like the ground.
// the wind, shared by the grass and the flowers: windAt() is the world-space sway of a point h above the ground at
// ip; toLocal() turns a world offset into the instance's own (scaled) axes via dot(column, w) / |column|^2
const WIND_GLSL = `uniform float time;
  vec3 windAt(vec3 ip, float h) {
    float gust = 0.6 + 0.4 * sin(time * 0.7 + ip.x * 0.8);
    return vec3(0.85, 0.0, 0.5) * h * gust * (0.28 + 0.16 * sin(time * 2.1 + dot(ip.xz, vec2(2.3, 1.7))));
  }
  vec3 toLocal(vec3 w) {
    return vec3(dot(instanceMatrix[0].xyz, w) / dot(instanceMatrix[0].xyz, instanceMatrix[0].xyz), 0.0,
                dot(instanceMatrix[2].xyz, w) / dot(instanceMatrix[2].xyz, instanceMatrix[2].xyz));
  }
`;
export const grassTime = (() => {
  const SEG = 4, pos = [], col = [], idx = [];
  for (let i = 0; i <= SEG; i++) {
    const v = i / SEG, w = 0.5 * (1 - v), c = 0.4 + 0.75 * v;         // unit height; width is set per instance
    pos.push(-w, v, 0, w, v, 0); col.push(c * (1 + 0.22 * v), c, c * (1 - 0.35 * v), c * (1 + 0.22 * v), c, c * (1 - 0.35 * v));   // sun-yellowed tips
    if (i < SEG) idx.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, k) => k % 3 === 1 ? 1 : 0), 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), time = { value: 0 };
  mat.onBeforeCompile = sh => {
    sh.uniforms.time = time;
    // shimmer: about a quarter of the blades (picked by a hash of their position) catch the sun at the tip now and
    // then, a brief glint; it's added after lighting, scaled by the direct sunlight so blades in shade don't glint
    sh.vertexShader = WIND_GLSL + 'varying float vGlint;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ip = instanceMatrix[3].xyz;
      float pick = step(0.74, fract(sin(dot(ip.xz, vec2(12.9898, 78.233))) * 43758.5453));
      vGlint = pick * position.y * position.y * position.y * pow(max(0.0, sin(time * 2.3 + ip.x * 13.7 + ip.z * 7.9)), 40.0);
      transformed += toLocal(windAt(ip, length(instanceMatrix[1].xyz)) * position.y * position.y);   // bends toward the tip`);
    sh.fragmentShader = 'varying float vGlint;\n' + sh.fragmentShader
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize(vNormal);')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n  gl_FragColor.rgb += vec3(1.0, 0.9, 0.55) * vGlint * min(1.0, 3.0 * length(reflectedLight.directDiffuse));');
  };
  const N = 16000, blades = new THREE.InstancedMesh(geo, mat, N), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  const GREENS = [[86, 128, 54], [112, 154, 66], [62, 98, 42], [128, 160, 70]];
  const YELLOWS = [[150, 166, 62], [176, 172, 74], [196, 182, 92]];                  // yellow-green and dry straw
  const DEADS = [[150, 122, 72], [128, 100, 58], [172, 146, 92], [112, 88, 54]];     // dead, brown straw
  for (let i = 0; i < N;) {
    const a = Math.random() * Math.PI * 2, r = 2.45 * Math.sqrt(Math.random()), x = Math.cos(a) * r, z = Math.sin(a) * r;
    const edge = 2.6 * (0.84 + 0.05 * Math.sin(a * 5) + 0.04 * Math.sin(a * 11 + 2));       // the grass texture's outline
    const dead = deadAt(x, z);
    const h = (0.15 + Math.random() * 0.13) * (0.85 + 0.15 * Math.sin(x * 2.7) * Math.sin(z * 3.1 + 1))
      * (1 - THREE.MathUtils.smoothstep(r, edge - 0.35, edge + 0.02)) * (1 - 0.6 * dead);
    if (h < 0.03 || Math.random() < 0.55 * dead) continue;                            // dead spots are thinned out
    const flop = 0.4 + 0.9 * dead;                                                       // and the dead blades flop over
    q.setFromEuler(e.set((Math.random() - 0.5) * flop, Math.random() * Math.PI, (Math.random() - 0.5) * flop));
    blades.setMatrixAt(i, m.compose(V().set(x, 0, z), q, V().set(0.009 + Math.random() * 0.007, h, 1)));
    const pal = Math.random() < dead * 1.1 ? DEADS
      : Math.random() < 0.2 + 0.12 * Math.sin(x * 1.3 + z * 0.9) ? YELLOWS : GREENS;   // a bit of yellow, in drifts
    const [gr, gg, gb] = pal[Math.random() * pal.length | 0];
    blades.setColorAt(i++, c.setRGB(gr / 255, gg / 255, gb / 255, THREE.SRGBColorSpace));
  }
  blades.receiveShadow = true; scene.add(blades);
  return time;
})();

// tiny purple flowers in little clusters among the grass (kept out of the dead spots): a thin green stem and a small
// lilac-to-violet head, some peeking just above the blades. Both sway with the same wind as the grass, the head
// riding the stem's tip.
{
  const sway = (mat, expr) => { mat.onBeforeCompile = sh => {
    sh.uniforms.time = grassTime;
    sh.vertexShader = WIND_GLSL + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ip = instanceMatrix[3].xyz; transformed += toLocal(${expr});`);
  }; return mat; };
  const spots = [];
  for (let k = 0; spots.length < 75 && k < 1000; k++) {             // cluster centres on live grass
    const a = Math.random() * Math.PI * 2, r = 0.3 + 1.7 * Math.sqrt(Math.random()), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (deadAt(x, z) < 0.2) spots.push([x, z]);
  }
  const flowers = spots.flatMap(([x, z]) => Array.from({ length: 3 + (Math.random() * 5 | 0) }, () =>
    [x + (Math.random() - 0.5) * 0.16, z + (Math.random() - 0.5) * 0.16, 0.1 + Math.random() * 0.2]));
  const stems = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    sway(lam(0x5a8436), 'windAt(ip, length(instanceMatrix[1].xyz)) * position.y * position.y'), flowers.length);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4),
    sway(new THREE.MeshLambertMaterial(), 'windAt(ip, ip.y)'), flowers.length);
  const PURPLES = [[150, 90, 200], [120, 70, 180], [180, 125, 222], [100, 52, 150]], m = new THREE.Matrix4(), c = new THREE.Color();
  flowers.forEach(([x, z, h], i) => {
    stems.setMatrixAt(i, m.makeScale(0.004, h, 0.004).setPosition(x, 0, z));
    const r = 0.011 + Math.random() * 0.007;
    heads.setMatrixAt(i, m.makeScale(r, r * 0.7, r).setPosition(x, h, z));
    const [pr, pg, pb] = PURPLES[Math.random() * 4 | 0];
    heads.setColorAt(i, c.setRGB(pr / 255, pg / 255, pb / 255, THREE.SRGBColorSpace));
  });
  stems.receiveShadow = heads.receiveShadow = true; scene.add(stems, heads);
}
