import * as T from "three";
import { box, cylinder, tube, mesh, bake } from "./shapes.js";

// Original geometry and artwork, deliberately seeded rather than generated
// randomly on every visit. All additions sit on existing furniture or outdoors.
const ink = "#314b48", paper = "#eee5cf";
const leafColors = ["#426d48", "#608b55", "#7c9d61"];

function leafGeometry() {
  const positions = [], uvs = [], indices = [], steps = 7;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, width = Math.pow(Math.sin(t * Math.PI), 0.8) * 0.24;
    for (const side of [-1, 0, 1]) {
      positions.push(side * width, t, Math.sin(t * Math.PI * 0.65) * 0.34 - Math.abs(side) * width * 0.22);
      uvs.push((side + 1) / 2, t);
    }
  }
  for (let i = 0; i < steps; i++) {
    const row = i * 3;
    for (let j = 0; j < 2; j++) {
      const a = row + j, b = a + 1, c = a + 3, d = a + 4;
      indices.push(a, b, c, b, d, c, c, b, a, c, d, b);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  // Shared vertices on two-sided triangles cancel their normals. Give leaves
  // the smooth upper surface normal; both faces remain explicitly modelled.
  const normal = g.getAttribute("normal");
  for (let i = 0; i < normal.count; i++) normal.setXYZ(i, 0, -0.25, 0.9682);
  return g;
}
const leaf = leafGeometry();

/** Run before bake(root): replace the original spherical foliage in place. */
export function prepareFoliage(root) {
  const plants = [];
  root.traverse((parent) => {
    const old = parent.children.filter((o) =>
      o.isMesh && o.geometry.type === "SphereGeometry" &&
      ["76946b", "9aaa7d"].includes(o.material?.color?.getHexString()));
    if (old.length === 6) plants.push({ parent, old });
  });
  plants.forEach(({ parent, old }, plantIndex) => {
    const x = old.reduce((sum, o) => sum + o.position.x, 0) / old.length;
    const z = old.reduce((sum, o) => sum + o.position.z, 0) / old.length;
    const size = old[0].scale.y / 0.47;
    old.forEach((o) => o.removeFromParent());
    for (let i = 0; i < 10; i++) {
      const angle = i * 2.39996 + plantIndex * 0.4;
      const g = new T.Group();
      g.position.set(x, size * (0.62 + i * 0.043), z);
      g.rotation.set(0.38 + (i % 3) * 0.21, angle, (i % 2 ? 1 : -1) * 0.1);
      parent.add(g);
      const length = size * (0.58 + (i % 3) * 0.09);
      mesh(g, leaf, leafColors[i % 3], [0, 0, 0], [size * 1.15, length, length]);
      tube(g, "#9aa46b", [[0, 0, 0], [0, length * 0.45, length * 0.22], [0, length * 0.85, length * 0.31]], 0.006 * size);
    }
  });
  return plants.length;
}

function makeArtwork() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  function tile(index, draw) {
    const x = (index % 2) * 512, y = Math.floor(index / 2) * 512;
    ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.rect(0, 0, 512, 512); ctx.clip();
    draw(ctx); ctx.restore();
  }
  tile(0, (c) => {
    c.fillStyle = paper; c.fillRect(0, 0, 512, 512);
    c.fillStyle = ink; c.font = "700 44px sans-serif"; c.fillText("STAY CURIOUS", 39, 73);
    c.font = "18px sans-serif"; c.fillText("A LITTLE WORLD OF BIG IDEAS", 40, 108);
    c.fillStyle = "#d7ad6b"; c.beginPath(); c.arc(366, 211, 60, 0, Math.PI * 2); c.fill();
    [ ["#a8b89a", 340, 160], ["#729684", 390, 220], ["#476f61", 458, 280] ].forEach(([color, base, peak]) => {
      c.fillStyle = color; c.beginPath(); c.moveTo(-20, base); c.lineTo(130, peak); c.lineTo(250, base - 90); c.lineTo(370, peak + 35); c.lineTo(540, base - 40); c.lineTo(540, 540); c.lineTo(-20, 540); c.fill();
    });
    c.strokeStyle = "#eadfc0"; c.lineWidth = 7; c.beginPath(); c.moveTo(295, 512); c.bezierCurveTo(240, 420, 400, 395, 312, 327); c.stroke();
  });
  tile(1, (c) => {
    c.fillStyle = "#f4f0dd"; c.fillRect(0, 0, 512, 512);
    c.fillStyle = ink; c.font = "italic 700 34px sans-serif"; c.fillText("Small steps. Good work.", 23, 54);
    const cards = [ [32, 100, "IDEA", "#e3c581"], [281, 100, "BUILD", "#a8c1a3"], [156, 305, "SHARE", "#d5a68e"] ];
    c.strokeStyle = "#697b76"; c.lineWidth = 5;
    c.beginPath(); c.moveTo(181, 181); c.bezierCurveTo(235, 158, 240, 158, 278, 181); c.stroke();
    c.beginPath(); c.moveTo(356, 245); c.bezierCurveTo(362, 278, 300, 294, 287, 305); c.stroke();
    c.beginPath(); c.moveTo(176, 356); c.bezierCurveTo(40, 345, 37, 287, 98, 240); c.stroke();
    cards.forEach(([x, y, text, color]) => {
      c.fillStyle = "#c9c3ad"; c.fillRect(x + 4, y + 6, 158, 139);
      c.fillStyle = color; c.fillRect(x, y, 158, 139);
      c.fillStyle = ink; c.font = "italic 700 29px sans-serif"; c.fillText(text, x + 14, y + 39);
      c.lineWidth = 3;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + 15, y + 66 + i * 19); c.lineTo(x + 135 - i * 14, y + 64 + i * 19); c.stroke(); }
    });
  });
  tile(2, (c) => {
    c.fillStyle = "#f5edda"; c.fillRect(0, 0, 512, 512);
    c.fillStyle = ink; c.font = "700 28px sans-serif"; c.fillText("NOTES / TODAY", 43, 58);
    c.strokeStyle = "#a9b5a5"; c.lineWidth = 3;
    for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(43, 96 + i * 42); c.lineTo(456 - (i % 3) * 54, 96 + i * 42); c.stroke(); }
    c.strokeStyle = "#ba735e"; c.lineWidth = 6;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(50, 102 + i * 84); c.lineTo(64, 116 + i * 84); c.lineTo(94, 80 + i * 84); c.stroke(); }
    c.fillStyle = "#dec989"; c.save(); c.translate(337, 338); c.rotate(-0.08); c.fillRect(0, 0, 126, 121); c.fillStyle = ink; c.font = "italic 24px sans-serif"; c.fillText("nice", 21, 45); c.fillText("idea!", 18, 79); c.restore();
  });
  tile(3, (c) => {
    c.fillStyle = "#3a594e"; c.fillRect(0, 0, 512, 512);
    c.strokeStyle = "#d8b279"; c.lineWidth = 3; c.strokeRect(23, 23, 466, 466);
    c.fillStyle = "#efdfbb"; c.font = "700 48px sans-serif"; c.textAlign = "center"; c.fillText("GOOD DAY", 256, 95);
    c.font = "21px sans-serif"; c.fillText("TAKE A LITTLE BREAK", 256, 134);
    c.strokeStyle = "#ead8b0"; c.lineWidth = 17; c.beginPath(); c.ellipse(354, 290, 48, 48, 0, -Math.PI / 2, Math.PI / 2); c.stroke();
    c.fillStyle = "#d0a36d"; c.beginPath(); c.roundRect(125, 235, 223, 136, [0, 0, 55, 55]); c.fill();
    c.fillStyle = "#6c4736"; c.beginPath(); c.ellipse(236, 237, 111, 25, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#c4cbb1"; c.lineWidth = 6;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(193 + i * 42, 205); c.bezierCurveTo(155 + i * 42, 183, 222 + i * 42, 169, 190 + i * 42, 151); c.stroke(); }
    c.fillStyle = "#efdfbb"; c.font = "21px sans-serif"; c.fillText("COFFEE / BOOKS / COMPANY", 256, 434);
  });
  const texture = new T.CanvasTexture(canvas);
  texture.name = "original-office-artwork-atlas";
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new T.MeshStandardMaterial({ map: texture, roughness: 0.93 });
  material.name = "office-paper-artwork";
  const plane = (parent, tile, pos, w, h, rotation = [0, 0, 0]) => {
    const g = new T.PlaneGeometry(w, h), uv = g.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (tile % 2) / 2 + 0.003 + uv.getX(i) * 0.494, 0.5 - Math.floor(tile / 2) / 2 + 0.003 + uv.getY(i) * 0.494);
    const m = mesh(parent, g, material, pos); m.rotation.set(...rotation); m.castShadow = false;
    return m;
  };
  return { plane, texture };
}

function fabric(parent, color, position, width, depth, drape = 0) {
  const g = new T.PlaneGeometry(width, depth, 12, 10);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getY(i), edge = Math.max(0, z / depth + 0.08);
    p.setXYZ(i, x, 0.018 * Math.cos(x * 28) + 0.016 * Math.sin(z * 16) - edge * edge * drape, z);
  }
  g.computeVertexNormals();
  const material = new T.MeshStandardMaterial({ color, roughness: 0.95, side: T.DoubleSide });
  material.name = "woven-draped-textile";
  return mesh(parent, g, material, position);
}

function pillow(parent, pos, color, rotate = 0) {
  const g = new T.SphereGeometry(1, 12, 8);
  const p = mesh(parent, g, color, pos, [0.3, 0.22, 0.14]);
  p.rotation.z = rotate;
  const seam = new T.Group(); parent.add(seam); seam.position.set(...pos); seam.rotation.z = rotate;
  tube(seam, "#d8d1b0", [[-.25, -.12, .08], [-.27, .12, .08], [0, .19, .08], [.27, .12, .08], [.25, -.12, .08], [0, -.19, .08], [-.25, -.12, .08]], .008);
}

/** Call after the main world has been baked. These groups remain quality-cullable. */
export function addSetDressing(root, desks = []) {
  const detail = new T.Group(); detail.name = "close-office-details";
  detail.userData.detailTier = 1;
  root.add(detail);
  const { plane, texture } = makeArtwork();
  const lamp = new T.MeshStandardMaterial({ color: "#fff1d1", emissive: "#ffd999", emissiveIntensity: 2.1, roughness: 0.35 });
  lamp.name = "office-practical-diffusers";
  const darkCable = "#3f4f49";
  desks.forEach((desk, i) => {
    const x = desk.x, z = desk.z - 1.13;
    for (let k = 0; k < 3; k++) {
      const p = box(detail, k === 2 ? "#dfccaa" : "#ede4d2", [x - .62 + k * .012, 1.132 + k * .009, z + .31], [.33, .008, .36]);
      p.rotation.y = -.14 + k * .04;
    }
    plane(detail, 2, [x - .596, 1.156, z + .31], .30, .33, [-Math.PI / 2, 0, -.06]);
    tube(detail, darkCable, [[x-.3,1.28,z-.24],[x-.6,.94,z-.49],[x-.58,.66,z-.48],[x-.87,.63,z-.4]], .009);
    tube(detail, i % 2 ? "#ae916b" : "#70857a", [[x+.36,1.14,z+.36],[x+.42,1.14,z+.38],[x+.49,1.14,z+.38]], .014);
    box(detail, lamp, [x-.91,1.385,z+.17], [.12,.018,.08]);
  });
  // Art is mounted on the existing rear wall and cabinetry, never in an aisle.
  for (const [x, y, z, tile, w, h] of [
    [-4.6, 1.54, -9.865, 1, 2.4, 1.02],
    [4.6, 1.54, -9.865, 0, 2.4, 1.02],
    [-12.04, 1.31, .86, 3, .72, .79],
    [9.9, 1.8, -9.405, 1, 1.12, .69],
  ]) plane(detail, tile, [x, y, z], w, h);
  // Visitor book and pen at reception.
  box(detail, "#5b7168", [-3.45, 1.417, 9.38], [.55,.05,.42]);
  plane(detail, 2, [-3.45,1.445,9.38], .5,.38,[-Math.PI/2,0,0]);
  tube(detail, "#b18b50", [[-3.03,1.42,9.25],[-2.99,1.42,9.52]], .016);
  // Lounge linens have real folds and piped cushion edges.
  fabric(detail, "#a8705b", [-10.23,.85,6.55], 1.02,.9,.72);
  pillow(detail, [-9.9,.96,.17], "#d1b179", -.16);
  pillow(detail, [-8.86,.96,.17], "#b2806a", .2);
  for (let i = 0; i < 4; i++) {
    const book = box(detail, ["#8b9c7d","#b68f6b","#587a71","#d1b57e"][i],[-9.18,.53+i*.047,2.6],[.42,.045,.31]);
    book.rotation.y = -.2 + i*.12;
    box(detail, "#e9ddbd", [-9.18,.535+i*.047,2.755], [.35,.025,.005]);
  }
  cylinder(detail, "#d9c4a1", [-8.73,.527,2.54], [.12,.028,.12]);
  cylinder(detail, "#a86f4e", [-8.73,.6,2.54], [.075,.13,.075]);
  cylinder(detail, "#4f392b", [-8.73,.669,2.54], [.061,.003,.061]);
  // Book spines and shelf dividers make the existing library read at eye level.
  for (let row = 0; row < 3; row++) {
    const y = .35 + row * .55;
    for (let j = 0; j < 6; j++) {
      const z = 4.2+j*.3;
      for (const height of [.08,.28]) box(detail, "#dac59b",[-11.565,y+height,z],[.008,.013,.13]);
      box(detail,"#f2e5c8",[-11.567,y+.2,z],[.008,.12,.048]);
    }
  }
  // Soap, folded towels and a basket rest on existing sanitary surfaces.
  cylinder(detail, "#c19b6d", [-9.64,1,-7.57], [.07,.22,.07]);
  box(detail,"#526e66",[-9.64,1.13,-7.57],[.1,.025,.045]);
  box(detail,"#ded9bf",[-8.61,.93,-7.58],[.25,.065,.28]);
  fabric(detail,"#ded9bf",[-8.61,.97,-7.58],.25,.28,.03);
  for (let i = 0; i < 3; i++) {
    box(detail,"#d7ccb0",[-12.43,1.15,-4.5+i*.03],[.015,.42,.015]);
  }
  // Pool rail diamonds, chalk and the arcade's warm bezel add close-up scale.
  for (let i = 0; i < 7; i++) for (const z of [-4.32,-2.68]) {
    const diamond = box(detail,"#ecd8a4",[8.92+i*.36,1.014,z],[.025,.006,.025]); diamond.rotation.y=Math.PI/4;
  }
  box(detail,"#bbd7cc",[11.29,1.045,-3.9],[.07,.06,.07]);
  fabric(detail,"#d9c8a2",[9.7,.65,7.96],.63,.5,.17);
  cylinder(detail,"#a2bbb1",[7.68,1.35,.2],[.055,.2,.055]);
  cylinder(detail,"#6e897e",[7.68,1.46,.2],[.037,.035,.037]);
  box(detail,lamp,[8.2,1.74,-7.26],[.74,.04,.018]);
  box(detail,lamp,[7.8,1.71,-8.89],[.75,.045,.018]);
  // Thin diffusers on existing suspended fixtures provide true emissive bloom.
  for (const x of [-3.2,3.2]) for (const z of [-2,1.4,4.8])
    box(detail,lamp,[x,3.228,z],[2.35,.014,.13]);
  for (const x of [-6.8,6.8])
    mesh(detail,new T.SphereGeometry(.18,12,8),lamp,[x,2.75,9]);
  bake(detail);
  detail.traverse((o) => { o.userData.detailTier = 1; });

  // A second city layer gives windows believable parallax in free-fly/POV.
  const skyline = new T.Group(); skyline.name = "layered-city-skyline"; root.add(skyline);
  const windows = [], windowGeometry = new T.BoxGeometry(.26,.4,.015);
  const windowMaterial = new T.MeshStandardMaterial({color:"#b4d0cc",metalness:.35,roughness:.22,emissive:"#e2b36f",emissiveIntensity:.1});
  windowMaterial.name = "city-window-glow";
  windowMaterial.userData.dayNightEmitter = true;
  for (let i=0;i<9;i++) {
    const x=-16+i*4, z=-16-(i%3)*1.1, h=3.05+(i*7%5)*.6;
    const color=["#a2b5ad","#b2c1b5","#a6b9b2"][i%3];
    box(skyline,color,[x,h/2-.5,z],[2.65,h,1.9]);
    box(skyline,"#a6b7ac",[x,h-.43,z],[2.82,.16,2.08]);
    box(skyline,"#698882",[x+.6,h-.05,z-.2],[.6,.62,.74]);
    for(let col=0;col<4;col++) {
      const wx=x-.95+col*.63;
      box(skyline,"#668581",[wx,h/2-.5,z+.96],[.045,h-.1,.035]);
      for(let row=0;row<Math.floor((h-.6)/.7);row++) windows.push([wx,.3+row*.7,z+.976]);
    }
    for(let y=.1;y<h-.5;y+=.7) box(skyline,"#95aaa1",[x,y,z+.966],[2.62,.045,.03]);
  }
  bake(skyline);
  const glazing = new T.InstancedMesh(windowGeometry,windowMaterial,windows.length);
  const transform=new T.Object3D();
  windows.forEach((pos,i)=>{transform.position.set(...pos);transform.updateMatrix();glazing.setMatrixAt(i,transform.matrix);});
  glazing.computeBoundingSphere();glazing.castShadow=false;skyline.add(glazing);
  const stats = { artworkAtlasBytes:1024*1024*4*4/3, skylineWindows:windows.length };
  return { detail, skyline, artworkTexture:texture, practicalMaterial:lamp, windowMaterial, stats };
}
