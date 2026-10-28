import { GLTFLoader } from "../assets/vendor/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "../assets/vendor/libs/meshopt_decoder.module.js";

let pending;
/** Optional streamed model. The procedural generator remains an offline-safe fallback. */
export function loadCrownAsset({ onProgress = () => {} } = {}) {
  if (!pending) pending = (async () => {
    try {
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const asset = await loader.loadAsync(new URL("../assets/models/zuozuo-crown.glb", import.meta.url).href, (event) => {
        onProgress({ phase: "crown", loaded: event.loaded, total: event.total || 1 });
      });
      const crown = asset.scene;
      crown.name = "immutable-ornate-ruby-crown";
      crown.userData.meshoptAsset = true;
      crown.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        object.material.userData.preserveMaterial = true;
      });
      return crown;
    } catch {
      // Loading failure changes the delivery path, never the character design.
      return null;
    }
  })();
  return pending;
}
