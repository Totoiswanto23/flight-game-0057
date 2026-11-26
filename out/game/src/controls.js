// Keyboard + mouse input, one clear job: turn key and pointer state into
// the flight input the physics step consumes, and expose the one-shot
// actions (camera, pause, restart, mute) the main loop polls each frame.
export function createControls(canvas) {
  const keys = new Set();
  const state = {
    mouseSteer: false,
    mouseX: 0,          // -1..1 across the window
    mouseY: 0,          // -1..1 down the window
    pointerDown: false,
  };
  const pressed = new Set(); // one-shot keys, consumed by the main loop

  function keyOf(e) { return e.key.length === 1 ? e.key.toLowerCase() : e.key; }

  window.addEventListener('keydown', (e) => {
    const k = keyOf(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(keyOf(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    state.pointerDown = true;
    canvas.setPointerCapture(e.pointerId);
  });
  window.addEventListener('pointerup', () => { state.pointerDown = false; });
  window.addEventListener('pointermove', (e) => {
    state.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function held(...names) { return names.some((n) => keys.has(n)); }

  /** Continuous flight input for this frame. */
  function flightInput(dt) {
    let pitch = 0; let roll = 0;
    if (held('ArrowUp', 'w')) pitch += 1;
    if (held('ArrowDown', 's')) pitch -= 1;
    if (held('ArrowLeft', 'a')) roll -= 1;
    if (held('ArrowRight', 'd')) roll += 1;
    // Mouse steering: hold the pointer down and drag — the stick follows
    // the pointer offset from the centre of the screen.
    if (state.pointerDown) {
      roll += Math.max(-1, Math.min(1, state.mouseX * 1.4));
      pitch += Math.max(-1, Math.min(1, -state.mouseY * 1.2));
    }
    let throttleDelta = 0;
    if (held('Shift')) throttleDelta += 0.9;
    if (held('Control')) throttleDelta -= 0.9;
    if (held('+', '=')) throttleDelta += 0.9;
    if (held('-', '_')) throttleDelta -= 0.9;
    return {
      pitch: Math.max(-1, Math.min(1, pitch)),
      roll: Math.max(-1, Math.min(1, roll)),
      throttleDelta,
      brake: held(' '),
    };
  }

  /** True once for a key pressed since the last poll. */
  function consume(key) {
    if (pressed.has(key)) { pressed.delete(key); return true; }
    return false;
  }

  return { flightInput, consume, state };
}
