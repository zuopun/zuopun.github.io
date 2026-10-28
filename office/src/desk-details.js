import * as T from "three";
import { box, mesh } from "./shapes.js";

// Every monitor and paper insert shares this atlas: role detail adds one material,
// rather than a texture/material/draw call for each workstation.
const IDS = [
  "zz",
  "owl",
  "design",
  "check",
  "market",
  "square",
  "zuno",
  "fo",
  "gs",
  "lena",
  "wild",
  "bob",
  "lan",
];
const CELL_W = 512,
  CELL_H = 320,
  COLS = 4,
  ROWS = 4;
let screenMaterial;
const screenGeometries = new Map();
const handleGeometry = new T.TorusGeometry(0.055, 0.018, 3, 6);
const rimGeometry = new T.CircleGeometry(0.073, 6);
const shadeGeometry = new T.ConeGeometry(0.1, 0.12, 4, 1, true);
const lampGlowGeometry = new T.CircleGeometry(0.088, 4);
const tinySphere = new T.SphereGeometry(1, 5, 3);
const tinyPot = new T.CylinderGeometry(0.065, 0.05, 0.08, 4);
const warmLight = new T.MeshBasicMaterial({
  color: "#ffedbe",
  side: T.DoubleSide,
});

function rect(ctx, x, y, w, h, color, radius = 0) {
  ctx.fillStyle = color;
  if (radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  } else ctx.fillRect(x, y, w, h);
}
function line(ctx, points, color, width = 3) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}
function text(ctx, copy, x, y, size = 15, color = "#c9d7cc", weight = "500") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.fillText(copy, x, y);
}
function dot(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
function textLines(ctx, x, y, widths, color = "#a9bcb2", gap = 12) {
  widths.forEach((w, i) => rect(ctx, x, y + i * gap, w, 4, color, 2));
}
function header(ctx, title, accent, dark = true) {
  rect(ctx, 0, 0, CELL_W, CELL_H, dark ? "#243a36" : "#e7eddf");
  rect(ctx, 0, 0, CELL_W, 40, dark ? "#172c28" : "#cbd9c9");
  dot(ctx, 15, 20, 4, "#d88f73");
  dot(ctx, 30, 20, 4, "#dfbd72");
  dot(ctx, 45, 20, 4, "#9cb79e");
  text(ctx, title, 70, 26, 15, dark ? "#e2edda" : "#344d41", "700");
  rect(ctx, 0, 40, 9, CELL_H - 40, accent);
}
function drawTimeline(ctx, id, accent) {
  header(ctx, "X  /  COMMUNITY", accent);
  rect(ctx, 20, 56, 64, 247, "#1d302c", 8);
  text(ctx, "X", 38, 91, 34, "#f7f1df", "700");
  [121, 151, 181, 211, 241].forEach((y) =>
    rect(ctx, 36, y, 30, 7, "#719087", 3),
  );
  for (let i = 0; i < 3; i++) {
    const y = 55 + i * 81;
    rect(ctx, 95, y, 395, 73, "#304943", 7);
    dot(ctx, 117, y + 20, 10, [accent, "#bdac80", "#8cae9e"][i]);
    text(
      ctx,
      id === "zz"
        ? "ZZ studio"
        : id === "bob"
          ? "OWL community"
          : "Lan's notebook",
      137,
      y + 22,
      14,
      "#e2e9d6",
      "700",
    );
    textLines(ctx, 137, y + 34, [285, 245], "#a1b8ac", 10);
    text(ctx, "♡   ↻   ◇", 137, y + 66, 13, "#c6bd92");
  }
}
function drawScreen(ctx, id) {
  const accent = {
    zz: "#bda3d0",
    owl: "#c8c29c",
    design: "#e1a58c",
    check: "#a6b99c",
    market: "#8fb5c0",
    square: "#c3a97c",
    zuno: "#8eb6ba",
    fo: "#d0a5b2",
    gs: "#d9bc76",
    lena: "#98b699",
    wild: "#bdba82",
    bob: "#a2b6cd",
    lan: "#d7b2b0",
  }[id];
  if (["zz", "bob", "lan"].includes(id)) {
    drawTimeline(ctx, id, accent);
    return;
  }
  if (id === "market") {
    header(ctx, "MARKET / RESEARCH", accent);
    for (let y = 75; y < 280; y += 40)
      line(
        ctx,
        [
          [28, y],
          [486, y],
        ],
        "#3c544d",
        1,
      );
    for (let x = 40; x < 485; x += 58)
      line(
        ctx,
        [
          [x, 62],
          [x, 280],
        ],
        "#3c544d",
        1,
      );
    for (let i = 0; i < 15; i++) {
      const x = 42 + i * 29,
        mid = 204 - Math.sin(i * 0.8) * 39 - i * 5,
        up = i % 4 !== 1;
      const color = up ? "#9cbea2" : "#d8987b";
      line(
        ctx,
        [
          [x, mid - 27],
          [x, mid + 24],
        ],
        color,
        2,
      );
      rect(ctx, x - 6, mid - 12, 12, 24, color, 1);
    }
    line(
      ctx,
      [
        [30, 250],
        [85, 228],
        [140, 235],
        [200, 191],
        [260, 204],
        [315, 158],
        [375, 163],
        [435, 122],
        [485, 130],
      ],
      "#dfc28c",
      3,
    );
    text(ctx, "MOOD   /   SIGNALS   /   IDEAS", 30, 305, 12, "#bacdbf");
    return;
  }
  if (id === "zuno") {
    header(ctx, "ZUNO / WORKSPACE", accent);
    rect(ctx, 20, 53, 96, 250, "#1b302c", 6);
    text(ctx, "EXPLORER", 30, 74, 11, "#7da99e", "700");
    ["src/", "office/", "scene.js", "motions.js", "notes.md"].forEach((s, i) =>
      text(ctx, s, 30, 104 + i * 24, 12, "#a2bdae"),
    );
    const code = [
      ["const office = {", "#e0bc81"],
      ['  mood: "make good things",', "#a7cda5"],
      ["  team: monkeys,", "#9fc0cf"],
      ["};", "#e0bc81"],
      ["function update() {", "#d1a0bd"],
      ["  team.forEach(move);", "#a7cda5"],
      ["  renderer.draw(office);", "#9fc0cf"],
      ["}", "#e0bc81"],
    ];
    code.forEach(([s, c], i) => {
      ctx.font = "13px monospace";
      ctx.fillStyle = c;
      ctx.fillText(s, 132, 76 + i * 22);
    });
    rect(ctx, 126, 254, 366, 47, "#152a24", 5);
    text(ctx, "› ready to create", 139, 284, 14, "#9ec592");
    return;
  }
  if (id === "design") {
    header(ctx, "DESIGN / MOOD BOARD", accent, true);
    for (let i = 0; i < 6; i++) {
      const x = 25 + (i % 3) * 159,
        y = 57 + Math.floor(i / 3) * 118;
      rect(
        ctx,
        x,
        y,
        145,
        105,
        ["#cdbb9c", "#a5bbb2", "#d5a994", "#b9b99a", "#b1a3bb", "#d2c796"][i],
        4,
      );
      dot(ctx, x + 102, y + 28, 15, "#f4dfad");
      line(
        ctx,
        [
          [x + 8, y + 94],
          [x + 49, y + 45],
          [x + 83, y + 78],
          [x + 118, y + 47],
          [x + 140, y + 96],
        ],
        "#627e6a",
        10,
      );
    }
    for (let i = 0; i < 8; i++)
      rect(
        ctx,
        25 + i * 58,
        299,
        49,
        10,
        ["#b56f60", "#d4ae77", "#809f8e", "#7c9caa"][i % 4],
        2,
      );
    return;
  }
  if (id === "check" || id === "fo" || id === "square") {
    header(
      ctx,
      id === "check"
        ? "SOURCE / FACT CHECK"
        : id === "fo"
          ? "FO / ANNOUNCEMENTS"
          : "SQUARE / EDITORIAL",
      accent,
      false,
    );
    rect(ctx, 37, 56, 319, 248, "#fcf7e8", 4);
    rect(ctx, 372, 56, 118, 248, "#d4dece", 4);
    text(
      ctx,
      id === "check"
        ? "REVIEW NOTES"
        : id === "fo"
          ? "HELLO, COMMUNITY"
          : "THE DAILY SQUARE",
      56,
      83,
      15,
      "#3c5846",
      "700",
    );
    for (let i = 0; i < 5; i++) {
      const y = 105 + i * 36;
      rect(ctx, 56, y, 13, 13, "#d9e1ca", 2);
      line(
        ctx,
        [
          [59, y + 6],
          [63, y + 10],
          [70, y + 1],
        ],
        i === 3 ? "#bd765f" : "#73997e",
        2,
      );
      textLines(ctx, 83, y + 1, [238, 180 - i * 14], "#a5b09a", 9);
    }
    text(
      ctx,
      id === "check" ? "VERIFIED" : id === "fo" ? "DRAFT" : "IDEAS",
      384,
      83,
      12,
      "#526b53",
      "700",
    );
    ["#d7b577", "#bbc1a3", "#ce9c8a"].forEach((c, i) => {
      rect(ctx, 385, 105 + i * 58, 91, 43, c, 3);
      textLines(ctx, 392, 116 + i * 58, [69, 53], "#fff1d9", 9);
    });
    return;
  }
  if (id === "gs") {
    header(ctx, "GOLDEN STILLNES / SOUND", accent);
    for (let lane = 0; lane < 3; lane++) {
      const y = 70 + lane * 72;
      rect(ctx, 28, y, 460, 60, "#1b302c", 4);
      for (let i = 0; i < 70; i++) {
        const h =
          4 + Math.abs(Math.sin(i * 1.9 + lane) * Math.cos(i * 0.23)) * 42;
        rect(
          ctx,
          34 + i * 6.4,
          y + 30 - h / 2,
          3,
          h,
          ["#cbae67", "#a8ba8d", "#c5a37a"][lane],
          1,
        );
      }
    }
    line(
      ctx,
      [
        [259, 58],
        [259, 288],
      ],
      "#f6df9c",
      2,
    );
    text(
      ctx,
      "AMBIENCE    •    BREATH    •    STILLNESS",
      29,
      305,
      12,
      "#d8c88d",
    );
    return;
  }
  if (id === "lena") {
    header(ctx, "LENA / STORYBOARD", accent);
    for (let i = 0; i < 6; i++) {
      const x = 26 + (i % 3) * 157,
        y = 58 + Math.floor(i / 3) * 112;
      rect(ctx, x, y, 144, 88, "#b6c0a8", 2);
      for (let k = 0; k < 8; k++) {
        rect(ctx, x + 5 + k * 17, y + 3, 7, 4, "#405b4b");
        rect(ctx, x + 5 + k * 17, y + 81, 7, 4, "#405b4b");
      }
      dot(ctx, x + 70, y + 37, 14, "#e2c596");
      line(
        ctx,
        [
          [x + 43, y + 73],
          [x + 58, y + 53],
          [x + 80, y + 53],
          [x + 104, y + 73],
        ],
        "#71876a",
        10,
      );
      text(
        ctx,
        ["OPEN", "DETAIL", "WIDE", "FOLLOW", "PAUSE", "END"][i],
        x,
        y + 103,
        10,
        "#c4d3bb",
      );
    }
    rect(ctx, 27, 293, 458, 10, "#344f44", 2);
    for (let i = 0; i < 9; i++)
      rect(ctx, 30 + i * 50, 294, 43, 8, i % 2 ? "#bcaa86" : "#8ba996", 1);
    return;
  }
  if (id === "wild") {
    header(ctx, "WILD / TRAIL NOTES", accent, false);
    rect(ctx, 24, 55, 463, 249, "#d9dec5", 5);
    for (let i = 0; i < 7; i++) {
      const y = 79 + i * 31;
      line(
        ctx,
        [
          [30, y],
          [112, y - 16],
          [193, y + 12],
          [285, y - 22],
          [379, y + 14],
          [480, y - 6],
        ],
        "#b8c7a3",
        2,
      );
    }
    line(
      ctx,
      [
        [63, 252],
        [132, 203],
        [191, 226],
        [242, 158],
        [316, 132],
        [371, 90],
        [447, 112],
      ],
      "#ab7656",
      4,
    );
    for (const [x, y] of [
      [63, 252],
      [242, 158],
      [447, 112],
    ]) {
      dot(ctx, x, y, 10, "#b47e5e");
      dot(ctx, x, y, 4, "#f3e9c9");
    }
    line(
      ctx,
      [
        [402, 251],
        [430, 209],
        [457, 251],
        [402, 251],
      ],
      "#557855",
      4,
    );
    text(ctx, "N", 59, 89, 18, "#4c6c52", "700");
    line(
      ctx,
      [
        [65, 96],
        [65, 122],
      ],
      "#4c6c52",
      3,
    );
    return;
  }
  header(ctx, "OWL / STRATEGY WALL", accent, false);
  const cards = [
    [38, 69, 132, 62],
    [190, 69, 132, 62],
    [342, 69, 132, 62],
    [112, 210, 132, 62],
    [274, 210, 132, 62],
  ];
  for (const [a, b] of [
    [0, 1],
    [1, 2],
    [0, 3],
    [1, 3],
    [2, 4],
  ]) {
    const p = cards[a],
      q = cards[b];
    line(
      ctx,
      [
        [p[0] + 66, p[1] + 62],
        [q[0] + 66, q[1]],
      ],
      "#a1b28e",
      3,
    );
  }
  cards.forEach(([x, y, w, h], i) => {
    rect(
      ctx,
      x,
      y,
      w,
      h,
      ["#c7c99c", "#d5bc8c", "#adc1a1", "#c7ae99", "#b8c6ad"][i],
      5,
    );
    text(
      ctx,
      ["LISTEN", "SHAPE", "SHARE", "LEARN", "GROW"][i],
      x + 12,
      y + 24,
      14,
      "#425c46",
      "700",
    );
    textLines(ctx, x + 12, y + 35, [99, 75], "#f1eed5", 9);
  });
}
function getScreenMaterial() {
  if (screenMaterial) return screenMaterial;
  const canvas = document.createElement("canvas");
  canvas.width = CELL_W * COLS;
  canvas.height = CELL_H * ROWS;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#243a36";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  IDS.forEach((id, index) => {
    ctx.save();
    ctx.translate((index % COLS) * CELL_W, Math.floor(index / COLS) * CELL_H);
    drawScreen(ctx, id);
    ctx.restore();
  });
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 2;
  screenMaterial = new T.MeshBasicMaterial({ map: texture, side: T.FrontSide });
  return screenMaterial;
}
function screen(parent, id, pos, w, h, rotation = 0) {
  let geometry = screenGeometries.get(id);
  if (!geometry) {
    geometry = new T.PlaneGeometry(1, 1);
    const index = Math.max(0, IDS.indexOf(id)),
      col = index % COLS,
      row = Math.floor(index / COLS);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(
        i,
        (col + uv.getX(i)) / COLS,
        (ROWS - row - 1 + uv.getY(i)) / ROWS,
      );
    screenGeometries.set(id, geometry);
  }
  const plane = mesh(parent, geometry, getScreenMaterial(), pos, [w, h, 1]);
  plane.rotation.x = rotation;
  plane.castShadow = false;
  plane.receiveShadow = false;
  return plane;
}

export function addDeskDetails(root, person, x, z) {
  // Existing monitor fronts face +Z, including the second market/engineering monitor.
  screen(root, person.id, [x - 0.3, 1.53, z - 0.137], 0.608, 0.398);
  if (["market", "zuno"].includes(person.id))
    screen(root, person.id, [x + 0.5, 1.53, z - 0.137], 0.608, 0.398);
  // Small articulated desk lamp: base, two arms, shade and a warm unlit diffuser.
  box(root, "#4e6458", [x - 1.01, 1.14, z + 0.17], [0.19, 0.035, 0.14]);
  const lower = box(
    root,
    "#6e8273",
    [x - 1.01, 1.28, z + 0.17],
    [0.026, 0.25, 0.026],
  );
  lower.rotation.z = -0.12;
  const upper = box(
    root,
    "#6e8273",
    [x - 0.97, 1.44, z + 0.17],
    [0.026, 0.17, 0.026],
  );
  upper.rotation.z = -0.55;
  const shade = mesh(root, shadeGeometry, person.color, [
    x - 0.925,
    1.51,
    z + 0.17,
  ]);
  shade.rotation.z = -0.22;
  const diffuser = mesh(root, lampGlowGeometry, warmLight, [
    x - 0.913,
    1.453,
    z + 0.17,
  ]);
  diffuser.rotation.x = Math.PI / 2;
  diffuser.castShadow = false;
  // Keep the existing mug body; the dark top and handle make it read as a cup.
  mesh(root, handleGeometry, person.color, [x + 1.017, 1.245, z + 0.12]);
  const coffee = mesh(root, rimGeometry, "#614c37", [
    x + 0.92,
    1.357,
    z + 0.12,
  ]);
  coffee.rotation.x = -Math.PI / 2;
  // One tangible personal object per role, kept small enough to leave keyboard space.
  const px = x + 0.84,
    pz = z - 0.31;
  const item = (color, pos, size) =>
    box(root, color, [px + pos[0], 1.13 + pos[1], pz + pos[2]], size);
  if (person.id === "zz") {
    item("#34434d", [0, 0.08, 0], [0.18, 0.15, 0.04]);
    item("#9aaeb4", [0, 0.08, 0.024], [0.14, 0.11, 0.008]);
    item("#5c7075", [0, 0.015, 0.03], [0.16, 0.025, 0.12]);
  } else if (person.id === "owl") {
    mesh(root, tinySphere, "#ad9967", [px, 1.23, pz], [0.085, 0.11, 0.075]);
    item("#eee0ac", [-0.032, 0.12, 0.064], [0.043, 0.048, 0.014]);
    item("#eee0ac", [0.032, 0.12, 0.064], [0.043, 0.048, 0.014]);
  } else if (person.id === "design") {
    item("#d8bd8e", [0, 0.02, 0], [0.25, 0.035, 0.16]);
    item("#b86f62", [-0.065, 0.043, 0], [0.055, 0.012, 0.06]);
    item("#739c90", [0.012, 0.043, 0], [0.055, 0.012, 0.06]);
    const brush = item("#4a655b", [0.09, 0.043, 0.02], [0.015, 0.015, 0.23]);
    brush.rotation.y = 0.35;
  } else if (person.id === "check") {
    item("#8f9d77", [0, 0.016, 0], [0.26, 0.03, 0.23]);
    screen(root, "check", [px, 1.166, pz], 0.23, 0.2, -Math.PI / 2);
    const pen = item("#bf6153", [-0.19, 0.03, 0.015], [0.018, 0.018, 0.27]);
    pen.rotation.y = 0.18;
    item("#655e4b", [0.19, 0.04, 0], [0.07, 0.08, 0.07]);
  } else if (person.id === "market") {
    mesh(root, tinyPot, "#be9973", [px, 1.17, pz]);
    mesh(root, tinySphere, "#81976b", [px, 1.265, pz], [0.085, 0.08, 0.075]);
    item("#d7c8a4", [-0.19, 0.012, 0.02], [0.15, 0.024, 0.2]);
  } else if (person.id === "square") {
    for (let i = 0; i < 3; i++)
      item(
        ["#b99170", "#d8c29a", "#e7dcc0"][i],
        [0, 0.015 + i * 0.025, 0],
        [0.28, 0.025, 0.2],
      );
    const pen = item("#bc6454", [-0.19, 0.025, 0], [0.016, 0.016, 0.26]);
    pen.rotation.y = -0.24;
  } else if (person.id === "zuno") {
    item("#7e9b9c", [0, 0.06, 0], [0.15, 0.12, 0.11]);
    item("#bfd0ba", [0, 0.145, 0], [0.17, 0.085, 0.12]);
    item("#38544d", [0, 0.15, 0.063], [0.1, 0.025, 0.009]);
    item("#ba9c58", [0.15, 0.025, 0.02], [0.075, 0.05, 0.12]);
  } else if (person.id === "fo") {
    item("#bd9ba3", [0, 0.035, 0], [0.25, 0.07, 0.19]);
    item("#f1dfb8", [0, 0.075, 0], [0.21, 0.018, 0.16]);
    screen(root, "fo", [px, 1.217, pz], 0.2, 0.15, -Math.PI / 2);
    item("#8b6e76", [-0.18, 0.07, 0], [0.065, 0.14, 0.065]);
  } else if (person.id === "gs") {
    item("#665e48", [0, 0.065, 0], [0.24, 0.13, 0.14]);
    item("#d3ba72", [-0.067, 0.07, 0.075], [0.06, 0.075, 0.014]);
    item("#d3ba72", [0.067, 0.07, 0.075], [0.06, 0.075, 0.014]);
    item("#bcaa78", [-0.19, 0.018, 0], [0.09, 0.035, 0.14]);
  } else if (person.id === "lena") {
    item("#42584d", [0, 0.065, 0], [0.25, 0.13, 0.04]);
    const clapper = item("#c6d1b8", [0.005, 0.16, 0], [0.27, 0.035, 0.045]);
    clapper.rotation.z = 0.13;
    item("#edd9b6", [-0.21, 0.016, 0], [0.12, 0.03, 0.19]);
    screen(root, "lena", [px - 0.21, 1.164, pz], 0.1, 0.17, -Math.PI / 2);
  } else if (person.id === "wild") {
    item("#e4d9ac", [0, 0.015, 0], [0.29, 0.03, 0.23]);
    screen(root, "wild", [px, 1.163, pz], 0.27, 0.21, -Math.PI / 2);
    item("#788a65", [-0.19, 0.08, 0], [0.075, 0.16, 0.075]);
    item("#a6a575", [-0.19, 0.17, 0], [0.05, 0.025, 0.05]);
  } else if (person.id === "bob") {
    item("#748799", [0, 0.11, 0], [0.17, 0.22, 0.025]);
    item("#e0cba4", [0, 0.11, 0.016], [0.13, 0.17, 0.009]);
    item("#849c79", [0, 0.09, 0.024], [0.08, 0.08, 0.01]);
    item("#596f60", [0, 0.02, -0.04], [0.11, 0.03, 0.11]);
  } else if (person.id === "lan") {
    item("#c3979b", [0, 0.025, 0], [0.23, 0.05, 0.21]);
    item("#e5d6bc", [0.01, 0.055, 0], [0.2, 0.012, 0.19]);
    const pen = item("#97798d", [-0.17, 0.025, 0], [0.016, 0.016, 0.21]);
    pen.rotation.y = 0.3;
    item("#7f9d7e", [0.18, 0.055, 0.02], [0.065, 0.11, 0.065]);
  }
  return {
    id: person.id,
    screen: person.id,
    personalItem: true,
    lamp: true,
    mug: true,
  };
}
