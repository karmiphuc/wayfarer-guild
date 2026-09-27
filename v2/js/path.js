// Grid A* with typed arrays and a binary heap. 8-way movement, no corner cutting.
// cost[i]: 0 = blocked, otherwise movement cost multiplier (roads are cheaper).

export class PathGrid {
  constructor(w, h) {
    this.w = w; this.h = h; const n = w * h;
    this.cost = new Float32Array(n);
    this.g = new Float32Array(n); this.from = new Int32Array(n);
    this.stamp = new Uint32Array(n); this.closed = new Uint32Array(n); this.run = 0;
    this.heap = new Int32Array(n * 4); this.f = new Float32Array(n);
    this.version = 0;
  }
  set(x, y, c) { this.cost[y * this.w + x] = c; }
  walkable(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.cost[y * this.w + x] > 0; }

  // Returns [[x,y],...] from start (exclusive) to goal (inclusive), or null.
  find(sx, sy, gx, gy, maxIter = this.w * this.h * 4) {
    const { w, h, cost, g, from, stamp, closed, heap, f } = this;
    if (!this.walkable(gx, gy)) return null;
    const run = ++this.run, start = sy * w + sx, goal = gy * w + gx;
    if (start === goal) return [];
    let hn = 0;
    const push = i => { let k = hn++; heap[k] = i; while (k > 0) { const p = (k - 1) >> 1; if (f[heap[p]] <= f[i]) break; heap[k] = heap[p]; heap[p] = i; k = p; } };
    const pop = () => {
      const top = heap[0], last = heap[--hn]; let k = 0;
      if (hn > 0) { heap[0] = last;
        for (;;) { const l = 2 * k + 1, r = l + 1; let m = k;
          if (l < hn && f[heap[l]] < f[heap[m]]) m = l;
          if (r < hn && f[heap[r]] < f[heap[m]]) m = r;
          if (m === k) break; const t = heap[m]; heap[m] = heap[k]; heap[k] = t; k = m; } }
      return top;
    };
    const hEst = i => { const dx = Math.abs((i % w) - gx), dy = Math.abs(((i / w) | 0) - gy); return (dx + dy) + (1.414 - 2) * Math.min(dx, dy); };
    stamp[start] = run; g[start] = 0; from[start] = -1; f[start] = hEst(start); push(start);
    let iter = 0;
    while (hn > 0 && iter++ < maxIter) {
      const cur = pop();
      if (cur === goal) break;
      if (closed[cur] === run) continue; closed[cur] = run;
      const cx = cur % w, cy = (cur / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx, c = cost[ni];
        if (c <= 0) continue;
        if (dx && dy && (cost[cy * w + nx] <= 0 || cost[ny * w + cx] <= 0)) continue; // no corner cutting
        const ng = g[cur] + c * (dx && dy ? 1.414 : 1);
        if (stamp[ni] !== run || ng < g[ni]) {
          stamp[ni] = run; g[ni] = ng; from[ni] = cur; f[ni] = ng + hEst(ni); push(ni);
        }
      }
    }
    if (stamp[goal] !== run) return null;
    const out = []; let i = goal;
    while (i !== start && i >= 0) { out.push([i % w, (i / w) | 0]); i = from[i]; }
    return out.reverse();
  }

  // nearest walkable cell to (x,y) by spiral search
  nearestWalkable(x, y, maxR = 6) {
    x = Math.round(x); y = Math.round(y);
    if (this.walkable(x, y)) return [x, y];
    for (let r = 1; r <= maxR; r++)
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++)
        if ((Math.abs(dx) === r || Math.abs(dy) === r) && this.walkable(x + dx, y + dy)) return [x + dx, y + dy];
    return null;
  }
}
