// Arcade flight physics: one clear job — move the plane from its inputs.
// Throttle sets a target speed; pitch sets climb or descent; bank turns
// the heading. No lift tables, no stalls to memorise: the fun is in the
// rings and the landing, not in a flight manual.
import { PLANE, WORLD } from './config.js';
import { heightAt } from './terrain.js';

export function createFlightState() {
  return {
    // Position in metres, y is altitude above sea level.
    x: WORLD.runway.x0 + 90,
    y: WORLD.runway.height + 1.6,
    z: WORLD.runway.z,
    heading: 0,          // radians, 0 = east (+X), grows counter-clockwise
    pitch: 0,            // radians, positive = nose up
    roll: 0,             // radians, positive = bank right
    speed: 0,
    throttle: 0,
    fuel: PLANE.fuelCapacity,
    damage: 0,
    onGround: true,
    verticalSpeed: 0,
    distanceFlown: 0,
  };
}

/**
 * Advance the flight state by dt seconds.
 * input: { pitch: -1..1 (up positive), roll: -1..1 (right positive),
 *          throttleDelta, brake }
 * Returns events: { hitGround: bool, hardLanding: bool }.
 */
export function stepFlight(state, input, dt) {
  const events = { hitGround: false, hardLanding: false };

  // Throttle.
  state.throttle = Math.min(1, Math.max(0, state.throttle + input.throttleDelta * dt));
  if (input.brake) state.throttle = Math.max(0, state.throttle - 0.8 * dt);

  // Fuel burns with throttle; empty tank means no thrust.
  if (state.throttle > 0 && state.fuel > 0) {
    state.fuel = Math.max(0, state.fuel - PLANE.fuelBurn * state.throttle * dt);
  }
  const thrust = state.fuel > 0 ? state.throttle : 0;

  // Speed chases the throttle's target; drag pulls it back when idle.
  const targetSpeed = thrust * PLANE.maxSpeed;
  state.speed += (targetSpeed - state.speed) * Math.min(1, (PLANE.accel / PLANE.maxSpeed) * dt * 4);
  if (input.brake) state.speed = Math.max(0, state.speed - 22 * dt);

  // Pitch and roll ease toward the pilot's input.
  const targetPitch = input.pitch * 0.5;
  const targetRoll = input.roll * 0.9;
  state.pitch += (targetPitch - state.pitch) * Math.min(1, 3.2 * dt);
  state.roll += (targetRoll - state.roll) * Math.min(1, 4.0 * dt);

  // A banked turn changes heading; a level plane flies straight.
  state.heading -= Math.sin(state.roll) * PLANE.turnRate * dt * Math.min(1, state.speed / 30);

  // Take-off: once fast enough and the pilot pulls up, the wheels leave
  // the ground. (Checked against the pilot's input, not the eased pitch:
  // the pitch is held level while rolling, so the eased value never rises
  // on the runway on its own.)
  const groundY = heightAt(state.x, state.z);
  if (state.onGround && state.speed > PLANE.minSpeed && input.pitch > 0.15) {
    state.onGround = false;
  }

  const prevY = state.y;
  if (state.onGround) {
    state.y = groundY + 1.6;
    state.verticalSpeed = 0;
    // Rolling on the ground: steer a little with roll input.
    state.heading -= input.roll * 0.25 * dt * Math.min(1, state.speed / 20);
  } else {
    // Vertical speed from pitch; a slow plane sinks.
    let vs = Math.sin(state.pitch) * state.speed * PLANE.climbFactor;
    if (state.speed < PLANE.minSpeed) vs -= (PLANE.minSpeed - state.speed) * 0.35;
    state.verticalSpeed = vs;
    state.y += vs * dt;
  }

  // Move forward along the heading.
  const dx = Math.cos(state.heading) * state.speed * dt;
  const dz = -Math.sin(state.heading) * state.speed * dt;
  state.x += dx;
  state.z += dz;
  state.distanceFlown += Math.hypot(dx, dz);

  // Ground contact.
  const nowGroundY = heightAt(state.x, state.z);
  if (!state.onGround && state.y <= nowGroundY + 1.6) {
    const impact = Math.abs(state.verticalSpeed);
    state.y = nowGroundY + 1.6;
    events.hitGround = true;
    if (impact > 9 || state.speed > 70) {
      events.hardLanding = true;
    } else {
      state.onGround = true;
      state.pitch = 0;
      state.verticalSpeed = 0;
    }
  }
  // Sea: the water is not landable.
  if (state.y < WORLD.waterLevel + 1.2 && heightAt(state.x, state.z) < 0) {
    events.hitGround = true;
    events.hardLanding = true;
    state.y = WORLD.waterLevel + 1.2;
  }
  return events;
}

/** True when the plane sits on the runway strip. */
export function onRunway(state) {
  const rw = WORLD.runway;
  return state.x > rw.x0 && state.x < rw.x1
    && Math.abs(state.z - rw.z) < rw.halfWidth
    && state.onGround;
}

/** True when the plane is slow, level and on the runway: a good landing. */
export function isGoodLanding(state) {
  return onRunway(state) && state.speed < 45 && Math.abs(state.pitch) < 0.1;
}
