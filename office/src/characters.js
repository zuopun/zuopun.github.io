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
  bossFaceGeometry,
  bossFacePoint,
  BOSS_FACE_CENTER_Y,
  getBossFurMaterial,
  addBossFurShell,
  addColleagueFurShell,
  addBossCrown,
  bossPlushGeometry,
  bossHeadGeometry,
  addBossEar,
  addBossFacePile,
  addBossArm,
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
  const furMat = getBossFurMaterial();
  // Hero silhouette uses smooth geometry; fur shells provide the fine outline.
  const plushBall = (parent, material, position, scale) => boss
    ? mesh(parent, bossPlushGeometry(position[1] === .8 && scale[0] > .4 ? "body" : "round"), material, position, scale)
    : ball(parent, material, position, scale);
  let faceMesh;
  const color = boss ? furMat : person.color;
  plushBall(
    fixed,
    color,
    [0, 0.8, 0],
    [boss ? 0.57 : 0.32, boss ? 0.66 : 0.42, boss ? 0.41 : 0.24],
  );
  if (!boss) ball(fixed, "#f2dfb5", [0, 0.86, 0.21], [0.19, 0.24, 0.05]);
  const head = new T.Group();
  fixed.add(head);
  mesh(
    head,
    boss ? bossHeadGeometry() : new T.SphereGeometry(1, 12, 8),
    furMat,
    [0, boss ? 1.9 : 1.58, 0],
    boss ? [0.7, 0.63, 0.48] : [0.43, 0.4, 0.32],
  );
  if (boss) {
    addBossEar(head, -1); addBossEar(head, 1);
  } else {
    for (const sign of [-1, 1]) {
      plushBall(head, furMat, [sign * .46, 1.58, 0], [.19, .21, .12]);
      plushBall(head, cream, [sign * .48, 1.58, .1], [.12, .14, .035]);
    }
  }
  if (boss) {
    faceMesh = mesh(
      head,
      bossFaceGeometry(face),
      bossFaceMaterial(face),
      [0, BOSS_FACE_CENTER_Y, 0],
    );
    faceMesh.name = "official-zuozuo-face";
    faceMesh.castShadow = false;
    addBossFacePile(head);
    addBossFurShell(fixed, [0, 0.8, 0], [0.57, 0.66, 0.41]);
    for (const side of [-1, 1]) {
      plushBall(fixed, furMat, [side * .385, 1.12, -.015], [.23, .28, .245]);
      addBossFurShell(fixed, [side * .385, 1.12, -.015], [.23, .28, .245], 3);
    }
    addBossFurShell(head, [0, 1.9, 0], [0.7, 0.63, 0.48]);
    addBossCrown(head);
  } else {
    addColleagueFurShell(head);
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
    if (boss) addBossArm(pivot, sign);
    else {
      plushBall(pivot, color, [sign * .06, -.24, 0], [.12, .28, .12]);
      plushBall(pivot, furMat, [sign * .07, -.48, .015], [.105, .12, .1]);
    }
    arms.push(pivot);
  }
  const legs = [];
  for (const sign of [-1, 1]) {
    const pivot = new T.Group();
    pivot.position.set(sign * (boss ? 0.25 : 0.16), 0.45, 0);
    body.add(pivot);
    plushBall(
      pivot,
      boss ? furMat : "#555d50",
      [0, -0.19, 0],
      boss ? [0.22, 0.28, 0.23] : [0.12, 0.24, 0.12],
    );
    plushBall(
      pivot,
      boss ? furMat : person.color,
      [0, -0.36, 0.08],
      boss ? [0.23, 0.13, 0.28] : [0.13, 0.09, 0.19],
    );
    if (boss) {
      const pad = mesh(pivot, new T.SphereGeometry(1, 24, 16), new T.MeshPhysicalMaterial({ color: "#b58d69", roughness: .95, sheen: .35 }), [0, -.465, .095], [.135, .02, .175]);
      pad.name = "soft-suede-paw-pad";
      addBossFurShell(pivot, [0, -.19, 0], [.22, .28, .23], 2);
      addBossFurShell(pivot, [0, -.36, .08], [.23, .13, .28], 2);
    }
    legs.push(pivot);
  }
  if (!boss)
    tube(
      fixed,
      furMat,
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
  // Preserve a separate head for eye-level POV, with the actor's own hands visible.
  head.removeFromParent();
  faceMesh?.removeFromParent();
  bake(head);
  if (faceMesh) head.add(faceMesh);
  bake(fixed);
  fixed.add(head);
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
    head,
    faceMesh,
    eyeHeight: boss ? 1.91 : 1.64,
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
  // Both grips belong to the arms: no activity object is positioned beside a
  // hand in world space. The same sockets will attach to wrist bones later.
  const fingerMaterial = getBossFurMaterial();
  const fingerContacts = [], grips = [];
  const smoothFinger = (parent, points, radius = .031) => {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    const finger = new T.Mesh(new T.TubeGeometry(curve, 12, radius, 7, false), fingerMaterial);
    finger.castShadow = true; finger.name = "plush-articulated-finger";
    parent.add(finger); fingerContacts.push(finger); return finger;
  };
  for (let side = 0; side < 2; side++) {
    const sign = side ? 1 : -1, grip = new T.Group();
    grip.name = side ? "right-hand-grip" : "left-hand-grip";
    grip.position.set(sign * .07, -.60, .065);
    boss.arms[side].add(grip); grips.push(grip);
    // Index and middle fingers cradle the cigarette from opposite sides; a
    // separate thumb closes beneath it. Every digit is a round curved volume.
    smoothFinger(grip, [[-.075, .095, -.025], [-.055, .04, -.014], [-.028, .018, .014], [-.018, .012, .053]], .030);
    smoothFinger(grip, [[.07, .085, -.02], [.048, .033, -.008], [.028, .006, .013], [.022, .003, .052]], .031);
    smoothFinger(grip, [[.074, -.05, -.04], [.045, -.033, -.011], [.01, -.029, .025], [-.025, -.014, .034]], .035);
    smoothFinger(grip, [[.093, .025, -.05], [.074, -.005, -.029], [.053, -.025, .006]], .027);
  }
  // Attach the lip marker to the actual reference patch, so face proportions
  // and future head articulation cannot leave a stale body-space mouth point.
  const mouthAnchor = new T.Object3D(); mouthAnchor.name = "boss-drawn-mouth-contact";
  mouthAnchor.position.copy(bossFacePoint(616, 793));
  mouthAnchor.userData.sourcePixel = [616, 793]; boss.faceMesh.add(mouthAnchor);
  const mouth = boss.body.worldToLocal(mouthAnchor.getWorldPosition(new T.Vector3()));
  const peakGrip = new T.Vector3(.18, 1.58, .50).sub(boss.arms[1].position).normalize()
    .multiplyScalar(grips[1].position.length()).add(boss.arms[1].position);
  const filterLength = peakGrip.distanceTo(mouth) - .005;
  const sets = Array.from({ length: 3 }, () => new T.Group());
  const smokingGrip = grips[1], cigarette = sets[0];
  cigarette.name = "cigarette-held-between-index-and-middle";
  smokingGrip.add(cigarette); boss.body.add(sets[1], sets[2]);
  const stick = (material, z, radius, length) => {
    const object = new T.Mesh(new T.CylinderGeometry(radius, radius, length, 12), typeof material === "string" ? mat(material) : material);
    object.position.z = z; object.rotation.x = Math.PI / 2; object.castShadow = true; cigarette.add(object); return object;
  };
  stick("#eee4d6", .055, .018, .31);
  stick("#b98a57", -(filterLength + .1) / 2, .019, filterLength - .1);
  // Narrow paper/filter seam and a porous, ashed tip give the tiny object a
  // recognizable construction without increasing its silhouette unnaturally.
  stick("#d0bc99", -.099, .0195, .008);
  stick("#716961", .208, .019, .025);
  const emberMaterial = new T.MeshStandardMaterial({ color: "#9e351d", emissive: "#ff651e", emissiveIntensity: 2.6, roughness: .9 });
  stick(emberMaterial, .224, .016, .008);
  const cigaretteTip = new T.Object3D(); cigaretteTip.name = "cigarette-emitter-at-ember";
  cigaretteTip.position.z = .231; cigarette.add(cigaretteTip);
  const cigaretteFilter = new T.Object3D(); cigaretteFilter.name = "cigarette-filter-lip-contact";
  cigaretteFilter.position.z = -filterLength; cigarette.add(cigaretteFilter);

  const handheld = sets[1]; handheld.name = "held-handheld-console";
  handheld.position.set(0, 1.055, .60);
  box(handheld, "#263530", [0, 0, 0], [.84, .14, .28]);
  for (const side of [-1, 1]) {
    const handle = new T.Mesh(new T.SphereGeometry(1, 16, 10), mat(side < 0 ? "#31586a" : "#9d4f48"));
    handle.position.set(side * .345, -.01, .012); handle.scale.set(.14, .105, .18); handheld.add(handle);
    cylinder(handheld, "#c4b994", [side * .31, .1, -.035], [.036, .02, .036]);
    for (const [x, z] of [[0, .025], [.025, 0], [0, -.025], [-.025, 0]])
      cylinder(handheld, "#e0c87f", [side * .335 + x, .101, .065 + z], [.01, .012, .01]);
  }
  box(handheld, "#101d24", [0, .076, 0], [.53, .012, .25]);
  const screen = document.createElement("canvas"); screen.width = 256; screen.height = 128;
  const screenCtx = screen.getContext("2d");
  const screenTexture = new T.CanvasTexture(screen); screenTexture.colorSpace = T.SRGBColorSpace;
  const display = new T.Mesh(new T.PlaneGeometry(.48, .22), new T.MeshStandardMaterial({ map: screenTexture, emissiveMap: screenTexture, emissive: "#ffffff", emissiveIntensity: 1.1, roughness: .23 }));
  display.rotation.x = -Math.PI / 2; display.position.y = .085; handheld.add(display);
  function drawGame(time) {
    screenCtx.fillStyle = "#11283c"; screenCtx.fillRect(0, 0, 256, 128);
    screenCtx.fillStyle = "#4c8b95";
    for (let i = 0; i < 5; i++) screenCtx.fillRect((i * 67 - time * 14) % 330 - 25, 36 + i % 2 * 15, 34, 63);
    screenCtx.fillStyle = "#69bda5"; screenCtx.fillRect(0, 96, 256, 32);
    screenCtx.fillStyle = "#e1b358"; screenCtx.fillRect(72, 65 - Math.max(0, Math.sin(time * 3)) * 20, 24, 31);
    screenCtx.fillStyle = "#c8e9ed"; screenCtx.fillRect(160, 82, 48, 7);
    screenCtx.fillStyle = "#f3edc5"; screenCtx.font = "bold 15px monospace"; screenCtx.fillText("ZUO QUEST", 10, 22);
    screenTexture.needsUpdate = true;
  }
  drawGame(0);
  const newspaperTexture = makeNewspaperTexture();
  const paperMaterial = new T.MeshStandardMaterial({ map: newspaperTexture, color: "#fff7e6", roughness: 1, side: T.DoubleSide });
  const newspaper = sets[2]; newspaper.name = "held-newspaper-with-turning-leaf";
  const leftPage = new T.Mesh(new T.PlaneGeometry(.54, .61, 8, 3), paperMaterial);
  leftPage.position.set(-.27, 1.04, .64); leftPage.rotation.y = -.14; newspaper.add(leftPage);
  const pageTurn = new T.Group(); pageTurn.position.set(0, 1.04, .65); newspaper.add(pageTurn);
  const rightPage = new T.Mesh(new T.PlaneGeometry(.54, .61, 12, 3), paperMaterial);
  rightPage.position.x = .27; pageTurn.add(rightPage);
  const positions = rightPage.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + .27;
    positions.setZ(i, Math.sin(x / .54 * Math.PI) * .035);
  }
  rightPage.geometry.computeVertexNormals();
  // Batch the fixed components without baking the moving grips or page hinge.
  bake(cigarette); bake(handheld);
  const smokeTexture = makeSmokeTexture(), smoke = [];
  for (let i = 0; i < 16; i++) {
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: smokeTexture, color: "#afb4b3", transparent: true, opacity: .4, depthWrite: false, toneMapped: false }));
    boss.root.add(sprite); smoke.push(sprite);
  }
  const savedRotations = boss.arms.map(a => a.quaternion.clone());
  const previousTime = { value: null }, vector = new T.Vector3(), target = new T.Vector3(), axis = new T.Vector3();
  const orient = new T.Quaternion(), desired = new T.Quaternion();
  const gripBody = new T.Vector3(), zAxis = new T.Vector3(0, 0, 1);
  const poseHand = (index, position, delta) => {
    const arm = boss.arms[index];
    vector.copy(grips[index].position).normalize();
    target.copy(position).sub(arm.position).normalize();
    desired.setFromUnitVectors(vector, target);
    savedRotations[index].slerp(desired, 1 - Math.exp(-delta * 12));
    arm.quaternion.copy(savedRotations[index]);
  };
  let lastGameFrame = -1;
  const update = (time, phase) => {
    const delta = previousTime.value === null ? .1 : Math.min(.1, Math.max(.001, time - previousTime.value));
    previousTime.value = time;
    boss.body.worldToLocal(mouthAnchor.getWorldPosition(mouth));
    const breath = Math.sin(time * 1.5) * .008;
    const wave = (Math.sin(time * Math.PI / 3 - Math.PI / 2) + 1) / 2;
    const lift = T.MathUtils.smoothstep(wave, .16, .8);
    if (phase === 0) {
      poseHand(0, new T.Vector3(-.58, .69, .32), delta);
      poseHand(1, target.set(.64, .88, .44).lerp(new T.Vector3(.18, 1.58, .50), lift), delta);
    } else if (phase === 1) {
      poseHand(0, new T.Vector3(-.365, 1.055 + breath, .63), delta);
      poseHand(1, new T.Vector3(.365, 1.055 + breath, .63), delta);
    } else {
      poseHand(0, new T.Vector3(-.47, .96 + breath, .65), delta);
      poseHand(1, new T.Vector3(.47, .96 + breath, .65), delta);
    }
    for (let i = 0; i < 2; i++) {
      const arm = boss.arms[i], grip = grips[i];
      gripBody.copy(grip.position).applyQuaternion(arm.quaternion).add(arm.position);
      if (i === 1 && phase === 0) {
        axis.copy(gripBody).sub(mouth).normalize();
        axis.lerp(new T.Vector3(.45, .10, .89), 1 - lift).normalize();
      } else axis.set(0, 0, 1);
      orient.setFromUnitVectors(zAxis, axis);
      grip.quaternion.copy(arm.quaternion).invert().multiply(orient);
    }
    const turn = (time % 7) / 7;
    pageTurn.rotation.y = phase === 2 && turn > .68 ? .14 + Math.sin((turn - .68) / .32 * Math.PI) * 2.7 : .14;
    handheld.rotation.z = phase === 1 ? Math.sin(time * 2) * .025 : 0;
    handheld.position.y = 1.055 + breath;
    fingerContacts.forEach((finger, i) => { finger.rotation.x = phase === 1 ? Math.sin(time * 8 + i * .7) * .075 : 0; });
    emberMaterial.emissiveIntensity = 1.8 + lift * 3;
    const frame = Math.floor(time * 12);
    if (phase === 1 && frame !== lastGameFrame) { drawGame(time); lastGameFrame = frame; }
  };
  return { sets, smoke, cigaretteTip, cigaretteFilter, mouthAnchor, pageTurn, update, smokingGrip, grips, fingerContacts, cigarette };
}
function makeSmokeTexture() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d"), gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,.7)"); gradient.addColorStop(.4, "rgba(255,255,255,.4)"); gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(canvas);
}
function makeNewspaperTexture() {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 640;
  const ctx = canvas.getContext("2d"); ctx.fillStyle = "#e9dfc9"; ctx.fillRect(0, 0, 512, 640);
  ctx.fillStyle = "#2e332c"; ctx.font = "bold 64px serif"; ctx.fillText("左左日報", 22, 82);
  ctx.fillRect(22, 100, 468, 4); ctx.font = "22px sans-serif"; ctx.fillText("THE OFFICE DAILY · 好點子發生中", 22, 132);
  ctx.fillStyle = "#5f7564"; ctx.fillRect(24, 160, 220, 180);
  ctx.fillStyle = "#b3c1a0"; ctx.fillRect(48, 200, 50, 115); ctx.fillRect(113, 180, 55, 135); ctx.fillRect(178, 224, 40, 91);
  ctx.fillStyle = "#40473c";
  for (let col = 0; col < 2; col++) for (let row = 0; row < 29; row++) {
    if (col === 0 && row < 11) continue;
    const width = 145 + ((row * 19 + col * 37) % 64);
    ctx.fillRect(24 + col * 240, 164 + row * 15, width, row % 7 === 0 ? 5 : 3);
  }
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}
