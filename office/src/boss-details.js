import * as T from "three";

// The face keeps the reference's actual ink pixels. Only the source photograph's
// orange light and fur at the crop edge are removed; no facial features are redrawn.
export async function loadBossFace() {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Official boss face could not load"));
    img.src = new URL("../refs/zuozuo_face.png", import.meta.url).href;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 512;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 350, 466, 532, 437, 0, 0, 640, 512);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const beige = [229, 211, 173];
  const ink = [13, 14, 12];
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const peak = Math.max(
        pixels.data[i],
        pixels.data[i + 1],
        pixels.data[i + 2],
      );
      const ellipse = ((x - 320) / 310) ** 2 + ((y - 256) / 248) ** 2;
      // Reference ink is almost black. The spatial mask excludes the dark fur rim.
      const amount =
        ellipse < 0.92 ? 1 - T.MathUtils.smoothstep(peak, 24, 85) : 0;
      for (let channel = 0; channel < 3; channel++)
        pixels.data[i + channel] = Math.round(
          T.MathUtils.lerp(beige[channel], ink[channel], amount),
        );
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.name = "official-zuozuo-flat-ink-face";
  return texture;
}

export function bossFaceMaterial(texture) {
  return new T.MeshBasicMaterial({ map: texture, toneMapped: false });
}

let furMaterial, shellMaterial;
export function getBossFurMaterial() {
  if (furMaterial) return furMaterial;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#795236";
  ctx.fillRect(0, 0, 256, 256);
  let seed = 422;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 6500; i++) {
    const x = random() * 256,
      y = random() * 256;
    const shade = Math.floor(97 + random() * 48);
    ctx.strokeStyle = `rgb(${shade},${Math.floor(shade * 0.68)},${Math.floor(shade * 0.42)})`;
    ctx.lineWidth = 0.65 + random() * 0.65;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + 2,
      y - 1,
      x + (random() - 0.5) * 5,
      y - 3 - random() * 6,
    );
    ctx.stroke();
  }
  const texture = new T.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.colorSpace = T.SRGBColorSpace;
  furMaterial = new T.MeshStandardMaterial({
    map: texture,
    bumpMap: texture,
    bumpScale: 0.025,
    roughness: 1,
  });
  furMaterial.name = "fixed-brown-plush";
  return furMaterial;
}

// One coarse shell per body part, all sharing one alpha-tested material. It is
// optional; the directional fiber texture alone supplies the distant plush look.
export function addBossFurShell(parent, center, scale) {
  if (!shellMaterial) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 128, 128);
    let seed = 813;
    const rand = () =>
      (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 1300; i++) {
      const x = rand() * 128,
        y = rand() * 128;
      ctx.strokeStyle = rand() > 0.5 ? "#916b46" : "#785036";
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 1, y - 2 - rand() * 3);
      ctx.stroke();
    }
    const tex = new T.CanvasTexture(c);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(3, 2);
    tex.colorSpace = T.SRGBColorSpace;
    shellMaterial = new T.MeshStandardMaterial({
      map: tex,
      alphaTest: 0.35,
      roughness: 1,
      side: T.FrontSide,
    });
    shellMaterial.name = "plush-silhouette-shell";
  }
  const shell = new T.Mesh(new T.SphereGeometry(1, 16, 10), shellMaterial);
  shell.position.set(...center);
  shell.scale.set(scale[0] + 0.014, scale[1] + 0.014, scale[2] + 0.014);
  shell.castShadow = false;
  shell.receiveShadow = true;
  shell.userData.bossFurShell = true;
  parent.add(shell);
  return shell;
}

function add(
  parent,
  geometry,
  material,
  position = [0, 0, 0],
  scale = [1, 1, 1],
) {
  const object = new T.Mesh(geometry, material);
  object.position.set(...position);
  object.scale.set(...scale);
  object.castShadow = true;
  parent.add(object);
  return object;
}

function scroll(parent, gold, points, radius = 0.022) {
  return add(
    parent,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
      7,
      radius,
      4,
      false,
    ),
    gold,
  );
}

// The front crest is a broad pierced fleur, with rounded side curls and a ruby
// cabochon; the crown silhouette is formed by gold plates rather than wire spikes.
export function addBossCrown(head) {
  const crown = new T.Group();
  crown.name = "immutable-ornate-ruby-crown";
  head.add(crown);
  const gold = new T.MeshStandardMaterial({
    color: "#d8ad44",
    metalness: 0.3,
    roughness: 0.3,
  });
  const ruby = new T.MeshStandardMaterial({
    color: "#a00e24",
    metalness: 0.05,
    roughness: 0.24,
    flatShading: true,
  });
  const deepGold = new T.MeshStandardMaterial({
    color: "#ac792b",
    metalness: 0.22,
    roughness: 0.45,
  });
  add(
    crown,
    new T.CylinderGeometry(0.545, 0.545, 0.2, 28, 1, true),
    gold,
    [0, 2.51, 0],
    [1, 1, 0.9],
  );
  for (const y of [2.405, 2.605]) {
    const ring = add(
      crown,
      new T.TorusGeometry(0.545, 0.032, 3, 28),
      gold,
      [0, y, 0],
      [1, 0.9, 1],
    );
    ring.rotation.x = Math.PI / 2;
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const socket = new T.Group();
    socket.position.set(Math.sin(a) * 0.55, 2.51, Math.cos(a) * 0.495);
    socket.rotation.y = a;
    crown.add(socket);
    const bezel = add(
      socket,
      new T.TorusGeometry(0.072, 0.018, 3, 12),
      deepGold,
    );
    bezel.scale.y = 1.08;
    add(
      socket,
      new T.IcosahedronGeometry(1, 0),
      ruby,
      [0, 0, 0.009],
      [0.059, 0.064, 0.035],
    );
  }
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const crest = new T.Group();
    crest.position.set(Math.sin(a) * 0.5, 2.6, Math.cos(a) * 0.45);
    crest.rotation.y = a;
    const isFront = i === 0;
    const height = isFront ? 0.56 : 0.38;
    crown.add(crest);
    const shape = new T.Shape();
    shape.moveTo(-0.16, 0);
    shape.bezierCurveTo(
      -0.23,
      0.12,
      -0.18,
      height * 0.58,
      -0.09,
      height * 0.77,
    );
    shape.quadraticCurveTo(-0.035, height * 0.9, 0, height);
    shape.quadraticCurveTo(0.035, height * 0.9, 0.09, height * 0.77);
    shape.bezierCurveTo(0.18, height * 0.58, 0.23, 0.12, 0.16, 0);
    shape.quadraticCurveTo(0, -0.025, -0.16, 0);
    const hole = new T.Path();
    hole.moveTo(0, height * 0.75);
    hole.bezierCurveTo(
      -0.055,
      height * 0.57,
      -0.08,
      height * 0.3,
      0,
      height * 0.27,
    );
    hole.bezierCurveTo(
      0.08,
      height * 0.3,
      0.055,
      height * 0.57,
      0,
      height * 0.75,
    );
    shape.holes.push(hole);
    add(
      crest,
      new T.ExtrudeGeometry(shape, {
        depth: 0.035,
        bevelEnabled: false,
        curveSegments: 4,
      }),
      gold,
    );
    const bezel = add(
      crest,
      new T.TorusGeometry(isFront ? 0.085 : 0.065, 0.025, 3, 12),
      gold,
      [0, height * 0.48, 0.045],
    );
    bezel.scale.y = 1.1;
    add(
      crest,
      new T.IcosahedronGeometry(1, 0),
      ruby,
      [0, height * 0.48, 0.052],
      [isFront ? 0.071 : 0.051, isFront ? 0.08 : 0.061, 0.037],
    );
    for (const side of [-1, 1]) {
      scroll(
        crest,
        gold,
        [
          [side * 0.11, 0.015, 0.015],
          [side * 0.24, 0.065, 0.025],
          [side * 0.26, 0.19, 0.035],
          [side * 0.2, 0.24, 0.045],
          [side * 0.165, 0.195, 0.05],
          [side * 0.19, 0.16, 0.055],
        ],
        0.025,
      );
      scroll(
        crest,
        deepGold,
        [
          [side * 0.1, 0.025, 0.055],
          [side * 0.155, 0.085, 0.06],
          [side * 0.13, 0.145, 0.06],
        ],
        0.011,
      );
    }
  }
  let triangles = 0;
  crown.traverse((o) => {
    if (o.isMesh)
      triangles +=
        (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
  });
  crown.userData.triangles = triangles;
  return crown;
}
