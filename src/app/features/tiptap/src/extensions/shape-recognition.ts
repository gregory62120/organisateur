export interface Pt {
  x: number;
  y: number;
  p?: number;
}

export interface RecognizedShape {
  shape: 'line' | 'ellipse' | 'rect' | 'polygon';
  points: Pt[];
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const round1 = (value: number) => Math.round(value * 10) / 10;

export const distanceToSegment = (p: Pt, a: Pt, b: Pt) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

const pathLength = (pts: Pt[]) => {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += dist(pts[i], pts[i - 1]);
  }
  return total;
};

export const resamplePolyline = (pts: Pt[], count: number): Pt[] => {
  const total = pathLength(pts);
  if (total === 0) {
    return [pts[0]];
  }
  const step = total / (count - 1);
  const out: Pt[] = [{ x: pts[0].x, y: pts[0].y }];
  let carried = 0;
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1];
    const b = pts[i];
    let segment = dist(a, b);
    while (segment > 0 && carried + segment >= step) {
      const t = (step - carried) / segment;
      a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      out.push(a);
      segment = dist(a, b);
      carried = 0;
    }
    carried += segment;
  }
  return out;
};

const meanDistance = (samples: Pt[], polyline: Pt[]) => {
  let sum = 0;
  for (const sample of samples) {
    let best = Infinity;
    for (let i = 1; i < polyline.length; i++) {
      best = Math.min(best, distanceToSegment(sample, polyline[i - 1], polyline[i]));
    }
    sum += best;
  }
  return sum / Math.max(1, samples.length);
};

/** Erreur moyenne (normalisée par la diagonale) entre le tracé et un contour candidat. */
const outlineError = (sampled: Pt[], outline: Pt[], diag: number) =>
  (meanDistance(sampled, outline) + meanDistance(resamplePolyline(outline, 80), sampled)) /
  2 /
  diag;

// Douglas-Peucker
const simplify = (pts: Pt[], epsilon: number): Pt[] => {
  if (pts.length < 3) {
    return pts;
  }
  const first = pts[0];
  const last = pts[pts.length - 1];
  let index = -1;
  let farthest = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = distanceToSegment(pts[i], first, last);
    if (d > farthest) {
      farthest = d;
      index = i;
    }
  }
  if (farthest <= epsilon || index < 0) {
    return [first, last];
  }
  const left = simplify(pts.slice(0, index + 1), epsilon);
  const right = simplify(pts.slice(index), epsilon);
  return [...left.slice(0, -1), ...right];
};

const turnAngle = (prev: Pt, current: Pt, next: Pt) => {
  const ax = current.x - prev.x;
  const ay = current.y - prev.y;
  const bx = next.x - current.x;
  const by = next.y - current.y;
  const norm = Math.hypot(ax, ay) * Math.hypot(bx, by);
  if (norm === 0) {
    return 0;
  }
  const cos = Math.max(-1, Math.min(1, (ax * bx + ay * by) / norm));
  return (Math.acos(cos) * 180) / Math.PI;
};

/** Sommets d'un tracé fermé : coins nets uniquement (hameçons et points plats éliminés). */
const polygonVertices = (pts: Pt[], diag: number): Pt[] | null => {
  const vertices = simplify(pts, 0.05 * diag).map((p) => ({ x: p.x, y: p.y }));
  if (vertices.length > 3 && dist(vertices[0], vertices[vertices.length - 1]) < 0.25 * diag) {
    vertices.pop();
  }

  let changed = true;
  while (changed && vertices.length >= 3) {
    changed = false;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (dist(vertices[i], vertices[j]) < 0.12 * diag) {
        vertices[i] = {
          x: (vertices[i].x + vertices[j].x) / 2,
          y: (vertices[i].y + vertices[j].y) / 2,
        };
        vertices.splice(j, 1);
        changed = true;
        break;
      }
    }
    if (changed) {
      continue;
    }
    for (let i = 0; i < vertices.length; i++) {
      const prev = vertices[(i - 1 + vertices.length) % vertices.length];
      const next = vertices[(i + 1) % vertices.length];
      if (turnAngle(prev, vertices[i], next) < 25) {
        vertices.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return vertices.length >= 3 && vertices.length <= 6 ? vertices : null;
};

const isRectangle = (vertices: Pt[]) => {
  if (vertices.length !== 4) {
    return false;
  }
  for (let i = 0; i < 4; i++) {
    const prev = vertices[(i + 3) % 4];
    const next = vertices[(i + 1) % 4];
    const turn = turnAngle(prev, vertices[i], next);
    if (turn < 65 || turn > 115) {
      return false;
    }
    // Arêtes proches des axes (écart ≤ 20°).
    const edge = vertices[(i + 1) % 4];
    const angle = (Math.atan2(edge.y - vertices[i].y, edge.x - vertices[i].x) * 180) / Math.PI;
    const offAxis = Math.abs(((angle % 90) + 90) % 90);
    if (Math.min(offAxis, 90 - offAxis) > 20) {
      return false;
    }
  }
  return true;
};

/** Reconnaît un tracé à main levée : ligne, ellipse, rectangle ou polygone (triangle, etc.). */
export const recognizeShape = (pts: Pt[]): RecognizedShape | null => {
  if (pts.length < 3) {
    return null;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of pts) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const diag = Math.hypot(w, h);
  if (diag < 20) {
    return null;
  }
  const first = pts[0];
  const last = pts[pts.length - 1];
  const chord = dist(first, last);

  // Ligne : écart maximal à la corde faible.
  if (chord >= 25) {
    let deviation = 0;
    for (const point of pts) {
      const cross = Math.abs(
        (last.x - first.x) * (first.y - point.y) - (first.x - point.x) * (last.y - first.y),
      );
      deviation = Math.max(deviation, cross / chord);
    }
    if (deviation <= 0.08 * chord) {
      return { shape: 'line', points: [first, last] };
    }
  }

  // Formes fermées.
  if (chord > 0.3 * diag || pathLength(pts) < 1.6 * diag || Math.min(w, h) < 0.1 * Math.max(w, h)) {
    return null;
  }

  const sampled = resamplePolyline(pts, 80);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const ellipse = Array.from({ length: 49 }, (_, i) => ({
    x: cx + (w / 2) * Math.cos((i / 48) * Math.PI * 2),
    y: cy + (h / 2) * Math.sin((i / 48) * Math.PI * 2),
  }));
  const ellipseError = outlineError(sampled, ellipse, diag);

  const vertices = polygonVertices(pts, diag);
  const polygonError = vertices
    ? outlineError(sampled, [...vertices, vertices[0]], diag)
    : Infinity;

  const asEllipse = (): RecognizedShape => ({
    shape: 'ellipse',
    points: [
      { x: round1(minX), y: round1(minY) },
      { x: round1(maxX), y: round1(maxY) },
    ],
  });
  const asPolygon = (): RecognizedShape => {
    const list = vertices as Pt[];
    if (isRectangle(list)) {
      const xs = list.map((v) => v.x);
      const ys = list.map((v) => v.y);
      return {
        shape: 'rect',
        points: [
          { x: round1(Math.min(...xs)), y: round1(Math.min(...ys)) },
          { x: round1(Math.max(...xs)), y: round1(Math.max(...ys)) },
        ],
      };
    }
    return { shape: 'polygon', points: list.map((v) => ({ x: round1(v.x), y: round1(v.y) })) };
  };

  if (vertices && vertices.length <= 4) {
    // Peu de coins : polygone si c'est ce qui colle le mieux, sinon ellipse.
    if (polygonError <= ellipseError) {
      return asPolygon();
    }
    return ellipseError <= 0.08 ? asEllipse() : null;
  }
  if (ellipseError <= 0.08) {
    return asEllipse();
  }
  return vertices && polygonError <= 0.07 ? asPolygon() : null;
};
