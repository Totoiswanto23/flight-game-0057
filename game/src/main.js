// Sky Courier — main loop: build the world, run the fixed-step flight
// simulation, chase or cockpit camera, HUD, screens and sound.
const THREE = window.THREE;
import { WORLD, PALETTE, PLANE, SCORE } from './config.js';
import { buildTerrain, heightAt } from './terrain.js';
import { buildAircraft, spinPropeller } from './aircraft.js';
import { createFlightState, stepFlight, onRunway } from './physics.js';
import { createControls } from './controls.js';
import { buildRings, createMission, stepMission, highlightNextRing } from './missions.js';
import { createAudio } from './audio.js';
import { buildHud, updateHud, showScreen, hideScreen, screenButton, setCockpit, getBest, setBest } from './hud.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const canvas = document.getElementById('game');
const params = new URLSearchParams(location.search);
const shot = params.get('shot');

// Test hooks for the headless capture script: window.__skyReady flips
// true after the first frame renders, __skyErrors collects page errors.
window.__skyErrors = [];
window.addEventListener('error', (e) => window.__skyErrors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => window.__skyErrors.push('rejection: ' + String(e.reason)));
window.__sky = { get state() { return state; }, get mission() { return mission; }, get mode() { return mode; } };

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
scene.fog = new THREE.Fog(PALETTE.fog, 500, 3400);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.5, 8000);
camera.position.set(-40, 30, 380);

const sun = new THREE.DirectionalLight(0xfff2d9, 1.25);
sun.position.set(600, 900, 300);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xbcd8ff, 0.55));

const { clouds } = buildTerrain(scene);
const plane = buildAircraft();
scene.add(plane);
const rings = buildRings(scene);

const controls = createControls(canvas);
const audio = createAudio();
buildHud();

let state = createFlightState();
let mission = createMission();
let mode = 'title';            // title | play | paused | crashed | complete
let cameraMode = 'chase';      // chase | cockpit
let clock = 0;                 // seconds of play since (re)start
let crashCooldown = 0;

function resetRun() {
  state = createFlightState();
  mission = createMission();
  mission.startTime = 0;
  clock = 0;
  crashCooldown = 0;
  rings.forEach((ring, i) => {
    ring.mesh.material.color.setHex(i === 0 ? 0x00e676 : PALETTE.ring);
    ring.pole.material.opacity = 0.35;
  });
  highlightNextRing(rings, 0);
}

function startGame() {
  audio.ensure();
  resetRun();
  hideScreen();
  mode = 'play';
}

function showTitle() {
  mode = 'title';
  showScreen({
    title: 'SKY COURIER',
    body: `You fly the island mail plane. Throttle up on the runway, lift off, ` +
      `fly through all <b>5 rings</b> in order, then come back and land on the runway. ` +
      `Watch your fuel — an empty tank only glides. A hard hit costs damage; ` +
      `100% damage ends the run.`,
    button: 'TAKE OFF',
    best: getBest(),
  });
}

function showCrash(reason) {
  mode = 'crashed';
  audio.crash();
  const best = getBest();
  if (mission.score > best) setBest(mission.score);
  showScreen({
    title: 'CRASHED',
    body: `${reason}<br>Rings flown: <b>${mission.ringsDone} / 5</b> · ` +
      `Score: <b>${mission.score}</b> · Time: <b>${mission.elapsed.toFixed(0)}s</b>`,
    button: 'FLY AGAIN',
    best: Math.max(best, mission.score),
  });
}

function showComplete() {
  mode = 'complete';
  audio.land();
  const timeBonus = Math.max(0, Math.round((420 - mission.elapsed) * SCORE.timeBonusPerSecond));
  mission.score += SCORE.landing + timeBonus;
  const best = getBest();
  if (mission.score > best) setBest(mission.score);
  showScreen({
    title: 'MISSION COMPLETE',
    body: `All 5 rings and a clean landing on the runway.<br>` +
      `Landing bonus +${SCORE.landing} · Time bonus +${timeBonus}<br>` +
      `Final score: <b>${mission.score}</b> · Time: <b>${mission.elapsed.toFixed(0)}s</b>`,
    button: 'FLY AGAIN',
    best: Math.max(best, mission.score),
  });
}

screenButton().addEventListener('click', () => {
  audio.click();
  startGame();
});

function updateCamera(dt) {
  const forward = new THREE.Vector3(Math.cos(state.heading), 0, -Math.sin(state.heading));
  if (cameraMode === 'cockpit') {
    plane.visible = false;
    const eye = new THREE.Vector3(state.x, state.y + 1.1, state.z)
      .addScaledVector(forward, 1.6);
    const look = new THREE.Vector3(
      state.x + Math.cos(state.heading) * Math.cos(state.pitch) * 100,
      state.y + Math.sin(state.pitch) * 100 + 1.1,
      state.z - Math.sin(state.heading) * Math.cos(state.pitch) * 100,
    );
    camera.position.lerp(eye, Math.min(1, dt * 30));
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    camera.rotateZ(-state.roll * 0.6);
  } else {
    plane.visible = true;
    const back = forward.clone().multiplyScalar(-16);
    const target = new THREE.Vector3(state.x, state.y + 2.5, state.z).add(back);
    target.y += 4.5;
    camera.position.lerp(target, Math.min(1, dt * 4.5));
    const look = new THREE.Vector3(state.x, state.y + 1, state.z).addScaledVector(forward, 26);
    camera.lookAt(look);
  }
}

function updatePlaneMesh() {
  plane.position.set(state.x, state.y, state.z);
  // Forward is +X, wings span Z: yaw about Y, pitch about Z, roll about X.
  // Order 'YZX' applies roll, then pitch, then yaw — the aircraft order.
  plane.rotation.order = 'YZX';
  plane.rotation.y = state.heading;
  plane.rotation.z = state.pitch;
  plane.rotation.x = state.roll;
  spinPropeller(plane, state.throttle, STEP);
}

let last = performance.now();
let acc = 0;

function frame(nowMs) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (nowMs - last) / 1000);
  last = nowMs;
  acc += dt;

  // One-shot keys.
  if (controls.consume('c') || controls.consume('C')) {
    cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
    setCockpit(cameraMode === 'cockpit');
  }
  if (controls.consume('m') || controls.consume('M')) audio.toggleMute();
  if (controls.consume('r') || controls.consume('R')) {
    if (mode !== 'title') startGame();
  }
  if (controls.consume('p') || controls.consume('P') || controls.consume('Escape')) {
    if (mode === 'play') {
      mode = 'paused';
      showScreen({ title: 'PAUSED', body: 'The island waits for you.', button: 'RESUME', best: getBest() });
    } else if (mode === 'paused') {
      hideScreen();
      mode = 'play';
    }
  }
  if (controls.consume('Enter') && mode !== 'play') startGame();

  // Fixed-step simulation.
  while (acc >= STEP) {
    acc -= STEP;
    if (mode === 'play') {
      clock += STEP;
      const input = controls.flightInput(STEP);
      const events = stepFlight(state, input, STEP);
      crashCooldown = Math.max(0, crashCooldown - STEP);

      if (events.hitGround && crashCooldown <= 0) {
        const overRunway = onRunway(state);
        if (events.hardLanding && !(overRunway && state.speed < 70)) {
          state.damage += PLANE.damagePerHit;
          crashCooldown = 1.2;
          audio.crash();
          mission.message = 'HARD HIT — DAMAGE +' + PLANE.damagePerHit + '%';
          mission.messageUntil = clock + 2;
        } else if (events.hardLanding) {
          state.onGround = true;
          state.pitch = 0;
        }
        if (state.damage >= 100) { showCrash('The plane took too much damage.'); break; }
      }

      // Out of fuel and stopped on the ground away from the runway.
      if (state.fuel <= 0 && state.onGround && state.speed < 2 && !onRunway(state) && mission.phase !== 'done') {
        showCrash('Out of fuel, down in the rough.');
        break;
      }

      const ev = stepMission(mission, state, rings, clock);
      if (ev === 'ring') audio.ring();

      // Landing: slow and level on the runway after the course.
      if (mission.phase === 'land' && onRunway(state) && state.speed < 45) {
        showComplete();
        break;
      }
      // Landed early (before the rings) — just a stop on the runway.
      if (mission.phase === 'rings' && onRunway(state) && state.onGround && state.speed < 2) {
        mission.message = 'BACK ON THE RUNWAY — THROTTLE UP AND GO';
        mission.messageUntil = clock + 3;
      }
    }
  }

  // Clouds drift.
  for (const cloud of clouds) {
    cloud.position.x += cloud.userData.speed * dt;
    if (cloud.position.x > 1300) cloud.position.x = -1300;
  }

  updatePlaneMesh();
  updateCamera(dt);
  if (mode === 'play' || mode === 'paused') updateHud(state, mission, clock);
  audio.update(state.throttle, state.speed, mode === 'play' && !state.onGround);
  renderer.render(scene, camera);
  if (!window.__skyReady) window.__skyReady = true;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Screenshot scenes jump straight into play with a staged state.
if (shot) {
  cameraMode = stageShot(shot, state, mission, rings);
  setCockpit(cameraMode === 'cockpit');
  hideScreen();
  mode = 'play';
  mission.startTime = 0;
  clock = mission.phase === 'done' ? 187 : 0;
} else {
  showTitle();
}
requestAnimationFrame(frame);
