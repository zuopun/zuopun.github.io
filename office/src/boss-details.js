import * as T from "three";
import { createPlushSurface } from "./characters/plush-surface.js";
const plushSurface = createPlushSurface(T);

let crownTemplate = null;
export function setBossCrownTemplate(template) { crownTemplate = template; }

// The official ink stays pixel-for-pixel aligned with the supplied reference.
// Its photographed orange rim lighting is removed, not baked into the toy's skin.
export const BOSS_SKIN_SRGB = [231, 197, 158];
export const BOSS_FACE_CENTER_Y = 1.83;
const BOSS_FACE_SCALE = .93;
export async function loadBossFace() {
  const source = await new T.TextureLoader().loadAsync(new URL("../refs/zuozuo_face.png", import.meta.url).href);
  const canvas = document.createElement("canvas");
  canvas.width = source.image.width; canvas.height = source.image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source.image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // Original black line coverage is recoverable from max RGB: every skin pixel
  // inside the face contour is much brighter than the ink. Preserve edge AA.
  for (let i = 0; i < pixels.data.length; i += 4) {
    const maximum = Math.max(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
    const coverage = 1 - T.MathUtils.smoothstep(maximum, 28, 122);
    for (let c = 0; c < 3; c++) pixels.data[i + c] = Math.round(BOSS_SKIN_SRGB[c] * (1 - coverage) + (c === 2 ? 3 : 1) * coverage);
  }
  ctx.putImageData(pixels, 0, 0);
  // Remove only the photographic fur seam at the skin boundary. None of the
  // brows, cheek strokes, mouth or chin reaches this twelve-pixel margin.
  const edge = faceOutline().getPoints(40);
  ctx.strokeStyle = `rgb(${BOSS_SKIN_SRGB.join(",")})`; ctx.lineWidth = 24; ctx.lineJoin = "round";
  ctx.beginPath(); edge.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.stroke();
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 8;
  texture.name = "official-zuozuo-ink-on-unlit-warm-beige";
  texture.userData.officialSource = "refs/zuozuo_face.png";
  texture.userData.inkDerivedFromOriginal = true;
  texture.userData.skinSRGB = BOSS_SKIN_SRGB.slice();
  source.dispose();
  return texture;
}

export function bossFaceMaterial(texture) {
  const material = new T.MeshBasicMaterial({ map: texture, toneMapped: false, fog: false });
  material.name = "official-ink-unlit-uniform-beige";
  material.userData.preserveMaterial = true;
  return material;
}

function faceOutline() {
  const outline = new T.Shape();
  outline.moveTo(562, 473);
  outline.bezierCurveTo(619, 465, 697, 473, 747, 490);
  outline.bezierCurveTo(826, 516, 860, 579, 875, 654);
  outline.bezierCurveTo(896, 762, 839, 844, 774, 877);
  outline.bezierCurveTo(692, 912, 572, 898, 497, 871);
  outline.bezierCurveTo(409, 842, 358, 779, 357, 693);
  outline.bezierCurveTo(352, 605, 389, 527, 470, 491);
  outline.bezierCurveTo(503, 478, 534, 474, 562, 473);
  return outline;
}

// A continuous sculpted head surface starts at the exact face outline and
// wraps around the cheeks, temples and back. Its front is an actual aperture,
// so there cannot be a second ellipsoid protruding through the curved skin.
export function bossHeadGeometry(segments = 96, rings = 12) {
  const outline = faceOutline().getSpacedPoints(segments); outline.pop();
  const columns = outline.length, rows = rings * 2 + 1, positions = [], normals = [], uvs = [], indices = [];
  for (let i = 0; i <= columns; i++) {
    const pixel = outline[i % columns], x = (pixel.x - 616) / 505 * BOSS_FACE_SCALE / .7, y = ((687 - pixel.y) / 505 * BOSS_FACE_SCALE + BOSS_FACE_CENTER_Y - 1.9) / .63;
    const angle = Math.atan2(y, x), edgeRadius = Math.hypot(x, y);
    for (let j = 0; j < rows; j++) {
      let r, z;
      if (j <= rings) { r = T.MathUtils.lerp(edgeRadius, 1, j / rings); z = Math.sqrt(Math.max(0, 1 - r * r)); }
      else { const phi = (j - rings) / rings * Math.PI / 2; r = Math.cos(phi); z = -Math.sin(phi); }
      const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
      positions.push(px, py, z); normals.push(px, py, z);
      uvs.push(.5 + Math.atan2(z, px) / (Math.PI * 2), .5 + Math.asin(py) / Math.PI);
      if (i < columns && j < rows - 1) { const a = i * rows + j, b = (i + 1) * rows + j; indices.push(a, b, a + 1, a + 1, b, b + 1); }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices);
  geometry.computeBoundingSphere(); geometry.userData.openFaceAperture = true;
  return geometry;
}

export function bossFacePoint(pixelX, pixelY) {
  const x = (pixelX - 616) / 505 * BOSS_FACE_SCALE, y = (687 - pixelY) / 505 * BOSS_FACE_SCALE, headY = y + BOSS_FACE_CENTER_Y - 1.9;
  const z = .48 * Math.sqrt(Math.max(.02, 1 - (x / .7) ** 2 - (headY / .63) ** 2));
  const normal = new T.Vector3(x / (.7 * .7), headY / (.63 * .63), z / (.48 * .48)).normalize();
  return new T.Vector3(x, y, z).addScaledVector(normal, .0018);
}

// This patch IS the head's front surface. There is no extra disc, rim extrusion,
// cheek sphere, or physical muzzle; the nose remains the original drawn ink.
export function bossFaceGeometry(texture) {
  const source = new T.ShapeGeometry(faceOutline(), 12);
  const input = source.attributes.position, vertices = [], uvs = [];
  function vertex(pixel) {
    const point = bossFacePoint(pixel.x, pixel.y);
    vertices.push(point.x, point.y, point.z);
    uvs.push(pixel.x / texture.image.width, 1 - pixel.y / texture.image.height);
  }
  function subdivide(a, b, c, depth) {
    if (!depth) { vertex(a); vertex(c); vertex(b); return; }
    const ab = a.clone().add(b).multiplyScalar(.5), bc = b.clone().add(c).multiplyScalar(.5), ca = c.clone().add(a).multiplyScalar(.5);
    subdivide(a, ab, ca, depth - 1); subdivide(ab, b, bc, depth - 1);
    subdivide(ca, bc, c, depth - 1); subdivide(ab, bc, ca, depth - 1);
  }
  for (let i = 0; i < source.index.count; i += 3) {
    const p = [0, 1, 2].map(j => new T.Vector2().fromBufferAttribute(input, source.index.getX(i + j)));
    subdivide(...p, 3);
  }
  source.dispose();
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  geometry.userData.integratedHeadSurface = true;
  return geometry;
}

export function getBossFurMaterial() { return plushSurface.getPlushMaterial(); }
function getShellMaterial() { return plushSurface.getPlushShellMaterial(); }

export function bossPlushGeometry(kind = "round", width = 32, height = 24) {
  const geometry = new T.SphereGeometry(1, width, height);
  if (kind === "body") {
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), bulge = 1 - .04 * y - .025 * y * y;
      p.setX(i, p.getX(i) * bulge); p.setZ(i, p.getZ(i) * bulge);
    }
    geometry.computeVertexNormals();
  }
  return geometry;
}

// Dense short curved fibres are represented by nested alpha surfaces. No radial
// quills or polygon cards protrude from the silhouette.
export function addBossFurShell(parent, center, scale, layers = 5) {
  const group = new T.Group(); group.name = "permanent-soft-plush-shells"; parent.add(group);
  const isHead = center[1] > 1.8 && scale[0] > .6, isBody = center[1] === .8 && scale[0] > .4;
  for (let layer = 0; layer < layers; layer++) {
    const geometry = isHead ? bossHeadGeometry(64, 10) : bossPlushGeometry(isBody ? "body" : "round", 28, 20);
    geometry.setAttribute("furLayer", new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(layer / Math.max(1, layers - 1)), 1));
    const shell = new T.Mesh(geometry, getShellMaterial()); shell.position.set(...center);
    shell.scale.set(...scale.map(value => value + .004 + layer * .005));
    shell.castShadow = false; shell.receiveShadow = true; shell.userData.bossFurShell = true; group.add(shell);
  }
  return group;
}

export function addBossArm(parent, side) {
  // One softly stuffed limb continues into the paw: no intersecting hand sphere,
  // glove cuff or rigid wrist band. The prop grip remains at its existing socket.
  const profile = [[0, -.67], [.085, -.655], [.158, -.59], [.19, -.43], [.195, -.24], [.18, -.055], [.13, .075], [0, .135]];
  const curve = new T.CatmullRomCurve3(profile.map(([r, y]) => new T.Vector3(r, y, 0)));
  const points = curve.getPoints(32).map(p => new T.Vector2(Math.max(0, p.x), p.y));
  const geometry = new T.LatheGeometry(points, 32); geometry.scale(1, 1, .95); geometry.translate(side * .06, 0, .012);
  const arm = new T.Mesh(geometry, getBossFurMaterial()); arm.name = "continuous-soft-plush-arm-and-paw"; arm.castShadow = true; arm.receiveShadow = true; parent.add(arm);
  for (let layer = 0; layer < 3; layer++) {
    const g = geometry.clone(), p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { p.setXYZ(i, p.getX(i) + n.getX(i) * (.004 + layer * .007), p.getY(i) + n.getY(i) * (.004 + layer * .007), p.getZ(i) + n.getZ(i) * (.004 + layer * .007)); }
    g.setAttribute("furLayer", new T.Float32BufferAttribute(new Float32Array(p.count).fill(layer / 2), 1));
    const shell = new T.Mesh(g, getShellMaterial()); shell.castShadow = false; shell.receiveShadow = true; parent.add(shell);
  }
  return arm;
}

export function addBossFacePile(parent) {
  const points = faceOutline().getPoints(48), positions = [], uvs = [], indices = [];
  points.forEach((pixel, i) => {
    for (const factor of [.994, 1.026]) {
      const px = 616 + (pixel.x - 616) * factor, py = 687 + (pixel.y - 687) * factor;
      const p = bossFacePoint(px, py); p.y += BOSS_FACE_CENTER_Y;
      const n = new T.Vector3(p.x / .49, (p.y - 1.9) / .3969, p.z / .2304).normalize();
      p.addScaledVector(n, .003);
      positions.push(p.x, p.y, p.z); uvs.push(i / points.length * 3, factor === .994 ? .12 : .32);
    }
    if (i) { const a = i * 2; indices.push(a - 2, a, a - 1, a - 1, a, a + 1); }
  });
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("furLayer", new T.Float32BufferAttribute(new Float32Array(positions.length / 3).fill(.15), 1));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const edge = new T.Mesh(geometry, getShellMaterial()); edge.name = "soft-fur-skin-seam"; edge.castShadow = false; parent.add(edge);
  return edge;
}

export function addBossEar(parent, side) {
  const ear = new T.Group(); ear.name = side < 0 ? "left-thick-plush-ear" : "right-thick-plush-ear";
  ear.position.set(side * .765, 1.91, -.035); ear.rotation.y = side * .14; parent.add(ear);
  // Rounded outer capsule continues into a thick fur rim, leaving a real hollow.
  const profile = [[0, -.2], [.14, -.2], [.255, -.13], [.301, -.015], [.293, .095], [.254, .172], [.205, .198], [.16, .181], [.144, .15]];
  const curve = new T.CatmullRomCurve3(profile.map(([r, z]) => new T.Vector3(r, z, 0)));
  const points = curve.getPoints(30).map(p => new T.Vector2(Math.max(0, p.x), p.y));
  const geometry = new T.LatheGeometry(points, 40); geometry.rotateX(Math.PI / 2); geometry.scale(1, 1.065, 1);
  const rim = new T.Mesh(geometry, getBossFurMaterial()); rim.castShadow = true; rim.receiveShadow = true; ear.add(rim);
  const bowlPoints = [];
  for (let i = 0; i <= 20; i++) { const r = i / 20; bowlPoints.push(new T.Vector2(r * .145, .085 + .066 * r * r)); }
  const bowlGeometry = new T.LatheGeometry(bowlPoints, 40); bowlGeometry.rotateX(Math.PI / 2); bowlGeometry.scale(1, 1.065, 1);
  const inner = new T.Mesh(bowlGeometry, new T.MeshPhysicalMaterial({ color: "#b88c66", normalMap: plushSurface.getMaps().normal, normalScale: new T.Vector2(.15, .15), roughness: .98, sheen: .18, sheenColor: new T.Color("#c4a37d"), side: T.DoubleSide }));
  inner.name = "recessed-soft-ear-interior"; ear.add(inner);
  // A short alpha skin follows the same curved rim rather than a flat ellipse.
  for (let layer = 0; layer < 2; layer++) {
    const g = geometry.clone(); g.setAttribute("furLayer", new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(layer * .67), 1));
    const shell = new T.Mesh(g, getShellMaterial()); shell.scale.setScalar(1.009 + layer * .012); shell.castShadow = false; ear.add(shell);
  }
  return ear;
}

export function addColleagueFurShell(head) {
  const geometry = new T.SphereGeometry(1, 12, 8), positions = geometry.attributes.position, indices = [];
  const inFace = index => positions.getZ(index) > .48 && Math.abs(positions.getX(index)) < .86 && positions.getY(index) > -.86 && positions.getY(index) < .62;
  for (let i = 0; i < geometry.index.count; i += 3) {
    const triangle = [geometry.index.getX(i), geometry.index.getX(i + 1), geometry.index.getX(i + 2)];
    if (!triangle.some(inFace)) indices.push(...triangle);
  }
  geometry.setIndex(indices); geometry.setAttribute("furLayer", new T.Float32BufferAttribute(new Float32Array(positions.count).fill(.67), 1));
  const shell = new T.Mesh(geometry, getShellMaterial()); shell.position.set(0, 1.58, 0); shell.scale.set(.444, .414, .334);
  shell.castShadow = false; shell.receiveShadow = true; head.add(shell); return shell;
}

function add(parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1]) {
  const object = new T.Mesh(geometry, material);
  object.position.set(...position); object.scale.set(...scale);
  object.castShadow = true; parent.add(object); return object;
}
function scroll(parent, material, points, radius = .021, segments = 18) {
  return add(parent, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), segments, radius, 6, false), material);
}
function rubySocket(parent, gold, ruby, x, y, size) {
  const ring = add(parent, new T.TorusGeometry(size, .018, 5, 20), gold, [x, y, .055]);
  ring.scale.y = 1.08;
  const gem = add(parent, new T.IcosahedronGeometry(1, 1), ruby, [x, y, .063], [size * .87, size * .95, size * .5]);
  gem.rotation.z = .15;
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    add(parent, new T.SphereGeometry(.013, 6, 4), gold, [x + Math.sin(a) * size, y + Math.cos(a) * size * 1.08, .08]);
  }
}

export function addBossCrown(head) {
  if (crownTemplate) {
    const crown = crownTemplate.clone(true);
    head.add(crown);
    return crown;
  }
  const crown = new T.Group(); crown.name = "immutable-ornate-ruby-crown"; crown.scale.set(.95, .85, .95); crown.position.y = .26; head.add(crown);
  const gold = new T.MeshStandardMaterial({ color: "#e8ad32", metalness: .82, roughness: .24 });
  const deepGold = new T.MeshStandardMaterial({ color: "#a96c1b", metalness: .78, roughness: .35 });
  const ruby = new T.MeshPhysicalMaterial({ color: "#a30017", metalness: .05, roughness: .14, clearcoat: 1, clearcoatRoughness: .06 });
  add(crown, new T.CylinderGeometry(.548, .548, .22, 48, 1, true), gold, [0, 2.515, 0], [1, 1, .91]);
  for (const y of [2.4, 2.43, 2.6, 2.63]) {
    const ring = add(crown, new T.TorusGeometry(.548, y === 2.43 || y === 2.6 ? .012 : .023, 5, 48), gold, [0, y, 0], [1, .91, 1]);
    ring.rotation.x = Math.PI / 2;
  }
  // Large cabochons span the broad embossed crown band.
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const socket = new T.Group(); socket.position.set(Math.sin(angle) * .553, 2.515, Math.cos(angle) * .505); socket.rotation.y = angle; crown.add(socket);
    rubySocket(socket, gold, ruby, 0, 0, .065);
    for (const side of [-1, 1]) {
      scroll(socket, deepGold, [[side * .09, -.075, .008], [side * .12, -.04, .012], [side * .09, -.012, .012], [side * .115, .02, .012], [side * .09, .07, .008]], .008, 10);
    }
  }
  // Four broad, pierced fleur-de-lis crests, each with a tall centre teardrop,
  // paired ruby scrolls, and inward-curled acanthus leaves as in the turnaround.
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    const crest = new T.Group(); crest.position.set(Math.sin(angle) * .5, 2.62, Math.cos(angle) * .455); crest.rotation.y = angle; crest.scale.y = i === 0 ? 1.06 : .73; crown.add(crest);
    const shape = new T.Shape();
    shape.moveTo(0, .56); shape.bezierCurveTo(-.06, .49, -.155, .43, -.13, .34);
    shape.bezierCurveTo(-.11, .29, -.065, .27, -.045, .22);
    shape.bezierCurveTo(-.07, .17, -.13, .15, -.125, .07);
    shape.quadraticCurveTo(-.08, .01, 0, 0);
    shape.quadraticCurveTo(.08, .01, .125, .07);
    shape.bezierCurveTo(.13, .15, .07, .17, .045, .22);
    shape.bezierCurveTo(.065, .27, .11, .29, .13, .34);
    shape.bezierCurveTo(.155, .43, .06, .49, 0, .56);
    const hole = new T.Path(); hole.moveTo(0, .495); hole.bezierCurveTo(-.09, .42, -.095, .35, 0, .32); hole.bezierCurveTo(.095, .35, .09, .42, 0, .495); shape.holes.push(hole);
    add(crest, new T.ExtrudeGeometry(shape, { depth: .025, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 1, steps: 1, curveSegments: 8 }), gold);
    rubySocket(crest, gold, ruby, 0, .39, .058);
    rubySocket(crest, gold, ruby, 0, .115, .075);
    for (const side of [-1, 1]) {
      scroll(crest, gold, [[side * .03, .22, .035], [side * .13, .32, .035], [side * .215, .28, .03], [side * .23, .2, .035], [side * .18, .16, .035], [side * .13, .2, .04], [side * .16, .25, .045]], .023);
      rubySocket(crest, gold, ruby, side * .17, .235, .043);
      scroll(crest, gold, [[side * .09, .015, .02], [side * .27, -.005, .025], [side * .32, .07, .03], [side * .285, .145, .035], [side * .23, .14, .04], [side * .23, .095, .045], [side * .26, .095, .045]], .022);
      scroll(crest, deepGold, [[side * .02, .04, .056], [side * .07, .17, .057], [side * .025, .23, .056]], .009, 9);
    }
  }
  let triangles = 0;
  crown.traverse(o => { if (o.isMesh) triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; });
  crown.userData.triangles = triangles;
  return crown;
}
