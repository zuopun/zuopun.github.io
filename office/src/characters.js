import * as T from "three";
import {
  mesh,
  box,
  ball,
  cylinder,
  tube,
  mat,
  bake,
  sprite,
} from "./shapes.js";
import { addCharacterDetails } from "./character-details.js";
import {
  loadBossFace,
  bossFaceMaterial,
  getBossFurMaterial,
  addBossFurShell,
  addBossCrown,
} from "./boss-details.js";
const brown = "#835736",
  cream = "#dfbb89",
  ink = "#3e382d";
export async function loadFace() {
  return loadBossFace();
}
export function createCharacter(person, face) {
  const boss = person.id === "zuozuo",
    manager = person.id === "dd";
  const root = new T.Group(),
    body = new T.Group(),
    fixed = new T.Group();
  root.add(body);
  body.add(fixed);
  const furMat = boss ? getBossFurMaterial() : brown;
  const color = boss ? furMat : person.color;
  ball(
    fixed,
    color,
    [0, 0.8, 0],
    [boss ? 0.53 : 0.32, boss ? 0.64 : 0.42, boss ? 0.38 : 0.24],
  );
  if (!boss) ball(fixed, "#f2dfb5", [0, 0.86, 0.21], [0.19, 0.24, 0.05]);
  const head = new T.Group();
  fixed.add(head);
  mesh(
    head,
    new T.SphereGeometry(1, boss ? 24 : 12, boss ? 16 : 8),
    furMat,
    [0, boss ? 1.9 : 1.58, 0],
    boss ? [0.7, 0.63, 0.48] : [0.43, 0.4, 0.32],
  );
  for (const sign of [-1, 1]) {
    ball(
      head,
      furMat,
      [sign * (boss ? 0.74 : 0.46), boss ? 1.9 : 1.58, 0],
      boss ? [0.29, 0.32, 0.2] : [0.19, 0.21, 0.12],
    );
    ball(
      head,
      cream,
      [sign * (boss ? 0.76 : 0.48), boss ? 1.9 : 1.58, boss ? 0.16 : 0.1],
      boss ? [0.19, 0.22, 0.05] : [0.12, 0.14, 0.035],
    );
  }
  if (boss) {
    const faceMesh = mesh(
      head,
      new T.CircleGeometry(1, 48),
      bossFaceMaterial(face),
      [0, 1.86, 0.495],
      [0.52, 0.43, 1],
    );
    faceMesh.castShadow = false;
    addBossFurShell(fixed, [0, 0.8, 0], [0.53, 0.64, 0.38]);
    addBossFurShell(head, [0, 1.9, 0], [0.7, 0.63, 0.48]);
    addBossCrown(head);
  } else {
    ball(head, cream, [0, 1.55, 0.27], [0.33, 0.27, 0.075]);
    for (const sign of [-1, 1]) {
      ball(head, ink, [sign * 0.13, 1.64, 0.335], [0.035, 0.05, 0.018]);
      tube(
        head,
        ink,
        [
          [sign * 0.19, 1.73, 0.33],
          [sign * 0.13, 1.75, 0.345],
          [sign * 0.08, 1.73, 0.35],
        ],
        0.014,
      );
    }
    ball(head, "#966647", [0, 1.51, 0.36], [0.06, 0.04, 0.025]);
    tube(
      head,
      ink,
      [
        [-0.09, 1.43, 0.33],
        [0, 1.4, 0.35],
        [0.09, 1.43, 0.33],
      ],
      0.012,
    );
    if (["design", "market", "fo", "lena", "lan"].includes(person.id)) {
      ball(head, "#503a2f", [0, 1.83, -0.04], [0.41, 0.19, 0.31]);
      for (const x of [-0.3, 0.3])
        ball(
          head,
          "#503a2f",
          [x, 1.55, -0.13],
          [0.12, person.id === "lena" ? 0.25 : 0.4, 0.24],
        );
    }
    if (["hood", "headphones"].includes(person.style)) {
      tube(
        head,
        person.id === "gs" ? "#dab75c" : "#515560",
        [
          [-0.43, 1.5, 0],
          [-0.44, 1.88, 0],
          [0, 2.05, 0],
          [0.44, 1.88, 0],
          [0.43, 1.5, 0],
        ],
        0.045,
      );
      for (const x of [-0.43, 0.43])
        box(head, color, [x, 1.58, 0], [0.13, 0.25, 0.2]);
      if (person.style === "hood")
        ball(fixed, color, [0, 1.14, -0.15], [0.35, 0.25, 0.24]);
    }
    if (["beret", "cap", "scout"].includes(person.style)) {
      cylinder(head, color, [0, 1.94, 0], [0.44, 0.13, 0.37]);
      if (person.style === "beret") {
        ball(head, color, [0.08, 2.03, 0], [0.35, 0.13, 0.28]);
        cylinder(head, "#555d4b", [0.08, 2.16, 0], [0.025, 0.08, 0.025]);
      } else {
        box(head, color, [0, 1.92, 0.29], [0.55, 0.035, 0.35]);
        if (person.style === "scout") {
          cylinder(head, "#897c51", [0, 2.02, 0], [0.3, 0.18, 0.26]);
          box(fixed, "#c6ab70", [0, 0.95, -0.28], [0.49, 0.53, 0.22]);
          tube(
            fixed,
            "#d5bb81",
            [
              [-0.24, 1.12, 0.17],
              [0, 0.91, 0.29],
              [0.24, 1.12, 0.17],
            ],
            0.07,
          );
        }
      }
    }
    if (person.style === "glasses") {
      for (const x of [-0.14, 0.14])
        mesh(head, new T.TorusGeometry(0.108, 0.015, 5, 16), ink, [
          x,
          1.64,
          0.355,
        ]);
      box(head, ink, [0, 1.64, 0.36], [0.06, 0.02, 0.02]);
      for (let y = 0.62; y < 1.15; y += 0.13)
        box(fixed, "#536c56", [0, y, 0.24], [0.55, 0.02, 0.02]);
      for (const x of [-0.15, 0, 0.15])
        box(fixed, "#d4d3aa", [x, 0.88, 0.25], [0.02, 0.5, 0.02]);
    }
    if (["suit", "vest", "jacket"].includes(person.style) || manager) {
      for (const sign of [-1, 1]) {
        const lapel = box(
          fixed,
          color,
          [sign * 0.1, 1.03, 0.24],
          [0.12, 0.32, 0.035],
        );
        lapel.rotation.z = sign * 0.35;
      }
      box(fixed, "#e9d7b0", [0, 1.06, 0.27], [0.065, 0.3, 0.025]);
      box(fixed, "#8c7356", [0, 0.9, 0.29], [0.055, 0.19, 0.025]);
    }
    if (person.style === "knit") {
      for (let y = 0.6; y < 1.15; y += 0.1)
        box(fixed, "#e4beb3", [0, y, 0.24], [0.49, 0.015, 0.02]);
      box(head, "#e4c27d", [0.3, 1.8, 0.23], [0.14, 0.06, 0.04]);
    }
    if (person.style === "beret") {
      box(fixed, "#d9c69d", [0, 0.76, 0.25], [0.39, 0.5, 0.035]);
      for (const [x, y, c] of [
        [-0.1, 0.7, "#8caba0"],
        [0.1, 0.85, "#bc765d"],
        [0, 0.6, "#d6ac57"],
      ])
        ball(fixed, c, [x, y, 0.28], [0.04, 0.05, 0.01]);
    }
    if (person.style === "owl") {
      for (const x of [-0.06, 0.06])
        ball(fixed, "#9b8053", [0.17 + x, 1.04, 0.25], [0.065, 0.075, 0.025]);
      for (const x of [0.11, 0.23])
        ball(fixed, "#f6e6ba", [x, 1.06, 0.28], [0.025, 0.025, 0.01]);
    }
  }
  const arms = [];
  for (const sign of [-1, 1]) {
    const pivot = new T.Group();
    pivot.position.set(sign * (boss ? 0.5 : 0.29), boss ? 1.13 : 1.1, 0);
    body.add(pivot);
    ball(
      pivot,
      boss ? furMat : color,
      [sign * 0.06, -0.24, 0],
      boss ? [0.19, 0.4, 0.19] : [0.12, 0.28, 0.12],
    );
    ball(
      pivot,
      furMat,
      [sign * 0.07, -0.48, 0.015],
      boss ? [0.17, 0.2, 0.16] : [0.105, 0.12, 0.1],
    );
    arms.push(pivot);
  }
  const legs = [];
  for (const sign of [-1, 1]) {
    const pivot = new T.Group();
    pivot.position.set(sign * (boss ? 0.25 : 0.16), 0.45, 0);
    body.add(pivot);
    ball(
      pivot,
      boss ? furMat : "#555d50",
      [0, -0.19, 0],
      boss ? [0.22, 0.28, 0.23] : [0.12, 0.24, 0.12],
    );
    ball(
      pivot,
      boss ? furMat : person.color,
      [0, -0.36, 0.08],
      boss ? [0.23, 0.13, 0.28] : [0.13, 0.09, 0.19],
    );
    legs.push(pivot);
  }
  if (!boss)
    tube(
      fixed,
      brown,
      [
        [0, 0.6, -0.17],
        [0.15, 0.5, -0.42],
        [0.4, 0.75, -0.45],
        [0.35, 0.9, -0.42],
      ],
      0.035,
    );
  const prop = new T.Group();
  arms[1].add(prop);
  prop.position.set(0.07, -0.47, 0.12);
  if (manager) {
    box(prop, "#344d4d", [0, 0, 0.03], [0.36, 0.45, 0.045]);
    box(prop, "#bcd9ce", [0, 0, 0.06], [0.29, 0.36, 0.01]);
  }
  if (person.id === "zz") {
    cylinder(prop, "#4e5c5b", [0, 0.3, 0], [0.015, 0.6, 0.015]);
    box(prop, "#4c5458", [0, 0.67, 0], [0.16, 0.28, 0.04]);
  }
  if (person.id === "check") {
    mesh(prop, new T.TorusGeometry(0.12, 0.02, 5, 16), "#625b48", [0, 0.15, 0]);
    box(prop, "#625b48", [0, -0.05, 0], [0.035, 0.22, 0.035]);
  }
  if (["owl", "square"].includes(person.id))
    box(
      prop,
      person.id === "square" ? "#bd614f" : "#4a7975",
      [0, 0.08, 0],
      [0.025, 0.32, 0.025],
    );
  if (["market", "zuno"].includes(person.id))
    cylinder(
      prop,
      person.id === "zuno" ? "#afc487" : "#e0cfac",
      [0, 0.04, 0],
      [0.07, 0.2, 0.07],
    );
  if (["design", "fo"].includes(person.id))
    box(
      prop,
      person.id === "design" ? "#ead8b4" : "#a37e87",
      [0, 0, 0],
      [0.3, 0.39, 0.035],
    );
  if (person.id === "lena") {
    box(prop, "#465550", [0, 0, 0], [0.27, 0.2, 0.15]);
    const lens = cylinder(prop, "#a5b8b0", [0, 0, 0.13], [0.08, 0.13, 0.08]);
    lens.rotation.x = Math.PI / 2;
  }
  // Separate activity props: only shown at the corresponding destination.
  const activityProps = {};
  for (const type of ["drink", "pool", "darts", "lift"]) {
    const p = new T.Group();
    p.visible = false;
    arms[1].add(p);
    p.position.set(0.07, -0.45, 0.12);
    activityProps[type] = p;
    if (type === "drink") cylinder(p, "#dbbc7d", [0, 0, 0], [0.08, 0.22, 0.08]);
    if (type === "pool") {
      const stick = cylinder(p, "#c6a071", [0, 0, 0], [0.018, 1.8, 0.018]);
      stick.rotation.x = 1;
    }
    if (type === "darts") {
      box(p, "#dbad6d", [0, 0, 0.05], [0.04, 0.04, 0.22]);
    }
    if (type === "lift") {
      box(p, "#607267", [0, 0, 0], [0.5, 0.035, 0.035]);
      for (const x of [-0.2, 0.2])
        ball(p, "#526258", [x, 0, 0], [0.08, 0.14, 0.14]);
    }
  }
  const roleAccessories = addCharacterDetails({
    person,
    fixed,
    head,
    arms,
    legs,
    prop,
  });
  bake(fixed);
  bake(prop);
  Object.values(activityProps).forEach(bake);
  const attached = [prop, ...Object.values(activityProps)];
  attached.forEach((p) => p.removeFromParent());
  for (const p of arms) bake(p);
  for (const p of legs) bake(p);
  attached.forEach((p) => arms[1].add(p));
  const marker = sprite("⚙", "#769787"),
    waitMarker = sprite("!", "#c58a65");
  root.add(marker, waitMarker);
  marker.position.y = waitMarker.position.y = boss ? 3.25 : 2.35;
  marker.visible = waitMarker.visible = false;
  const hit = mesh(
    root,
    new T.CylinderGeometry(0.6, 0.6, boss ? 3 : 2.1, 8),
    new T.MeshBasicMaterial({ visible: false }),
    [0, boss ? 1.5 : 1.05, 0],
  );
  hit.userData.character = person.id;
  return {
    person,
    roleAccessories,
    root,
    body,
    arms,
    legs,
    prop,
    activityProps,
    marker,
    waitMarker,
    hit,
    state: "idle",
    note: "",
    path: [],
    dwell: 0,
    action: "",
    activityLabel: "自由活動",
    phase: Math.random() * 6,
  };
}
export function makeBossProps(boss) {
  const sets = [];
  for (let i = 0; i < 3; i++) {
    const g = new T.Group();
    boss.body.add(g);
    sets.push(g);
  }
  const cigarette = sets[0];
  cylinder(
    cigarette,
    "#f0e6ca",
    [0.62, 1.35, 0.46],
    [0.027, 0.3, 0.027],
  ).rotation.x = Math.PI / 2;
  ball(cigarette, "#d18b55", [0.62, 1.35, 0.62], [0.028, 0.028, 0.028]);
  box(sets[1], "#4d625a", [0, 1.03, 0.52], [0.64, 0.16, 0.27]);
  for (const x of [-0.21, 0.21])
    ball(sets[1], "#c9b77c", [x, 1.13, 0.55], [0.05, 0.025, 0.05]);
  for (const side of [-1, 1]) {
    const page = box(
      sets[2],
      "#e9e0bd",
      [side * 0.28, 1.18, 0.57],
      [0.56, 0.64, 0.025],
    );
    page.rotation.y = side * 0.14;
    for (let j = 0; j < 5; j++)
      box(
        sets[2],
        "#8b8c72",
        [side * 0.28, 1.35 - j * 0.08, 0.61],
        [0.41, 0.015, 0.01],
      );
  }
  box(sets[2], "#61745c", [0, 1.45, 0.61], [1, 0.06, 0.01]);
  sets.forEach(bake);
  const cigaretteTip = new T.Object3D();
  cigaretteTip.position.set(0.62, 1.35, 0.62);
  cigarette.add(cigaretteTip);
  const smoke = [];
  for (let i = 0; i < 8; i++) {
    const m = ball(
      boss.root,
      new T.MeshBasicMaterial({
        color: "#e9e6d9",
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
      [0, 0, 0],
      [0.08, 0.08, 0.08],
    );
    m.castShadow = false;
    smoke.push(m);
  }
  return { sets, smoke, cigaretteTip };
}
