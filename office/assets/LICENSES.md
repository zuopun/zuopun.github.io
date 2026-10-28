# Asset provenance and licences

The application loads all assets from relative URLs in this repository. No texture, HDR image, font, model, telemetry or API request is made to a third-party service at runtime.

## Original office surfaces and environments — CC0 1.0

The following assets were created specifically for this project from mathematical functions and deterministic seeded noise, without incorporating photographs, scans, existing textures, models or artwork. To the extent copyright or related rights apply, the project dedicates these generated assets to the public domain under **CC0 1.0 Universal**: <https://creativecommons.org/publicdomain/zero/1.0/>. The CC0 legal code is <https://creativecommons.org/publicdomain/zero/1.0/legalcode>.

| Files | Source / reproducibility | Contents |
| --- | --- | --- |
| `textures/office-{albedo,normal,orm}-{low,high}.png` | `scripts/generate-assets.py`, seed `418624` | Original oak grain, woven cloth, brushed metal, pebbled leather, carpet pile, ceramic grout, plaster and leaf surfaces. ORM packs occlusion / roughness / metallic in RGB. Low atlas 1024×512; high 2048×1024. |
| `textures/office-{albedo,normal,orm}-{low,high}.ktx2` | The same PNGs encoded by Basis Universal (`basisu`, UASTC + mipmaps) | GPU compressed copies of the original texture atlases. No additional source art. |
| `environment/office-{day,sunset,night}.hdr` | `scripts/generate-assets.py` | Original 1024×512 Radiance RGBE equirectangular lighting environments. The sun/window radiance exceeds 1.0; these are real HDR lighting data. |
| Runtime art / paper atlas | `src/set-dressing.js` | Original 1024×1024 canvas paintings, planning notes and desk papers. |
| Runtime contact-shadow texture | `src/lighting.js` | Original radial soft-contact falloff generated on canvas. |
| `models/zuozuo-crown.glb` | `scripts/build-models.mjs`, using `src/boss-details.js`; encoded with Meshopt | Original procedural gold/filigree/ruby mesh compiled into GLB. No third-party model was incorporated. The supplied character reference remains separately owned. |
| Procedural office geometry and furnishings | `src/world.js`, `src/architecture.js`, `src/set-dressing.js`, `src/desk-details.js` | Original meshes, office props and fictional role-screen graphics. |

Generate editable source maps and HDRs with `python3 scripts/generate-assets.py` (Python 3, NumPy and Pillow). To regenerate the committed compressed copies, add `--basisu /path/to/basisu`. The encoder is a development tool only; it is not required to run the static site. Basis Universal is Apache-2.0 licensed; the encoder binary is not redistributed by this project.

## User-provided 左左 references

`refs/zuozuo_face.png` and `refs/zuozuo_turnaround.png` were supplied with the project as the official character references. Their original rights remain with their respective owner; they are **not** included in the CC0 dedication above. The face uses the original image directly, and its original pixels are not recoloured or repainted.

## Runtime libraries and decoders

- `vendor/three.module.js`, Three.js addons including OrbitControls, BufferGeometryUtils, post-processing passes, RGBELoader and KTX2Loader: **MIT**, Three.js contributors. See `vendor/THREE-LICENSE.txt`.
- `vendor/libs/basis/basis_transcoder.js` and `.wasm`: **Apache-2.0**, Binomial LLC / Basis Universal contributors, distributed with Three.js. Full license: `vendor/libs/basis/LICENSE.txt`; see also `vendor/libs/basis/README.md` and the upstream project <https://github.com/BinomialLLC/basis_universal>.
- `vendor/libs/ktx-parse.module.js`: **MIT**, Don McCurdy. Full license: `vendor/libs/ktx-parse-LICENSE.txt`.
- `vendor/libs/zstddec.module.js`: decoder wrapper **MIT**, Don McCurdy; embedded Zstandard decoder **BSD-3-Clause**, Facebook, Inc. Full notices for both: `vendor/libs/zstddec-LICENSE.txt`.
- Meshoptimizer encoder/decoder, version 0.24: **MIT**, Arseny Kapoulkine. See `scripts/lib/meshopt-LICENSE.md` and `vendor/libs/meshopt-LICENSE.md`.
- No externally sourced glTF model or photographic texture is used. All complex geometry is built by committed procedural source code.

Library licences are separate from the CC0 asset dedication. The official reference images are separate from both.
