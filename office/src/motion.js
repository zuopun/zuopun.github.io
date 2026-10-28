// Distance-driven locomotion and local avoidance. No renderer dependency: the
// same controller is exercised by the deterministic simulation tests.
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const damp = (a, b, lambda, dt) => b + (a - b) * Math.exp(-lambda * dt);
export const smoothstep = (x) => {
  x = clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
};

export function gaitAt(distance, strideLength = 0.76) {
  const phase = ((distance / strideLength) % 1 + 1) % 1;
  return [0, 0.5].map((offset) => {
    const p = (phase + offset) % 1;
    // A long planted stance and eased forward swing keep the shoe from skating.
    const stance = p < 0.62;
    const t = stance ? p / 0.62 : (p - 0.62) / 0.38;
    const z = stance ? 0.22 - t * 0.44 : -0.22 + smoothstep(t) * 0.44;
    const angle = -Math.asin(clamp((z - 0.07) / 0.39, -0.9, 0.9));
    return {
      angle,
      lift: stance ? 0 : Math.sin(t * Math.PI) * 0.075,
      planted: stance,
    };
  });
}

function priority(c) {
  let hash = 0;
  for (const ch of c.person.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (c.state === "working" ? 3 : c.person.id === "dd" ? 2 : 1) * 1e8 + hash;
}

export function segmentWalkable(from, to, isWalkable) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.06));
  for (let i = 1; i <= steps; i++)
    if (!isWalkable({ x: from.x + ((to.x - from.x) * i) / steps,
      z: from.z + ((to.z - from.z) * i) / steps })) return false;
  return true;
}

export function createMotionController({ characters, navigate, radius = 0.42 }) {
  let snapshot = [];
  function beginFrame() {
    snapshot = characters.filter((c) => c.person.id !== "zuozuo").map((c) => ({
      c, x: c.root.position.x, z: c.root.position.z,
      vx: c.motion?.vx || 0, vz: c.motion?.vz || 0,
      priority: priority(c), moving: c.path.length > 0,
    }));
  }
  function recoverRoute(c, m) {
    const from = c.root.position;
    const actors = snapshot.filter((o) => o.c !== c).map((o) => ({ x: o.x, z: o.z, radius: radius * 2 + 0.12 }));
    const around = navigate(from, m.finalTarget, actors);
    if (around.length) {
      c.path = around;
      m.detour = false;
      return;
    }
    // A single-width doorway can have no route around an opposing queue.
    // Walk into a nearby free refuge, then retry the original destination. The
    // retreat itself is a normal collision-tested route, never a teleport.
    const choices = [];
    for (const r of [1.25, 2, 3])
      for (let i = 0; i < 16; i++) {
        const a = i * TAU / 16;
        const p = { x: from.x + Math.cos(a) * r, z: from.z + Math.sin(a) * r };
        if (Math.abs(p.x) > 12.5 || p.z < -9.5 || p.z > 9.5 || !navigate.isWalkable(p)) continue;
        if (actors.some((o) => Math.hypot(p.x - o.x, p.z - o.z) < 1.15)) continue;
        let open = 0;
        for (let j = 0; j < 8; j++)
          if (navigate.isWalkable({ x: p.x + Math.cos(j * TAU / 8) * 0.65, z: p.z + Math.sin(j * TAU / 8) * 0.65 })) open++;
        choices.push({ ...p, score: r - open * 0.35 });
      }
    choices.sort((a, b) => a.score - b.score);
    for (const p of choices.slice(0, 8)) {
      const path = navigate(from, p, actors);
      if (path.length) {
        c.path = path;
        m.detour = true;
        return;
      }
    }
  }
  function advance(c, dt, maximumSpeed) {
    const m = c.motion ||= { distance: 0, speed: 0, vx: 0, vz: 0, blockedFor: 0, age: 0 };
    const from = c.root.position;
    m.age += dt;
    if (m.destination !== c.destination || m.intentState !== c.state || !m.finalTarget) {
      m.destination = c.destination;
      m.intentState = c.state;
      m.finalTarget = c.destination || c.path.at(-1);
      m.detour = false;
      m.checkpoint = { x: from.x, z: from.z, time: m.age };
    }
    m.checkpoint ||= { x: from.x, z: from.z, time: m.age };
    if (m.age - m.checkpoint.time > 1.6 + (priority(c) % 11) * 0.07) {
      if (Math.hypot(from.x - m.checkpoint.x, from.z - m.checkpoint.z) < 0.3 && m.finalTarget)
        recoverRoute(c, m);
      m.checkpoint = { x: from.x, z: from.z, time: m.age };
    }
    // Stand fully before leaving a chair. This also gives the chair time to pull out.
    const standing = 1 - smoothstep(((c.seatBlend || 0) - 0.05) / 0.65);
    m.speed = damp(m.speed, maximumSpeed * standing, 8, dt);
    let target = c.path[0];
    while (target && Math.hypot(target.x - from.x, target.z - from.z) < 0.035) {
      c.path.shift();
      target = c.path[0];
    }
    if (!target && m.detour) {
      m.detour = false;
      c.path = navigate(from, m.finalTarget);
      target = c.path[0];
    }
    if (!target) {
      m.vx = m.vz = m.speed = 0;
      return { distance: 0, arrived: true, blocked: false };
    }
    const dx = target.x - from.x, dz = target.z - from.z;
    const distance = Math.hypot(dx, dz), ux = dx / distance, uz = dz / distance;
    const travel = Math.min(distance, m.speed * dt);
    if (travel < 1e-8) return { distance: 0, arrived: false, blocked: false };
    const nearby = snapshot.filter((o) => o.c !== c && Math.hypot(o.x - from.x, o.z - from.z) < 2.4);
    const ownPriority = priority(c);
    // Anticipate an oncoming actor instead of waiting until their bodies touch.
    const opposing = nearby.find((o) => {
      const rx = o.x - from.x, rz = o.z - from.z;
      return rx * ux + rz * uz > 0 && Math.abs(rx * uz - rz * ux) < radius * 2.1 &&
        (!o.moving || o.vx * ux + o.vz * uz < 0.05);
    });
    const yielding = !!opposing && (opposing.priority > ownPriority || !opposing.moving);
    const clearance = radius * 2;
    let chosen = null, best = Infinity;
    // Both actors prefer their own right-hand side, so passing is deterministic.
    const angles = [0, -0.28, -0.55, -0.95, -1.4, 0.4, 0.8, 1.35];
    if (yielding && m.blockedFor > 0.35) angles.push(-1.9, 1.9, Math.PI);
    for (const angle of angles) {
      const sin = Math.sin(angle), cos = Math.cos(angle);
      const vx = (ux * cos - uz * sin) * travel;
      const vz = (uz * cos + ux * sin) * travel;
      const to = { x: from.x + vx, z: from.z + vz };
      if (!segmentWalkable(from, to, navigate.isWalkable)) continue;
      let collision = false, proximity = 0;
      for (const o of nearby) {
        const current = Math.hypot(from.x - o.x, from.z - o.z);
        const separation = Math.hypot(to.x - o.x, to.z - o.z);
        const otherTravel = o.moving ? Math.max(Math.hypot(o.vx, o.vz) * dt, travel * 0.5) : 0;
        // Permit only outward movement if actors started on the same grid point.
        if (separation < clearance + otherTravel && separation < current - 1e-5) {
          collision = true;
          break;
        }
        const horizon = yielding ? 0.38 : 0.18;
        const future = Math.hypot(
          to.x + (vx / dt) * horizon - (o.x + o.vx * horizon),
          to.z + (vz / dt) * horizon - (o.z + o.vz * horizon),
        );
        proximity += Math.max(0, clearance + 0.25 - future) * (yielding ? 2 : 0.5);
      }
      if (collision) continue;
      const score = (Math.hypot(target.x - to.x, target.z - to.z) - distance) / Math.max(travel, 0.001) +
        Math.abs(angle) * 0.08 + proximity * 2 + (angle > 0 ? 0.08 : 0);
      if (score < best) { best = score; chosen = { ...to, vx, vz }; }
    }
    if (!chosen) {
      m.vx = m.vz = 0;
      m.blockedFor += dt;
      return { distance: 0, arrived: false, blocked: true };
    }
    from.x = chosen.x;
    from.z = chosen.z;
    const moved = Math.hypot(chosen.vx, chosen.vz);
    m.distance += moved;
    m.vx = chosen.vx / dt;
    m.vz = chosen.vz / dt;
    m.blockedFor = best > 0 ? m.blockedFor + dt : 0;
    const angle = Math.atan2(m.vx, m.vz);
    c.root.rotation.y += Math.atan2(Math.sin(angle - c.root.rotation.y), Math.cos(angle - c.root.rotation.y)) * Math.min(1, dt * 10);
    if (Math.hypot(target.x - from.x, target.z - from.z) < 0.035) c.path.shift();
    if (!c.path.length && m.detour) {
      m.detour = false;
      c.path = navigate(from, m.finalTarget);
      return { distance: moved, arrived: !c.path.length, blocked: false };
    }
    const arrived = !c.path.length;
    if (arrived) m.speed = m.vx = m.vz = 0;
    return { distance: moved, arrived, blocked: false };
  }
  return { beginFrame, advance };
}

export function resetLegPlacement(c) {
  c.legs.forEach((leg) => {
    leg.userData ||= {};
    leg.userData.restY ??= leg.position.y;
    leg.position.y = leg.userData.restY;
    leg.position.z = 0;
  });
}

export function poseLocomotion(c, moved, dt) {
  const m = c.motion;
  const pace = moved / Math.max(dt, 0.001);
  m.poseBlend = damp(m.poseBlend || 0, pace > 0.05 ? 1 : 0, 12, dt);
  const blend = m.poseBlend;
  const gait = gaitAt(m.distance, c.state === "working" ? 0.95 : 0.76);
  gait.forEach((foot, i) => {
    const leg = c.legs[i];
    leg.rotation.x = foot.angle * blend;
    leg.position.y += (0.36 * (Math.cos(foot.angle) - 1) + 0.08 * Math.sin(foot.angle) + foot.lift) * blend;
    c.arms[i].rotation.x = -foot.angle * 0.42 * blend;
  });
  c.body.position.y = Math.sin(m.distance / 0.38 * TAU) ** 2 * 0.018 * blend;
  c.body.rotation.z = Math.sin(m.distance / 0.76 * TAU) * 0.025 * blend;
  c.body.rotation.x = (c.state === "working" ? 0.09 : 0.015) * blend;
  // Keep the remaining seated pose while the first stand-up frames settle.
  if (c.seatBlend > 0.05) {
    c.body.position.y += c.seatBlend * 0.17;
    c.legs.forEach((leg) => { leg.rotation.x -= c.seatBlend * 1.3; });
  }
}

export function activityPhase(time, duration) {
  return ((time % duration) + duration) % duration / duration;
}

// Refine the existing poses after the base animation. All timing is shared with
// the prop effects, so a dart leaves the hand at the actual throw release.
export function polishActivity(c, time, dt, characters) {
  if (c.person.id === "zuozuo" || c.path.length || !c.arrived || c.state !== "idle") return;
  const weight = c.activityBlend || 0;
  if (c.action === "pool") {
    const p = activityPhase(time, 4.8);
    const stroke = p < 0.58 ? 0.15 * Math.sin(p / 0.58 * Math.PI * 4) :
      p < 0.7 ? -0.55 * smoothstep((p - 0.58) / 0.12) : -0.55 * (1 - smoothstep((p - 0.7) / 0.3));
    c.body.rotation.x = 0.26 * weight;
    c.arms[0].rotation.x = -0.72 * weight;
    c.arms[0].rotation.z = 0.18 * weight;
    c.arms[1].rotation.x = (-0.82 + stroke) * weight;
    c.arms[1].rotation.z = -0.12 * weight;
  } else if (c.action === "darts") {
    const p = activityPhase(time, 4);
    const aim = p < 0.56 ? smoothstep(p / 0.18) : 1 - smoothstep((p - 0.56) / 0.13);
    c.arms[1].rotation.x = (-0.3 - aim * 2.05) * weight;
    c.arms[1].rotation.z = -0.13 * weight;
    c.body.rotation.y = (0.1 - aim * 0.2) * weight;
    c.activityProps.darts.visible = p < 0.59 || p > 0.9;
  } else if (c.action === "lift") {
    const curl = (1 - Math.cos(time * 1.65)) / 2;
    c.arms[1].rotation.x = (-0.1 - smoothstep(curl) * 1.4) * weight;
    c.body.rotation.z = -Math.sin(time * 1.65) * 0.018 * weight;
  } else if (c.action === "snack" || c.action === "drink") {
    const p = activityPhase(time, c.action === "drink" ? 5.2 : 3.8);
    const lift = p < 0.35 ? smoothstep(p / 0.35) : p < 0.64 ? 1 : 1 - smoothstep((p - 0.64) / 0.36);
    c.arms[1].rotation.x = (-0.35 - lift * 1.25) * weight;
    c.arms[1].rotation.z = -0.1 * lift * weight;
    c.body.rotation.x = -0.035 * lift * weight;
  } else if (c.action === "chat") {
    const partner = characters.find((o) => o !== c && o.action === "chat" && !o.path.length &&
      Math.hypot(o.root.position.x - c.root.position.x, o.root.position.z - c.root.position.z) < 2.4);
    if (partner) {
      const angle = Math.atan2(partner.root.position.x - c.root.position.x, partner.root.position.z - c.root.position.z);
      c.root.rotation.y += Math.atan2(Math.sin(angle - c.root.rotation.y), Math.cos(angle - c.root.rotation.y)) * Math.min(1, dt * 5);
      c.activityLabel = `與 ${partner.person.name} 聊聊近況`;
    }
    c.arms[1].rotation.x = (-0.65 + Math.sin(time * 2.4 + c.phase) * 0.25) * weight;
    c.arms[1].rotation.z = -0.3 * weight;
    c.arms[0].rotation.z = 0.12 * Math.sin(time * 1.7) * weight;
    c.body.rotation.x = Math.sin(time * 1.5 + c.phase) * 0.025 * weight;
  }
}
