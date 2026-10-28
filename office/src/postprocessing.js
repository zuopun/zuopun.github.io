import * as T from 'three';
import { EffectComposer } from '../assets/vendor/postprocessing/EffectComposer.js';
import { TexturePass } from '../assets/vendor/postprocessing/TexturePass.js';
import { ShaderPass } from '../assets/vendor/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from '../assets/vendor/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from '../assets/vendor/postprocessing/SMAAPass.js';
import { OutputPass } from '../assets/vendor/postprocessing/OutputPass.js';

const vertexShader = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const depthFunctions = `
uniform sampler2D officeDepth;
uniform mat4 inverseProjection;
uniform vec2 resolution;
vec3 viewPosition(vec2 uv) {
  float d=texture2D(officeDepth,uv).r;
  vec4 p=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);
  return p.xyz/p.w;
}`;

// Depth-reconstructed SSAO needs no extra geometry/normal pass. Sampling radius
// is expressed in metres, preventing giant dark halos around tiny desk objects.
const aoShader = {
  uniforms: {
    tDiffuse:{value:null},officeDepth:{value:null},inverseProjection:{value:new T.Matrix4()},
    resolution:{value:new T.Vector2()},strength:{value:0.48},radius:{value:0.48},samples:{value:12},
  }, vertexShader,
  fragmentShader:`varying vec2 vUv;uniform sampler2D tDiffuse;
  uniform float strength,radius;uniform int samples;${depthFunctions}
  void main(){
    vec4 original=texture2D(tDiffuse,vUv);
    float depth=texture2D(officeDepth,vUv).r;
    if(depth>.99999){gl_FragColor=original;return;}
    vec3 p=viewPosition(vUv);
    vec3 normal=normalize(cross(dFdx(p),dFdy(p)));
    if(normal.z<0.)normal=-normal;
    float projected=clamp(radius*resolution.y/max(-p.z,.1),2.,45.);
    float visibility=0.;
    for(int i=0;i<24;i++){
      if(i>=samples)break;
      float f=float(i)+.5;
      float angle=f*2.39996323;
      vec2 offset=vec2(cos(angle),sin(angle))*sqrt(f/float(samples))*projected/resolution;
      vec2 uv=clamp(vUv+offset,vec2(.001),vec2(.999));
      vec3 delta=viewPosition(uv)-p;
      float dist=length(delta);
      float horizon=max(dot(normal,delta/max(dist,.001))-.12,0.);
      float falloff=1.-smoothstep(radius*.15,radius,dist);
      visibility+=horizon*falloff;
    }
    float occlusion=clamp(visibility/float(samples)*3.2,0.,.7);
    gl_FragColor=vec4(original.rgb*(1.-strength*occlusion),original.a);
  }`,
};

const dofShader = {
  uniforms:{tDiffuse:{value:null},officeDepth:{value:null},inverseProjection:{value:new T.Matrix4()},
    resolution:{value:new T.Vector2()},focus:{value:7},aperture:{value:0.55}},
  vertexShader,
  fragmentShader:`varying vec2 vUv;uniform sampler2D tDiffuse;uniform float focus,aperture;${depthFunctions}
  void main(){
    float z=-viewPosition(vUv).z;
    float coc=clamp(abs(z-focus)/max(z,.1)*aperture,0.,1.)*2.6;
    vec4 color=texture2D(tDiffuse,vUv)*2.;float weight=2.;
    for(int i=0;i<8;i++){
      float a=float(i)*.78539816;
      vec2 uv=vUv+vec2(cos(a),sin(a))*coc/resolution;
      float sampleZ=-viewPosition(uv).z;
      float w=sampleZ<z-.5?.3:1.;
      color+=texture2D(tDiffuse,uv)*w;weight+=w;
    }
    gl_FragColor=color/weight;
  }`,
};
const gradeShader = {
  uniforms:{tDiffuse:{value:null},strength:{value:0.12}},vertexShader,
  fragmentShader:`varying vec2 vUv;uniform sampler2D tDiffuse;uniform float strength;
  void main(){vec4 p=texture2D(tDiffuse,vUv);float l=dot(p.rgb,vec3(.2126,.7152,.0722));
  vec3 c=mix(vec3(l),p.rgb,1.+strength*.15);c*=vec3(1.+strength*.025,1.,1.-strength*.018);
  gl_FragColor=vec4(max(c,vec3(0.)),p.a);}`,
};

function isVisible(object) {
  for (let p=object;p;p=p.parent) if (!p.visible) return false;
  return true;
}

/** A face-only final draw restores the unlit reference ink and uniform warm-beige skin after all
 * photographic effects. It compares the ORIGINAL scene depth per fragment,
 * so the face cannot show through the head, crown, walls or other characters. */
function createReferenceOverlay(scene,depthTexture,resolution) {
  const overlayScene=new T.Scene(), entries=[];
  scene.traverse(object=>{
    if(!object.isMesh || object.name !== 'official-zuozuo-face')return;
    const material=object.material.clone();
    material.toneMapped=false;
    material.depthTest=false;
    material.depthWrite=false;
    material.fog=false;
    const previous=object.material.onBeforeCompile;
    material.onBeforeCompile=shader=>{
      previous?.call(material,shader);
      shader.uniforms.officeSceneDepth={value:depthTexture};
      shader.uniforms.officeResolution={value:resolution};
      shader.fragmentShader=`uniform sampler2D officeSceneDepth;uniform vec2 officeResolution;\n`+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('void main() {',`void main() {
        float officeOccluder=texture2D(officeSceneDepth,gl_FragCoord.xy/officeResolution).r;
        // The HDR depth is single-sampled; the default framebuffer is MSAA.
        // Curved skin needs a one-pixel depth-slope allowance at sample edges.
        float officeDepthTolerance=max(0.000002,fwidth(gl_FragCoord.z)*1.25);
        if(gl_FragCoord.z>officeOccluder+officeDepthTolerance)discard;`);
    };
    material.customProgramCacheKey=()=> 'office-reference-face-depth-overlay-v2';
    const copy=new T.Mesh(object.geometry,material);
    copy.matrixAutoUpdate=false;
    copy.frustumCulled=true;
    overlayScene.add(copy);entries.push({object,copy,material});
  });
  return {
    scene:overlayScene,
    update(){for(const {object,copy} of entries){copy.visible=isVisible(object);copy.matrix.copy(object.matrixWorld);}},
    dispose(){entries.forEach(e=>e.material.dispose());},
    count:entries.length,
  };
}

/** Lazy HDR pipeline. Low/post-off renders directly and allocates no buffers. */
export function createPostProcessing(renderer,scene,camera,{afterSceneRender=()=>{}}={}) {
  let pipeline=null, settings={post:false,ao:false,bloom:0,dof:false,smaa:false,aoSamples:12};
  let width=1,height=1,pixelRatio=1,activeDof=false;
  function ensure(){
    if(pipeline)return pipeline;
    const resolution=new T.Vector2(1,1);
    const input=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true});
    input.texture.name='Office.HDR.beauty';
    input.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
    input.depthTexture.name='Office.scene.depth';
    const composer=new EffectComposer(renderer,new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false}));
    const texture=new TexturePass(input.texture);
    const ao=new ShaderPass(aoShader),dof=new ShaderPass(dofShader);
    for(const pass of [ao,dof]){
      pass.uniforms.officeDepth.value=input.depthTexture;
      pass.uniforms.resolution.value=resolution;
    }
    const bloom=new UnrealBloomPass(new T.Vector2(1,1),.12,.45,1.1);
    const grade=new ShaderPass(gradeShader),smaa=new SMAAPass(1,1),output=new OutputPass();
    for(const pass of [texture,ao,bloom,dof,grade,smaa,output])composer.addPass(pass);
    const face=createReferenceOverlay(scene,input.depthTexture,resolution);
    pipeline={input,composer,texture,ao,bloom,dof,grade,smaa,output,face,resolution};
    resize(width,height,pixelRatio);
    configure(settings);
    return pipeline;
  }
  function configure(next){
    settings={...settings,...next};
    if(settings.post)ensure();
    if(!pipeline)return;
    pipeline.ao.enabled=!!settings.ao;
    pipeline.ao.uniforms.samples.value=settings.aoSamples||12;
    pipeline.bloom.enabled=settings.bloom>0;
    pipeline.bloom.strength=settings.bloom||0;
    pipeline.smaa.enabled=!!settings.smaa;
    pipeline.dof.enabled=false;
    pipeline.grade.enabled=!!settings.post;
  }
  function resize(w,h,ratio=renderer.getPixelRatio()){
    width=Math.max(1,Math.floor(w));height=Math.max(1,Math.floor(h));pixelRatio=ratio;
    if(!pipeline)return;
    const px=Math.max(1,Math.floor(width*ratio)),py=Math.max(1,Math.floor(height*ratio));
    pipeline.input.setSize(px,py);pipeline.resolution.set(px,py);
    pipeline.composer.setPixelRatio(ratio);pipeline.composer.setSize(width,height);
  }
  function release(){
    if(!pipeline)return;
    pipeline.input.dispose();pipeline.input.depthTexture.dispose();
    pipeline.composer.passes.forEach(p=>p.dispose?.());
    pipeline.composer.dispose();pipeline.face.dispose();pipeline=null;
  }
  return {
    configure,
    resize,
    render(dt,{mode='overview',focusDistance=8}={}){
      if(!settings.post){renderer.setRenderTarget(null);renderer.render(scene,camera);afterSceneRender();return;}
      const p=ensure();
      p.ao.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
      p.dof.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
      p.dof.uniforms.focus.value=Math.max(.2,focusDistance);
      activeDof=!!settings.dof && (mode==='follow'||(mode==='overview'&&focusDistance<12));
      p.dof.enabled=activeDof;
      renderer.setRenderTarget(p.input);renderer.clear();renderer.render(scene,camera);afterSceneRender();
      p.composer.render(dt);
      p.face.update();
      const auto=renderer.autoClear;renderer.autoClear=false;
      renderer.setRenderTarget(null);renderer.render(p.face.scene,camera);renderer.autoClear=auto;
    },
    release,
    stats(){
      if(!pipeline)return {enabled:settings.post,ao:false,bloom:false,dof:false,smaa:false,faceProtected:true,renderTargetBytes:0};
      const p=pipeline,targets=new Set([p.input,p.composer.renderTarget1,p.composer.renderTarget2,p.smaa.edgesRT,p.smaa.weightsRT,p.bloom.renderTargetBright,...p.bloom.renderTargetsHorizontal,...p.bloom.renderTargetsVertical]);
      let bytes=0;
      for(const texture of [p.smaa.areaTexture,p.smaa.searchTexture])bytes+=(texture.image?.width||0)*(texture.image?.height||0)*4;
      for(const target of targets){if(!target)continue;bytes+=target.width*target.height*(target.texture.type===T.HalfFloatType?8:4);if(target.depthBuffer)bytes+=target.width*target.height*4;}
      return {enabled:settings.post,ao:settings.post&&settings.ao,bloom:settings.post&&settings.bloom>0,dof:settings.post&&activeDof,smaa:settings.post&&settings.smaa,faceProtected:p.face.count>0,renderTargetBytes:bytes};
    },
    dispose:release,
  };
}
