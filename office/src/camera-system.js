import * as T from "three";

export const CAMERA_MODES = Object.freeze(["overview", "free", "follow", "pov"]);
const MODE_NAMES = { overview: "總覽", free: "自由飛行", follow: "跟隨", pov: "第一人稱" };
const STATE_NAMES = { working: "工作中", waiting: "等待確認", idle: "自由活動" };
const Y = new T.Vector3(0, 1, 0);
const clamp = T.MathUtils.clamp;
const editable = (target) => target?.closest?.("input, select, textarea, [contenteditable=true]");
const button = (text, title) => {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = text;
  element.title = title;
  return element;
};

/** Live camera rig. Does not move actors or change their status. update() runs after simulation. */
export function createCameraSystem({ camera, controls, renderer, characters, onSelect = () => {}, collisionRoots = [] }) {
  const canvas = renderer.domElement;
  const home = { position: camera.position.clone(), target: controls.target.clone(), fov: camera.fov };
  const disposers = [];
  const listen = (element, name, handler, options) => {
    element.addEventListener(name, handler, options);
    disposers.push(() => element.removeEventListener(name, handler, options));
  };
  const panel = document.createElement("section");
  panel.id = "camera-panel";
  panel.setAttribute("aria-label", "鏡頭控制");
  panel.innerHTML = `<div class="camera-topline"><div id="camera-modes" role="group" aria-label="鏡頭模式"></div><button type="button" id="camera-tour" aria-pressed="false" title="巡遊所有房間與夥伴">◈ 導覽</button><div id="camera-settings"></div></div><div class="camera-statusline"><label class="camera-person-label">視角人物<select id="camera-character" aria-label="切換視角人物"></select></label><div id="camera-hud" aria-live="polite"><strong id="camera-who"></strong><span id="camera-activity"></span><span id="camera-next"></span></div><div id="camera-flight" hidden><div id="camera-joystick" role="group" aria-label="移動搖桿"><span class="joystick-mark">＋</span><i></i></div><button type="button" data-flight="up" aria-label="飛高">↑</button><button type="button" data-flight="down" aria-label="飛低">↓</button></div></div><p id="camera-help"></p>`;
  document.querySelector("main").appendChild(panel);
  const $ = (id) => document.getElementById(id);
  const modeButtons = new Map();
  for (const name of CAMERA_MODES) {
    const b = button(MODE_NAMES[name], name === "free" ? "WASD 移動 · 滑鼠拖曳環顧 · Q/E 升降" : MODE_NAMES[name]);
    b.dataset.mode = name;
    b.id = `camera-${name}`;
    b.setAttribute("aria-pressed", String(name === "overview"));
    b.onclick = () => setMode(name);
    $("camera-modes").appendChild(b);
    modeButtons.set(name, b);
  }
  const selector = $("camera-character");
  for (const c of characters) {
    const option = document.createElement("option");
    option.value = c.person.id;
    selector.appendChild(option);
  }
  let selected = characters.find((c) => c.person.id === "zuozuo") || characters[0];
  let mode = "overview", tour = false, tourTime = 0, tourIndex = -1;
  let yaw = 0, pitch = 0, lookYaw = 0, lookPitch = 0, followDistance = 3.7;
  let transition = null, immersiveTransition = null, time = 0, hudTime = 0, hiddenActor = null, targetFov = camera.fov;
  let joystick = { x: 0, y: 0 }, flightVertical = 0;
  const keys = new Set(), pointers = new Map();
  const desiredPosition = new T.Vector3(), desiredTarget = new T.Vector3();
  const eye = new T.Vector3(), forward = new T.Vector3(), right = new T.Vector3();
  const targetQuaternion = new T.Quaternion(), bodyQuaternion = new T.Quaternion();
  const lookMatrix = new T.Matrix4(), ray = new T.Raycaster();
  const gesture = { distance: 0, x: 0, y: 0 };
  const rooms = [
    { name: "主位 · 左左", position: [3.4, 4.2, -3.8], target: [0, 2.6, -8.6] },
    { name: "開放辦公區", position: [7, 7, 7], target: [0, 1, 1] },
    { name: "接待區", position: [0, 4, 12], target: [-3.6, 1.3, 8.6] },
    { name: "休息室", position: [-6.8, 5.2, 8], target: [-10, 1, 3.5] },
    { name: "洗手間與淋浴", position: [-7.2, 5, -1.7], target: [-10.3, 1.3, -6.7] },
    { name: "遊戲室", position: [6.5, 5.5, -1.2], target: [10, 1, -5] },
    { name: "健身房", position: [6.5, 5.5, 8.6], target: [10, 1, 3.6] },
  ];
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "3D 辦公室；方向鍵環顧，1 至 9 選人，Tab 切換人物，Escape 回總覽");

  function activity(c) {
    if (c.person.id === "zuozuo" || c.person.id === "dd") return c.activityLabel || "巡視辦公室";
    if (c.path.length) return c.state === "working" ? "趕回自己的座位" : "前往下一個活動";
    return c.activityLabel || STATE_NAMES[c.state] || "自由活動";
  }
  function destination(c) {
    if (!c.destination) return c.person.id === "zuozuo" ? "下一幕：抽煙 · 電動 · 報紙" : "下一站：巡視夥伴";
    if (c.state !== "idle" && c.person.id !== "dd") return `${c.path.length ? "目的地" : "所在位置"}：${c.person.name} 的座位`;
    return `${c.path.length ? "下一站" : "所在位置"}：${c.destination.label || "辦公室"}`;
  }
  function textIfChanged(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }
  function syncUI() {
    selector.value = selected.person.id;
    for (const [i, option] of [...selector.options].entries()) {
      const c = characters[i];
      const text = `${c.person.name} · ${c.person.role} · ${activity(c)}`;
      if (option.textContent !== text) option.textContent = text;
    }
    textIfChanged($("camera-who"), `${selected.person.name} · ${STATE_NAMES[selected.state] || "自由活動"}`);
    textIfChanged($("camera-activity"), selected.note ? `${activity(selected)} · ${selected.note}` : activity(selected));
    textIfChanged($("camera-next"), tour && tourIndex < rooms.length ? `導覽：${rooms[Math.max(0, tourIndex)].name}` : destination(selected));
    for (const b of document.querySelectorAll("#roster button")) {
      const c = characters.find((item) => item.person.id === b.dataset.id);
      if (!c) continue;
      if (!b.querySelector(".roster-name")) {
        b.replaceChildren();
        for (const className of ["roster-name", "roster-role", "roster-activity"]) {
          const span = document.createElement("span"); span.className = className; b.appendChild(span);
        }
      }
      textIfChanged(b.querySelector(".roster-name"), c.person.name);
      textIfChanged(b.querySelector(".roster-role"), c.person.role);
      textIfChanged(b.querySelector(".roster-activity"), activity(c));
      if (b.getAttribute("aria-pressed") !== String(c === selected)) b.setAttribute("aria-pressed", String(c === selected));
      b.title = `${c.person.name} · ${c.person.role} · ${activity(c)}`;
    }
  }
  function refreshModeUI() {
    document.body.dataset.camera = mode;
    document.body.classList.toggle("immersive-camera", mode !== "overview" || tour);
    for (const [name, b] of modeButtons) b.setAttribute("aria-pressed", String(name === mode && !tour));
    $("camera-tour").setAttribute("aria-pressed", String(tour));
    $("camera-flight").hidden = mode !== "free";
    const touch = matchMedia("(pointer: coarse)").matches;
    $("camera-help").textContent = tour ? "自動走訪各房間與 15 位夥伴 · 拖曳或 Esc 結束導覽" : ({
      overview: touch ? "單指旋轉 · 雙指縮放／平移 · 點選角色" : "拖曳旋轉 · 滾輪縮放 · 右鍵平移 · 1–9 / Tab 選人 · Esc 總覽",
      free: touch ? "搖桿移動 · 滑動畫面環顧 · ↑↓ 升降 · 雙指縮放" : "WASD 移動 · 拖曳／雙擊鎖定滑鼠環顧 · Q/E 升降 · Shift 加速 · Esc 總覽",
      follow: touch ? "拖曳環顧 · 雙指拉近／拉遠 · 下拉選單切換人物" : "拖曳環顧 · 滾輪調整距離 · 1–9 / Tab 換人 · Esc 總覽",
      pov: touch ? "眼睛高度 · 拖曳轉頭 · 雙指調整視野 · 下拉選單換人" : "眼睛高度 · 拖曳轉頭 · 滾輪調整視野 · 1–9 / Tab 換人 · Esc 總覽",
    })[mode];
    syncUI();
  }
  function revealHead() {
    if (!hiddenActor) return;
    if (hiddenActor.head) hiddenActor.head.visible = true;
    if (hiddenActor.face) hiddenActor.face.visible = true;
    hiddenActor = null;
  }
  function applyPOVVisibility() {
    if (mode !== "pov") { revealHead(); return; }
    if (hiddenActor !== selected) revealHead();
    hiddenActor = selected;
    if (selected.head) selected.head.visible = false;
    // The rig remains alive and its torso, arms and activity props are still rendered.
    selected.marker.visible = false;
    selected.waitMarker.visible = false;
  }
  function setFov(value) {
    if (Math.abs(camera.fov - value) < 0.001) return;
    camera.fov = value;
    camera.updateProjectionMatrix();
  }
  function select(id, { focus = true, notify = true, inspect = false } = {}) {
    const c = typeof id === "string" ? characters.find((item) => item.person.id === id) : id;
    if (!c || !characters.includes(c)) return false;
    selected = c;
    if (mode === "follow" || mode === "pov") beginImmersiveTransition();
    lookYaw = 0;
    lookPitch = mode === "pov" && c.person.id === "zuozuo" ? 0.18 : 0;
    if (notify) onSelect(c, { inspect });
    if (mode === "overview" && focus && !tour) {
      c.root.updateWorldMatrix(true, true);
      const offset = new T.Vector3(2.3, 2.2, c.person.id === "zuozuo" ? 8.5 : 5.5).applyAxisAngle(Y, c.root.rotation.y);
      const target = c.root.position.clone().add(new T.Vector3(0, c.person.id === "zuozuo" ? 2.1 : 1.1, 0));
      transition = overviewTransition(target.clone().add(offset), target);
      controls.enabled = false;
    }
    applyPOVVisibility();
    syncUI();
    return true;
  }
  function overviewTransition(position, target) {
    return { position, target, fromPosition: camera.position.clone(), fromTarget: controls.target.clone(), start: time };
  }
  function beginImmersiveTransition() {
    immersiveTransition = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), start: time };
  }
  function applyCameraPose(position, quaternion, dt, damping) {
    if (immersiveTransition && (mode === "follow" || mode === "pov")) {
      const progress = clamp((time - immersiveTransition.start) / 0.85, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(immersiveTransition.position, position, eased);
      camera.quaternion.copy(immersiveTransition.quaternion).slerp(quaternion, eased);
      if (progress >= 1) immersiveTransition = null;
    } else {
      const blend = 1 - Math.exp(-damping * Math.min(dt, 0.1));
      camera.position.lerp(position, blend);
      camera.quaternion.slerp(quaternion, blend);
    }
  }
  function setMode(next, { reset = false } = {}) {
    if (!CAMERA_MODES.includes(next)) return false;
    tour = false;
    revealHead();
    mode = next;
    immersiveTransition = null;
    if (mode === "follow" || mode === "pov") beginImmersiveTransition();
    lookYaw = 0;
    // The raised boss naturally looks down toward the team; free look remains available.
    lookPitch = mode === "pov" && selected.person.id === "zuozuo" ? 0.18 : 0;
    keys.clear();
    joystick.x = joystick.y = flightVertical = 0;
    if (document.pointerLockElement === canvas && next !== "free") document.exitPointerLock?.();
    controls.enabled = false;
    if (mode === "overview") {
      transition = overviewTransition(home.position.clone(), home.target.clone());
      camera.near = 0.1;
      targetFov = home.fov;
      if (reset) { setFov(home.fov); camera.position.copy(home.position); controls.target.copy(home.target); transition = null; controls.enabled = true; controls.update(); }
    } else {
      transition = null;
      camera.near = mode === "pov" ? 0.025 : 0.08;
      targetFov = mode === "pov" ? 70 : mode === "free" ? 62 : 52;
      if (mode === "free") {
        camera.getWorldDirection(forward);
        yaw = Math.atan2(-forward.x, -forward.z);
        pitch = Math.asin(clamp(forward.y, -1, 1));
      }
    }
    camera.updateProjectionMatrix();
    refreshModeUI();
    return true;
  }
  function startTour() {
    if (tour) { setMode("overview"); return; }
    setMode("overview");
    tour = true; tourTime = 0; tourIndex = -1; transition = null;
    controls.enabled = false;
    targetFov = 48;
    refreshModeUI();
  }
  function pointCamera(position, target, dt, damping = 6) {
    lookMatrix.lookAt(position, target, Y);
    targetQuaternion.setFromRotationMatrix(lookMatrix);
    applyCameraPose(position, targetQuaternion, dt, damping);
    controls.target.copy(target);
  }
  function actorEye(c, vector) {
    c.body.updateWorldMatrix(true, false);
    vector.set(0, c.eyeHeight || (c.person.id === "zuozuo" ? 1.91 : 1.64), c.person.id === "zuozuo" ? 0.51 : 0.36);
    c.body.localToWorld(vector);
    return vector;
  }
  function followCollision(position, target) {
    if (!collisionRoots.length) return;
    forward.subVectors(position, target);
    const distance = forward.length();
    if (distance < 0.1) return;
    ray.set(target, forward.normalize()); ray.near = 0.25; ray.far = distance;
    const hit = ray.intersectObjects(collisionRoots, true).find((intersection) => intersection.object.isMesh && intersection.object.material?.visible !== false && !(intersection.object.material?.isMeshBasicMaterial && intersection.object.material?.transparent) && intersection.object.visible);
    if (hit && hit.distance > 0.35) position.copy(target).addScaledVector(forward, Math.max(0.3, hit.distance - 0.22));
  }
  function update(dt, elapsed = time + dt) {
    time = elapsed;
    setFov(T.MathUtils.damp(camera.fov, targetFov, 8, dt));
    hudTime += dt;
    if (hudTime > 0.25) { syncUI(); hudTime = 0; }
    if (tour) {
      tourTime += dt;
      const index = Math.floor(tourTime / 5) % (rooms.length + characters.length);
      if (index !== tourIndex) {
        tourIndex = index;
        if (index >= rooms.length) select(characters[index - rooms.length], { focus: false, notify: false });
        syncUI();
      }
      if (index < rooms.length) {
        desiredPosition.fromArray(rooms[index].position);
        desiredTarget.fromArray(rooms[index].target);
      } else {
        actorEye(selected, desiredTarget);
        const orbit = selected.root.rotation.y + Math.sin(tourTime * 0.18) * 0.35;
        desiredPosition.set(2.7, 1.6, 5.5).applyAxisAngle(Y, orbit).add(desiredTarget);
      }
      pointCamera(desiredPosition, desiredTarget, dt, 2.3);
      return;
    }
    if (mode === "overview") {
      if (transition) {
        const progress = clamp((time - transition.start) / 0.95, 0, 1);
        const eased = progress * progress * (3 - 2 * progress);
        camera.position.lerpVectors(transition.fromPosition, transition.position, eased);
        controls.target.lerpVectors(transition.fromTarget, transition.target, eased);
        camera.lookAt(controls.target);
        if (progress >= 1) { transition = null; controls.enabled = true; }
      }
      controls.update();
      return;
    }
    // Keyboard arrows are also available when pointer capture is impractical.
    const turn = dt * 1.25;
    if (keys.has("ArrowLeft")) turnLook(-turn, 0);
    if (keys.has("ArrowRight")) turnLook(turn, 0);
    if (keys.has("ArrowUp")) turnLook(0, -turn);
    if (keys.has("ArrowDown")) turnLook(0, turn);
    if (mode === "free") {
      targetQuaternion.setFromEuler(new T.Euler(pitch, yaw, 0, "YXZ"));
      camera.quaternion.slerp(targetQuaternion, 1 - Math.exp(-18 * dt));
      forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      let mx = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0) + joystick.x;
      let mz = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0) - joystick.y;
      const length = Math.max(1, Math.hypot(mx, mz)); mx /= length; mz /= length;
      const speed = (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 9 : 4) * dt;
      camera.position.addScaledVector(right, mx * speed).addScaledVector(forward, mz * speed);
      camera.position.y += ((keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0) + flightVertical) * speed;
      camera.position.y = clamp(camera.position.y, 0.35, 35);
      camera.position.x = clamp(camera.position.x, -35, 35);
      camera.position.z = clamp(camera.position.z, -30, 35);
      camera.getWorldDirection(forward);
      controls.target.copy(camera.position).addScaledVector(forward, 5);
      return;
    }
    actorEye(selected, eye);
    if (mode === "pov") {
      selected.body.getWorldQuaternion(bodyQuaternion);
      forward.set(0, 0, 1).applyQuaternion(bodyQuaternion);
      // Camera looks along the character's forward axis, with restrained independent head turns.
      const characterYaw = Math.atan2(-forward.x, -forward.z);
      targetQuaternion.setFromEuler(new T.Euler(-lookPitch, characterYaw - lookYaw, 0, "YXZ"));
      desiredPosition.copy(eye);
      if (selected.path.length) desiredPosition.y += Math.sin(time * 8) * 0.008;
      applyCameraPose(desiredPosition, targetQuaternion, dt, 18);
      forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      controls.target.copy(camera.position).addScaledVector(forward, 5);
      applyPOVVisibility();
    } else {
      const heading = selected.root.rotation.y + lookYaw;
      desiredTarget.copy(eye).add(new T.Vector3(0, -0.15, 0));
      desiredPosition.set(0.75, 0.7 + lookPitch * 1.8, -followDistance).applyAxisAngle(Y, heading).add(eye);
      desiredPosition.y = Math.max(0.3, desiredPosition.y);
      followCollision(desiredPosition, desiredTarget);
      pointCamera(desiredPosition, desiredTarget, dt, 7);
    }
  }
  function turnLook(dx, dy) {
    if (mode === "free") { yaw -= dx; pitch = clamp(pitch - dy, -1.35, 1.35); }
    else if (mode === "follow") { lookYaw -= dx; lookPitch = clamp(lookPitch + dy, -0.28, 1.3); }
    else if (mode === "pov") { lookYaw = clamp(lookYaw - dx, -1.35, 1.35); lookPitch = clamp(lookPitch + dy, -0.95, 1.05); }
  }
  function zoom(delta) {
    if (mode === "follow") followDistance = clamp(followDistance * Math.exp(delta * 0.0015), 1.3, 8);
    else if (mode === "pov" || mode === "free") targetFov = clamp(targetFov + delta * 0.025, 42, 88);
  }
  function readGesture() {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return;
    gesture.distance = Math.hypot(a.x - b.x, a.y - b.y);
    gesture.x = (a.x + b.x) / 2; gesture.y = (a.y + b.y) / 2;
  }
  listen(canvas, "pointerdown", (e) => {
    if (tour) { setMode("overview"); transition = null; controls.enabled = true; }
    if (mode === "overview") { if (transition) { transition = null; controls.enabled = true; } return; }
    canvas.focus({ preventScroll: true });
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture?.(e.pointerId);
    readGesture();
  });
  listen(canvas, "pointermove", (e) => {
    if (mode === "overview") return;
    if (document.pointerLockElement === canvas) { turnLook(e.movementX * 0.003, e.movementY * 0.003); return; }
    const before = pointers.get(e.pointerId); if (!before) return;
    const dx = e.clientX - before.x, dy = e.clientY - before.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size > 1) {
      const old = { ...gesture }; readGesture();
      zoom((old.distance - gesture.distance) * 5);
      turnLook((gesture.x - old.x) * 0.004, (gesture.y - old.y) * 0.004);
    } else turnLook(dx * 0.004, dy * 0.004);
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) listen(canvas, name, (e) => { pointers.delete(e.pointerId); readGesture(); });
  listen(canvas, "wheel", (e) => { if (mode !== "overview") { e.preventDefault(); zoom(e.deltaY); } }, { passive: false });
  listen(canvas, "dblclick", () => { if (mode === "free" && !matchMedia("(pointer: coarse)").matches) canvas.requestPointerLock?.()?.catch?.(() => {}); });
  listen(window, "blur", () => { keys.clear(); pointers.clear(); joystick.x = joystick.y = flightVertical = 0; });
  listen(document, "keydown", (e) => {
    if (e.key === "Escape") { setMode("overview"); return; }
    if (editable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[1-9]$/.test(e.key)) { select(characters[Number(e.key) - 1]); e.preventDefault(); return; }
    if (e.key === "Tab" && (e.target === canvas || e.target === document.body)) {
      const index = characters.indexOf(selected);
      select(characters[(index + (e.shiftKey ? -1 : 1) + characters.length) % characters.length]);
      e.preventDefault(); return;
    }
    if (/^(Key[WASDQE]|Arrow(Up|Down|Left|Right)|Shift(Left|Right))$/.test(e.code)) {
      if (mode !== "overview") { keys.add(e.code); e.preventDefault(); }
    }
  });
  listen(document, "keyup", (e) => keys.delete(e.code));
  selector.onchange = () => select(selector.value);
  $("camera-tour").onclick = startTour;
  const stick = $("camera-joystick"), knob = stick.querySelector("i");
  let stickPointer = null;
  const stickMove = (e) => {
    const rect = stick.getBoundingClientRect();
    let x = (e.clientX - rect.left - rect.width / 2) / 22, y = (e.clientY - rect.top - rect.height / 2) / 22;
    const length = Math.max(1, Math.hypot(x, y)); x /= length; y /= length;
    joystick = { x, y }; knob.style.transform = `translate(${x * 15}px, ${y * 15}px)`;
  };
  listen(stick, "pointerdown", (e) => { e.preventDefault(); stickPointer = e.pointerId; stick.setPointerCapture(e.pointerId); stickMove(e); });
  listen(stick, "pointermove", (e) => { if (e.pointerId === stickPointer) stickMove(e); });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) listen(stick, event, () => { stickPointer = null; joystick.x = joystick.y = 0; knob.style.transform = ""; });
  for (const b of panel.querySelectorAll("[data-flight]")) {
    listen(b, "pointerdown", (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); flightVertical = b.dataset.flight === "up" ? 1 : -1; });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) listen(b, event, () => { flightVertical = 0; });
  }
  refreshModeUI();
  return {
    update, select, setMode, syncUI, startTour,
    resetOverview: () => setMode("overview"),
    get selected() { return selected; },
    get mode() { return mode; },
    debug: () => ({ mode, selected: selected.person.id, tour, tourIndex, transition: !!transition || !!immersiveTransition,
      fov: camera.fov, position: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
      eye: actorEye(selected, new T.Vector3()).toArray(), headHidden: !!hiddenActor && hiddenActor.head?.visible === false,
      bodyVisible: selected.body.visible, followDistance, lookYaw, lookPitch, joystick: { ...joystick } }),
    dispose() { revealHead(); disposers.forEach((off) => off()); panel.remove(); delete document.body.dataset.camera; document.body.classList.remove("immersive-camera"); },
  };
}
