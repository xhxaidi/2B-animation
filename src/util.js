// Small shared helpers: vectors, materials, lathes, scene-graph shorthands, canvas textures and easing.
import * as THREE from 'three';

export const V = () => new THREE.Vector3();
export const UP = new THREE.Vector3(0, 1, 0);
export const lam = (c, side = THREE.FrontSide) => new THREE.MeshLambertMaterial({ color: c, side });
// lathe from [radius, y] pairs listed bottom -> top; optional phi range leaves an opening (phi 0 = front, +z)
export const lathe = (pts, seg = 18, ps = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, ps, pl);
export function pivot(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
export function mesh(geo, m, parent, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o;
}
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter;
  return t;
}
export const ease = x => x * x * (3 - 2 * x);
export const wrapAng = a => Math.atan2(Math.sin(a), Math.cos(a));
