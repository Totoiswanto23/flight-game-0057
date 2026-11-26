// Seeded randomness so the island, the ring course and the screenshot
// scenes are identical on every load. No Math.random in world building.

// mulberry32: small, fast, deterministic PRNG.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 2D value noise with smooth interpolation, built on a hashed lattice.
export function makeNoise2D(seed) {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) base[i] = i;
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = base[i]; base[i] = base[j]; base[j] = tmp;
  }
  for (let i = 0; i < 512; i += 1) perm[i] = base[i & 255];

  function lattice(ix, iz) {
    return perm[(perm[ix & 255] + iz) & 255] / 255;
  }
  function smooth(t) { return t * t * (3 - 2 * t); }

  return function noise(x, z) {
    const ix = Math.floor(x); const iz = Math.floor(z);
    const fx = x - ix; const fz = z - iz;
    const a = lattice(ix, iz); const b = lattice(ix + 1, iz);
    const c = lattice(ix, iz + 1); const d = lattice(ix + 1, iz + 1);
    const u = smooth(fx); const v = smooth(fz);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  };
}

// Fractal brownian motion: a few octaves of the value noise above.
export function makeFbm(seed, octaves = 4) {
  const noise = makeNoise2D(seed);
  return function fbm(x, z) {
    let sum = 0; let amp = 0.5; let freq = 1; let norm = 0;
    for (let o = 0; o < octaves; o += 1) {
      sum += amp * noise(x * freq, z * freq);
      norm += amp; amp *= 0.5; freq *= 2.1;
    }
    return sum / norm;
  };
}
