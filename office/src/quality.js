import * as T from 'three';
import { createPostProcessing } from './postprocessing.js';
import { createOcclusionCulling } from './occlusion.js';

import { QUALITY_PRESETS, detectQuality } from './quality-policy.js';
export { QUALITY_PRESETS, detectQuality } from './quality-policy.js';

export function estimateTextureBytes(texture) {
  if(!texture)return 0;
  if(texture.isCompressedTexture){
    const sum=(levels)=>levels?.reduce((n,m)=>n+(m.data?.byteLength||0),0)||0;
    return sum(texture.mipmaps)||sum(texture.image?.mipmaps);
  }
  const images=Array.isArray(texture.image)?texture.image:[texture.image];
  const components=texture.format===T.RedFormat?1:texture.format===T.RGFormat?2:4;
  const bytes=texture.type===T.FloatType?4:(texture.type===T.HalfFloatType||texture.type===T.UnsignedShortType)?2:1;
  let total=0;
  for(const image of images){
    if(!image)continue;
    const width=image.width||image.videoWidth||image.naturalWidth||0;
    const height=image.height||image.videoHeight||image.naturalHeight||0;
    total+=width*height*components*bytes*(texture.generateMipmaps?4/3:1);
  }
  return Math.ceil(total);
}

export function sceneTextureBytes(scene,extraTextures=[]) {
  const textures=new Set();
  const add=(v)=>{if(v?.isTexture)textures.add(v);};
  add(scene.environment);add(scene.background);extraTextures.forEach(add);
  scene.traverse(o=>{
    for(const material of Array.isArray(o.material)?o.material:[o.material]){
      if(!material)continue;
      Object.values(material).forEach(add);
      if(material.uniforms)Object.values(material.uniforms).forEach(u=>add(u.value));
    }
  });
  return {bytes:[...textures].reduce((n,t)=>n+estimateTextureBytes(t),0),count:textures.size};
}

/** Spatially partition only large static batches. Attributes (including PBR
 * atlas coordinates) remain intact and normal Three.js frustum culling can
 * reject whole room chunks in first-person. No visibility is guessed through
 * walls, which would make doorways and orbit views pop. */
export function partitionStaticGeometry(root,cellSize=7) {
  const meshes=[];
  root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)&&o.geometry.attributes.position.count>3000)meshes.push(o);});
  let chunks=0;
  for(const mesh of meshes){
    const original=mesh.geometry,source=original.index?original.toNonIndexed():original;
    const pos=source.attributes.position,groups=new Map();
    for(let i=0;i<pos.count;i+=3){
      const x=(pos.getX(i)+pos.getX(i+1)+pos.getX(i+2))/3;
      const z=(pos.getZ(i)+pos.getZ(i+1)+pos.getZ(i+2))/3;
      const key=`${Math.floor(x/cellSize)},${Math.floor(z/cellSize)}`;
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);
    }
    if(groups.size<2){if(source!==original)source.dispose();continue;}
    for(const [key,triangles] of groups){
      const geometry=new T.BufferGeometry();
      for(const [name,attribute] of Object.entries(source.attributes)){
        const array=new attribute.array.constructor(triangles.length*3*attribute.itemSize);let n=0;
        for(const first of triangles)for(let v=0;v<3;v++)for(let c=0;c<attribute.itemSize;c++)array[n++]=attribute.array[(first+v)*attribute.itemSize+c];
        geometry.setAttribute(name,new T.BufferAttribute(array,attribute.itemSize,attribute.normalized));
      }
      geometry.computeBoundingSphere();geometry.computeBoundingBox();
      const chunk=new T.Mesh(geometry,mesh.material);chunk.name=`office-static-${key}`;
      chunk.position.copy(mesh.position);chunk.quaternion.copy(mesh.quaternion);chunk.scale.copy(mesh.scale);
      chunk.castShadow=mesh.castShadow;chunk.receiveShadow=mesh.receiveShadow;
      chunk.userData.staticChunk=true;mesh.parent.add(chunk);chunks++;
    }
    mesh.removeFromParent();original.dispose();if(source!==original)source.dispose();
  }
  return chunks;
}

// Keep the boss's core silhouette, face, crown and fur fins identical. Shell
// tiers share the same vertex buffers but submit only the requested layer
// indices, so Low saves geometry work as well as alpha-test fill rate.
function createFurGeometryLOD(scene) {
  const entries=[];
  scene.traverse(mesh=>{
    const source=mesh.geometry,layer=source?.getAttribute('furLayer');
    if(!mesh.isMesh||!layer)return;
    const levels={high:source,ultra:source};
    for(const [name,maximum]of [['low',.34],['medium',.67]]){
      const geometry=new T.BufferGeometry(),indices=[];
      for(const [name,attribute]of Object.entries(source.attributes))geometry.setAttribute(name,attribute);
      const count=source.index?.count||layer.count;
      for(let i=0;i<count;i+=3){
        const triangle=[0,1,2].map(offset=>source.index?source.index.getX(i+offset):i+offset);
        if(triangle.every(index=>layer.getX(index)<=maximum+.00001))indices.push(...triangle);
      }
      geometry.setIndex(indices);
      geometry.boundingSphere=source.boundingSphere?.clone()||null;
      geometry.boundingBox=source.boundingBox?.clone()||null;
      levels[name]=geometry;
    }
    entries.push({mesh,source,levels});
  });
  return {
    setPreset(name){for(const e of entries)e.mesh.geometry=e.levels[name];},
    stats(){return {meshes:entries.length,submittedTriangles:entries.reduce((n,e)=>n+(e.mesh.geometry.index?e.mesh.geometry.index.count:e.mesh.geometry.attributes.position.count)/3,0)};},
    dispose(){for(const e of entries){e.mesh.geometry=e.source;e.levels.low.dispose();e.levels.medium.dispose();}},
  };
}

export function createQualitySystem({renderer,scene,camera,performanceManager,materials,lighting,worldRoot,onChange=()=>{},onProgress=()=>{}}) {
  const context=renderer.getContext();
  const info=context.getExtension('WEBGL_debug_renderer_info');
  const gpu=info?context.getParameter(info.UNMASKED_RENDERER_WEBGL):'';
  const auto=detectQuality({mobile:matchMedia('(pointer: coarse)').matches||innerWidth<700,memory:navigator.deviceMemory||8,cores:navigator.hardwareConcurrency||8,gpu});
  const chunks=worldRoot?partitionStaticGeometry(worldRoot):0;
  const occlusion=createOcclusionCulling(renderer,scene,camera);
  const furGeometry=createFurGeometryLOD(scene);
  const post=createPostProcessing(renderer,scene,camera,{afterSceneRender:()=>occlusion.query()});
  let name=auto,manual=false,postOverride=null,request=0,ready=Promise.resolve(),width=1,height=1;
  let panel=null,select=null,postCheckbox=null,qualityState=null;
  let loading=false,dayLoading=false,loadError=null,dayRequest=0;
  const textureMaterials=new Set(),detailProps=[];
  scene.traverse(o=>{
    for(const material of Array.isArray(o.material)?o.material:[o.material])if(material)textureMaterials.add(material);
    if(o.userData.qualityDetail||o.userData.detailTier) {
      let taggedParent=false;
      for(let parent=o.parent;parent;parent=parent.parent)if(parent.userData.qualityDetail||parent.userData.detailTier)taggedParent=true;
      if(!taggedParent)detailProps.push(o);
    }
  });
  const point=new T.Vector3();
  function resize(w,h){
    width=Math.max(1,w);height=Math.max(1,h);
    renderer.setSize(width,height);
    post.resize(width,height,renderer.getPixelRatio());
  }
  function applyRenderSettings(){
    const preset=QUALITY_PRESETS[name];
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,preset.pixelRatio));
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFSoftShadowMap;
    scene.traverse(o=>{
      if(!o.isLight||!o.shadow)return;
      if(o.shadow.mapSize.x!==preset.shadowSize){
        o.shadow.map?.dispose();o.shadow.map=null;
        o.shadow.mapSize.set(preset.shadowSize,preset.shadowSize);
      }
    });
    renderer.shadowMap.needsUpdate=true;
    performanceManager?.setLOD?.(preset.lodDistance);
    lighting?.setQuality?.(name);
    occlusion.setEnabled(name!=='low');
    furGeometry.setPreset(name);
    for(const m of textureMaterials)m.userData?.setFurQuality?.(name);
    post.configure({...preset,post:postOverride??preset.post});
    if(!(postOverride??preset.post))post.release();
    resize(width,height);
    select&&(select.value=name);
    postCheckbox&&(postCheckbox.checked=postOverride??preset.post);
    qualityState&&(qualityState.textContent=manual?'手動設定':`自動 · ${preset.label}`);
  }
  function setPreset(next,{isManual=true}={}){
    if(!QUALITY_PRESETS[next])return Promise.reject(new RangeError(`Unknown quality preset: ${next}`));
    const current=++request;
    name=next;manual=isManual;postOverride=null;loading=true;loadError=null;
    applyRenderSettings();onProgress('正在調整材質品質…');
    ready=(async()=>{
      try {
        await materials?.setQuality?.(next);
        if(current===request)onProgress('');
      } catch(error) {
        if(current===request){
          loadError=String(error.message||error);
          onProgress('材質暫時無法載入，保留目前的貼圖。');
          if(qualityState)qualityState.textContent='保留目前貼圖';
        }
        throw error;
      } finally {
        if(current===request){loading=false;onChange(stats());}
      }
    })();
    return ready;
  }
  async function setTimeOfDay(next){
    const ticket=++dayRequest;dayLoading=true;loadError=null;
    try {
      await lighting?.setTimeOfDay?.(next);
      renderer.shadowMap.needsUpdate=true;
    } catch(error) {
      if(ticket===dayRequest){loadError=String(error.message||error);if(qualityState)qualityState.textContent='保留目前光線';}
      throw error;
    } finally {
      if(ticket===dayRequest){dayLoading=false;onChange(stats());}
    }
  }
  function setPostEnabled(enabled){postOverride=!!enabled;applyRenderSettings();onChange(stats());}
  function stats(){
    const textures=sceneTextureBytes(scene,[...(materials?.residentTextures?.()||[]),...(lighting?.residentTextures?.()||[])]),p=post.stats();
    // Shadow maps are texture allocations, too; include their actual current size.
    let shadowBytes=0;scene.traverse(o=>{if(o.isLight&&o.shadow?.map){const rt=o.shadow.map;shadowBytes+=rt.width*rt.height*8;}});
    const total=textures.bytes+p.renderTargetBytes+shadowBytes;
    return {preset:name,ready:!loading&&!dayLoading,loading:loading||dayLoading,error:loadError,automatic:!manual,pixelRatio:renderer.getPixelRatio(),staticChunks:chunks,sceneTextureCount:textures.count,sceneTextureMiB:+(textures.bytes/1048576).toFixed(2),renderTargetMiB:+(p.renderTargetBytes/1048576).toFixed(2),shadowMiB:+(shadowBytes/1048576).toFixed(2),textureMiB:+(total/1048576).toFixed(2),textureMemoryEstimate:true,fur:furGeometry.stats(),occlusion:occlusion.stats(),post:p,lodDistance:QUALITY_PRESETS[name].lodDistance};
  }
  function mount(container){
    panel=document.createElement('div');panel.className='render-settings';
    const label=document.createElement('label');label.textContent='畫質 ';
    select=document.createElement('select');select.id='quality-preset';select.setAttribute('aria-label','畫質預設');
    for(const [id,preset]of Object.entries(QUALITY_PRESETS)){const option=document.createElement('option');option.value=id;option.textContent=preset.label;select.append(option);}
    select.value=name;select.addEventListener('change',()=>{void setPreset(select.value).catch(()=>{});});label.append(select);panel.append(label);
    const postLabel=document.createElement('label');postCheckbox=document.createElement('input');postCheckbox.type='checkbox';postCheckbox.id='post-effects';postCheckbox.checked=postOverride??QUALITY_PRESETS[name].post;postCheckbox.addEventListener('change',()=>setPostEnabled(postCheckbox.checked));postLabel.append(postCheckbox,' 光影效果');panel.append(postLabel);
    if(lighting?.setTimeOfDay){
      const dayLabel=document.createElement('label');dayLabel.textContent='光線 ';
      const day=document.createElement('select');day.id='time-of-day';day.setAttribute('aria-label','時段');
      for(const [id,title]of[['day','白晝'],['sunset','夕陽'],['night','夜晚']]){const option=document.createElement('option');option.value=id;option.textContent=title;day.append(option);}
      day.addEventListener('change',()=>{void setTimeOfDay(day.value).catch(()=>{});});dayLabel.append(day);panel.append(dayLabel);
    }
    qualityState=document.createElement('small');qualityState.className='quality-state';qualityState.textContent=`自動 · ${QUALITY_PRESETS[name].label}`;panel.append(qualityState);
    container.append(panel);return panel;
  }
  const size=renderer.getSize(new T.Vector2());width=size.x;height=size.y;
  ready=setPreset(auto,{isManual:false});
  return {
    setPreset,setPostEnabled,setTimeOfDay,mount,resize,stats,
    get ready(){return ready;},
    render(dt,view){
      camera.getWorldPosition(point);
      for(const prop of detailProps){const distance=prop.getWorldPosition(new T.Vector3()).distanceTo(point);prop.visible=distance<(name==='low'?12:QUALITY_PRESETS[name].propDistance);}
      occlusion.update();
      post.render(dt,view);
    },
    dispose(){post.dispose();occlusion.dispose();furGeometry.dispose();panel?.remove();},
  };
}
