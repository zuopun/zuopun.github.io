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
  const blocked = new Set();
  for (let i = 0; i < W * H; i++) {
    const p = point(i);
    if (
      obstacles.some(
        (o) =>
          Math.abs(p.x - o.x) < o.w / 2 + 0.5 &&
          Math.abs(p.z - o.z) < o.d / 2 + 0.5,
      )
    )
      blocked.add(i);
  }
  function nearest(i) {
    if (!blocked.has(i)) return i;
    let best = -1,
      dist = Infinity;
    const a = point(i);
    for (let j = 0; j < W * H; j++) {
      if (blocked.has(j)) continue;
      const b = point(j),
        d = (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
      if (d < dist) {
        best = j;
        dist = d;
      }
    }
    return best;
  }
  const route = (from, to) => {
    const start = nearest(index(from)),
      end = nearest(index(to));
    const open = new Set([start]),
      g = new Map([[start, 0]]),
      parent = new Map();
    const goal = point(end);
    const h = (i) => {
      const p = point(i);
      return Math.abs(p.x - goal.x) + Math.abs(p.z - goal.z);
    };
    while (open.size) {
      let current = -1,
        best = Infinity;
      for (const i of open) {
        const f = g.get(i) + h(i);
        if (f < best) {
          current = i;
          best = f;
        }
      }
      if (current === end) {
        const path = [];
        let i = end;
        while (i !== start) {
          path.unshift(point(i));
          i = parent.get(i);
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
      open.delete(current);
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
        if (blocked.has(next)) continue;
        const cost = g.get(current) + step;
        if (cost < (g.get(next) ?? Infinity)) {
          parent.set(next, current);
          g.set(next, cost);
          open.add(next);
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
