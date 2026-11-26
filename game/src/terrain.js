// The island: a displaced heightfield with painted vertex colours
// (sand beach, grass, dry hilltops, rock), a flat runway strip, a water
// plane, trees, a lighthouse, a few houses by the runway, and clouds.
// three.min.js is loaded as a classic script in index.html (UMD build),
// so the modules read it off window instead of importing it.
const THREE = window.THREE;
import { WORLD, PALETTE } from './config.js';
import { makeFbm, mulberry32 } from './random.js';

const fbm = makeFbm(WORLD.seed, 4);
const fbmDetail = makeFbm(WORLD.seed + 77, 3);

function smoothstep(a, b, t) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

/** Ground height at (x, z). The runway strip is flattened to its height. */
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const shore = smoothstep(WORLD.islandRadius, WORLD.islandRadius - 260, r);
  if (shore <= 0) return -6; // seabed
  let h = 4 + shore * (18 + 62 * Math.max(0, fbm(x * 0.0016 + 31, z * 0.0016 + 17)));
  h += 14 * Math.max(0, fbmDetail(x * 0.006, z * 0.006)) * shore;
  h += 34 * Math.pow(Math.max(0, fbm(x * 0.0009 - 11, z * 0.0009 + 5)), 2) * shore;
  // Flatten the runway strip (with a soft blend at its edges).
  const rw = WORLD.runway;
  const inX = smoothstep(rw.x0 - 60, rw.x0, x) * (1 - smoothstep(rw.x1, rw.x1 + 60, x));
  const inZ = 1 - smoothstep(rw.halfWidth, rw.halfWidth + 46, Math.abs(z - rw.z));
  const flat = inX * inZ;
  return h * (1 - flat) + rw.height * flat;
}

function groundColor(h, x, z, out) {
  if (h < 5.5) out.setHex(PALETTE.sand);
  else if (h < 46) out.setHex(PALETTE.grass);
  else if (h < 78) out.setHex(PALETTE.grassDry);
  else out.setHex(PALETTE.rock);
  // Slight variation so the ground is not a flat wash of colour.
  const v = 0.92 + 0.08 * fbmDetail(x * 0.05, z * 0.05);
  out.multiplyScalar(v);
  return out;
}

export function buildTerrain(scene) {
  const group = new THREE.Group();
  const size = 2600; const seg = 150;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i); const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    groundColor(h, x, z, c);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(
    geo, new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  group.add(ground);

  // Sea.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(9000, 9000),
    new THREE.MeshPhongMaterial({ color: PALETTE.water, shininess: 90, specular: 0x99ccff }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = WORLD.waterLevel;
  group.add(sea);

  // Runway: dark strip, white centre dashes, threshold bars, numbers.
  const rw = WORLD.runway;
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(rw.x1 - rw.x0, rw.halfWidth * 2),
    new THREE.MeshLambertMaterial({ color: PALETTE.runway }),
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set((rw.x0 + rw.x1) / 2, rw.height + 0.15, rw.z);
  group.add(strip);
  const dashGeo = new THREE.PlaneGeometry(18, 1.6);
  const dashMat = new THREE.MeshBasicMaterial({ color: PALETTE.runwayLine });
  for (let x = rw.x0 + 30; x < rw.x1 - 20; x += 48) {
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, rw.height + 0.3, rw.z);
    group.add(dash);
  }
  // Threshold bars at both ends.
  const barGeo = new THREE.PlaneGeometry(4, 22);
  for (const x of [rw.x0 + 12, rw.x1 - 12]) {
    const bar = new THREE.Mesh(barGeo, dashMat);
    bar.rotation.x = -Math.PI / 2;
    bar.position.set(x, rw.height + 0.3, rw.z);
    group.add(bar);
  }

  // Trees: cone + cylinder, scattered on grass away from the runway.
  const rand = mulberry32(WORLD.seed + 5);
  const trunkGeo = new THREE.CylinderGeometry(0.7, 1.1, 5, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const leafGeo = new THREE.ConeGeometry(4.2, 11, 7);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f7d32 });
  const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x3d9142 });
  let placed = 0; let guard = 0;
  while (placed < WORLD.trees && guard < 4000) {
    guard += 1;
    const a = rand() * Math.PI * 2;
    const r = 180 + rand() * 700;
    const x = Math.cos(a) * r; const z = Math.sin(a) * r;
    const h = heightAt(x, z);
    if (h < 7 || h > 60) continue;
    if (Math.abs(z - rw.z) < 46 && x > rw.x0 - 60 && x < rw.x1 + 60) continue;
    const s = 0.8 + rand() * 0.9;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, h + 2.5 * s, z); trunk.scale.setScalar(s);
    const leaf = new THREE.Mesh(leafGeo, rand() < 0.5 ? leafMat : leafMat2);
    leaf.position.set(x, h + (5 + 5.5) * s, z); leaf.scale.setScalar(s);
    group.add(trunk, leaf);
    placed += 1;
  }

  // A few houses with red roofs near the runway's west end.
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xf2e8d5 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xc0392b });
  for (let i = 0; i < 5; i += 1) {
    const x = rw.x0 - 60 - i * 26;
    const z = rw.z - 55 - (i % 2) * 24;
    const h = heightAt(x, z);
    const house = new THREE.Group();
    const walls = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 11), wallMat);
    walls.position.y = 3.5;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 5, 4), roofMat);
    roof.position.y = 9.5; roof.rotation.y = Math.PI / 4;
    house.add(walls, roof);
    house.position.set(x, h, z);
    group.add(house);
  }

  // Lighthouse on the east point.
  const lh = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 4.2, 26, 10),
    new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }),
  );
  tower.position.y = 13;
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(3.5, 3.7, 5, 10),
    new THREE.MeshLambertMaterial({ color: 0xd43d2a }),
  );
  band.position.y = 17;
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe082 }),
  );
  lamp.position.y = 27.5;
  lh.add(tower, band, lamp);
  const lhx = 880; const lhz = -160;
  lh.position.set(lhx, heightAt(lhx, lhz), lhz);
  group.add(lh);

  // Clouds: flat white puffs drifting slowly.
  const clouds = [];
  const cloudMat = new THREE.MeshLambertMaterial({
    color: 0xffffff, transparent: true, opacity: 0.85,
  });
  for (let i = 0; i < WORLD.clouds; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rand() * 3);
    for (let p = 0; p < puffs; p += 1) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(9 + rand() * 10, 8, 6), cloudMat);
      s.position.set((rand() - 0.5) * 34, (rand() - 0.5) * 5, (rand() - 0.5) * 16);
      s.scale.y = 0.55;
      cloud.add(s);
    }
    cloud.position.set((rand() - 0.5) * 2200, 150 + rand() * 110, (rand() - 0.5) * 2200);
    cloud.userData.speed = 1.5 + rand() * 2;
    clouds.push(cloud);
    group.add(cloud);
  }

  scene.add(group);
  return { group, clouds };
}
