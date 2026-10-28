import * as T from "three";
import { RGBELoader } from "../assets/vendor/loaders/RGBELoader.js";

const TIMES = {
  day: { background: "#dce4e4", fog: "#dce4e4", sun: "#fff1d4", sunPower: 2.7, sky: "#dce9ff", ground: "#7d806b", hemi: .62, exposure: .93, practical: .16, environment: .6 },
  sunset: { background: "#b99896", fog: "#b99896", sun: "#ffa76b", sunPower: 2.8, sky: "#a8b2e0", ground: "#835b49", hemi: .65, exposure: 1.03, practical: .6, environment: .8 },
  night: { background: "#1a263b", fog: "#1a263b", sun: "#8da9ed", sunPower: .65, sky: "#7d93cc", ground: "#544238", hemi: .58, exposure: 1.14, practical: 1.35, environment: 1.15 },
};

function contactMap() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const c = canvas.getContext("2d"), gradient = c.createRadialGradient(32, 32, 8, 32, 32, 31);
  gradient.addColorStop(0, "rgba(30,24,18,.3)");
  gradient.addColorStop(.5, "rgba(30,24,18,.16)");
  gradient.addColorStop(1, "rgba(30,24,18,0)");
  c.fillStyle = gradient; c.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(canvas);
}
function addFurnitureContacts(scene, obstacles = []) {
  const footprints = obstacles.filter((o) => o.w > .4 && o.d > .4 && o.w < 5 && o.d < 4);
  const material = new T.MeshBasicMaterial({ map: contactMap(), transparent: true, depthWrite: false, toneMapped: false, opacity: .76 });
  material.name = "furniture-baked-soft-contact";
  const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), material, footprints.length);
  mesh.name = "Furniture contact shadows";
  mesh.renderOrder = 1;
  const temp = new T.Object3D();
  footprints.forEach((o, i) => {
    temp.position.set(o.x, .075, o.z);
    if (Math.abs(o.x) < 3.3 && o.z < -6.3) temp.position.y += .75;
    temp.rotation.x = -Math.PI / 2;
    temp.scale.set(o.w * 1.22, o.d * 1.24, 1);
    temp.updateMatrix(); mesh.setMatrixAt(i, temp.matrix);
  });
  scene.add(mesh);
  return mesh;
}

export async function setupLighting(renderer, scene, sun, { world, onProgress = () => {} } = {}) {
  const rgbe = new RGBELoader(), generator = new T.PMREMGenerator(renderer);
  generator.compileEquirectangularShader();
  const environments = new Map(), resident = new Set();
  let active = "day", pending = 0, quality = "medium";
  let hemisphere;
  scene.traverse((o) => { if (o.isHemisphereLight && !hemisphere) hemisphere = o; });
  if (!hemisphere) { hemisphere = new T.HemisphereLight(); scene.add(hemisphere); }
  const fill = new T.DirectionalLight("#dae6ff", .5);
  fill.position.set(12, 8, 8); scene.add(fill);
  // One warm key casts the cached shadow. Practical lights are inexpensive diffuse
  // points without shadow maps; luminous shades themselves feed selective bloom.
  const practicals = [];
  for (const [x, z] of [[-9.5, 4], [9.5, -5.5], [9.5, 4.5], [-9.5, -5]]) {
    const light = new T.PointLight("#ffd4a1", .16, 9, 2);
    light.position.set(x, 3.1, z); practicals.push(light); scene.add(light);
  }
  const contact = addFurnitureContacts(scene, world?.obstacles);
  sun.shadow.radius = 3;
  sun.shadow.normalBias = .025;
  sun.shadow.bias = -.0001;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  async function loadEnvironment(name) {
    if (!environments.has(name)) {
      const promise = rgbe.loadAsync(new URL(`../assets/environment/office-${name}.hdr`, import.meta.url).href)
        .then((source) => {
          const target = generator.fromEquirectangular(source);
          target.texture.name = `office-cc0-${name}-ibl`;
          resident.add(target.texture);
          source.dispose();
          onProgress({ phase: "environment", loaded: 1, total: 1, name });
          return target;
        });
      environments.set(name, promise);
    }
    return environments.get(name);
  }
  async function setTimeOfDay(name) {
    if (!TIMES[name]) return;
    const ticket = ++pending;
    const environment = await loadEnvironment(name);
    if (ticket !== pending) return;
    active = name;
    const p = TIMES[name];
    scene.environment = environment.texture;
    scene.environmentIntensity = p.environment;
    scene.background = new T.Color(p.background);
    if (scene.fog) scene.fog.color.set(p.fog);
    hemisphere.color.set(p.sky); hemisphere.groundColor.set(p.ground); hemisphere.intensity = p.hemi;
    sun.color.set(p.sun); sun.intensity = p.sunPower;
    sun.position.set(name === "sunset" ? -20 : -12, name === "sunset" ? 12 : 22, name === "night" ? -6 : 9);
    fill.intensity = name === "night" ? .22 : .45;
    practicals.forEach((light) => { light.intensity = p.practical; });
    const emitted = new Set();
    scene.traverse((o) => {
      const m = o.material;
      if (m?.userData?.dayNightEmitter && !emitted.has(m)) {
        m.emissiveIntensity = name === "night" ? 1.5 : name === "sunset" ? .7 : .1;
        emitted.add(m);
      }
    });
    renderer.toneMappingExposure = p.exposure;
    renderer.shadowMap.needsUpdate = true;
  }
  await setTimeOfDay("day");
  return {
    setTimeOfDay,
    residentTextures: () => [...resident],
    setQuality(name) {
      name = String(name).toLowerCase();
      quality = name;
      practicals.forEach((light) => { light.visible = name !== "low"; });
      contact.visible = true;
    },
    stats: () => ({ timeOfDay: active, environmentsResident: environments.size, quality, furnitureContacts: contact.count }),
    dispose() { for (const env of environments.values()) env.then((r) => r.dispose()); generator.dispose(); },
  };
}
