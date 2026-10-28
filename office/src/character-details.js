import * as T from "three";
import { mesh, box, mat } from "./shapes.js";

// Small, readable silhouettes and garment construction. All geometry is opaque
// and uses the shared palette so the caller can merge it with the existing rig.
const rounded = new T.SphereGeometry(1, 8, 5);
const bead = new T.SphereGeometry(1, 6, 4);
const ring = new T.TorusGeometry(1, 0.15, 3, 8);
const cylinder = new T.CylinderGeometry(1, 1, 1, 8);
const ball = (p, color, position, scale) =>
  mesh(p, rounded, color, position, scale);
const dot = (p, color, position, scale) =>
  mesh(p, bead, color, position, scale);
const band = (p, color, position, scale) =>
  mesh(p, cylinder, color, position, scale);

const ROLE_ACCESSORIES = {
  zz: "hoodie, headphones, selfie stick and phone",
  owl: "owl badge, shirt pocket and whiteboard marker",
  design: "beret, paint apron, brushes and drawing board",
  check: "glasses, plaid vest, magnifier and red pen",
  market: "tailored vest, ponytail and coffee mug",
  square: "editor cap, press card and red editing pen",
  zuno: "hoodie, terminal badge and energy drink",
  fo: "tailored suit, announcement folder and brooch",
  gs: "gold headphones, audio badge and jacket trim",
  lena: "short side-swept bob, camera and shoulder strap",
  wild: "scout hat, neckerchief, compass and hiking backpack",
  bob: "casual blazer, pocket square and watch",
  lan: "knit cardigan, swept fringe and flower hair clip",
  dd: "manager suit, tie, watch and tablet",
};

/** Add detail before the existing fixed/arm/leg bake calls. */
export function addCharacterDetails({ person, fixed, head, arms, legs, prop }) {
  if (person.id === "zuozuo") return [];
  const { id, color, style } = person;
  const dark = "#4d3b31",
    cream = "#e7d7b6",
    gold = "#c7ac6c";

  // Deliberately small thumbs and finger divisions read as plush monkey hands,
  // while remaining part of the animated wrist meshes.
  arms.forEach((arm, i) => {
    const sign = i ? 1 : -1;
    dot(arm, "#966d49", [sign * 0.135, -0.44, 0.085], [0.038, 0.055, 0.04]);
    for (let f = 0; f < 3; f++) {
      box(
        arm,
        "#6d4b33",
        [sign * 0.07 - 0.043 + f * 0.043, -0.53, 0.105],
        [0.008, 0.04, 0.008],
      );
    }
    box(arm, color, [sign * 0.06, -0.38, 0], [0.205, 0.045, 0.19]);
  });
  legs.forEach((leg) => {
    box(leg, "#e6dec8", [0, -0.425, 0.09], [0.25, 0.035, 0.32]);
    box(leg, "#4d5145", [0, -0.41, -0.035], [0.21, 0.045, 0.09]);
    for (let y = 0; y < 2; y++) {
      box(
        leg,
        cream,
        [0, -0.3 - y * 0.03, 0.185 + y * 0.012],
        [0.14, 0.012, 0.012],
      );
    }
  });

  const collar = () => {
    for (const sign of [-1, 1]) {
      const flap = box(
        fixed,
        cream,
        [sign * 0.105, 1.14, 0.215],
        [0.15, 0.13, 0.04],
      );
      flap.rotation.z = sign * 0.42;
    }
  };
  const buttons = (n = 3) => {
    for (let i = 0; i < n; i++)
      dot(
        fixed,
        "#6a6752",
        [0, 0.96 - i * 0.115, 0.255],
        [0.016, 0.016, 0.013],
      );
  };
  const pocket = (x, y, shade = color) => {
    box(fixed, shade, [x, y, 0.235], [0.13, 0.11, 0.04]);
    box(fixed, cream, [x, y + 0.05, 0.263], [0.13, 0.012, 0.015]);
  };
  const hairLock = (x, y, z, sx, sy, sz, tilt = 0) => {
    const lock = ball(head, dark, [x, y, z], [sx, sy, sz]);
    lock.rotation.z = tilt;
    return lock;
  };
  const watch = () => {
    band(arms[0], "#6c6552", [-0.065, -0.37, 0], [0.115, 0.055, 0.105]);
    box(arms[0], gold, [-0.065, -0.365, 0.105], [0.08, 0.07, 0.026]);
  };

  // Face-framing locks vary the women individually rather than using one cap
  // silhouette. Male characters receive their own cropped or swept hairstyle.
  if (id === "design") {
    hairLock(-0.28, 1.74, 0.19, 0.075, 0.21, 0.09, -0.15);
    hairLock(0.3, 1.48, -0.02, 0.1, 0.28, 0.12, 0.16);
  } else if (id === "market") {
    hairLock(0.29, 1.55, -0.26, 0.15, 0.36, 0.14, -0.3);
    band(head, gold, [0.27, 1.77, -0.25], [0.11, 0.05, 0.105]);
    hairLock(-0.16, 1.84, 0.19, 0.23, 0.075, 0.12, -0.12);
  } else if (id === "fo") {
    hairLock(0, 1.73, -0.34, 0.18, 0.17, 0.14);
    hairLock(0.12, 1.84, 0.2, 0.23, 0.075, 0.1, 0.16);
  } else if (id === "lena") {
    hairLock(-0.17, 1.83, 0.2, 0.27, 0.09, 0.11, -0.22);
    hairLock(-0.3, 1.62, 0.14, 0.075, 0.21, 0.09, -0.12);
  } else if (id === "lan") {
    hairLock(-0.15, 1.84, 0.19, 0.24, 0.075, 0.11, -0.1);
    hairLock(0.31, 1.5, 0.04, 0.08, 0.24, 0.12, 0.13);
  } else if (!["beret", "cap", "scout"].includes(style)) {
    hairLock(-0.12, 1.91, 0.06, 0.18, 0.075, 0.16, -0.25);
    hairLock(0.08, 1.92, 0.025, 0.15, 0.065, 0.16, 0.2);
  }

  if (["zz", "zuno"].includes(id)) {
    box(fixed, "#d5d0bb", [0, 0.93, 0.251], [0.018, 0.4, 0.015]);
    for (const x of [-0.12, 0.12]) {
      box(fixed, cream, [x, 1.035, 0.248], [0.016, 0.23, 0.016]);
      box(fixed, "#626555", [x, 0.92, 0.257], [0.026, 0.04, 0.02]);
    }
    pocket(0, 0.64, id === "zz" ? "#8d74a2" : "#658693");
    if (id === "zz") {
      box(prop, "#abc1cb", [0, 0.67, 0.024], [0.125, 0.225, 0.006]);
      box(prop, "#eee3c7", [0, 0.6, 0.03], [0.07, 0.012, 0.006]);
    } else {
      box(fixed, "#d9d9bc", [0.18, 1.0, 0.24], [0.1, 0.08, 0.025]);
      box(fixed, "#456c64", [0.18, 1.0, 0.26], [0.065, 0.018, 0.012]);
      band(prop, "#b9cbb9", [0, 0.14, 0], [0.075, 0.02, 0.075]);
      box(prop, "#455e4f", [0, 0.03, 0.071], [0.07, 0.06, 0.008]);
    }
  }
  if (id === "owl") {
    collar();
    buttons();
    pocket(-0.17, 0.99, "#d4d8c6");
    box(fixed, "#487a73", [-0.18, 1.08, 0.263], [0.018, 0.14, 0.018]);
    box(prop, "#e9debe", [0, 0.23, 0], [0.035, 0.055, 0.035]);
  }
  if (id === "design") {
    box(fixed, "#b9a576", [0, 0.63, 0.277], [0.28, 0.12, 0.025]);
    for (const [x, shade] of [
      [-0.08, "#789b8e"],
      [0, "#b76d5a"],
      [0.08, "#d6af5d"],
    ]) {
      box(fixed, "#b49469", [x, 0.77, 0.295], [0.018, 0.19, 0.016]);
      box(fixed, shade, [x, 0.88, 0.295], [0.03, 0.045, 0.02]);
    }
    box(prop, "#d4a37c", [-0.05, 0.04, 0.023], [0.11, 0.1, 0.008]);
    box(prop, "#7c9c96", [0.07, -0.05, 0.023], [0.1, 0.12, 0.008]);
  }
  if (id === "check") {
    collar();
    box(fixed, "#bb6f59", [-0.2, 1.01, 0.27], [0.025, 0.17, 0.025]);
    box(fixed, gold, [-0.2, 1.1, 0.285], [0.04, 0.025, 0.02]);
  }
  if (id === "market") {
    collar();
    buttons();
    mesh(
      prop,
      ring,
      "#ddd0b1",
      [0.085, 0.05, 0],
      [0.055, 0.075, 0.055],
    ).rotation.y = Math.PI / 2;
    band(prop, "#6d4e37", [0, 0.143, 0], [0.055, 0.006, 0.055]);
    for (const x of [-0.44, 0.44])
      dot(head, gold, [x, 1.43, 0.1], [0.025, 0.025, 0.025]);
  }
  if (id === "square") {
    box(head, "#eee0bd", [0, 1.95, 0.33], [0.18, 0.1, 0.012]);
    for (const x of [-0.16, 0.16])
      box(fixed, "#79674c", [x, 0.86, 0.25], [0.045, 0.49, 0.02]);
    box(fixed, "#f4e8c8", [-0.16, 1.0, 0.274], [0.13, 0.11, 0.014]);
    box(fixed, "#b78362", [-0.16, 1.02, 0.285], [0.09, 0.018, 0.008]);
  }
  if (["fo", "bob", "dd"].includes(id)) {
    collar();
    buttons();
    if (id === "fo") {
      const skirt = mesh(
        fixed,
        new T.CylinderGeometry(0.25, 0.32, 0.22, 8),
        color,
        [0, 0.49, 0],
        [1, 1, 0.8],
      );
      skirt.name = "tailored-skirt";
      dot(fixed, gold, [0.2, 1.04, 0.25], [0.032, 0.032, 0.018]);
      box(prop, "#e8dfc6", [0, 0.07, 0.024], [0.23, 0.065, 0.008]);
      box(prop, "#9f7981", [0, -0.025, 0.026], [0.16, 0.012, 0.008]);
    } else {
      pocket(-0.17, 0.95);
      box(
        fixed,
        id === "bob" ? "#e6bb90" : "#c4d1c0",
        [-0.17, 1.03, 0.255],
        [0.11, 0.055, 0.012],
      );
      watch();
      if (id === "dd")
        for (let i = 0; i < 3; i++)
          box(
            prop,
            "#6d9f8c",
            [-0.03, 0.1 - i * 0.09, 0.068],
            [0.17, 0.018, 0.008],
          );
    }
  }
  if (id === "gs") {
    for (const x of [-0.22, 0.22])
      box(fixed, gold, [x, 0.86, 0.21], [0.035, 0.45, 0.035]);
    box(fixed, "#5f644c", [0, 0.98, 0.255], [0.2, 0.13, 0.02]);
    for (let i = 0; i < 5; i++)
      box(
        fixed,
        "#e5c77d",
        [-0.07 + i * 0.035, 0.98, 0.27],
        [0.013, 0.035 + (i % 3) * 0.025, 0.008],
      );
    for (const x of [-0.5, 0.5])
      box(head, "#e4c77c", [x, 1.58, 0.02], [0.025, 0.16, 0.12]);
  }
  if (id === "lena") {
    const strap = box(
      fixed,
      "#475849",
      [-0.14, 0.92, 0.23],
      [0.045, 0.57, 0.025],
    );
    strap.rotation.z = -0.36;
    box(prop, "#c7bfa5", [0.075, 0.13, 0], [0.08, 0.06, 0.09]);
    mesh(prop, ring, "#364c45", [0, 0, 0.2], [0.075, 0.075, 0.075]);
    box(prop, "#b99361", [-0.09, 0.115, 0.09], [0.035, 0.025, 0.025]);
  }
  if (id === "wild") {
    for (const x of [-0.19, 0.19])
      box(fixed, "#8e8058", [x, 0.91, 0.205], [0.055, 0.45, 0.035]);
    band(fixed, "#71836a", [0, 1.27, -0.3], [0.12, 0.55, 0.12]).rotation.z =
      Math.PI / 2;
    box(fixed, "#c8b77d", [0, 0.91, -0.41], [0.3, 0.24, 0.025]);
    box(fixed, "#6f7355", [0, 0.93, -0.43], [0.07, 0.035, 0.015]);
    dot(fixed, "#d9c68d", [-0.17, 0.83, 0.25], [0.065, 0.065, 0.02]);
    box(fixed, "#8b7253", [-0.17, 0.83, 0.272], [0.012, 0.085, 0.008]);
  }
  if (id === "lan") {
    for (const x of [-0.15, 0.15])
      box(fixed, "#e2b5ad", [x, 0.86, 0.255], [0.022, 0.49, 0.012]);
    buttons(4);
    for (const [x, y] of [
      [0.3, 1.8],
      [0.34, 1.83],
      [0.34, 1.77],
    ])
      dot(head, "#e3c88b", [x, y, 0.255], [0.025, 0.025, 0.015]);
  }
  fixed.userData.roleAccessory = ROLE_ACCESSORIES[id] || "";
  return (ROLE_ACCESSORIES[id] || "").split(", ");
}
