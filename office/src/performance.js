import * as T from "three";
import { box, mesh, bake } from "./shapes.js";

const scratch = new T.Object3D();
const lowBall = new T.SphereGeometry(1, 8, 5);
const lowEye = new T.SphereGeometry(1, 5, 3);
const lowFurMaterial = new T.MeshStandardMaterial({
  color: "#835736",
  roughness: 0.8,
});

// Keep the live rig intact. Only distant rendering switches to the coarse rig;
// status, pathing, picking and animated joint transforms use the original rig.
function createDistantRig(character) {
  const body = new T.Group(),
    fixed = new T.Group();
  body.add(fixed);
  const { person } = character,
    brown = lowFurMaterial,
    cream = "#dfbb89";
  mesh(fixed, lowBall, person.color, [0, 0.8, 0], [0.32, 0.42, 0.24]);
  mesh(fixed, lowBall, brown, [0, 1.58, 0], [0.43, 0.4, 0.32]);
  for (const side of [-1, 1]) {
    mesh(fixed, lowBall, brown, [side * 0.46, 1.58, 0], [0.19, 0.21, 0.12]);
    mesh(fixed, lowEye, cream, [side * 0.48, 1.58, 0.105], [0.11, 0.13, 0.025]);
    mesh(
      fixed,
      lowEye,
      "#3e382d",
      [side * 0.13, 1.64, 0.34],
      [0.035, 0.045, 0.02],
    );
  }
  mesh(fixed, lowBall, cream, [0, 1.55, 0.27], [0.33, 0.27, 0.075]);
  // Preserve job silhouettes even at the furthest zoom.
  if (["beret", "cap", "scout"].includes(person.style)) {
    mesh(fixed, lowBall, person.color, [0, 1.94, 0], [0.43, 0.13, 0.36]);
    if (person.style !== "beret")
      box(fixed, person.color, [0, 1.92, 0.3], [0.54, 0.035, 0.35]);
  }
  if (["hood", "headphones"].includes(person.style)) {
    for (const x of [-0.43, 0.43])
      box(
        fixed,
        person.id === "gs" ? "#d3b65f" : "#4d5660",
        [x, 1.58, 0],
        [0.13, 0.25, 0.2],
      );
    box(fixed, person.color, [0, 1.97, 0], [0.68, 0.065, 0.11]);
  }
  if (["design", "market", "fo", "lena", "lan"].includes(person.id)) {
    mesh(fixed, lowBall, "#503a2f", [0, 1.83, -0.04], [0.41, 0.18, 0.31]);
    for (const x of [-0.3, 0.3])
      mesh(
        fixed,
        lowBall,
        "#503a2f",
        [x, 1.55, -0.13],
        [0.12, person.id === "lena" ? 0.22 : 0.36, 0.22],
      );
  }
  if (person.id === "wild")
    box(fixed, "#b7a46b", [0, 0.95, -0.28], [0.49, 0.53, 0.22]);
  if (person.id === "design")
    box(fixed, "#e0c79c", [0, 0.76, 0.25], [0.39, 0.5, 0.03]);
  if (person.id === "check")
    for (const x of [-0.14, 0.14])
      box(fixed, "#354239", [x, 1.64, 0.36], [0.2, 0.12, 0.025]);
  if (person.id === "dd")
    box(fixed, "#324c49", [0.37, 0.8, 0.24], [0.29, 0.39, 0.04]);
  bake(fixed);
  const limbs = (original, arms) =>
    original.map((joint, i) => {
      const group = new T.Group();
      group.position.copy(joint.position);
      body.add(group);
      mesh(
        group,
        lowBall,
        arms ? person.color : "#555d50",
        [arms ? (i ? 1 : -1) * 0.06 : 0, arms ? -0.24 : -0.19, 0],
        arms ? [0.12, 0.28, 0.12] : [0.12, 0.24, 0.12],
      );
      mesh(
        group,
        lowEye,
        arms ? brown : person.color,
        [
          arms ? (i ? 1 : -1) * 0.07 : 0,
          arms ? -0.48 : -0.36,
          arms ? 0.015 : 0.08,
        ],
        arms ? [0.105, 0.12, 0.1] : [0.13, 0.09, 0.19],
      );
      bake(group);
      return group;
    });
  return {
    body,
    arms: limbs(character.arms, true),
    legs: limbs(character.legs, false),
  };
}

function splitSeatGeometry(geometry, seatColor) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const groups = [{}, {}],
    color = new T.Color(seatColor);
  for (const attributes of groups)
    for (const name of Object.keys(source.attributes)) attributes[name] = [];
  const colors = source.getAttribute("color");
  if (!colors) return null;
  for (
    let first = 0;
    first < source.getAttribute("position").count;
    first += 3
  ) {
    let isSeat = true;
    for (let i = first; i < first + 3; i++)
      if (
        Math.abs(colors.getX(i) - color.r) > 0.002 ||
        Math.abs(colors.getY(i) - color.g) > 0.002 ||
        Math.abs(colors.getZ(i) - color.b) > 0.002
      )
        isSeat = false;
    const target = groups[isSeat ? 1 : 0];
    for (let i = first; i < first + 3; i++)
      for (const [name, attribute] of Object.entries(source.attributes))
        for (let k = 0; k < attribute.itemSize; k++)
          target[name].push(
            isSeat && name === "color"
              ? 1
              : attribute.array[i * attribute.itemSize + k],
          );
  }
  const result = groups.map((attributes) => {
    const g = new T.BufferGeometry();
    for (const [name, values] of Object.entries(attributes))
      g.setAttribute(
        name,
        new T.Float32BufferAttribute(values, source.attributes[name].itemSize),
      );
    g.computeBoundingSphere();
    return g;
  });
  if (source !== geometry) source.dispose();
  return result;
}

function instanceChairs(scene, characters, chairs) {
  const candidates = chairs
    .map((chair) => ({
      chair,
      person: characters.find((c) => c.desk?.chair === chair)?.person,
    }))
    .filter((entry) => entry.person);
  if (candidates.length < 2)
    return { count: 0, update: () => {}, dispose: () => {} };
  const prototype = candidates[0].chair.children.find((o) => o.isMesh);
  if (
    !prototype ||
    candidates.some(
      ({ chair }) => chair.children.filter((o) => o.isMesh).length !== 1,
    )
  )
    return { count: 0, update: () => {}, dispose: () => {} };
  const reference = prototype.geometry.attributes.position;
  const matching = candidates.filter(({ chair }) => {
    const p = chair.children.find((o) => o.isMesh).geometry.attributes.position;
    if (p.count !== reference.count) return false;
    for (let i = 0; i < p.array.length; i++)
      if (Math.abs(p.array[i] - reference.array[i]) > 0.00001) return false;
    return true;
  });
  if (matching.length < 2)
    return { count: 0, update: () => {}, dispose: () => {} };
  const geometries = splitSeatGeometry(
    prototype.geometry,
    matching[0].person.color,
  );
  if (!geometries) return { count: 0, update: () => {}, dispose: () => {} };
  const material = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
  });
  const instances = geometries.map((g) => {
    const m = new T.InstancedMesh(g, material, matching.length);
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    m.frustumCulled = false;
    m.receiveShadow = true;
    m.castShadow = false;
    m.userData.dynamic = true;
    scene.add(m);
    return m;
  });
  matching.forEach(({ chair, person }, i) => {
    instances[1].setColorAt(i, new T.Color(person.color));
    for (const child of [...chair.children])
      if (child.isMesh) child.removeFromParent();
    chair.userData.instanced = true;
  });
  const update = () => {
    matching.forEach(({ chair }, i) => {
      chair.updateWorldMatrix(true, false);
      for (const m of instances) m.setMatrixAt(i, chair.matrixWorld);
    });
    for (const m of instances) m.instanceMatrix.needsUpdate = true;
  };
  update();
  return {
    count: matching.length,
    update,
    dispose: () => {
      instances.forEach((m) => {
        scene.remove(m);
        m.geometry.dispose();
      });
      material.dispose();
    },
  };
}

function createContactShadows(scene, characters) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const gradient = x.createRadialGradient(32, 32, 4, 32, 32, 31);
  gradient.addColorStop(0, "rgba(47,60,44,.22)");
  gradient.addColorStop(0.55, "rgba(47,60,44,.10)");
  gradient.addColorStop(1, "rgba(47,60,44,0)");
  x.fillStyle = gradient;
  x.fillRect(0, 0, 64, 64);
  const texture = new T.CanvasTexture(c),
    material = new T.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
  const geometry = new T.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  const shadows = new T.InstancedMesh(geometry, material, characters.length);
  shadows.instanceMatrix.setUsage(T.DynamicDrawUsage);
  shadows.frustumCulled = false;
  shadows.renderOrder = 1;
  scene.add(shadows);
  const update = () => {
    characters.forEach((character, i) => {
      scratch.position.set(
        character.root.position.x,
        character.person.id === "zuozuo" ? 0.32 : 0.035,
        character.root.position.z,
      );
      scratch.rotation.set(0, character.root.rotation.y, 0);
      scratch.scale.set(
        character.person.id === "zuozuo" ? 1.6 : 1.1,
        1,
        character.action === "nap" ? 1.7 : 0.85,
      );
      scratch.updateMatrix();
      shadows.setMatrixAt(i, scratch.matrix);
    });
    shadows.instanceMatrix.needsUpdate = true;
  };
  update();
  return {
    update,
    dispose: () => {
      scene.remove(shadows);
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}

/** Call once after all models exist, then update(camera) after simulation each frame. */
export function optimizeScene(
  scene,
  characters,
  chairs = [],
  { lodDistance = 68, contactShadows = true } = {},
) {
  const entries = [];
  for (const character of characters) {
    // The reference character never swaps appearance or detail level.
    if (character.person.id === "zuozuo") continue;
    const distant = createDistantRig(character),
      lod = new T.LOD();
    lod.autoUpdate = false;
    character.root.add(lod);
    lod.addLevel(character.body, 0);
    lod.addLevel(distant.body, lodDistance, 0.08);
    distant.body.visible = false;
    entries.push({ character, distant, lod });
  }
  const seats = instanceChairs(scene, characters, chairs),
    shadows = contactShadows ? createContactShadows(scene, characters) : null;
  return {
    update(camera) {
      camera.updateMatrixWorld();
      for (const { character, distant, lod } of entries) {
        distant.body.position.copy(character.body.position);
        distant.body.quaternion.copy(character.body.quaternion);
        distant.body.scale.copy(character.body.scale);
        for (const type of ["arms", "legs"])
          distant[type].forEach((joint, i) => {
            joint.position.copy(character[type][i].position);
            joint.quaternion.copy(character[type][i].quaternion);
          });
        lod.updateWorldMatrix(true, false);
        lod.update(camera);
      }
      seats.update();
      shadows?.update();
    },
    stats() {
      return {
        instancedChairs: seats.count,
        distantCharacters: entries.filter((e) => e.lod.getCurrentLevel() === 1)
          .length,
        lodDistance,
      };
    },
    dispose() {
      seats.dispose();
      shadows?.dispose();
    },
  };
}

/** Freeze scenery shadows only after the first valid render. Actors use contact shadows. */
export function prepareStaticShadows(scene, characters, chairs = []) {
  for (const root of [...characters.map((c) => c.root), ...chairs])
    root.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });
  scene.traverse((o) => {
    if (o.isMesh && (o.userData.dynamic || o.material?.transparent))
      o.castShadow = false;
  });
}
