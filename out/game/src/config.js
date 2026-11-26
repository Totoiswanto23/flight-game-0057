// Sky Courier — tuning numbers and colours in one place.
// The world is a small island (about 2 km across) with a beach, hills, a
// lighthouse point, and one east-west runway on the south shore.

export const WORLD = {
  seed: 20261126,
  islandRadius: 1000,
  waterLevel: 0,
  maxHill: 130,
  // Runway: flat strip along X at the south shore, heading east (+X).
  runway: { x0: -300, x1: 300, z: 340, halfWidth: 14, height: 3 },
  // Ring course: five rings flown in order, then land on the runway.
  rings: [
    { x: 120, y: 55, z: 120, r: 22 },
    { x: 520, y: 70, z: -260, r: 22 },
    { x: -120, y: 95, z: -560, r: 22 },
    { x: -620, y: 60, z: -120, r: 22 },
    { x: -420, y: 45, z: 420, r: 22 },
  ],
  clouds: 26,
  trees: 170,
};

export const PLANE = {
  maxSpeed: 95,        // m/s at full throttle
  cruiseSpeed: 55,
  minSpeed: 22,        // below this the wings stop flying
  accel: 14,           // m/s^2 toward target speed
  pitchRate: 0.55,     // rad/s at full input
  rollRate: 1.5,       // rad/s at full input
  turnRate: 0.55,      // heading change per radian of bank, per second
  climbFactor: 0.9,    // vertical speed from pitch
  fuelCapacity: 100,
  fuelBurn: 0.55,      // per second at full throttle
  damagePerHit: 34,
};

export const SCORE = {
  ring: 250,
  landing: 500,
  timeBonusPerSecond: 5,
};

export const PALETTE = {
  sky: 0x8ec3e8,
  fog: 0xa8c8e0,
  water: 0x2e7fb8,
  sand: 0xe8d29a,
  grass: 0x5da24a,
  grassDry: 0x9aa854,
  rock: 0x8a7f72,
  runway: 0x3c4148,
  runwayLine: 0xf5f5f5,
  planeBody: 0xff7a1a,
  planeWing: 0xfff3e0,
  planeTrim: 0x1a5fb4,
  ring: 0xffc400,
  ringNext: 0x00e676,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'sky-courier.best';
