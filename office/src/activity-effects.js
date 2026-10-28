import * as T from "three";
import { ball, box, cylinder, bake, sprite } from "./shapes.js";
import { activityPhase, smoothstep } from "./motion.js";

// A small number of shared, animated props provide readable cause and effect.
// Each activity has one reserved destination, so one projectile/ball is enough.
export function createActivityEffects(scene, characters) {
  const root = new T.Group();
  root.name = "activity-effects";
  scene.add(root);
  const dart = new T.Group();
  root.add(dart);
  const shaft = cylinder(dart, "#b9c3bf", [0, 0, 0], [0.012, 0.19, 0.012]);
  shaft.rotation.x = Math.PI / 2;
  box(dart, "#d8ad61", [0, 0, -0.075], [0.07, 0.012, 0.065]);
  box(dart, "#aa6250", [0, 0, -0.075], [0.012, 0.07, 0.065]);
  bake(dart);
  const cue = ball(root, "#f8f0d6", [10.45, 1.15, -3], [0.065, 0.065, 0.065]);
  const target = new T.Vector3(11.3, 1.6, -9.37);
  const launch = new T.Vector3();
  const water = new T.InstancedMesh(
    new T.SphereGeometry(1, 4, 3),
    new T.MeshStandardMaterial({ color: "#c8e7e2", transparent: true, opacity: 0.4, roughness: 0.15, depthWrite: false }),
    12,
  );
  root.add(water);
  water.castShadow = false;
  water.name = "shower-water";
  const matrix = new T.Matrix4(), rotation = new T.Quaternion(), scale = new T.Vector3(0.009, 0.085, 0.009), position = new T.Vector3();
  const bubbles = new Map();
  for (const c of characters.filter((c) => c.person.id !== "zuozuo")) {
    const bubble = sprite("···", "#7d9585");
    bubble.name = "conversation-bubble";
    bubble.scale.set(0.28, 0.28, 1);
    bubble.position.set(0.35, 2.32, 0);
    c.root.add(bubble);
    bubble.visible = false;
    bubbles.set(c, bubble);
  }
  let launchCycle = -1, launcher = null;
  function update(time) {
    const throwing = characters.find((c) => c.action === "darts" && c.arrived && !c.path.length && c.state === "idle");
    const p = activityPhase(time, 4), cycle = Math.floor(time / 4);
    dart.visible = !!throwing && p >= 0.59 && p < 0.9;
    if (dart.visible) {
      if (cycle !== launchCycle || launcher !== throwing) {
        throwing.arms[1].updateWorldMatrix(true, false);
        launch.set(0.07, -0.45, 0.12);
        throwing.arms[1].localToWorld(launch);
        launchCycle = cycle;
        launcher = throwing;
      }
      const flight = Math.min(1, (p - 0.59) / 0.14);
      dart.position.lerpVectors(launch, target, flight);
      dart.position.y += Math.sin(flight * Math.PI) * 0.18;
      dart.lookAt(target.x, target.y, target.z - 0.1);
    }
    const billiards = characters.find((c) => c.action === "pool" && c.arrived && !c.path.length && c.state === "idle");
    cue.visible = !!billiards;
    if (billiards) {
      const p = activityPhase(time, 4.8);
      const roll = smoothstep((p - 0.64) / 0.26);
      cue.position.set(10.45 + Math.sin(roll * Math.PI) * 0.45, 1.15, -3 - roll * 0.88);
      cue.rotation.x = roll * 12;
    }
    water.visible = characters.some((c) => c.action === "shower" && c.arrived && !c.path.length && c.state === "idle");
    if (water.visible) {
      for (let i = 0; i < 12; i++) {
        const p = (time * 0.95 + i / 12) % 1;
        position.set(-11.2 + Math.sin(i * 2.4) * 0.15, 2.08 - p * 1.8, -7.68 + Math.cos(i * 3.2) * 0.13);
        matrix.compose(position, rotation, scale);
        water.setMatrixAt(i, matrix);
      }
      water.instanceMatrix.needsUpdate = true;
    }
    for (const [c, bubble] of bubbles) {
      bubble.visible = c.action === "chat" && c.arrived && !c.path.length && c.state === "idle";
      bubble.position.y = 2.32 + Math.sin(time * 2 + c.phase) * 0.035;
    }
  }
  update(0);
  return { update, root };
}
