// The courier plane, built from three.js primitives: fuselage, nose,
// canopy, wings, tail, a spinning propeller and navigation lights.
// No model files, no textures — everything is geometry and colour.
const THREE = window.THREE;
import { PALETTE } from './config.js';

export function buildAircraft() {
  const plane = new THREE.Group();

  const bodyMat = new THREE.MeshPhongMaterial({ color: PALETTE.planeBody, shininess: 60 });
  const wingMat = new THREE.MeshPhongMaterial({ color: PALETTE.planeWing, shininess: 40 });
  const trimMat = new THREE.MeshPhongMaterial({ color: PALETTE.planeTrim, shininess: 40 });
  const darkMat = new THREE.MeshPhongMaterial({ color: 0x222831 });

  // Fuselage: a cylinder along Z, nose toward -Z is forward in our model,
  // so the group is rotated to face +X flight direction by the caller.
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.75, 6.4, 12), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  plane.add(fuselage);

  // Nose cone.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.8, 12), trimMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -4.0;
  plane.add(nose);

  // Canopy: a squashed glass dome on top.
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 14, 10),
    new THREE.MeshPhongMaterial({ color: 0x9fd8ff, shininess: 120, specular: 0xffffff }),
  );
  canopy.scale.set(0.9, 0.75, 1.7);
  canopy.position.set(0, 0.85, -0.9);
  plane.add(canopy);

  // Main wings.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.28, 2.4), wingMat);
  wing.position.set(0, -0.15, -0.4);
  plane.add(wing);
  // Wing tip stripes.
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 2.4), trimMat);
    tip.position.set(side * 6.6, -0.15, -0.4);
    plane.add(tip);
  }

  // Tail: horizontal stabiliser + vertical fin.
  const tail = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 1.5), wingMat);
  tail.position.set(0, 0.15, 3.0);
  plane.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.2, 1.8), trimMat);
  fin.position.set(0, 1.1, 2.9);
  plane.add(fin);

  // Propeller hub + two blades (spun in the animation loop).
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), darkMat);
  prop.add(hub);
  const bladeGeo = new THREE.BoxGeometry(0.28, 4.6, 0.12);
  const bladeMat = new THREE.MeshPhongMaterial({ color: 0x1f1f1f });
  const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
  const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
  blade2.rotation.z = Math.PI / 2;
  prop.add(blade1, blade2);
  prop.position.z = -5.0;
  plane.add(prop);

  // Landing gear: two wheels and a tail wheel.
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 1.5, -1.45, -0.6);
    plane.add(wheel);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), darkMat);
    strut.position.set(side * 1.5, -0.95, -0.6);
    plane.add(strut);
  }

  // Navigation lights: red left, green right, white tail.
  const light = (color, x, y, z) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({ color }),
    );
    m.position.set(x, y, z);
    plane.add(m);
  };
  light(0xff2222, -6.8, -0.15, -0.4);
  light(0x22ff66, 6.8, -0.15, -0.4);
  light(0xffffff, 0, 0.2, 3.3);

  // The model faces -Z; flight code treats heading 0 as +X, so rotate the
  // group once so its nose points along the flight direction.
  const root = new THREE.Group();
  const inner = new THREE.Group();
  inner.rotation.y = -Math.PI / 2; // -Z nose -> +X nose
  inner.add(plane);
  root.add(inner);

  root.userData.propeller = prop;
  root.userData.inner = inner;
  return root;
}

/** Spin the propeller faster with throttle; slow to a stop when off. */
export function spinPropeller(plane, throttle, dt) {
  const prop = plane.userData.propeller;
  prop.rotation.z += dt * (2 + throttle * 55);
}
