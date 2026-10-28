import * as T from "three";
import { mergeGeometries } from "../assets/vendor/BufferGeometryUtils.js";
const mats = new Map();
export function mat(color, roughness = 0.8) {
  const key = color + ":" + roughness;
  if (!mats.has(key))
    mats.set(key, new T.MeshStandardMaterial({ color, roughness }));
  return mats.get(key);
}
const boxGeo = new T.BoxGeometry(1, 1, 1),
  ballGeo = new T.SphereGeometry(1, 8, 6),
  detailBallGeo = new T.SphereGeometry(1, 6, 4),
  cylGeo = new T.CylinderGeometry(1, 1, 1, 8);
export function mesh(
  parent,
  geo,
  material,
  pos = [0, 0, 0],
  scale = [1, 1, 1],
) {
  const m = new T.Mesh(
    geo,
    typeof material === "string" || typeof material === "number"
      ? mat(material)
      : material,
  );
  m.position.set(...pos);
  m.scale.set(...scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const box = (p, c, pos, s) => mesh(p, boxGeo, c, pos, s);
export const ball = (p, c, pos, s) =>
  mesh(p, Math.max(...s) < 0.18 ? detailBallGeo : ballGeo, c, pos, s);
export const cylinder = (p, c, pos, s) => mesh(p, cylGeo, c, pos, s);
export function tube(p, c, pts, r = 0.025) {
  return mesh(
    p,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(pts.map((v) => new T.Vector3(...v))),
      pts.length <= 3 ? 8 : 12,
      r,
      r < 0.02 ? 3 : 4,
      false,
    ),
    c,
  );
}
// Fixed-size atlas pages keep labels sharp while sharing one draw material.
const labelPages = [],
  labelSlots = new Map(),
  labelSize = 2048;
function allocateLabel(text, bg, color) {
  const key = JSON.stringify([text, bg, color]);
  if (labelSlots.has(key)) return labelSlots.get(key);
  let page = labelPages.at(-1);
  if (!page || page.used === 64) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = labelSize;
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = T.LinearMipmapLinearFilter;
    texture.anisotropy = 4;
    page = {
      canvas,
      texture,
      used: 0,
      material: new T.MeshBasicMaterial({
        map: texture,
        side: T.DoubleSide,
        toneMapped: false,
      }),
    };
    labelPages.push(page);
  }
  const i = page.used++,
    x = (i % 4) * 512,
    y = Math.floor(i / 4) * 128,
    ctx = page.canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, 512, 128);
  ctx.fillStyle = color;
  ctx.font = "600 47px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 256, y + 65, 490);
  page.texture.needsUpdate = true;
  const result = { page, x, y };
  labelSlots.set(key, result);
  return result;
}
export function label(
  p,
  text,
  pos,
  w = 2,
  h = 0.4,
  bg = "#f5f1de",
  color = "#395343",
) {
  const { page, x, y } = allocateLabel(text, bg, color),
    geometry = new T.PlaneGeometry(w, h),
    uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      (x + 2 + uv.getX(i) * 508) / labelSize,
      1 - (y + 2 + (1 - uv.getY(i)) * 124) / labelSize,
    );
  const result = mesh(p, geometry, page.material, pos);
  result.castShadow = false;
  return result;
}
const spriteMaterials = new Map();
export function sprite(text, color) {
  const key = JSON.stringify([text, color]);
  let material = spriteMaterials.get(key);
  if (!material) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = color;
    x.beginPath();
    x.arc(64, 64, 52, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#fff8e8";
    x.font = "bold 78px sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, 64, 67);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    material = new T.SpriteMaterial({
      map: texture,
      depthWrite: false,
      toneMapped: false,
    });
    spriteMaterials.set(key, material);
  }
  const result = new T.Sprite(material);
  result.scale.set(0.48, 0.48, 1);
  return result;
}
// Collapse fixed geometry by material. Animation joints remain separate groups.
const vertexMaterial = new T.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.8,
});
export function bake(root) {
  root.updateMatrixWorld(true);
  const groups = new Map(),
    inverse = root.matrixWorld.clone().invert();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const transformed = o.geometry
      .clone()
      .applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
    const g = transformed.index ? transformed.toNonIndexed() : transformed;
    if (g !== transformed) transformed.dispose();
    let material = o.material;
    if (
      material.isMeshStandardMaterial &&
      !material.vertexColors &&
      !material.map &&
      !material.bumpMap &&
      material.roughness === 0.8 &&
      !material.transparent &&
      material.opacity === 1 &&
      material.metalness === 0 &&
      material.side === T.FrontSide &&
      material.emissive.getHex() === 0 &&
      !material.normalMap &&
      !material.roughnessMap &&
      !material.metalnessMap &&
      !material.alphaMap
    ) {
      const colors = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3)
        material.color.toArray(colors, i);
      g.setAttribute("color", new T.BufferAttribute(colors, 3));
      material = vertexMaterial;
    }
    const key = material.uuid;
    if (!groups.has(key)) groups.set(key, { material, geos: [], objects: [] });
    groups.get(key).geos.push(g);
    groups.get(key).objects.push(o);
  });
  for (const { material, geos, objects } of groups.values()) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    objects.forEach((o) => o.removeFromParent());
    const m = new T.Mesh(merged, material);
    m.castShadow = objects.some((o) => o.castShadow);
    m.receiveShadow = true;
    root.add(m);
    geos.forEach((g) => g.dispose());
  }
}
