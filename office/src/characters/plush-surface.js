/**
 * Original, deterministic short-pile plush textures. No photographs or external
 * fur assets are used. The curved fibres, root occlusion and tangent normals
 * share one seed and UV field, so the outer shells continue the woven surface.
 * Exported as a factory to share the application's exact Three.js instance.
 */
export function createPlushSurface(T) {
  let surface, shells, maps;
  const SIZE = 1024, REPEAT = 1.8;
  const randomFrom = initial => {
    let seed = initial;
    return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  };
  function texture(canvas, name, colour = false) {
    const result = new T.CanvasTexture(canvas);
    if (colour) result.colorSpace = T.SRGBColorSpace;
    result.wrapS = result.wrapT = T.RepeatWrapping;
    result.repeat.set(REPEAT, REPEAT);
    result.anisotropy = 8;
    result.name = name;
    result.userData.originalProcedural = true;
    return result;
  }
  function makeCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    return canvas;
  }
  function getMaps() {
    if (maps) return maps;
    const albedo = makeCanvas(), height = makeCanvas(), mask = makeCanvas();
    const a = albedo.getContext('2d'), h = height.getContext('2d', { willReadFrequently: true });
    const m = mask.getContext('2d');
    a.fillStyle = '#492812'; a.fillRect(0, 0, SIZE, SIZE);
    h.fillStyle = '#303030'; h.fillRect(0, 0, SIZE, SIZE);
    m.fillStyle = '#000000'; m.fillRect(0, 0, SIZE, SIZE);
    const random = randomFrom(0x70f3a281);
    // A soft root bed varies slowly beneath the individual fibres. This gives
    // clumps their own volume instead of the salt-and-pepper grain of white noise.
    for (let i = 0; i < 650; i++) {
      const x = random() * SIZE, y = random() * SIZE, radius = 12 + random() * 24;
      const gradient = a.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, i % 2 ? 'rgba(112,65,28,.18)' : 'rgba(28,14,5,.15)');
      gradient.addColorStop(1, 'rgba(63,34,13,0)');
      a.fillStyle = gradient; a.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    a.lineCap = h.lineCap = m.lineCap = 'round';
    for (let i = 0; i < 19000; i++) {
      const x = random() * SIZE, y = random() * SIZE;
      const length = 13 + random() * 19;
      const curl = (2.6 + random() * 5.2) * (random() > .5 ? 1 : -1);
      const lean = Math.sin(x * .023 + Math.sin(y * .016) * 1.6) * 5;
      const thickness = .9 + random() * 1.25;
      const red = Math.round(83 + random() * 43);
      const green = Math.round(red * (.55 + random() * .05));
      const blue = Math.round(red * (.235 + random() * .055));
      const visibility = Math.round(80 + random() * 175);
      const path = (context, ox = 0, oy = 0, along = 0) => {
        context.beginPath(); context.moveTo(x + ox + along, y + oy);
        context.bezierCurveTo(x + ox + curl + along, y + oy - length * .26,
          x + ox - curl * .65 + lean + along, y + oy - length * .72,
          x + ox + lean + along, y + oy - length);
      };
      const offsetsX = x < 25 ? [0, SIZE] : x > SIZE - 25 ? [0, -SIZE] : [0];
      const offsetsY = y < 40 ? [0, SIZE] : [0];
      for (const ox of offsetsX) for (const oy of offsetsY) {
        // Curled fibre + a narrow reflected strand, rather than a bright dot.
        path(a, ox, oy); a.strokeStyle = `rgba(35,17,6,.42)`;
        a.lineWidth = thickness + 1.5; a.stroke();
        path(a, ox, oy); a.strokeStyle = `rgb(${red},${green},${blue})`;
        a.lineWidth = thickness; a.stroke();
        path(a, ox, oy, -.35); a.strokeStyle = `rgba(${red + 22},${green + 17},${blue + 9},.25)`;
        a.lineWidth = thickness * .32; a.stroke();
        path(h, ox, oy); h.strokeStyle = '#686868'; h.lineWidth = thickness + 1.1; h.stroke();
        path(h, ox, oy); h.strokeStyle = '#b9b9b9'; h.lineWidth = thickness * .72; h.stroke();
        path(m, ox, oy); m.strokeStyle = `rgb(${visibility},${visibility},${visibility})`;
        m.lineWidth = thickness * 1.2; m.stroke();
      }
    }
    const field = h.getImageData(0, 0, SIZE, SIZE).data;
    const normalPixels = new Uint8Array(SIZE * SIZE * 4);
    const sample = (x, y) => field[(((y + SIZE) % SIZE) * SIZE + (x + SIZE) % SIZE) * 4] / 255;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const dx = (sample(x - 1, y) - sample(x + 1, y)) * 2.7;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * 2.7;
      const inverse = 1 / Math.sqrt(dx * dx + dy * dy + 1), i = (y * SIZE + x) * 4;
      normalPixels[i] = Math.round(128 + dx * inverse * 127);
      normalPixels[i + 1] = Math.round(128 + dy * inverse * 127);
      normalPixels[i + 2] = Math.round(128 + inverse * 127);
      normalPixels[i + 3] = 255;
    }
    const normal = new T.DataTexture(normalPixels, SIZE, SIZE, T.RGBAFormat);
    normal.name = 'original-curled-plush-tangent-normal'; normal.flipY = true; normal.needsUpdate = true;
    normal.wrapS = normal.wrapT = T.RepeatWrapping; normal.repeat.set(REPEAT, REPEAT);
    normal.generateMipmaps = true; normal.minFilter = T.LinearMipmapLinearFilter; normal.anisotropy = 8;
    normal.userData.originalProcedural = true;
    maps = {
      albedo: texture(albedo, 'original-chestnut-curled-plush-albedo', true),
      normal,
      fibre: texture(mask, 'original-coherent-plush-fibre-density'),
    };
    return maps;
  }
  function getPlushMaterial() {
    if (surface) return surface;
    const { albedo, normal } = getMaps();
    surface = new T.MeshPhysicalMaterial({
      map: albedo, normalMap: normal, normalScale: new T.Vector2(.82, .82),
      roughness: .94, metalness: 0, ior: 1.35, specularIntensity: .22,
      sheen: .38, sheenColor: new T.Color('#724622'), sheenRoughness: .94,
    });
    surface.name = 'rich-brown-curled-soft-plush';
    surface.userData.preserveMaterial = true;
    return surface;
  }
  function getPlushShellMaterial() {
    if (shells) return shells;
    const { albedo, normal, fibre } = getMaps();
    shells = new T.MeshPhysicalMaterial({
      map: albedo, alphaMap: fibre, normalMap: normal, normalScale: new T.Vector2(.65, .65),
      alphaTest: .15, alphaToCoverage: false, roughness: .96,
      ior: 1.35, specularIntensity: .18,
      sheen: .44, sheenColor: new T.Color('#81512b'), sheenRoughness: .95,
    });
    shells.name = 'coherent-soft-curled-pile-shell';
    shells.userData.preserveMaterial = true;
    const maxLayer = { value: 1 };
    shells.userData.furQuality = { maxLayer };
    shells.userData.setFurQuality = preset => {
      maxLayer.value = { low: .34, medium: .67, high: 1, ultra: 1 }[String(preset).toLowerCase()] ?? 1;
    };
    shells.onBeforeCompile = shader => {
      shader.uniforms.maxFurLayer = maxLayer;
      shader.vertexShader = shader.vertexShader.replace('#include <common>',
        '#include <common>\nattribute float furLayer; varying float vFurLayer;');
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvFurLayer = furLayer;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
        '#include <common>\nvarying float vFurLayer; uniform float maxFurLayer;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', `
        if (vFurLayer > maxFurLayer) discard;
        float pileThreshold = .14 + vFurLayer * .54;
        float pileEdge = max(.035, fwidth(diffuseColor.a));
        diffuseColor.a = smoothstep(pileThreshold, pileThreshold + pileEdge, diffuseColor.a);
        if (diffuseColor.a < .025) discard;
        // The surviving fragment is an opaque fibre. Fractional alpha with
        // alpha-to-coverage produces glitter against both MSAA and HDR targets.
        diffuseColor.a = 1.0;
        diffuseColor.rgb *= mix(.74, 1.07, vFurLayer);
      `);
    };
    shells.customProgramCacheKey = () => 'coherent-short-curled-pile-v2-opaque-fibres';
    return shells;
  }
  return { getPlushMaterial, getPlushShellMaterial, getMaps };
}
