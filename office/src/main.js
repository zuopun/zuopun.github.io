import * as T from "three";
import { OrbitControls } from "../assets/vendor/OrbitControls.js";
import { PEOPLE, normalizeStatus } from "./state.js";
import { buildWorld } from "./world.js";
import { createCharacter, loadFace, makeBossProps } from "./characters.js";
import { optimizeScene, prepareStaticShadows } from "./performance.js";
import { createNavigator } from "./navigation.js";
const $ = (id) => document.getElementById(id),
  scene = new T.Scene();
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
  camera.position.set(mobile ? 17 : 19, mobile ? 25 : 25, mobile ? 29 : 34);
  controls.target.set(0, 0, mobile ? 1.5 : -1.5);
  controls.update();
}
reset();
$("reset").onclick = reset;
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
const floor = new T.Mesh(
  new T.PlaneGeometry(200, 200),
  new T.MeshStandardMaterial({ color: "#eee9df", roughness: 1 }),
);
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
];
let characters = [],
  selected = null,
  frame = 0,
  elapsed = 0,
  bossProps,
  performanceManager;
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
  const face = await loadFace();
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
  boss.root.position.set(0, 0.45, -8.65);
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
  for (const c of characters) {
    const b = document.createElement("button");
    b.textContent = c.person.name;
    b.dataset.id = c.person.id;
    b.setAttribute("aria-pressed", "false");
    b.onclick = () => {
      showCard(c);
      controls.target.copy(c.root.position).add(new T.Vector3(0, 1, 0));
      const offset = new T.Vector3(3, 3.2, 7).applyAxisAngle(
        new T.Vector3(0, 1, 0),
        c.root.rotation.y,
      );
      camera.position.copy(controls.target).add(offset);
    };
    $("roster").appendChild(b);
  }
  performanceManager = optimizeScene(scene, characters, world.chairs, {
    lodDistance: 68,
  });
  prepareStaticShadows(scene, characters, world.chairs);
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  characters.slice(0, 13).forEach(nextActivity);
  await poll();
  setInterval(poll, 60000);
  $("loading").hidden = true;
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
  if (hit)
    showCard(
      characters.find((c) => c.person.id === hit.object.userData.character),
    );
});
renderer.domElement.addEventListener("pointercancel", (e) => {
  activePointers.delete(e.pointerId);
  down = null;
  if (!activePointers.size) multiTouch = false;
});
const clock = new T.Clock();
let avg = 16,
  perfSamples = 0;
const smokeOrigin = new T.Vector3();
// Simulation is independent of drawing so behavior can be tested at fixed time steps.
export function stepSimulation(dt) {
  elapsed += dt;
  frame++;
  for (const c of characters) {
    const t = elapsed + c.phase,
      boss = c.person.id === "zuozuo",
      manager = c.person.id === "dd";
    c.body.rotation.set(0, 0, 0);
    c.body.position.set(0, 0, 0);
    c.body.scale.y = 1;
    for (const a of c.arms) a.rotation.set(0, 0, 0);
    for (const l of c.legs) l.rotation.set(0, 0, 0);
    for (const p of Object.values(c.activityProps)) p.visible = false;
    c.prop.visible = true;
    if (boss) {
      const phase = Math.floor(elapsed / 12) % 3;
      c.activityLabel = ["抽煙，想想下一個點子", "玩一局電動", "讀今天的報紙"][
        phase
      ];
      bossProps.sets.forEach((g, i) => (g.visible = i === phase));
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
        const k = (elapsed * 0.22 + i / 8) % 1;
        p.visible = phase === 0;
        p.position.set(
          smokeOrigin.x + k * 0.85,
          smokeOrigin.y + k * 1.2,
          smokeOrigin.z + k * 0.25,
        );
        p.scale.setScalar(0.025 + k * 0.1);
        p.material.opacity = (1 - k) * 0.22;
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
      const target = c.path[0],
        dx = target.x - c.root.position.x,
        dz = target.z - c.root.position.z,
        d = Math.hypot(dx, dz),
        speed = c.state === "working" ? 3 : manager ? 1.2 : 1.1;
      if (d <= Math.max(speed * dt, 0.000001)) {
        c.root.position.x = target.x;
        c.root.position.z = target.z;
        c.path.shift();
        if (!c.path.length) {
          c.arrived = true;
          c.dwell = manager ? 4 : 10 + Math.random() * 10;
          c.action = c.destination.action || "";
          c.activityLabel = c.destination.label || stateLabels[c.state];
          c.root.rotation.y = c.destination.angle ?? Math.PI;
        }
      } else {
        c.root.position.x += (dx / d) * speed * dt;
        c.root.position.z += (dz / d) * speed * dt;
        const angle = Math.atan2(dx, dz);
        c.root.rotation.y +=
          Math.atan2(
            Math.sin(angle - c.root.rotation.y),
            Math.cos(angle - c.root.rotation.y),
          ) * Math.min(1, dt * 12);
      }
      c.walkPhase = (c.walkPhase || 0) + dt * (c.state === "working" ? 14 : 8);
      const stride = Math.sin(c.walkPhase);
      c.legs[0].rotation.x = stride * 0.6;
      c.legs[1].rotation.x = -stride * 0.6;
      c.arms[0].rotation.x = -stride * 0.4;
      c.arms[1].rotation.x = stride * 0.4;
      c.body.position.y = Math.abs(stride) * 0.045;
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
  controls.update();
  stepSimulation(dt);
  performanceManager.update(camera);
  renderer.info.autoReset = false;
  renderer.info.reset();
  renderer.render(scene, camera);
  // Reduce resolution first, then shadows, when sustained rendering exceeds a mobile frame budget.
  avg = avg * 0.98 + Math.min(raw * 1000, 100) * 0.02;
  if (++perfSamples > 180 && avg > 30 && renderer.getPixelRatio() > 0.85) {
    renderer.setPixelRatio(Math.max(0.85, renderer.getPixelRatio() - 0.2));
    perfSamples = 0;
  } else if (perfSamples > 360 && avg > 33 && renderer.shadowMap.enabled) {
    renderer.shadowMap.enabled = false;
    scene.traverse((o) => {
      if (o.material) o.material.needsUpdate = true;
    });
    perfSamples = 0;
  }
}
animate();
function resizeScene() {
  const r = $("scene").getBoundingClientRect();
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
  renderer.setSize(r.width, r.height);
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
      let m;
      characters
        .find((c) => c.person.id === "zuozuo")
        .root.traverse((o) => {
          if (o.material?.map?.name === "official-zuozuo-flat-ink-face")
            m = o.material;
        });
      return { type: m?.type, toneMapped: m?.toneMapped };
    })(),
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
