import * as T from "three";
import { box, ball, cylinder, label, tube, mat, mesh } from "./shapes.js";
// All floor-level solids are returned to the same navigation grid as the desks.
export function dressOffice(root, solid) {
  const glass = new T.MeshStandardMaterial({
    color: "#b7d6d0",
    transparent: true,
    opacity: 0.22,
    roughness: 0.3,
    depthWrite: false,
  });
  function panel(x, z, w, d) {
    box(root, "#7e9086", [x, 0.55, z], [w, 1.1, d]);
    box(root, glass, [x, 1.85, z], [w, 1.45, d]);
    box(root, "#657a70", [x, 2.6, z], [w + 0.04, 0.06, d + 0.04]);
    solid(x, z, w, d);
  }
  for (const x of [-6.7, 6.7]) {
    for (const [a, b] of [
      [-10.3, -6.5],
      [-4.5, 1.5],
      [3.5, 9],
    ])
      panel(x, (a + b) / 2, 0.12, b - a);
    for (const z of [-5.5, 2.5]) {
      box(root, "#718477", [x, 2.55, z], [0.2, 0.2, 2.1]);
      for (const dz of [-1, 1])
        box(root, "#718477", [x, 1.25, z + dz], [0.18, 2.5, 0.1]);
    }
    panel(x < 0 ? -9.9 : 9.9, -1, 6.4, 0.12);
  }
  // Glass doors are parked against their jambs, keeping two clear entrances per wing.
  for (const x of [-6.7, 6.7])
    for (const z of [-5.5, 2.5]) {
      box(
        root,
        glass,
        [x + (x < 0 ? -0.45 : 0.45), 1.2, z - 0.9],
        [0.9, 2.35, 0.05],
      );
      box(
        root,
        "#9d916e",
        [x + (x < 0 ? -0.77 : 0.77), 1.15, z - 0.86],
        [0.04, 0.3, 0.04],
      );
    }
  // Raised executive platform and shallow front steps.
  box(root, "#667b67", [0, 0.4, -8.5], [6.7, 0.8, 3.7]);
  box(root, "#a4b28c", [0, 0.81, -8.5], [6.6, 0.035, 3.65]);
  for (let i = 0; i < 4; i++) {
    const z = -5.95 - i * 0.23, height = (i + 1) * 0.2;
    box(root, "#b0be9b", [0, height / 2, z], [5.5 + i * 0.25, height, 0.24]);
    box(root, "#d6b566", [0, height + 0.006, z + 0.11], [5.5 + i * 0.25, 0.012, 0.025]);
  }
  // The raised stage is a deliberate furniture boundary; bot aisles skirt it.
  solid(0, -8.1, 6.7, 4.9);
  // Reception sits beside the entrance; the center route remains unobstructed.
  box(root, "#c0a17a", [-3.6, 0.65, 9.25], [2.8, 1.3, 0.95]);
  box(root, "#eee3c8", [-3.6, 1.33, 9.25], [3, 0.12, 1.05]);
  solid(-3.6, 9.25, 3, 1.05);
  for (let i = 0; i < 12; i++)
    box(root, "#a18362", [-4.85 + i * 0.23, 0.66, 9.74], [0.07, 1.05, 0.025]);
  label(root, "左左公司", [-3.6, 0.88, 9.77], 1.8, 0.4, "#c0a17a", "#fff2d3");
  label(root, "WELCOME / 歡迎", [-3.6, 1.65, 9.2], 1.3, 0.24);
  box(root, "#4f6861", [-4.35, 1.55, 9.1], [0.55, 0.35, 0.06]);
  box(root, "#bdd0b7", [-4.35, 1.55, 9.14], [0.48, 0.28, 0.01]);
  box(root, "#b7c7ac", [0, 0.03, 9.6], [3.4, 0.03, 1.8]);
  label(
    root,
    "MAKE YOURSELF AT HOME",
    [0, 0.06, 9.65],
    2.8,
    0.32,
    "#b7c7ac",
    "#465d4b",
  ).rotation.x = -Math.PI / 2;
  // Exterior towers really stand beyond the windows, rather than a painted backdrop.
  for (let i = 0; i < 13; i++) {
    const x = -13 + i * 2.1,
      h = 2 + ((i * 7) % 5) * 0.55;
    box(
      root,
      i % 2 ? "#b9c9c4" : "#a8bbb6",
      [x, h / 2 - 0.5, -12.3 - (i % 3) * 0.3],
      [1.4, h, 0.7],
    );
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 2; col++)
        box(
          root,
          "#dce3cf",
          [x - 0.3 + col * 0.6, 0.3 + row * 0.55, -11.92 - (i % 3) * 0.3],
          [0.24, 0.26, 0.015],
        );
  }
  // Suspended strips and cable trays align with the desk pods.
  for (const x of [-3.2, 3.2])
    for (const z of [-2, 1.4, 4.8]) {
      box(root, "#667b73", [x, 3.3, z], [2.5, 0.09, 0.17]);
      box(root, "#fff2ca", [x, 3.25, z], [2.35, 0.025, 0.12]);
      for (const dx of [-1, 1])
        cylinder(root, "#7f8f82", [x + dx, 3.55, z], [0.012, 0.5, 0.012]);
    }
  for (const x of [-4.7, -1.55, 1.55, 4.7]) {
    box(root, "#65766e", [x, 0.68, 1.4], [0.28, 0.055, 7.8]);
    for (let z = -2; z < 5; z += 1.7)
      box(root, "#9aaa98", [x, 0.66, z], [0.4, 0.035, 0.06]);
  }
  // Whiteboards and framed art, intentionally abstract without live figures.
  for (const [x, z, title] of [
    [-4.6, -9.95, "IDEAS → MAKE → SHARE"],
    [4.6, -9.95, "GOOD THINGS TAKE A TEAM"],
  ]) {
    box(root, "#9a8a6a", [x, 1.55, z], [2.65, 1.3, 0.08]);
    box(root, "#f8f1dd", [x, 1.55, z + 0.05], [2.5, 1.15, 0.015]);
    label(root, title, [x, 1.95, z + 0.07], 2.3, 0.16);
    for (let i = 0; i < 6; i++)
      box(
        root,
        ["#acc5ac", "#ddba85", "#cf9a87"][i % 3],
        [x - 0.85 + (i % 3) * 0.8, 1.65 - Math.floor(i / 3) * 0.38, z + 0.075],
        [0.44, 0.24, 0.01],
      );
  }
  // Lounge: fridge, espresso machine, books, blanket and side tables.
  box(root, "#ced8c3", [-12, 0.95, 0.4], [1, 1.9, 0.8]);
  solid(-12, 0.4, 1, 0.8);
  box(root, "#eff0d8", [-12, 1.24, 0.82], [0.9, 0.04, 0.025]);
  box(root, "#7a8c80", [-11.65, 1.35, 0.84], [0.05, 0.45, 0.04]);
  box(root, "#b49b78", [-8.1, 0.6, 7.6], [2, 1.2, 0.8]);
  solid(-8.1, 7.6, 2, 0.8);
  box(root, "#eadfc6", [-8.1, 1.24, 7.6], [2.1, 0.08, 0.85]);
  box(root, "#485e57", [-8.5, 1.6, 7.6], [0.6, 0.65, 0.5]);
  box(root, "#b6c5b5", [-8.5, 1.62, 7.87], [0.42, 0.2, 0.02]);
  for (const x of [-8.65, -8.35])
    cylinder(root, "#f6e5bf", [x, 1.35, 7.95], [0.065, 0.13, 0.065]);
  box(root, "#b69b75", [-12, 0.95, 5], [0.45, 1.9, 2]);
  solid(-12, 5, 0.55, 2);
  for (let y = 0.35; y < 1.8; y += 0.55) {
    box(root, "#dfcea9", [-11.8, y, 5], [0.55, 0.05, 1.95]);
    for (let j = 0; j < 6; j++)
      box(
        root,
        ["#7f9b8d", "#ba886d", "#d2b36f"][j % 3],
        [-11.73, y + 0.21, 4.2 + j * 0.3],
        [0.32, 0.38, 0.18],
      );
  }
  box(root, "#bc9b85", [-10.3, 0.75, 6.5], [1.1, 0.08, 0.86]);
  for (let x = -10.8; x < -9.8; x += 0.12)
    box(root, "#dfc6a7", [x, 0.795, 6.5], [0.025, 0.01, 0.86]);
  // Washroom stalls, towel rail and frosted privacy enclosure.
  for (const z of [-5.4, -3.7]) {
    panel(-8.7, z, 2, 0.08);
  }
  panel(-9.65, -4.55, 0.08, 1.7);
  box(root, "#9eafa5", [-8.1, 1, -3.7], [1.1, 2, 0.08]);
  box(root, "#d6bf87", [-7.7, 1, -3.62], [0.07, 0.07, 0.04]);
  const frost = new T.MeshStandardMaterial({
    color: "#d4e2d8",
    roughness: 1,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
  });
  const showerDoor = new T.Group();
  root.add(showerDoor);
  const pane = box(showerDoor, frost, [-11.2, 1.16, -6], [1.6, 2.1, 0.045]);
  pane.castShadow = false;
  box(root, "#7d9c93", [-10.42, 1.1, -6], [0.035, 2.2, 0.06]);
  tube(
    root,
    "#859e92",
    [
      [-12.5, 1.4, -4.7],
      [-12.5, 1.4, -3.7],
    ],
    0.025,
  );
  for (let i = 0; i < 2; i++)
    box(
      root,
      i ? "#e6d2b4" : "#e9e6d1",
      [-12.45, 1.15, -4.5 + i * 0.45],
      [0.05, 0.58, 0.33],
    );
  // Games: a second arcade, cue rack, chalkboard scores and comfortable beanbags.
  box(root, "#8c9d85", [7.8, 0.85, -9.3], [1, 1.7, 0.75]);
  solid(7.8, -9.3, 1, 0.8);
  label(root, "PIXEL CLUB", [7.8, 1.5, -8.9], 0.75, 0.28, "#354e46", "#e6ca87");
  box(root, "#d8c7a3", [7.8, 1.05, -8.83], [0.9, 0.1, 0.3]);
  for (let i = 0; i < 4; i++)
    cylinder(root, "#b79967", [12.35, 1, -5.3 + i * 0.3], [0.017, 1.8, 0.017]);
  box(root, "#657c66", [12.35, 0.3, -4.85], [0.18, 0.1, 1.2]);
  label(root, "DART CLUB", [9.9, 1.8, -9.46], 1.25, 0.8, "#3f5b4b", "#e9ddbd");
  for (let i = 0; i < 3; i++)
    box(root, "#c3cbb1", [9.9, 1.95 - i * 0.18, -9.43], [0.8, 0.018, 0.015]);
  for (const [x, z] of [
    [12, -7.2],
    [12, -1.8],
  ]) {
    ball(root, "#c2a47c", [x, 0.35, z], [0.55, 0.38, 0.55]);
    solid(x, z, 1, 1);
  }
  // Gym: bench press, yoga mat, mirror, drinks station and weights.
  box(root, "#67847a", [9.7, 0.55, 7.5], [0.65, 0.16, 1.9]);
  solid(9.7, 7.5, 1, 2);
  for (const x of [9, 10.4])
    box(root, "#84998c", [x, 0.8, 6.8], [0.07, 1.6, 0.07]);
  const bar = cylinder(root, "#627b72", [9.7, 1.4, 6.8], [0.035, 2, 0.035]);
  bar.rotation.z = Math.PI / 2;
  for (const x of [8.95, 10.45]) {
    const w = cylinder(root, "#465e55", [x, 1.4, 6.8], [0.25, 0.13, 0.25]);
    w.rotation.z = Math.PI / 2;
  }
  for (const x of [7.6, 11.5])
    box(root, "#b2b89a", [x, 0.04, 8.8], [1, 0.03, 1.6]);
  box(root, "#8aaba2", [12.7, 1.5, 4.5], [0.06, 2.4, 4.2]);
  box(root, "#dce4d9", [12.65, 1.5, 4.5], [0.015, 2.2, 4]);
  box(root, "#e1dfc8", [7.5, 0.65, 0.1], [0.6, 1.3, 0.6]);
  solid(7.5, 0.1, 0.65, 0.65);
  cylinder(root, "#a8cbd0", [7.5, 1.55, 0.1], [0.24, 0.55, 0.24]);
  box(root, "#6d8d82", [7.5, 1, 0.43], [0.22, 0.15, 0.02]);
  return { glass, showerDoor };
}
