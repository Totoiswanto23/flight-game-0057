// The HUD: DOM panels over the 3D view — altitude, speed, heading,
// throttle, fuel, damage, score, timer, a compass tape, an artificial
// horizon, the next-target arrow, and the title / pause / end screens.
// All of it is plain DOM, so it stays crisp at any window size and reads
// clearly in a screenshot.
import { FONT, BEST_KEY, WORLD } from './config.js';
import { targetBearing, nextTarget } from './missions.js';

const $ = (id) => document.getElementById(id);

export function buildHud() {
  document.body.insertAdjacentHTML('beforeend', `
  <div id="hud">
    <div class="panel" id="p-left">
      <div class="row"><span class="label">ALT</span><span class="big" id="hud-alt">0</span><span class="unit">m</span></div>
      <div class="row"><span class="label">SPD</span><span class="big" id="hud-spd">0</span><span class="unit">km/h</span></div>
      <div class="row"><span class="label">HDG</span><span class="big" id="hud-hdg">090</span><span class="unit">°</span></div>
      <div class="row"><span class="label">V/S</span><span class="big small" id="hud-vs">0</span><span class="unit">m/s</span></div>
    </div>
    <div class="panel" id="p-top">
      <div id="hud-objective">FLY THROUGH THE GREEN RING</div>
      <div id="hud-compass"></div>
      <div id="hud-target">RING 1/5 · 0m</div>
    </div>
    <div class="panel" id="p-right">
      <div class="row"><span class="label">SCORE</span><span class="big" id="hud-score">0</span></div>
      <div class="row"><span class="label">TIME</span><span class="big small" id="hud-time">0:00</span></div>
      <div class="bar-row"><span class="label">THR</span><div class="bar"><div id="bar-thr"></div></div></div>
      <div class="bar-row"><span class="label">FUEL</span><div class="bar"><div id="bar-fuel"></div></div></div>
      <div class="bar-row"><span class="label">DMG</span><div class="bar"><div id="bar-dmg"></div></div></div>
    </div>
    <div class="panel" id="p-att">
      <canvas id="att" width="150" height="110"></canvas>
      <div class="att-label">ATTITUDE</div>
    </div>
    <div id="hud-msg"></div>
    <div id="hud-help">W/S pitch · A/D roll · SHIFT/CTRL throttle · SPACE brake · hold mouse to steer · C camera · P pause · M sound</div>
    <div id="hud-centre"></div>
  </div>
  <div id="screen" class="overlay">
    <div class="card">
      <h1 id="screen-title">SKY COURIER</h1>
      <p id="screen-sub">Island Runway Delivery</p>
      <div id="screen-body"></div>
      <div id="screen-best"></div>
      <button id="screen-btn">TAKE OFF</button>
      <p class="keys">Arrows / W A S D fly · SHIFT throttle up · CTRL throttle down · SPACE brake<br>Hold the mouse and drag to steer · C switches chase / cockpit view</p>
    </div>
  </div>`);
  const style = document.createElement('style');
  style.textContent = `
  #hud { font-family: ${FONT}; color: #eef4fa; pointer-events: none; }
  .panel { position: fixed; background: rgba(8, 18, 30, 0.62); border: 1px solid rgba(140, 200, 255, 0.35);
    border-radius: 10px; padding: 10px 14px; backdrop-filter: blur(2px); }
  #p-left { top: 14px; left: 14px; min-width: 168px; }
  #p-top { top: 14px; left: 50%; transform: translateX(-50%); text-align: center; min-width: 340px; }
  #p-right { top: 14px; right: 14px; min-width: 190px; }
  #p-att { left: 14px; bottom: 14px; padding: 8px; }
  .row { display: flex; align-items: baseline; gap: 8px; line-height: 1.25; }
  .label { font-size: 12px; letter-spacing: 2px; color: #9fd0ff; width: 44px; }
  .big { font-size: 30px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .big.small { font-size: 22px; }
  .unit { font-size: 12px; color: #9fd0ff; }
  #hud-objective { font-size: 15px; font-weight: 700; letter-spacing: 1px; color: #ffe082; }
  #hud-compass { font-size: 13px; letter-spacing: 3px; color: #cfe8ff; margin-top: 4px; font-variant-numeric: tabular-nums; }
  #hud-target { font-size: 13px; color: #cfe8ff; margin-top: 2px; }
  .bar-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
  .bar { flex: 1; height: 12px; background: rgba(255,255,255,0.16); border-radius: 6px; overflow: hidden; }
  .bar > div { height: 100%; border-radius: 6px; }
  #bar-thr { background: #4fc3f7; width: 0%; }
  #bar-fuel { background: #00e676; width: 100%; }
  #bar-dmg { background: #ff5252; width: 0%; }
  .att-label { text-align: center; font-size: 11px; letter-spacing: 2px; color: #9fd0ff; }
  #hud-msg { position: fixed; top: 118px; left: 50%; transform: translateX(-50%); font-size: 26px; font-weight: 800;
    color: #ffe082; text-shadow: 0 2px 8px rgba(0,0,0,0.6); letter-spacing: 1px; }
  #hud-help { position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); font-size: 12px; color: #d7e9f7;
    background: rgba(8,18,30,0.55); padding: 6px 12px; border-radius: 8px; white-space: nowrap; }
  #hud-centre { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 15px; color: #fff;
    text-shadow: 0 1px 6px #000; text-align: center; }
  .overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
    background: rgba(4, 12, 22, 0.55); font-family: ${FONT}; z-index: 10; }
  .overlay.hidden { display: none; }
  .card { background: rgba(8, 22, 38, 0.92); border: 1px solid rgba(140,200,255,0.4); border-radius: 16px;
    padding: 28px 36px; text-align: center; color: #eef4fa; max-width: 520px; }
  .card h1 { margin: 0; font-size: 44px; letter-spacing: 4px; color: #ffb74d; }
  .card p { margin: 8px 0; font-size: 16px; }
  #screen-sub { color: #9fd0ff; letter-spacing: 2px; font-size: 14px; }
  #screen-body { font-size: 15px; line-height: 1.5; color: #d7e9f7; }
  #screen-best { font-size: 14px; color: #ffe082; margin-top: 6px; }
  #screen-btn { margin-top: 18px; font-size: 20px; font-weight: 700; letter-spacing: 2px; padding: 12px 34px;
    border-radius: 10px; border: none; background: #ff7a1a; color: #fff; cursor: pointer; }
  #screen-btn:hover { background: #ff8f3d; }
  .keys { font-size: 12px !important; color: #9fb8cc !important; line-height: 1.6 !important; }
  #hud.cockpit #p-att { display: none; }
  #cockpit-frame { display: none; position: fixed; left: 0; right: 0; bottom: 0; height: 190px; z-index: 5;
    pointer-events: none; background: linear-gradient(to top, #1b2836 0%, #2c3e50 55%, rgba(44,62,80,0) 100%); }
  #cockpit-frame .gauges { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 26px; }
  #cockpit-frame .gauge { width: 74px; height: 74px; border-radius: 50%; border: 3px solid #4a6572;
    background: radial-gradient(circle at 50% 40%, #0d1b26, #050b12); position: relative; }
  #cockpit-frame .gauge i { position: absolute; left: 50%; top: 50%; width: 3px; height: 30px; background: #ff5252;
    transform-origin: 50% 0; }
  #cockpit-frame .gauge span { position: absolute; bottom: 8px; width: 100%; text-align: center; font-size: 9px;
    letter-spacing: 1px; color: #9fd0ff; font-family: ${FONT}; }
  #hud.cockpit #cockpit-frame { display: block; }
  `;
  document.head.appendChild(style);
  // Cockpit dashboard frame (gauges are decorative bezels; the live
  // numbers stay in the HUD panels above).
  $('hud').insertAdjacentHTML('beforeend', `
    <div id="cockpit-frame"><div class="gauges">
      <div class="gauge" id="g-alt"><i></i><span>ALT</span></div>
      <div class="gauge" id="g-spd"><i></i><span>SPD</span></div>
      <div class="gauge" id="g-hdg"><i></i><span>HDG</span></div>
      <div class="gauge" id="g-fuel"><i></i><span>FUEL</span></div>
    </div></div>`);
}

function pad(n, w) { return String(n).padStart(w, '0'); }

function fmtTime(sec) {
  const m = Math.floor(sec / 60); const s = Math.floor(sec % 60);
  return `${m}:${pad(s, 2)}`;
}

export function getBest() {
  try { return Number(localStorage.getItem(BEST_KEY) || 0); } catch { return 0; }
}
export function setBest(score) {
  try { localStorage.setItem(BEST_KEY, String(score)); } catch { /* private mode */ }
}

/** Refresh every HUD number from the live flight state. */
export function updateHud(state, mission, now) {
  const hdgDeg = ((state.heading * 180 / Math.PI) % 360 + 360) % 360;
  $('hud-alt').textContent = Math.max(0, Math.round(state.y));
  $('hud-spd').textContent = Math.round(state.speed * 3.6);
  $('hud-hdg').textContent = pad(Math.round(hdgDeg), 3);
  $('hud-vs').textContent = (state.verticalSpeed >= 0 ? '+' : '') + state.verticalSpeed.toFixed(1);
  $('hud-score').textContent = mission.score;
  $('hud-time').textContent = fmtTime(mission.elapsed);
  $('bar-thr').style.width = `${Math.round(state.throttle * 100)}%`;
  $('bar-fuel').style.width = `${Math.round(state.fuel)}%`;
  $('bar-fuel').style.background = state.fuel < 25 ? '#ff5252' : '#00e676';
  $('bar-dmg').style.width = `${Math.round(state.damage)}%`;

  // Compass tape: headings around the current one.
  const ticks = [];
  for (let d = -60; d <= 60; d += 15) {
    let h = Math.round(hdgDeg + d);
    h = ((h % 360) + 360) % 360;
    ticks.push(d === 0 ? `[${pad(h, 3)}]` : pad(h, 3));
  }
  $('hud-compass').textContent = ticks.join('  ');

  const target = nextTarget(mission);
  const b = targetBearing(state, target);
  const arrow = b.relative > 12 ? '▶' : b.relative < -12 ? '◀' : '▲';
  const name = mission.phase === 'rings'
    ? `RING ${mission.nextRing + 1}/${WORLD.rings.length}`
    : mission.phase === 'land' ? 'RUNWAY' : 'DONE';
  $('hud-target').textContent = `${name} ${arrow} ${Math.round(b.dist)}m`;
  $('hud-objective').textContent = mission.phase === 'rings'
    ? 'FLY THROUGH THE GREEN RING'
    : mission.phase === 'land'
      ? 'LAND ON THE RUNWAY — SLOW AND LEVEL'
      : 'MISSION COMPLETE';

  const msg = $('hud-msg');
  if (mission.message && now < mission.messageUntil) msg.textContent = mission.message;
  else msg.textContent = '';

  // Fuel warning.
  const centre = $('hud-centre');
  if (state.fuel <= 0 && !state.onGround) centre.textContent = '⚠ OUT OF FUEL — GLIDE TO THE RUNWAY';
  else if (state.fuel < 20 && state.fuel > 0) centre.textContent = '⚠ LOW FUEL';
  else centre.textContent = '';

  drawAttitude(state);
  // Cockpit gauge needles.
  const setNeedle = (id, frac) => {
    const el = document.querySelector(`#${id} i`);
    if (el) el.style.transform = `rotate(${-120 + Math.max(0, Math.min(1, frac)) * 240}deg)`;
  };
  setNeedle('g-alt', Math.min(1, state.y / 300));
  setNeedle('g-spd', state.speed / 95);
  setNeedle('g-hdg', hdgDeg / 360);
  setNeedle('g-fuel', state.fuel / 100);
}

function drawAttitude(state) {
  const canvas = $('att');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width; const h = canvas.height;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  // Sky / ground halves, rotated by bank and shifted by pitch.
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-state.roll);
  const pitchPx = Math.max(-40, Math.min(40, state.pitch * 60));
  ctx.translate(0, pitchPx);
  ctx.fillStyle = '#4aa3df';
  ctx.fillRect(-w, -h, w * 2, h);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-w, 0, w * 2, h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-w, -1, w * 2, 2);
  ctx.restore();
  // Fixed aircraft symbol.
  ctx.strokeStyle = '#ffe082';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 28, h / 2); ctx.lineTo(w / 2 - 8, h / 2);
  ctx.moveTo(w / 2 + 8, h / 2); ctx.lineTo(w / 2 + 28, h / 2);
  ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2, h / 2 + 8);
  ctx.stroke();
  ctx.fillStyle = '#9fd0ff';
  ctx.font = '11px system-ui';
  ctx.fillText('PITCH ' + (state.pitch * 57.3).toFixed(0) + '°', 6, h - 8);
}

/** Show the overlay screen (title / pause / crash / complete). */
export function showScreen({ title, body, button, best }) {
  $('screen-title').textContent = title;
  $('screen-body').innerHTML = body;
  $('screen-btn').textContent = button;
  $('screen-best').textContent = best ? `BEST SCORE: ${best}` : '';
  $('screen').classList.remove('hidden');
}
export function hideScreen() { $('screen').classList.add('hidden'); }
export function screenButton() { return $('screen-btn'); }
export function setCockpit(on) {
  $('hud').classList.toggle('cockpit', on);
}
