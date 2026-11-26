// Deterministic screenshot scenes: ?shot=1..4 places the real plane in a
// real flight state and starts the game at once, so a headless browser
// capture shows the game itself — chase view, cockpit view, terrain,
// aircraft, lit instruments, a ring or the runway ahead — with no clicks.
// The same seed and the same fixed state give the same frame every time.
import { WORLD } from './config.js';
import { highlightNextRing } from './missions.js';

function headingTo(from, to) {
  return Math.atan2(-(to.z - from.z), to.x - from.x);
}

/** Place the flight state for scene `name`; returns the camera mode. */
export function stageShot(name, state, mission, rings) {
  const ring1 = WORLD.rings[0];
  const rw = WORLD.runway;
  if (name === '2') {
    // Cockpit view on final approach: lined up with the runway, 40 m up.
    state.x = rw.x0 + 60; state.y = rw.height + 42; state.z = rw.z;
    state.heading = 0; state.pitch = -0.06; state.roll = 0;
    state.speed = 55; state.throttle = 0.45; state.fuel = 78;
    state.onGround = false;
    mission.phase = 'land'; mission.nextRing = WORLD.rings.length; mission.ringsDone = 5;
    mission.score = 5 * 250;
    highlightNextRing(rings, -1);
    return 'cockpit';
  }
  if (name === '3') {
    // Low over the island between rings 3 and 4: houses, trees and the
    // green target ring clearly ahead, chase camera in open air.
    state.x = -520; state.y = 55; state.z = 150;
    state.heading = headingTo(state, WORLD.rings[3]);
    state.pitch = 0.02; state.roll = -0.12;
    state.speed = 62; state.throttle = 0.6; state.fuel = 64;
    state.onGround = false;
    mission.nextRing = 3; mission.ringsDone = 3; mission.score = 750;
    highlightNextRing(rings, 3);
    return 'chase';
  }
  if (name === '4') {
    // Wheels down on the runway, mission complete.
    state.x = rw.x0 + 190; state.y = rw.height + 1.6; state.z = rw.z;
    state.heading = 0; state.pitch = 0; state.roll = 0;
    state.speed = 8; state.throttle = 0; state.fuel = 41;
    state.onGround = true;
    mission.phase = 'done'; mission.nextRing = WORLD.rings.length; mission.ringsDone = 5;
    mission.score = 5 * 250 + 500; mission.elapsed = 187;
    mission.message = 'MISSION COMPLETE — +500 LANDING BONUS';
    mission.messageUntil = 999999;
    highlightNextRing(rings, -1);
    return 'chase';
  }
  // Shot 1 (default): chase view mid-flight, the first ring dead ahead.
  state.x = -40; state.y = 58; state.z = 330;
  state.heading = headingTo(state, ring1);
  state.pitch = 0.05; state.roll = 0.12;
  state.speed = 58; state.throttle = 0.62; state.fuel = 88;
  state.onGround = false;
  mission.nextRing = 0; mission.ringsDone = 0; mission.score = 0;
  highlightNextRing(rings, 0);
  return 'chase';
}
