import * as T from "three";
import { KTX2Loader } from "../assets/vendor/loaders/KTX2Loader.js";

// These original CC0 atlases share one shader across the already merged scenery.
// The flat per-triangle surface index preserves material identity without splitting
// the building into hundreds of texture draw calls.
const SURFACES = { oak: 0, woven: 1, metal: 2, leather: 3, carpet: 4, ceramic: 5, plaster: 6, foliage: 7 };
const palettes = {
  oak: "dfc8a3 f2dfb9 af8664 c9ab7d a58b64 c0a17a a18362 b49b78 b69b75 dfcea9 b79967 9a8a6a 9b785b c09a70 c6a77d a78c69 866c4e 9d916e d8c7a3 695e46",
  woven: "a2af86 91a078 7d9480 67847a bc9b85 dfc6a7 e6d2b4 e9e6d1 c2a47c 879784 a4b49c",
  metal: "43554e 53665b 67766c 5d7065 66776d 46574f 4b5e52 495c51 7c8a73 65766e 657a70 667b73 7f8f82 84998c 859e92 627b72 465e55 718477 7d9c93 9aaa98 7a8c80 485e57 4f6861 6d8d82 435952 3f514b 52655b 788b83 8b9f9a d6b566 e3c475 d6af5d e4c77c d9c68d",
  leather: "798b67 3d5248 364c45 475849 4d3b31 6d4b33 6d4e37 503a2f 4d5145",
  carpet: "e8ebdb dfd6ba d8dfc9 d6dfdb b7c7ac b2b89a a4b28c 667b67 b0be9b c3cbb0 596f59 6d9c8a 77997f 6b7f74",
  ceramic: "faf4df c9dddd eae2ce e1ece4 f8f5e9 f7f3e4 f6f2df e8e8d9 eef2df c6d6bf 92ada8 8caeaa b4d0cd dce4d9 d4a282 ced8c3 eff0d8 e1dfc8",
  foliage: "76946b 9aaa7d a1b581 a2c9ac cde4a9 6d8e88 6d9f8c 426d48 608b55 7c9d61",
};
const exact = new Map();
for (const [name, values] of Object.entries(palettes))
  for (const hex of values.split(" ")) exact.set(hex, SURFACES[name]);
const workingColor = new T.Color();
function classify(r, g, b, character) {
  workingColor.setRGB(r, g, b);
  const hex = workingColor.getHexString();
  if (character) {
    if (["dfbb89", "f2dfb5", "966647", "3e382d"].includes(hex)) return SURFACES.plaster;
    // Metal buckles and frames retain hard highlights; clothing acquires weave.
    if (["d6af5d", "e4c77c", "d9c68d"].includes(hex)) return SURFACES.metal;
    return ["503a2f", "4d3b31", "6d4b33", "6d4e37"].includes(hex) ? SURFACES.leather : SURFACES.woven;
  }
  return exact.get(hex) ?? SURFACES.plaster;
}
const tileScale = [1.35, 5.5, 4.0, 5, 5.0, 1.2, 3, 2.8];

function decorateGeometry(object, character) {
  const source = object.geometry;
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.attributes.position, normal = geometry.attributes.normal;
  const colors = geometry.attributes.color;
  const uv = new Float32Array(position.count * 2);
  const layer = new Float32Array(position.count);
  const color = new Float32Array(position.count * 3);
  const material = object.material;
  const base = material.color || new T.Color("white");
  for (let i = 0; i < position.count; i += 3) {
    const r = (colors ? colors.getX(i) : 1) * base.r;
    const g = (colors ? colors.getY(i) : 1) * base.g;
    const b = (colors ? colors.getZ(i) : 1) * base.b;
    const category = material.transparent ? SURFACES.plaster : material.name === "woven-draped-textile" ? SURFACES.woven : classify(r, g, b, character);
    const nx = Math.abs(normal?.getX(i) || 0), ny = Math.abs(normal?.getY(i) || 0), nz = Math.abs(normal?.getZ(i) || 0);
    for (let j = i; j < Math.min(i + 3, position.count); j++) {
      const x = position.getX(j), y = position.getY(j), z = position.getZ(j);
      // Dominant-axis surface projection gives wood boards and tiles a real scale.
      const [u, v] = ny > nx && ny > nz ? [x, -z] : nx > nz ? [-z, y] : [x, y];
      uv[j * 2] = u * tileScale[category];
      uv[j * 2 + 1] = v * tileScale[category];
      layer[j] = category;
      color[j * 3] = (colors ? colors.getX(j) : 1) * base.r;
      color[j * 3 + 1] = (colors ? colors.getY(j) : 1) * base.g;
      color[j * 3 + 2] = (colors ? colors.getZ(j) : 1) * base.b;
    }
  }
  geometry.setAttribute("uv", new T.BufferAttribute(uv, 2));
  geometry.setAttribute("officeSurface", new T.BufferAttribute(layer, 1));
  geometry.setAttribute("color", new T.BufferAttribute(color, 3));
  object.geometry = geometry;
}

function atlasShader(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float officeSurface;\nvarying float vOfficeSurface;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvOfficeSurface = officeSurface;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
      varying float vOfficeSurface;
      vec2 officeAtlasUV(vec2 uv) {
        float surface = floor(vOfficeSurface + 0.5);
        vec2 tile = vec2(mod(surface, 4.0), floor(surface / 4.0));
        // A tiny gutter avoids reading the adjacent surface with anisotropic taps.
        return (tile + 0.0625 + fract(uv) * 0.875) / vec2(4.0, 2.0);
      }
      vec4 officeTexture(sampler2D tex, vec2 uv) {
        // Derivatives must be taken before fract(). Otherwise every repeat edge
        // selects the whole-atlas mip and leaks ceramic grout into other surfaces.
        return textureGrad(tex, officeAtlasUV(uv), dFdx(uv) * vec2(.21875, .4375), dFdy(uv) * vec2(.21875, .4375));
      }
    `);
    for (const [chunk, varying] of [
      ["map_fragment", "vMapUv"], ["normal_fragment_maps", "vNormalMapUv"],
      ["roughnessmap_fragment", "vRoughnessMapUv"], ["metalnessmap_fragment", "vMetalnessMapUv"],
      ["aomap_fragment", "vAoMapUv"],
    ]) shader.fragmentShader = shader.fragmentShader.replace(
      `#include <${chunk}>`, T.ShaderChunk[chunk].replace(new RegExp(`texture2D\\( (\\w+), ${varying} \\)`, "g"), `officeTexture($1, ${varying})`),
    );
  };
  material.customProgramCacheKey = () => "office-pbr-atlas-v2";
}

export async function applyMaterials(scene, { renderer, characters = [], onProgress = () => {} } = {}) {
  const loader = new KTX2Loader().setTranscoderPath(new URL("../assets/vendor/libs/basis/", import.meta.url).href);
  loader.detectSupport(renderer);
  const fallback = new T.TextureLoader();
  const cache = new Map(), managed = new Set(), resident = new Set();
  let activeTier = "low", activePreset = "medium", request = 0;
  async function loadTier(tier) {
    if (cache.has(tier)) return cache.get(tier);
    let loaded = 0;
    const pending = Promise.all(["albedo", "normal", "orm"].map(async (channel) => {
      const base = new URL(`../assets/textures/office-${channel}-${tier}`, import.meta.url).href;
      let texture;
      try { texture = await loader.loadAsync(`${base}.ktx2`); }
      catch { texture = await fallback.loadAsync(`${base}.png`); }
      texture.name = `office-cc0-${channel}-${tier}`;
      texture.colorSpace = channel === "albedo" ? T.SRGBColorSpace : T.NoColorSpace;
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
      // The KTX2 files retain the PNG scanline orientation (rd). Three's compressed
      // textures cannot flip on upload; compensate in the atlas row convention.
      texture.flipY = false;
      texture.userData.officeAtlas = true;
      resident.add(texture);
      onProgress({ phase: "materials", loaded: ++loaded, total: 3, tier });
      return texture;
    })).then(([albedo, normal, orm]) => ({ albedo, normal, orm }));
    cache.set(tier, pending);
    return pending;
  }
  const initial = await loadTier("low");
  const materials = new Map();
  function atlasMaterial(original) {
    const key = `${!!original.transparent}:${original.opacity}:${original.side}:${original.depthWrite}`;
    if (materials.has(key)) return materials.get(key);
    const glass = !!original.transparent;
    const result = glass ? new T.MeshPhysicalMaterial({
      color: "white", vertexColors: true, transparent: true,
      opacity: original.opacity, depthWrite: original.depthWrite,
      roughness: original.opacity > .7 ? 1 : .14, metalness: .05, clearcoat: original.opacity > .7 ? 0 : 1, clearcoatRoughness: .2,
      ior: 1.45, thickness: .045, side: original.side,
    }) : new T.MeshStandardMaterial({ color: "white", vertexColors: true, roughness: 1, metalness: 1, side: original.side });
    result.name = glass ? "office-frosted-architectural-glass" : "office-shared-pbr-atlas";
    result.map = initial.albedo;
    result.normalMap = initial.normal;
    result.normalScale.set(glass ? .14 : .6, glass ? .14 : .6);
    result.roughnessMap = initial.orm;
    if (!glass) result.metalnessMap = initial.orm;
    result.aoMap = initial.orm;
    result.aoMapIntensity = .45;
    result.envMapIntensity = glass ? .9 : .55;
    result.userData.officeSurfaceAtlas = true;
    atlasShader(result);
    materials.set(key, result);
    managed.add(result);
    return result;
  }
  const characterRoots = new Map(characters.map((c) => [c.root, c.person.id]));
  scene.traverse((object) => {
    if (!object.isMesh || Array.isArray(object.material)) return;
    const original = object.material;
    if (!original?.isMeshStandardMaterial || original.map || original.userData?.preserveMaterial || original.emissive?.getHex() > 0) return;
    let id = null;
    for (let node = object; node; node = node.parent) {
      if (characterRoots.has(node)) { id = characterRoots.get(node); break; }
    }
    // The reference character's purpose-built fur, crown and skin are never remapped.
    if (id === "zuozuo") return;
    decorateGeometry(object, !!id);
    object.material = atlasMaterial(original);
  });
  async function setQuality(preset) {
    preset = String(preset).toLowerCase();
    activePreset = preset;
    const ticket = ++request;
    const tier = ["high", "ultra"].includes(preset) ? "high" : "low";
    const textures = await loadTier(tier);
    if (ticket !== request) return;
    activeTier = tier;
    for (const material of managed) {
      material.map = textures.albedo;
      material.normalMap = preset === "low" ? null : textures.normal;
      material.roughnessMap = textures.orm;
      if (!material.transparent) material.metalnessMap = textures.orm;
      material.aoMap = textures.orm;
      material.needsUpdate = true;
    }
  }
  return {
    setQuality,
    residentTextures: () => [...resident],
    stats: () => ({ textureTier: activeTier, preset: activePreset, materialBatches: managed.size, textureCompression: "KTX2 / Basis UASTC (PNG fallback)", atlasSize: activeTier === "high" ? [2048, 1024] : [1024, 512] }),
    dispose() { loader.dispose(); for (const m of managed) m.dispose(); },
  };
}
