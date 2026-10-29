# Asset provenance and licences

The application loads all assets from relative URLs in this repository. No texture, HDR image, font, model, telemetry or API request is made to a third-party service at runtime.

## Original office surfaces and environments — CC0 1.0

The following assets were created specifically for this project from mathematical functions and deterministic seeded noise, without incorporating photographs, scans, existing textures, models or artwork. To the extent copyright or related rights apply, the project dedicates these generated assets to the public domain under **CC0 1.0 Universal**: <https://creativecommons.org/publicdomain/zero/1.0/>. The CC0 legal code is <https://creativecommons.org/publicdomain/zero/1.0/legalcode>.

| Files | Source / reproducibility | Contents |
| --- | --- | --- |
| `assets/textures/office-{albedo,normal,orm}-{low,high}.png` | `scripts/generate-assets.py`, seed `418624` | Original oak grain, woven cloth, brushed metal, pebbled leather, carpet pile, ceramic grout, plaster and leaf surfaces. ORM packs occlusion / roughness / metallic in RGB. Low atlas 1024×512; high 2048×1024. |
| `assets/textures/office-{albedo,normal,orm}-{low,high}.ktx2` | The same PNGs encoded by Basis Universal (`basisu`, UASTC + mipmaps) | GPU compressed copies of the original texture atlases. No additional source art. |
| `assets/environment/office-{day,sunset,night}.hdr` | `scripts/generate-assets.py` | Original 1024×512 Radiance RGBE equirectangular lighting environments. The sun/window radiance exceeds 1.0; these are real HDR lighting data. |
| Runtime art / paper atlas | `src/set-dressing.js` | Original 1024×1024 canvas paintings, planning notes and desk papers. |
| Runtime contact-shadow texture | `src/lighting.js` | Original radial soft-contact falloff generated on canvas. |
| `assets/models/zuozuo-crown.glb` | `scripts/build-models.mjs`, using `src/boss-details.js`; encoded with Meshopt | Original procedural gold/filigree/ruby mesh compiled into GLB. No third-party model was incorporated. The supplied character reference remains separately owned. |
| Runtime plush albedo / normal / fibre-density maps | `src/characters/plush-surface.js` | Original deterministic curved fibres, chestnut root occlusion and tangent normals; no sourced photographs or fur scans. |
| Procedural office geometry and furnishings | `src/world.js`, `src/architecture.js`, `src/set-dressing.js`, `src/desk-details.js` | Original meshes, office props and fictional role-screen graphics. |

Generate editable source maps and HDRs with `python3 scripts/generate-assets.py` (Python 3, NumPy and Pillow). To regenerate the committed compressed copies, add `--basisu /path/to/basisu`. The encoder is a development tool only; it is not required to run the static site. Basis Universal is Apache-2.0 licensed; the encoder binary is not redistributed by this project.

## User-provided 左左 references

`refs/zuozuo_face.png` and `refs/zuozuo_turnaround.png` were supplied with the project as the official character references. Their original rights remain with their respective owner; they are **not** included in the CC0 dedication above. The reference files are retained unchanged. The face material derives the original black ink coverage from the supplied face image and renders it on uniform warm-beige skin, removing the photograph’s orange edge lighting as requested in Stage 0. The 2026-10-29 correction in `src/characters/face-reference.js` preserves the original stroke positions and black cores while recovering their antialiased edges; it removes photographic fur outside the facial features and does not redraw the expression. This derivative use retains the original reference owner’s rights.

## Runtime libraries and decoders

- `assets/vendor/three.module.js`, Three.js addons including OrbitControls, BufferGeometryUtils, post-processing passes, RGBELoader and KTX2Loader: **MIT**, Three.js contributors. See `assets/vendor/THREE-LICENSE.txt`.
- `assets/vendor/libs/basis/basis_transcoder.js` and `.wasm`: **Apache-2.0**, Binomial LLC / Basis Universal contributors, distributed with Three.js. Full license: `assets/vendor/libs/basis/LICENSE.txt`; see also `assets/vendor/libs/basis/README.md` and the upstream project <https://github.com/BinomialLLC/basis_universal>.
- `assets/vendor/libs/ktx-parse.module.js`: **MIT**, Don McCurdy. Full license: `assets/vendor/libs/ktx-parse-LICENSE.txt`.
- `assets/vendor/libs/zstddec.module.js`: decoder wrapper **MIT**, Don McCurdy; embedded Zstandard decoder **BSD-3-Clause**, Facebook, Inc. Full notices for both: `assets/vendor/libs/zstddec-LICENSE.txt`.
- Meshoptimizer encoder/decoder, version 0.24: **MIT**, Arseny Kapoulkine. See `scripts/lib/meshopt-LICENSE.md` and `assets/vendor/libs/meshopt-LICENSE.md`.
- No externally sourced glTF model or photographic texture is used. All complex geometry is built by committed procedural source code.

Library licences are separate from the CC0 asset dedication. The official reference images are separate from both.


## Stage A — compressed scene assets and build tools

| Asset / tool | Source | Licence / scope |
| --- | --- | --- |
| `assets/models/office-floor-2.glb` and matching `.json` | `src/world.js`, `src/architecture.js`, `src/desk-details.js`, `src/set-dressing.js`; rebuilt by `npm run assets:office` | Original procedural geometry and fictional office artwork, CC0 1.0. Exact vertex attributes are retained; Meshopt compresses delivery without changing model proportions. |
| `assets/textures/generated/*.ktx2` | Canvas artwork from the same generators; deterministic SHA-256 file names; source image hashes in each model's JSON metadata | Original generated graphics, CC0 1.0, except any explicitly identified user-provided reference derivatives. Shared Basis UASTC textures are reused between models. |
| Offline atlas lettering | [Noto CJK](https://github.com/notofonts/noto-cjk), [Noto fonts](https://github.com/notofonts/noto-fonts) | SIL Open Font License 1.1; permits commercial use and rasterized lettering. The exporter explicitly selects Noto Sans/Serif CJK TC and Noto Sans Mono; no font binaries are redistributed. |
| Vite 7.2.2 | [vitejs/vite](https://github.com/vitejs/vite) | MIT; build tool only, not a runtime server. |
| Three.js GLTFExporter r170 | [mrdoob/three.js](https://github.com/mrdoob/three.js) | MIT, same version as the vendored runtime; offline exporter only. |
| glTF Transform 4.2.1 | [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | MIT; offline exact welding, reordering and GLB serialization. |
| `basisu` npm wrapper 1.16.3 | [HacksawStudios/basisu](https://github.com/HacksawStudios/basisu) | ISC wrapper; packaged Basis Universal encoder is Apache-2.0. Offline only; executable is not included in `dist/`. |

The Vite build disables `.env` loading and copies only the explicit public runtime directories and licence notices. Build dependencies, `.git`, credentials and configuration secrets are never copied into the static release.

## Stage E — original procedural spatial sound, CC0 1.0

All audio in `src/audio/synthesis.js` is generated from deterministic mathematical oscillators, seeded noise, envelopes and additive formants written specifically for this project. No recordings, sampled voices, music, third-party sound libraries or external audio services are incorporated. The generated sound assets are dedicated to **CC0 1.0 Universal** under the same legal code linked above; the supplied character artwork remains separately owned.

| Sound family | Reproducible source | Contents |
| --- | --- | --- |
| Character voices | `src/audio/acoustics.js:voiceProfile`, `src/audio/synthesis.js:voice` | Sixteen distinct fictional pitch/formant/cadence profiles, unintelligible syllables, laughter and coughs. These are synthetic toy-character voices, not imitations of real people. |
| Character Foley | `src/audio/synthesis.js:footstep` and `cue` | Carpet, tile, wood, grass and metal footfalls; typing, clicks, coffee sipping, eating, paper, game buttons/bleeps, lighter, cloth, breathing and gym equipment. |
| Building/environment | `src/audio/synthesis.js:ambience` and `cue` | Air conditioning, projector, arcade hum, kitchen, dishes, coffee machine, printer, telephone, gate, wind, birds, fountain, city traffic, elevator chimes and doors. |
| Room impulse responses | `src/audio/synthesis.js:impulse`, `src/audio/acoustics.js:ROOM_ACOUSTICS` | Original stereo early reflections and decaying noise for lobby, office, conference, studio, game, cafe, dining, kitchen, restroom, elevator and garden acoustics. No measured third-party impulse response was used. |

These signals are synthesized into bounded, cached PCM buffers after the user's first interaction. There are no audio files to download or redistribute and no initial-load audio payload; therefore no OGG/MP3 encoder or audio decoder is required. Web Audio is the browser's standard API, not a redistributed third-party audio engine. Every source uses HRTF panning, distance attenuation and wall/floor filtering; room reverberation is generated locally.

## Stage B — original office tower, interiors and city, CC0 1.0

`assets/models/floor-{1,3,4,5}.glb`, `core-{1,2,3,4,5}.glb`, `elevator-car.glb` and `building-shell.glb` are built from the committed procedural generators in `src/floors/` and `src/world/building-shell.js`. All furniture, staircase geometry, curtain walls, street fixtures, plants, cars, city silhouettes, original wall art, fictional displays and architectural lettering layouts were authored for this project and are dedicated to **CC0 1.0 Universal**. The meshes and their Canvas-generated graphics contain no downloaded third-party model, photograph, brand artwork or real financial data. Rasterized glyphs use the separately licensed Noto font family listed above. Rebuild with `npm run assets:building`; matching JSON files preserve collision geometry, floor names, sound anchors and reserved activity/seat metadata.

## Stage C — original rigged characters and animation

| Asset | Reproducible source | Licence / scope |
| --- | --- | --- |
| `assets/models/character-*.glb` / `.json` | `src/characters.js`, `src/character-details.js`, `src/characters/rig.js`; `npm run assets:characters` | Original procedural body/outfit/prop geometry, skeletons, normalized skin weights and authored animation clips, CC0 1.0. The supplied 左左 likeness, official face and reference-derived crown retain the reference owner's rights. No third-party character mesh or motion-capture data is incorporated. |
| Cotton-twill albedo, tangent normal and roughness KTX2 textures | `src/characters/cloth-material.js`; compiled by the asset pipeline | Original deterministic woven material, CC0 1.0. Shared microstructure with individual role colours. |
| Role garments, seams, WF forecast visor and scenario tablet | `src/characters/garment-details.js`, `src/characters/wf-details.js` | Original meshes and fictional graphics, CC0 1.0. |
| Phones, controllers, meals and folding newspapers | `src/characters/activity-props.js` | Original geometry and fictional screen/paper art, CC0 1.0. |
| Skeletal activity clips and two-bone foot/arm IK | `src/characters/animation-clips.js`, `src/characters/animator.js`, `src/characters/boss-prop-controller.js` | Original authored motion; no downloaded animation or motion-capture library. Generated motion data CC0 1.0; source code follows the repository's source licence. |

`src/characters/plush-hydration.js` restores the exact Stage 0 shell cutoff shader on loaded KTX2 materials. It does not generate replacement face artwork, change approved body geometry or obtain any external texture. The Stage 0 source hashes remain recorded in `docs/zuozuo-stage0-lock.json`.

## Stage F — original architectural lighting and water

`src/world/light-bake.js` computes original per-floor ambient-occlusion and diffuse-irradiance maps from the committed collision boxes and practical-light positions. These generated maps, the window-shaft density shader and the animated water normal/ripple functions in `src/world/lighting-system.js` are original work dedicated to **CC0 1.0 Universal**. They do not contain a photographed or downloaded source image. The floor bake is a 2.5D geometric horizon calculation with wall-occluded diffuse lights; it is not a path-traced global-illumination bake.

`assets/vendor/objects/Reflector.js` comes from **Three.js r170**, [mrdoob/three.js](https://github.com/mrdoob/three.js/blob/r170/examples/jsm/objects/Reflector.js), **MIT**, Three.js contributors. The full licence is `assets/vendor/THREE-LICENSE.txt`. The project uses it for a clipped planar reflection of the live scene on polished lobby stone, the gym mirror and the roof pool; the project-specific roughness/ripple shader is original. Glass and the remaining PBR surfaces use the existing original HDR environment maps documented above.

The texture-free atmosphere in `src/world/atmosphere.js` (horizon gradients, sun halo/disc, seeded procedural clouds and sparse stars) is also original **CC0 1.0 Universal** work. It uses no downloaded sky photograph, panorama or star catalogue.

The ten compressed floor bakes in `assets/textures/lighting/floor-*-{ao,diffuse}.ktx2` are reproducibly generated by `node scripts/bake-lighting.mjs` from the original floor collision metadata. They are **CC0 1.0 Universal**. `assets/textures/lighting/bake-report.json` records source-obstacle hashes, map dimensions and exact encoded byte counts. Basis Universal encoder licensing is documented in Stage A above; its executable is not redistributed.
