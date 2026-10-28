const step = 0.25,
  minX = -12.5,
  minZ = -9.5,
  W = 101,
  H = 77;
export function createNavigator(obstacles) {
  const point = (i) => ({
    x: minX + (i % W) * step,
    z: minZ + Math.floor(i / W) * step,
  });
  const index = (p) =>
    Math.max(0, Math.min(H - 1, Math.round((p.z - minZ) / step))) * W +
    Math.max(0, Math.min(W - 1, Math.round((p.x - minX) / step)));
  const blocked = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const p = point(i);
    if (
      obstacles.some(
        (o) =>
          Math.abs(p.x - o.x) < o.w / 2 + 0.5 &&
          Math.abs(p.z - o.z) < o.d / 2 + 0.5,
      )
    )
      blocked[i] = 1;
  }
  function nearest(i, unavailable = blocked) {
    if (!unavailable[i]) return i;
    let best = -1,
      dist = Infinity;
    const a = point(i);
    for (let j = 0; j < W * H; j++) {
      if (unavailable[j]) continue;
      const b = point(j),
        d = (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
      if (d < dist) {
        best = j;
        dist = d;
      }
    }
    return best;
  }
  const route = (from, to, actors = []) => {
    // Optional actor discs are used only for temporary avoidance replans. Static
    // furniture clearance remains the same half metre for every route.
    const unavailable = actors.length ? blocked.slice() : blocked;
    for (const actor of actors) {
      const r = actor.radius ?? 0.94;
      const x0 = Math.max(0, Math.floor((actor.x - r - minX) / step));
      const x1 = Math.min(W - 1, Math.ceil((actor.x + r - minX) / step));
      const z0 = Math.max(0, Math.floor((actor.z - r - minZ) / step));
      const z1 = Math.min(H - 1, Math.ceil((actor.z + r - minZ) / step));
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) {
          const p = point(z * W + x);
          if (Math.hypot(p.x - actor.x, p.z - actor.z) < r)
            unavailable[z * W + x] = 1;
        }
    }
    const start = nearest(index(from), unavailable),
      end = nearest(index(to));
    // An occupied goal is not silently shifted to another actor's chair.
    if (unavailable[end]) return [];
    const open = [],
      g = new Float32Array(W * H).fill(Infinity),
      parent = new Int32Array(W * H).fill(-1);
    g[start] = 0;
    const push = (entry) => {
      let i = open.length;
      open.push(entry);
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (open[p].f <= entry.f) break;
        open[i] = open[p];
        i = p;
      }
      open[i] = entry;
    };
    const pop = () => {
      const first = open[0], last = open.pop();
      if (open.length) {
        let i = 0;
        while (i * 2 + 1 < open.length) {
          let child = i * 2 + 1;
          if (child + 1 < open.length && open[child + 1].f < open[child].f) child++;
          if (open[child].f >= last.f) break;
          open[i] = open[child];
          i = child;
        }
        open[i] = last;
      }
      return first;
    };
    const goal = point(end);
    const h = (i) => {
      const p = point(i);
      return Math.abs(p.x - goal.x) + Math.abs(p.z - goal.z);
    };
    push({ i: start, g: 0, f: h(start) });
    while (open.length) {
      const entry = pop(), current = entry.i;
      if (entry.g !== g[current]) continue;
      if (current === end) {
        const path = [];
        let i = end;
        while (i !== start) {
          path.unshift(point(i));
          i = parent[i];
        }
        // Keep exact endpoints when they are in the validated free cell.
        if (
          !obstacles.some(
            (o) =>
              Math.abs(to.x - o.x) < o.w / 2 + 0.5 &&
              Math.abs(to.z - o.z) < o.d / 2 + 0.5,
          )
        )
          path.push({ x: to.x, z: to.z });
        return path.filter(
          (p, i, a) =>
            !i ||
            i === a.length - 1 ||
            (p.x - a[i - 1].x) * (a[i + 1].z - p.z) !==
              (p.z - a[i - 1].z) * (a[i + 1].x - p.x),
        );
      }
      const x = current % W,
        z = Math.floor(current / W);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (x + dx < 0 || x + dx >= W || z + dz < 0 || z + dz >= H) continue;
        const next = current + dx + dz * W;
        if (unavailable[next]) continue;
        const cost = g[current] + step;
        if (cost < g[next]) {
          parent[next] = current;
          g[next] = cost;
          push({ i: next, g: cost, f: cost + h(next) });
        }
      }
    }
    return [];
  };
  route.isWalkable = (p) =>
    !obstacles.some(
      (o) =>
        Math.abs(p.x - o.x) < o.w / 2 + 0.5 &&
        Math.abs(p.z - o.z) < o.d / 2 + 0.5,
    );
  return route;
}
