import * as T from "three";
import { box, ball, cylinder, label, tube, bake } from "./shapes.js";
import { dressOffice } from "./architecture.js";
import { addDeskDetails } from "./desk-details.js";
import { prepareFoliage, addSetDressing } from "./set-dressing.js";
export function buildWorld(scene, people) {
  const root = new T.Group();
  scene.add(root);
  const obstacles = [],
    desks = [];
  const solid = (x, z, w, d) => obstacles.push({ x, z, w, d });
  box(root, "#d1c5ad", [0, -0.48, 0], [27, 0.7, 22]);
  box(root, "#faf4df", [0, -0.08, 0], [26.6, 0.15, 21.6]);
  for (let x = -12; x <= 12; x += 2)
    box(root, "#eae2ce", [x, 0.005, 0], [0.025, 0.01, 21]);
  for (let z = -10; z <= 10; z += 2)
    box(root, "#eae2ce", [0, 0.006, z], [26, 0.01, 0.025]);
  // A low rear shell keeps the dollhouse legible from every angle.
  box(root, "#e5ddc9", [0, 1.25, -10.5], [26.7, 2.6, 0.25]);
  box(root, "#c4cdb5", [0, 2.56, -10.5], [26.8, 0.08, 0.35]);
  for (let x = -11; x <= 11; x += 4) {
    box(root, "#a5bdba", [x, 1.65, -10.33], [2.8, 1.15, 0.06]);
    box(root, "#f4eedc", [x, 1.65, -10.27], [0.06, 1.18, 0.08]);
  }
  function rug(x, z, w, d, c) {
    box(root, c, [x, 0.022, z], [w, 0.035, d]);
  }
  function plant(x, z, big = false) {
    const s = big ? 1 : 0.65;
    const planting = new T.Group();
    planting.position.y = Math.abs(x) < 3.35 && z < -6.35 ? 0.82 : 0;
    root.add(planting);
    cylinder(
      planting,
      "#d4a282",
      [x, 0.3 * s, z],
      [0.35 * s, 0.6 * s, 0.35 * s],
    );
    cylinder(
      planting,
      "#866c4e",
      [x, 0.63 * s, z],
      [0.04 * s, 0.6 * s, 0.04 * s],
    );
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const leaf = ball(
        planting,
        i % 2 ? "#76946b" : "#9aaa7d",
        [
          x + Math.cos(a) * 0.25 * s,
          1 * s + i * 0.055,
          z + Math.sin(a) * 0.25 * s,
        ],
        [0.22 * s, 0.47 * s, 0.13 * s],
      );
      leaf.rotation.z = Math.cos(a) * 0.5;
    }
  }
  function room(text, x, z, w, d, c) {
    rug(x, z, w, d, c);
    const sign = label(
      root,
      text,
      [x, 0.07, z + d / 2 - 0.35],
      w * 0.65,
      0.45,
      "#eee9da",
      "#526555",
    );
    sign.rotation.x = -Math.PI / 2;
  }
  room("MAKE SOMETHING GOOD", 0, 2, 12.5, 13, "#e8ebdb");
  room("SLOW LIVING", -9.7, 4, 5.6, 9, "#dfd6ba");
  room("PLAY CLUB", 9.7, -4.9, 5.6, 8, "#d8dfc9");
  room("MOVE & RESET", 9.7, 4.7, 5.6, 8, "#d6dfdb");
  room("FRESHEN UP", -9.7, -5.4, 5.6, 7.5, "#c9dddd");
  const chairs = [];
  function chair(x, z, color = "#7d9480", large = false) {
    const g = new T.Group();
    g.position.set(x, large ? 0.82 : 0, z);
    scene.add(g);
    const sc = large ? 1.7 : 1;
    box(g, color, [0, 0.59, 0], [0.76 * sc, 0.17, 0.7 * sc]);
    box(
      g,
      color,
      [0, large ? 1.4 : 1.04, large ? -0.46 : 0.36],
      [0.78 * sc, large ? 1.65 : 0.8, 0.15],
    );
    cylinder(g, "#67766c", [0, 0.28, 0], [0.055, 0.48, 0.055]);
    for (const side of [-1, 1]) {
      box(g, "#5d7065", [side * 0.43 * sc, 0.85, 0], [0.08, 0.08, 0.65 * sc]);
      box(g, "#5d7065", [side * 0.43 * sc, 0.7, 0.18], [0.05, 0.3, 0.05]);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const leg = box(
        g,
        "#66776d",
        [Math.sin(a) * 0.19, 0.12, Math.cos(a) * 0.19],
        [0.055, 0.05, 0.43],
      );
      leg.rotation.y = a;
      ball(
        g,
        "#46574f",
        [Math.sin(a) * 0.4, 0.08, Math.cos(a) * 0.4],
        [0.08, 0.08, 0.08],
      );
    }
    bake(g);
    chairs.push(g);
    return g;
  }
  function monitor(x, z, accent) {
    box(root, "#43554e", [x, 1.52, z], [0.7, 0.5, 0.065]);
    box(root, "#c6d8ca", [x, 1.53, z + 0.04], [0.61, 0.4, 0.01]);
    box(root, "#53665b", [x, 1.2, z], [0.05, 0.3, 0.05]);
    box(root, "#53665b", [x, 1.1, z], [0.35, 0.03, 0.22]);
  }
  function desk(person, x, z) {
    box(root, "#dfc8a3", [x, 1.02, z], [2.5, 0.15, 1.15]);
    box(root, "#f2dfb9", [x, 1.11, z], [2.4, 0.025, 1.05]);
    for (const dx of [-1.03, 1.03])
      for (const dz of [-0.4, 0.4])
        box(root, "#f6eed9", [x + dx, 0.49, z + dz], [0.09, 0.95, 0.09]);
    solid(x, z, 2.5, 1.15);
    const seat = chair(x, z + 1.13, person.color);
    monitor(x - 0.3, z - 0.2, person.color);
    if (["market", "zuno"].includes(person.id))
      monitor(x + 0.5, z - 0.2, person.color);
    box(root, "#eae9dc", [x, 1.15, z + 0.29], [0.7, 0.04, 0.22]);
    for (let k = 0; k < 6; k++)
      box(
        root,
        "#a7b4a6",
        [x - 0.27 + k * 0.1, 1.174, z + 0.29],
        [0.035, 0.005, 0.15],
      );
    cylinder(
      root,
      person.color,
      [x + 0.92, 1.24, z + 0.12],
      [0.09, 0.23, 0.09],
    );
    label(
      root,
      person.name,
      [x, 1.15, z + 0.6],
      1.1,
      0.21,
      "#f5efdf",
      "#4b6152",
    );
    addDeskDetails(root, person, x, z);
    desks.push({
      x,
      z: z + 1.13,
      angle: Math.PI,
      chair: seat,
      chairZ: z + 1.13,
    });
  }
  people.forEach((p, i) => {
    const x = i === 12 ? 4.7 : [-4.2, 0, 4.2][i % 3];
    const z = i === 12 ? -6.6 : -3.2 + Math.floor(i / 3) * 3.1;
    desk(p, x, z);
  });
  // The boss's larger head seat anchors the entire office.
  const bossZone = new T.Group();
  bossZone.position.y = 0.82;
  root.add(bossZone);
  box(bossZone, "#af8664", [0, 1.05, -7.5], [4.2, 0.22, 1.4]);
  solid(0, -7.5, 4.2, 1.4);
  for (const x of [-1.7, 1.7])
    box(bossZone, "#c9ab7d", [x, 0.5, -7.5], [0.4, 1, 0.85]);
  chair(0, -8.65, "#3c322e", true);
  label(bossZone, "左左 · THE BOSS", [0, 1.14, -6.77], 1.9, 0.29);
  box(bossZone, "#f1e9cf", [1.35, 1.2, -7.4], [0.6, 0.08, 0.4]);
  plant(-2.7, -8.5);
  plant(2.7, -8.5);
  label(bossZone, "ZUO OFFICE", [0, 2.1, -10.3], 4, 0.65, "#e5ddc9", "#52634b");
  box(bossZone, "#4b5e52", [1.55, 1.38, -7.65], [1.05, 0.48, 0.08]);
  label(
    bossZone,
    "PLAY / PAUSE",
    [1.55, 1.38, -7.7],
    0.95,
    0.38,
    "#253f39",
    "#dfd4a5",
  ).rotation.y = Math.PI;
  box(bossZone, "#4b5e52", [1.55, 1.19, -7.65], [0.08, 0.13, 0.08]);
  box(bossZone, "#495c51", [1.7, 1.22, -7.5], [0.28, 0.24, 0.5]);
  cylinder(bossZone, "#7c8a73", [-1.4, 1.2, -7.3], [0.19, 0.05, 0.19]);
  const cig = cylinder(
    bossZone,
    "#eadbb8",
    [-1.4, 1.25, -7.3],
    [0.02, 0.3, 0.02],
  );
  cig.rotation.z = 1.4;
  box(bossZone, "#e5ddc0", [-0.75, 1.19, -7.4], [0.6, 0.04, 0.5]);
  for (const y of [0.8, 1.4])
    box(root, "#a58b64", [3.5, y, -9.9], [2, 0.1, 0.5]);
  for (const x of [2.9, 3.5, 4.1]) {
    cylinder(root, "#d6b566", [x, 1.65, -9.9], [0.13, 0.35, 0.13]);
    ball(root, "#e3c475", [x, 1.85, -9.9], [0.21, 0.13, 0.13]);
    box(root, "#695e46", [x, 1.49, -9.9], [0.32, 0.07, 0.27]);
  }
  function sofa(x, z, rot = 0) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    root.add(g);
    box(g, "#a2af86", [0, 0.47, 0], [2, 0.4, 0.8]);
    box(g, "#91a078", [0, 0.85, -0.36], [2, 1, 0.18]);
    for (const sx of [-0.9, 0.9])
      box(g, "#91a078", [sx, 0.7, 0], [0.22, 0.6, 0.85]);
    for (const sx of [-0.45, 0.45])
      box(g, "#c3c9a4", [sx, 0.71, 0.02], [0.8, 0.13, 0.65]);
    solid(x, z, rot ? 1 : 2, rot ? 2 : 1);
  }
  sofa(-11, 2.3, Math.PI / 2);
  sofa(-9.5, 0.4);
  cylinder(root, "#c09a70", [-9.1, 0.45, 2.6], [0.7, 0.1, 0.7]);
  cylinder(root, "#756f52", [-9.1, 0.22, 2.6], [0.09, 0.45, 0.09]);
  solid(-9.1, 2.6, 1.3, 1.3);
  box(root, "#a4b49c", [-10.6, 0.6, 6.5], [2.9, 0.2, 0.85]);
  box(root, "#e7d6ac", [-11.6, 0.8, 6.5], [0.6, 0.22, 0.65]);
  solid(-10.6, 6.5, 2.9, 0.85);
  // Open snack cabinet with colorful little packets.
  box(root, "#c6a77d", [-7.6, 0.9, 0.4], [1.05, 1.8, 0.45]);
  for (const y of [0.3, 0.85, 1.4]) {
    box(root, "#f0deba", [-7.6, y, 0.68], [1.05, 0.06, 0.55]);
    for (let i = 0; i < 4; i++)
      box(
        root,
        ["#a1b581", "#d4a473", "#c98870", "#d5c383"][i],
        [-8 + i * 0.26, y + 0.18, 0.65],
        [0.16, 0.3, 0.16],
      );
  }
  solid(-7.6, 0.4, 1.05, 0.8);
  // Restroom: sink, toilet, frosted shower and shower head.
  box(root, "#f7f3e4", [-9.1, 0.8, -7.6], [1.4, 0.2, 0.75]);
  ball(root, "#b4d0cd", [-9.1, 0.91, -7.6], [0.42, 0.045, 0.25]);
  tube(
    root,
    "#8b9f9a",
    [
      [-9.1, 0.95, -7.85],
      [-9.1, 1.25, -7.85],
      [-9.1, 1.28, -7.6],
    ],
    0.035,
  );
  box(root, "#92ada8", [-9.1, 1.7, -8], [1.1, 0.8, 0.05]);
  solid(-9.1, -7.6, 1.4, 0.8);
  cylinder(root, "#f8f5e9", [-7.7, 0.38, -4.6], [0.36, 0.65, 0.44]);
  ball(root, "#e1ece4", [-7.7, 0.7, -4.6], [0.41, 0.09, 0.46]);
  box(root, "#f6f2df", [-7.7, 1, -4.97], [0.68, 0.8, 0.2]);
  solid(-7.7, -4.6, 0.8, 1);
  box(root, "#eef2df", [-11.2, 0.12, -7], [1.5, 0.2, 2]);
  for (const x of [-12, -10.4]) {
    box(root, "#8caeaa", [x, 1.1, -7], [0.06, 2, 2]);
    solid(x, -7, 0.06, 2);
  }
  box(root, "#a9c6be", [-11.2, 1.1, -8], [1.6, 2, 0.05]);
  tube(
    root,
    "#899d96",
    [
      [-11.8, 0.2, -7.7],
      [-11.8, 2.15, -7.7],
      [-11.2, 2.15, -7.7],
    ],
    0.03,
  );
  cylinder(root, "#6d8e88", [-11.2, 2.1, -7.7], [0.2, 0.06, 0.2]);
  // Arcade cabinet, pool table, dart board.
  const arcade = new T.Group();
  root.add(arcade);
  arcade.position.set(8.2, 0, -7.7);
  box(arcade, "#c3926d", [0, 0.85, 0], [1, 1.7, 0.8]);
  box(arcade, "#435952", [0, 1.4, 0.42], [0.82, 0.63, 0.04]);
  label(arcade, "PLAY", [0, 1.5, 0.45], 0.65, 0.2, "#435952", "#cde4a9");
  box(arcade, "#dec6a4", [0, 1.1, 0.52], [0.95, 0.12, 0.4]);
  cylinder(arcade, "#d67558", [-0.25, 1.25, 0.55], [0.06, 0.2, 0.06]);
  ball(arcade, "#e2ac57", [0.21, 1.2, 0.6], [0.07, 0.04, 0.07]);
  solid(8.2, -7.7, 1, 1);
  box(root, "#9b785b", [10, 0.85, -3.5], [2.9, 0.3, 1.7]);
  box(root, "#6d9c8a", [10, 1.02, -3.5], [2.65, 0.07, 1.45]);
  for (const x of [8.7, 11.3])
    for (const z of [-4.15, -2.85]) {
      cylinder(root, "#3d5248", [x, 1.07, z], [0.09, 0.015, 0.09]);
      box(root, "#a78c69", [x, 0.4, z], [0.12, 0.8, 0.12]);
    }
  for (let i = 0; i < 5; i++)
    ball(
      root,
      ["#eee2ad", "#d6a361", "#bc725a", "#a2c9ac", "#e8e8d9"][i],
      [9.6 + i * 0.18, 1.12, -3.4 + (i % 2) * 0.17],
      [0.07, 0.07, 0.07],
    );
  solid(10, -3.5, 2.9, 1.7);
  const dart = cylinder(root, "#596f59", [11.3, 1.6, -9.5], [0.55, 0.08, 0.55]);
  dart.rotation.x = Math.PI / 2;
  // Each inset disk has its own front plane; coplanar caps flicker in POV.
  for (const [layer, [r, c]] of [
    [0.4, "#d0b98c"],
    [0.24, "#77997f"],
    [0.09, "#ba785c"],
  ].entries()) {
    const d = cylinder(root, c, [11.3, 1.6, -9.44 + layer * 0.008], [r, 0.02, r]);
    d.rotation.x = Math.PI / 2;
  }
  // Gym treadmill and free weights.
  box(root, "#8c9e94", [8.4, 0.2, 3.5], [1.4, 0.25, 2.4]);
  box(root, "#3f514b", [8.4, 0.34, 3.5], [1, 0.04, 1.9]);
  for (const x of [7.85, 8.95])
    tube(
      root,
      "#788b83",
      [
        [x, 0.3, 2.5],
        [x, 1.4, 2.5],
        [x, 1.4, 3.2],
      ],
      0.05,
    );
  box(root, "#c6d6bf", [8.4, 1.4, 2.5], [1.2, 0.35, 0.12]);
  solid(8.4, 2.5, 1.5, 0.4);
  box(root, "#aaae91", [11.7, 0.8, 3.5], [0.6, 0.15, 2.2]);
  for (let j = 0; j < 3; j++) {
    tube(
      root,
      "#6b7f74",
      [
        [11.3, 0.95, 2.8 + j * 0.65],
        [12.1, 0.95, 2.8 + j * 0.65],
      ],
      0.04,
    );
    for (const x of [11.35, 12.05])
      ball(root, "#52655b", [x, 0.95, 2.8 + j * 0.65], [0.12, 0.17, 0.17]);
  }
  solid(11.7, 3.5, 1, 2.2);
  for (const [x, z] of [
    [-12, 9],
    [12, 9],
    [-12, -9],
    [12, -9],
    [-6, 9],
    [6, 9],
    [-5, -7],
    [5, -7],
  ])
    plant(x, z, true);
  // Street-like lamps and a welcoming entrance step.
  for (const x of [-6.8, 6.8]) {
    cylinder(root, "#879784", [x, 1.35, 9], [0.04, 2.7, 0.04]);
    ball(root, "#fff1c2", [x, 2.75, 9], [0.22, 0.25, 0.22]);
  }
  box(root, "#e0d0ad", [0, -0.35, 11.1], [5, 0.25, 0.8]);
  label(
    root,
    "GOOD COMPANY, EVERY DAY",
    [0, 0.08, 9.6],
    5,
    0.4,
    "#faf4df",
    "#8d9980",
  ).rotation.x = -Math.PI / 2;
  const { showerDoor } = dressOffice(root, solid);
  showerDoor.removeFromParent();
  scene.add(showerDoor);
  prepareFoliage(root);
  bake(root);
  const dressing = addSetDressing(root, desks);
  return { root, obstacles, desks, chairs, showerDoor, dressing };
}
