import * as T from "three";

let crownTemplate = null;
export function setBossCrownTemplate(template) { crownTemplate = template; }

// The official PNG is sampled directly. UVs select the original skin silhouette;
// neither the colour nor a single ink pixel is repainted or thresholded.
export async function loadBossFace() {
  const texture = await new T.TextureLoader().loadAsync(
    new URL("../refs/zuozuo_face.png", import.meta.url).href,
  );
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.name = "official-zuozuo-flat-ink-face";
  texture.userData.officialSource = "refs/zuozuo_face.png";
  return texture;
}

export function bossFaceMaterial(texture) {
  const material = new T.MeshBasicMaterial({ map: texture, toneMapped: false, fog: false });
  material.name = "official-face-unlit-unmodified";
  return material;
}

export function bossFaceGeometry(texture) {
  // Pixel-space contour follows the reference's broad cheeks and rounded chin.
  // This retains more of the eyebrows and cheek slashes than an ellipse crop.
  const outline = new T.Shape();
  outline.moveTo(562, 473);
  outline.bezierCurveTo(619, 465, 697, 473, 747, 490);
  outline.bezierCurveTo(826, 516, 860, 579, 875, 654);
  outline.bezierCurveTo(896, 762, 839, 844, 774, 877);
  outline.bezierCurveTo(692, 912, 572, 898, 497, 871);
  outline.bezierCurveTo(409, 842, 358, 779, 357, 693);
  outline.bezierCurveTo(352, 605, 389, 527, 470, 491);
  outline.bezierCurveTo(503, 478, 534, 474, 562, 473);
  const geometry = new T.ShapeGeometry(outline, 14);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i);
    uv.setXY(i, x / texture.image.width, 1 - y / texture.image.height);
    position.setXYZ(i, (x - 616) / 505, (687 - y) / 505, 0);
  }
  // The original contour uses image coordinates, so reversing Y reverses winding.
  const indices = geometry.index;
  for (let i = 0; i < indices.count; i += 3) {
    const a = indices.getX(i + 1);
    indices.setX(i + 1, indices.getX(i + 2));
    indices.setX(i + 2, a);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

let furMaterial, shellMaterial, finMaterial;
function seeded(seed) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
}
function canvasTexture(canvas, repeats = 1) {
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(repeats, repeats);
  texture.anisotropy = 4;
  return texture;
}
export function getBossFurMaterial() {
  if (furMaterial) return furMaterial;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#58351e";
  ctx.fillRect(0, 0, 512, 512);
  const random = seeded(422);
  for (let i = 0; i < 28000; i++) {
    const x = random() * 512, y = random() * 512;
    const shade = 78 + random() * 54;
    ctx.strokeStyle = `rgb(${shade},${shade * .61},${shade * .31})`;
    ctx.lineWidth = .55 + random() * .65;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 3, y - 2, x - 3, y - 5, x + (random() - .5) * 8, y - 7 - random() * 8);
    ctx.stroke();
  }
  const texture = canvasTexture(canvas, 3);
  texture.name = "original-procedural-brown-plush-albedo";
  furMaterial = new T.MeshPhysicalMaterial({
    map: texture, bumpMap: texture, bumpScale: .018,
    roughness: 1, sheen: .26, sheenColor: new T.Color("#c7985e"), sheenRoughness: 1,
  });
  furMaterial.name = "fixed-brown-plush";
  return furMaterial;
}

function getShellMaterial() {
  if (shellMaterial) return shellMaterial;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d"), random = seeded(813);
  for (let i = 0; i < 7600; i++) {
    const x = random() * 256, y = random() * 256;
    const shade = 80 + random() * 53;
    ctx.strokeStyle = `rgba(${shade},${shade * .62},${shade * .33},${.35 + random() * .65})`;
    ctx.lineWidth = .4 + random() * .8;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 2, y - 2, x + (random() - .5) * 5, y - 3 - random() * 5);
    ctx.stroke();
  }
  const texture = canvasTexture(canvas, 5);
  texture.name = "original-procedural-fur-shell-alpha";
  shellMaterial = new T.MeshPhysicalMaterial({
    map: texture, alphaTest: .3, roughness: 1, sheen: .3,
    sheenColor: new T.Color("#d1a367"), sheenRoughness: 1,
  });
  shellMaterial.name = "plush-silhouette-shell";
  const maxFurLayer = { value: 1 };
  shellMaterial.userData.furQuality = { maxLayer: maxFurLayer };
  shellMaterial.userData.setFurQuality = preset => {
    maxFurLayer.value = { low: .34, medium: .67, high: 1, ultra: 1 }[String(preset).toLowerCase()] ?? 1;
  };
  shellMaterial.onBeforeCompile = shader => {
    shader.uniforms.maxFurLayer = maxFurLayer;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nattribute float furLayer; varying float vFurLayer;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvFurLayer = furLayer;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vFurLayer; uniform float maxFurLayer;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <alphatest_fragment>", "if(vFurLayer > maxFurLayer || diffuseColor.a < .18 + vFurLayer * .66) discard; diffuseColor.a = 1.0;");
  };
  shellMaterial.customProgramCacheKey = () => "zuozuo-layered-fur-v3";
  return shellMaterial;
}

// Shell layers share a single material and bake into one draw per articulated part.
// Short crossed cards give the silhouette a soft halo even in a grazing close-up.
export function addBossFurShell(parent, center, scale, layers = 4) {
  const group = new T.Group();
  group.name = "permanent-plush-shells-and-fins";
  parent.add(group);
  const isHead = center[1] > 1.8 && scale[0] > .6;
  for (let layer = 0; layer < layers; layer++) {
    const geometry = new T.SphereGeometry(1, 20, 12);
    if (isHead) {
      const positions = geometry.attributes.position, indices = [];
      const inFace = index => positions.getZ(index) > .5 && Math.abs(positions.getX(index)) < .83 && positions.getY(index) > -.82 && positions.getY(index) < .7;
      for (let i = 0; i < geometry.index.count; i += 3) {
        const triangle = [geometry.index.getX(i), geometry.index.getX(i + 1), geometry.index.getX(i + 2)];
        if (!triangle.some(inFace)) indices.push(...triangle);
      }
      geometry.setIndex(indices);
    }
    geometry.setAttribute("furLayer", new T.Float32BufferAttribute(
      new Float32Array(geometry.attributes.position.count).fill(layer / Math.max(1, layers - 1)), 1,
    ));
    const shell = new T.Mesh(geometry, getShellMaterial());
    shell.position.set(...center);
    shell.scale.set(...scale.map(value => value + .009 + layer * .009));
    shell.castShadow = false;
    shell.receiveShadow = true;
    shell.userData.bossFurShell = true;
    group.add(shell);
  }
  if (!finMaterial) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const ctx = c.getContext("2d"), random = seeded(190);
    for (let i = 0; i < 100; i++) {
      const x = 12 + random() * 104;
      ctx.strokeStyle = `rgba(${90 + random() * 30},${52 + random() * 20},29,${.4 + random() * .6})`;
      ctx.lineWidth = .7 + random() * .65;
      ctx.beginPath(); ctx.moveTo(x, 128);
      ctx.bezierCurveTo(x + 5, 90, x - 7, 40, x + (random() - .5) * 20, 5 + random() * 50);
      ctx.stroke();
    }
    finMaterial = new T.MeshStandardMaterial({ map: canvasTexture(c), alphaTest: .3, side: T.DoubleSide, roughness: 1 });
    finMaterial.name = "plush-fiber-fins";
  }
  const random = seeded(Math.round(scale[0] * 1000) + 73);
  const count = scale[0] > .4 ? 180 : 45;
  for (let i = 0; i < count; i++) {
    const y = 1 - (i + .5) * 2 / count;
    const radius = Math.sqrt(1 - y * y), angle = i * 2.399963;
    const normal = new T.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    if (isHead && normal.z > .5 && Math.abs(normal.x) < .83 && y > -.82 && y < .7) continue;
    const fin = new T.Mesh(new T.PlaneGeometry(.017 + random() * .01, .03 + random() * .025), finMaterial);
    const offset = new T.Vector3(normal.x * scale[0], normal.y * scale[1], normal.z * scale[2]);
    fin.position.set(...center).add(offset).addScaledVector(normal, .02);
    // Plane Y runs out from the surface; local Z is a tangent facing sideways.
    const tangent = new T.Vector3().crossVectors(normal, new T.Vector3(.1, 1, .2)).normalize();
    const bitangent = new T.Vector3().crossVectors(tangent, normal).normalize();
    fin.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(tangent, normal, bitangent));
    fin.castShadow = false; group.add(fin);
  }
  return group;
}

// A single inexpensive shell keeps every colleague tactile without multiplying
// layers across the 14 smaller actors. The face aperture remains unobstructed.
export function addColleagueFurShell(head) {
  const geometry = new T.SphereGeometry(1, 12, 8);
  const positions = geometry.attributes.position, indices = [];
  const inFace = index => positions.getZ(index) > .48 && Math.abs(positions.getX(index)) < .86 && positions.getY(index) > -.86 && positions.getY(index) < .62;
  for (let i = 0; i < geometry.index.count; i += 3) {
    const triangle = [geometry.index.getX(i), geometry.index.getX(i + 1), geometry.index.getX(i + 2)];
    if (!triangle.some(inFace)) indices.push(...triangle);
  }
  geometry.setIndex(indices);
  geometry.setAttribute("furLayer", new T.Float32BufferAttribute(new Float32Array(positions.count).fill(.67), 1));
  const shell = new T.Mesh(geometry, getShellMaterial());
  shell.position.set(0, 1.58, 0); shell.scale.set(.444, .414, .334);
  shell.castShadow = false; shell.receiveShadow = true;
  head.add(shell);
  return shell;
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
  const crown = new T.Group(); crown.name = "immutable-ornate-ruby-crown"; head.add(crown);
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
    const crest = new T.Group(); crest.position.set(Math.sin(angle) * .5, 2.62, Math.cos(angle) * .455); crest.rotation.y = angle; crown.add(crest);
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
