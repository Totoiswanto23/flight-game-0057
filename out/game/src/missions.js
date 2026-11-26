// The mission: fly the ring course in order, then land on the runway.
// Rings are glowing torus meshes; the next one is green, the rest amber.
// One clear job — track progress, award points, and say what is next.
const THREE = window.THREE;
import { WORLD, SCORE, PALETTE } from './config.js';

export function buildRings(scene) {
  const rings = WORLD.rings.map((def, i) => {
    const geo = new THREE.TorusGeometry(def.r, 1.6, 12, 40);
    const mat = new THREE.MeshBasicMaterial({ color: PALETTE.ring });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(def.x, def.y, def.z);
    // Face the ring toward the previous waypoint so it reads as a gate.
    const prev = i === 0
      ? { x: WORLD.runway.x0 + 90, z: WORLD.runway.z }
      : WORLD.rings[i - 1];
    mesh.lookAt(prev.x, def.y, prev.z);
    scene.add(mesh);
    // A small beacon pole under each ring so it is findable from afar.
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, def.y, 6),
      new THREE.MeshBasicMaterial({ color: 0xffc400, transparent: true, opacity: 0.35 }),
    );
    pole.position.set(def.x, def.y / 2, def.z);
    scene.add(pole);
    return { ...def, mesh, pole, index: i };
  });
  return rings;
}

export function createMission() {
  return {
    nextRing: 0,
    ringsDone: 0,
    score: 0,
    phase: 'rings',      // 'rings' -> 'land' -> 'done'
    startTime: 0,
    elapsed: 0,
    message: '',
    messageUntil: 0,
  };
}

function ringDistance(state, ring) {
  const dx = state.x - ring.x; const dy = state.y - ring.y; const dz = state.z - ring.z;
  return Math.hypot(dx, dy, dz);
}

/** Called every frame; returns 'ring' | 'landed' | null when something happens. */
export function stepMission(mission, state, rings, now) {
  mission.elapsed = now - mission.startTime;
  if (mission.phase === 'rings') {
    const ring = rings[mission.nextRing];
    if (ringDistance(state, ring) < ring.r * 0.9) {
      mission.ringsDone += 1;
      mission.score += SCORE.ring;
      ring.mesh.material.color.setHex(0x90a4ae);
      ring.pole.material.opacity = 0.08;
      mission.message = `RING ${mission.ringsDone} / ${rings.length} — +${SCORE.ring}`;
      mission.messageUntil = now + 2.5;
      if (mission.nextRing + 1 < rings.length) {
        mission.nextRing += 1;
        rings[mission.nextRing].mesh.material.color.setHex(PALETTE.ringNext);
        return 'ring';
      }
      mission.phase = 'land';
      mission.message = 'COURSE CLEAR — LAND ON THE RUNWAY!';
      mission.messageUntil = now + 4;
      return 'ring';
    }
  }
  return null;
}

/** Colour the next ring green and the rest amber. Call once at start. */
export function highlightNextRing(rings, nextIndex) {
  rings.forEach((ring, i) => {
    ring.mesh.material.color.setHex(i === nextIndex ? PALETTE.ringNext : PALETTE.ring);
  });
}

/** Where the pilot should fly next: the next ring, or the runway centre. */
export function nextTarget(mission) {
  if (mission.phase === 'rings') return WORLD.rings[mission.nextRing];
  return { x: (WORLD.runway.x0 + WORLD.runway.x1) / 2, y: WORLD.runway.height + 8, z: WORLD.runway.z };
}

/** Bearing (0..360 deg) and distance from the plane to the next target. */
export function targetBearing(state, target) {
  const dx = target.x - state.x; const dz = target.z - state.z;
  const dist = Math.hypot(dx, dz);
  let deg = Math.atan2(-dz, dx) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  let rel = deg - (state.heading * 180 / Math.PI);
  while (rel > 180) rel -= 360;
  while (rel < -180) rel += 360;
  return { deg, dist, relative: rel };
}
