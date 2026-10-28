import { createCameraSystem } from "./camera-system.js";
import { createMotionController, resetLegPlacement, poseLocomotion, polishActivity } from "./motion.js";
import { createActivityEffects } from "./activity-effects.js";
let motionController, activityEffects;
import * as T from "three";
import { OrbitControls } from "../assets/vendor/OrbitControls.js";
import { PEOPLE, normalizeStatus } from "./state.js";
import { buildWorld } from "./world.js";
import { createCharacter, loadFace, makeBossProps } from "./characters.js";
import { optimizeScene, prepareStaticShadows } from "./performance.js";
import { createNavigator } from "./navigation.js";
import { applyMaterials } from "./materials.js";
import { setupLighting } from "./lighting.js";
import { createQualitySystem } from "./quality.js";
import { createLoadingUI } from "./loading.js";
import { loadCrownAsset } from "./mesh-assets.js";
import { setBossCrownTemplate } from "./boss-details.js";
let cameraSystem, quality;
const $ = (id) => document.getElementById(id),
  scene = new T.Scene();
const loading = createLoadingUI($("loading"));
scene.background = new T.Color("#eee9df");
scene.fog = new T.Fog("#eee9df", 95, 170);
const mobile = matchMedia("(max-width:700px)").matches;
let renderer;
try {
  renderer = new T.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (error) {
  $("loading").hidden = true;
  $("error").hidden = false;
  $("error").textContent =
    "這個瀏覽器無法開啟立體辦公室，請開啟 WebGL 或換一個支援的瀏覽器。";
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 1.7));
renderer.setSize($("scene").clientWidth, $("scene").clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
$("scene").appendChild(renderer.domElement);
const camera = new T.PerspectiveCamera(
    mobile ? 48 : 38,
    $("scene").clientWidth / $("scene").clientHeight,
    0.1,
    200,
  ),
  controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 7;
controls.maxDistance = mobile ? 100 : 65;
controls.maxPolarAngle = Math.PI * 0.46;
controls.minPolarAngle = 0.18;
controls.enablePan = true;
controls.touches.ONE = T.TOUCH.ROTATE;
controls.touches.TWO = T.TOUCH.DOLLY_PAN;
controls.target.set(0, 0, 1);
function reset() {
  camera.position.set(mobile ? 17 : 14, mobile ? 25 : 22, mobile ? 29 : 32);
  controls.target.set(0, 1, mobile ? 1.5 : -1.5);
  controls.update();
}
reset();
$("reset").onclick = () => cameraSystem ? cameraSystem.resetOverview() : reset();
scene.add(new T.HemisphereLight("#fff9df", "#a4b3a0", 1.8));
const sun = new T.DirectionalLight("#fff2d0", 2.5);
sun.position.set(-15, 28, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, {
  left: -20,
  right: 20,
  top: 20,
  bottom: -20,
  near: 1,
  far: 65,
});
sun.shadow.normalBias = 0.04;
sun.shadow.bias = -0.0001;
scene.add(sun);
// A dedicated soft key and rim establish the crowned host as the focal point.
const hero = new T.SpotLight("#fff0ce", 12, 18, 0.65, 0.85, 1.5);
hero.position.set(-3, 7, -4);
hero.target.position.set(0, 2.6, -8.65);
scene.add(hero, hero.target);
const heroRim = new T.PointLight("#ffd28c", 6, 7, 2);
heroRim.position.set(1.5, 4.2, -10);
scene.add(heroRim);
const floor = new T.Mesh(
  new T.PlaneGeometry(200, 200),
  new T.MeshStandardMaterial({ color: "#eee9df", roughness: 1 }),
);
floor.material.userData.preserveMaterial = true;
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.86;
floor.receiveShadow = true;
scene.add(floor);
const world = buildWorld(scene, PEOPLE),
  navigate = createNavigator(world.obstacles);
const activities = [
  {
    x: -10,
    z: 2.5,
    angle: -Math.PI / 2,
    action: "drink",
    label: "在休息室喝飲料",
  },
  {
    x: -10.5,
    z: 5.5,
    angle: 0,
    action: "nap",
    label: "在長椅小睡",
    pose: { x: -10.6, z: 6.5 },
  },
  { x: -7.5, z: 1.7, angle: Math.PI, action: "snack", label: "在零食櫃找點心" },
  { x: 8, z: -6.5, angle: Math.PI, action: "arcade", label: "在娛樂間打電動" },
  { x: 10, z: -2, angle: Math.PI, action: "pool", label: "在娛樂間打撞球" },
  {
    x: 11.5,
    z: -7.5,
    angle: Math.PI,
    action: "darts",
    label: "在娛樂間射飛鏢",
  },
  { x: 8.5, z: 3.5, angle: Math.PI, action: "run", label: "在健身房跑步" },
  { x: 10.5, z: 4, angle: Math.PI, action: "lift", label: "在健身房舉啞鈴" },
  { x: -9, z: -6.5, angle: Math.PI, action: "wash", label: "在洗手間洗手" },
  { x: -11, z: -6.5, angle: Math.PI, action: "shower", label: "在淋浴間沖澡" },
  { x: -8.3, z: 4, angle: 0, action: "chat", label: "在休息室聊聊近況" },
  { x: -8.3, z: 5.4, angle: Math.PI, action: "chat", label: "在休息室聊聊近況" },
  { x: 0, z: 9, angle: Math.PI / 2, action: "chat", label: "在接待區交流想法" },
  { x: 1.5, z: 9, angle: -Math.PI / 2, action: "chat", label: "在接待區交流想法" },
];
let characters = [],
  selected = null,
  frame = 0,
  elapsed = 0,
  bossProps,
  performanceManager,
  materials,
  lighting;
const stateLabels = {
  working: "⚙ 工作中",
  idle: "自由活動",
  waiting: "! 等待左左確認",
};
function moveTo(c, target) {
  c.destination = target;
  c.path = navigate(c.root.position, target);
  c.action = "";
  c.dwell = 0;
  c.arrived = false;
}
function nextActivity(c) {
  const occupied = new Set(
    characters
      .filter((other) => other !== c && other.state === "idle")
      .map((other) => other.destination),
  );
  let choices = activities.filter(
    (a) => a !== c.destination && !occupied.has(a),
  );
  if (!choices.length) choices = activities.filter((a) => a !== c.destination);
  moveTo(c, choices[Math.floor(Math.random() * choices.length)]);
}
function showCard(c) {
  selected = c;
  document.body.classList.add("has-selection");
  $("card").hidden = false;
  updateCard();
  for (const b of $("roster").children)
    b.setAttribute("aria-pressed", String(b.dataset.id === c.person.id));
}
function updateCard() {
  if (!selected) return;
  const c = selected;
  $("card-id").textContent = c.person.id.toUpperCase();
  $("card-name").textContent = c.person.name;
  $("card-role").textContent = c.person.role;
  $("card-state").textContent =
    c.person.id === "zuozuo"
      ? c.activityLabel
      : c.person.id === "dd"
        ? "巡視辦公室"
        : stateLabels[c.state];
  $("card-note").textContent =
    c.note || (c.path.length ? "正在前往目的地" : c.activityLabel);
}
$("close").onclick = () => {
  selected = null;
  document.body.classList.remove("has-selection");
  $("card").hidden = true;
  for (const b of $("roster").children) b.setAttribute("aria-pressed", "false");
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $("close").click();
});
async function poll() {
  let status,
    ok = true;
  try {
    const response = await fetch(new URL("../status.json", import.meta.url), {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw Error("status unavailable");
    status = await response.json();
    if (
      !status ||
      typeof status.bots !== "object" ||
      Array.isArray(status.bots) ||
      status.bots === null
    )
      throw Error("invalid status");
    for (const [id, entry] of Object.entries(status.bots)) {
      if (
        PEOPLE.some((p) => p.id === id) &&
        (!entry ||
          !["working", "idle", "waiting"].includes(entry.state) ||
          (entry.note !== undefined && typeof entry.note !== "string"))
      )
        throw Error("invalid entry");
    }
  } catch {
    ok = false;
    status = null;
  }
  const normalized = normalizeStatus(status);
  for (const c of characters.slice(0, 13)) {
    const next = normalized[c.person.id];
    if (c.state !== next.state) {
      c.state = next.state;
      if (c.state === "idle") nextActivity(c);
      else moveTo(c, c.desk);
    }
    c.note = next.note;
  }
  $("sync").textContent = ok ? "公司日常 · 狀態已同步" : "自由日常 · 全員閒置";
  updateCard();
}
try {
  const [face, crown] = await Promise.all([loadFace(), loadCrownAsset()]);
  setBossCrownTemplate(crown);
  loading.update("reference");
  for (const [i, person] of PEOPLE.entries()) {
    const c = createCharacter(person, face);
    c.desk = world.desks[i];
    c.root.position.set(c.desk.x, 0, c.desk.z);
    c.seatBlend = 0;
    scene.add(c.root);
    characters.push(c);
  }
  const boss = createCharacter(
    {
      id: "zuozuo",
      name: "左左",
      role: "公司老闆 · 永遠的主位",
      color: "#835736",
    },
    face,
  );
  boss.root.position.set(0, 1.03, -8.65);
  boss.root.scale.setScalar(1.25);
  scene.add(boss.root);
  characters.push(boss);
  bossProps = makeBossProps(boss);
  const dd = createCharacter(
    {
      id: "dd",
      name: "DD",
      role: "主管 · 巡視與照顧每個夥伴",
      color: "#5d6e73",
      style: "suit",
    },
    face,
  );
  dd.root.position.set(6, 0, 8);
  scene.add(dd.root);
  characters.push(dd);
  motionController = createMotionController({ characters, navigate });
  activityEffects = createActivityEffects(scene, characters);
  for (const c of characters) {
    const b = document.createElement("button");
    b.textContent = c.person.name;
    b.dataset.id = c.person.id;
    b.setAttribute("aria-pressed", "false");
    b.onclick = () => cameraSystem.select(c, { focus: true, inspect: true });
    $("roster").appendChild(b);
  }
  performanceManager = optimizeScene(scene, characters, world.chairs, {
    lodDistance: 68,
  });
  materials = await applyMaterials(scene, { renderer, characters, onProgress: loading.asset });
  lighting = await setupLighting(renderer, scene, sun, { world, onProgress: loading.asset });
  cameraSystem = createCameraSystem({
    camera, controls, renderer, characters,
    collisionRoots: [world.root],
    onSelect: (c, { inspect }) => { if (inspect || selected) showCard(c); },
  });
  prepareStaticShadows(scene, characters, world.chairs);
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  quality = createQualitySystem({ renderer, scene, camera, performanceManager,
    materials, lighting, worldRoot: world.root });
  await quality.ready;
  quality.mount($("camera-settings"));
  characters.slice(0, 13).forEach(nextActivity);
  await poll();
  setInterval(poll, 60000);
  loading.finish();
} catch (error) {
  console.error(error);
  $("loading").hidden = true;
  $("error").hidden = false;
  $("error").textContent = "辦公室素材載入失敗，請重新整理再試一次。";
  throw error;
}
const pointer = new T.Vector2(),
  ray = new T.Raycaster();
let down = null;
const activePointers = new Set();
let multiTouch = false;
renderer.domElement.addEventListener("pointerdown", (e) => {
  activePointers.add(e.pointerId);
  if (activePointers.size > 1) multiTouch = true;
  down = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener("pointerup", (e) => {
  activePointers.delete(e.pointerId);
  if (multiTouch) {
    if (!activePointers.size) multiTouch = false;
    return;
  }
  if (!down || Math.hypot(down.x - e.clientX, down.y - e.clientY) > 6) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    (-(e.clientY - rect.top) / rect.height) * 2 + 1,
  );
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(
    characters.map((c) => c.hit),
    false,
  )[0];
  if (hit) cameraSystem.select(hit.object.userData.character, { focus: false, inspect: true });
});
renderer.domElement.addEventListener("pointercancel", (e) => {
  activePointers.delete(e.pointerId);
  down = null;
  if (!activePointers.size) multiTouch = false;
});
const clock = new T.Clock();
let avg = 16;
const smokeOrigin = new T.Vector3();
// Simulation is independent of drawing so behavior can be tested at fixed time steps.
export function stepSimulation(dt) {
  elapsed += dt;
  frame++;
  motionController.beginFrame();
  for (const c of characters) {
    const t = elapsed + c.phase,
      boss = c.person.id === "zuozuo",
      manager = c.person.id === "dd";
    c.body.rotation.set(0, 0, 0);
    c.body.position.set(0, 0, 0);
    c.body.scale.y = 1;
    for (const a of c.arms) a.rotation.set(0, 0, 0);
    for (const l of c.legs) l.rotation.set(0, 0, 0);
    resetLegPlacement(c);
    for (const p of Object.values(c.activityProps)) p.visible = false;
    c.prop.visible = true;
    if (boss) {
      const phase = Math.floor(elapsed / 12) % 3;
      c.activityLabel = ["抽煙，想想下一個點子", "玩一局電動", "讀今天的報紙"][
        phase
      ];
      bossProps.sets.forEach((g, i) => (g.visible = i === phase));
      bossProps.update(elapsed, phase);
      c.body.position.y = Math.sin(t * 1.4) * 0.015;
      c.legs.forEach((l) => (l.rotation.x = -1.2));
      c.arms[0].rotation.x = phase === 0 ? -0.2 : -1.3;
      c.arms[1].rotation.x = phase === 0 ? -1.9 : -1.3;
      c.arms[0].rotation.z = phase === 0 ? 0 : 0.35;
      c.arms[1].rotation.z = phase === 0 ? -0.05 : -0.35;
      if (phase === 1)
        c.arms.forEach((a, i) => (a.rotation.x += Math.sin(t * 7 + i) * 0.045));
      bossProps.cigaretteTip.getWorldPosition(smokeOrigin);
      c.root.worldToLocal(smokeOrigin);
      bossProps.smoke.forEach((p, i) => {
        const k = (elapsed * 0.22 + i / bossProps.smoke.length) % 1;
        p.visible = phase === 0;
        p.position.set(
          smokeOrigin.x + k * 0.95,
          smokeOrigin.y + k * 1.6,
          smokeOrigin.z + k * 0.3,
        );
        p.scale.setScalar(0.07 + k * 0.25);
        p.material.opacity = (1 - k) * 0.48;
      });
      continue;
    }
    if (manager && c.path.length === 0) {
      c.dwell -= dt;
      if (c.dwell <= 0) {
        const target =
          characters[(c.patrolIndex = (c.patrolIndex ?? -1) + 1) % 13].desk;
        moveTo(c, {
          x: target.x + 1.65,
          z: target.z,
          angle: -Math.PI / 2,
          label: "查看夥伴的進度",
          action: "inspect",
        });
      }
    }
    const moving = c.path.length > 0;
    c.activityBlend = T.MathUtils.damp(
      c.activityBlend || 0,
      moving ? 0 : 1,
      5,
      dt,
    );
    c.seatBlend = T.MathUtils.damp(
      c.seatBlend || 0,
      !moving && c.arrived && c.state !== "idle" ? 1 : 0,
      6,
      dt,
    );
    if (c.desk?.chair)
      c.desk.chair.position.z = c.desk.chairZ + (1 - c.seatBlend) * 0.35;

    if (moving) {
      const result = motionController.advance(c, dt, c.state === "working" ? 3 : manager ? 1.2 : 1.1);
      poseLocomotion(c, result.distance, dt);
      if (result.arrived) {
        c.arrived = true;
        c.dwell = manager ? 4 : 10 + Math.random() * 10;
        c.action = c.destination.action || "";
        c.activityLabel = c.destination.label || stateLabels[c.state];
        c.root.rotation.y = c.destination.angle ?? Math.PI;
      }
    } else if (c.arrived && (c.state === "working" || c.state === "waiting")) {
      c.root.rotation.y = Math.PI;
      c.body.position.y = 0.17 * (c.seatBlend || 0);
      c.legs.forEach((l) => (l.rotation.x = -1.3 * (c.seatBlend || 0)));
      c.arms.forEach(
        (a, i) => (a.rotation.x = -1.3 + Math.sin(t * 9 + i * 2) * 0.055),
      );
      c.prop.visible = false;
      if (c.state === "waiting") {
        c.arms[1].rotation.z = -2.6 + Math.sin(t * 3) * 0.08;
        c.arms[1].rotation.x = 0.1;
      }
    } else if (!manager) {
      c.dwell -= dt;
      if (c.dwell <= 0) nextActivity(c);
      c.prop.visible = false;
      const a = c.action;
      if (["drink", "snack"].includes(a)) {
        c.arms[1].rotation.x = -1.5 + Math.sin(t * 1.2) * 0.25;
        c.activityProps.drink.visible = true;
      }
      if (a === "nap") {
        c.body.rotation.z = (Math.PI / 2) * c.activityBlend;
        c.body.position.y = 1.1 * c.activityBlend;
        c.body.position.x = 0.7;
        c.body.position.x +=
          (c.destination.pose.x - c.root.position.x) * c.activityBlend;
        c.body.position.z +=
          (c.destination.pose.z - c.root.position.z) * c.activityBlend;
        c.body.scale.y = 1 + Math.sin(t * 1.3) * 0.012;
      } else c.body.scale.y = 1;
      if (a === "run") {
        c.legs.forEach(
          (l, i) => (l.rotation.x = Math.sin(t * 13 + i * Math.PI) * 0.7),
        );
        c.arms.forEach(
          (l, i) => (l.rotation.x = Math.sin(t * 13 + i * Math.PI) * 0.6),
        );
        c.body.position.y = 0.3 + Math.abs(Math.sin(t * 13)) * 0.04;
      }
      if (a === "pool") {
        c.activityProps.pool.visible = true;
        c.arms[1].rotation.x = -0.5 + Math.sin(t * 1.5) * 0.2;
        c.body.rotation.x = 0.2;
      }
      if (a === "darts") {
        c.activityProps.darts.visible = true;
        c.arms[1].rotation.x = -1.5 + Math.sin(t * 2.5) * 0.7;
      }
      if (a === "lift") {
        c.activityProps.lift.visible = true;
        c.arms[1].rotation.x = -0.8 + Math.sin(t * 2) * 0.7;
      }
      if (["arcade", "wash", "shower"].includes(a))
        c.arms.forEach(
          (arm, i) =>
            (arm.rotation.x =
              -(a === "shower" ? 2 : 0.8) + Math.sin(t * 4 + i) * 0.15),
        );
    }
    polishActivity(c, elapsed, dt, characters);
    if (manager) c.arms[1].rotation.x = -0.7;
    if (c.action === "shower" && !moving) {
      c.body.position.y = -0.12;
      c.marker.visible = false;
    }
    c.marker.visible = c.state === "working";
    c.waitMarker.visible = c.state === "waiting";
    c.marker.position.y = c.waitMarker.position.y =
      2.35 + Math.sin(t * 2) * 0.04;
  }
  // Slide the frosted door open for passage, then close it for privacy.
  const passingShower = characters.some(
    (c) =>
      c.path.length &&
      Math.abs(c.root.position.x + 11.2) < 1.2 &&
      Math.abs(c.root.position.z + 6) < 1.3,
  );
  world.showerDoor.position.x = T.MathUtils.damp(
    world.showerDoor.position.x,
    passingShower ? 1.65 : 0,
    12,
    dt,
  );
  activityEffects.update(elapsed);
  if (frame % 20 === 0) updateCard();
}
function animate() {
  requestAnimationFrame(animate);
  if (document.hidden) {
    clock.getDelta();
    return;
  }
  const raw = clock.getDelta(),
    dt = Math.min(raw, 0.05);
  stepSimulation(dt);
  cameraSystem.update(Math.min(raw, 0.1), performance.now() / 1000);
  performanceManager.update(camera);
  renderer.info.autoReset = false;
  renderer.info.reset();
  quality.render(dt, { mode: cameraSystem.debug().mode,
    focusDistance: camera.position.distanceTo(controls.target) });
  avg = avg * 0.98 + Math.min(raw * 1000, 100) * 0.02;
}
animate();
function resizeScene() {
  const r = $("scene").getBoundingClientRect();
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
  quality.resize(r.width, r.height);
}
new ResizeObserver(resizeScene).observe($("scene"));
addEventListener("resize", resizeScene);
// Read-only diagnostics for browser smoke tests; no status override or production controls.
Object.defineProperty(window, "officeDebug", {
  value: () => ({
    characters: characters.map((c) => ({
      id: c.person.id,
      state: c.state,
      action: c.action,
      roleAccessories: c.roleAccessories,
      desk: c.desk ? { x: c.desk.x, z: c.desk.z } : null,
      arrived: !!c.arrived,
      moving: !!c.path.length,
      workingMarker: c.marker.visible,
      waitingMarker: c.waitMarker.visible,
      handRaised: c.arms[1].rotation.z < -2,
      seated: c.legs[0].rotation.x < -1,
      screen: (() => {
        const rect = $("scene").getBoundingClientRect();
        const p = c.root.position
          .clone()
          .add(new T.Vector3(0, 1.6, 0))
          .project(camera);
        return {
          x: rect.left + ((p.x + 1) * rect.width) / 2,
          y: rect.top + ((1 - p.y) * rect.height) / 2,
        };
      })(),
      x: c.root.position.x,
      z: c.root.position.z,
    })),
    showerDoorOpen: world.showerDoor.position.x / 1.65,
    target: controls.target.toArray(),
    faceMaterial: (() => {
      const face = characters.find((c) => c.person.id === "zuozuo").faceMesh;
      const m = face.material, rect = $("scene").getBoundingClientRect();
      face.updateWorldMatrix(true, false);
      const project = (x, y) => {
        const p = face.localToWorld(new T.Vector3((x - 616) / 505, (687 - y) / 505, 0)).project(camera);
        return { x: rect.left + (p.x + 1) * rect.width / 2,
          y: rect.top + (1 - p.y) * rect.height / 2, depth: p.z };
      };
      let visible = true;
      for (let o = face; o; o = o.parent) visible &&= o.visible;
      return { type: m.type, toneMapped: m.toneMapped,
        source: m.map.image.src, officialSource: m.map.userData.officialSource,
        visible, samples: [[616,510],[460,745],[750,810],[490,575],[725,625]].map(([x,y]) => ({sourcePixel:{x,y},screen:project(x,y)})),
        outline: [[357,473],[875,473],[875,900],[357,900]].map(([x,y]) => project(x,y)) };
    })(),
    cameraSystem: cameraSystem.debug(),
    quality: quality.stats(),
    materials: materials.stats(),
    lighting: lighting.stats(),
    performance: performanceManager.stats(),
    camera: camera.position.toArray(),
    distance: camera.position.distanceTo(controls.target),
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    frameMs: avg,
    pixelRatio: renderer.getPixelRatio(),
    bossPhase: Math.floor(elapsed / 12) % 3,
  }),
});
