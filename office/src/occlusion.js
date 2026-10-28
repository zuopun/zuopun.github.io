import * as T from 'three';

/** Conservative, asynchronous WebGL2 occlusion queries for static room chunks.
 * Query boxes use the beauty pass depth buffer but never write color or depth.
 * Camera movement immediately reveals every chunk; only three confirmed hidden
 * results can cull one. Hidden chunks are re-tested, including through doors.
 * This is optional: Low avoids the extra query draw calls entirely. */
export function createOcclusionCulling(renderer,scene,camera) {
  const gl=renderer.getContext();
  const supported=typeof gl.createQuery==='function';
  const entries=[],queryScene=new T.Scene(),boxGeometry=new T.BoxGeometry(1,1,1);
  const material=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:true,side:T.DoubleSide,toneMapped:false,fog:false});
  const view=new T.Matrix4(),lastView=new T.Matrix4(),frustum=new T.Frustum();
  let enabled=false,epoch=0,stable=0,cursor=0,queries=0,lastFrameQueries=0;
  scene.updateMatrixWorld(true);
  scene.traverse(mesh=>{
    if(!mesh.userData.staticChunk)return;
    const bounds=new T.Box3().setFromObject(mesh),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
    const proxy=new T.Mesh(boxGeometry,material);
    proxy.position.copy(center);proxy.scale.copy(size).multiplyScalar(1.015);
    proxy.frustumCulled=false;proxy.visible=false;queryScene.add(proxy);
    const entry={mesh,proxy,bounds,query:supported?gl.createQuery():null,pending:false,epoch:0,hidden:0};
    proxy.onBeforeRender=()=>{gl.beginQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE,entry.query);};
    proxy.onAfterRender=()=>{gl.endQuery(gl.ANY_SAMPLES_PASSED_CONSERVATIVE);entry.pending=true;entry.epoch=epoch;queries++;};
    entries.push(entry);
  });
  function reveal(){for(const e of entries){e.mesh.visible=true;e.hidden=0;}}
  return {
    setEnabled(value){enabled=!!value&&supported;if(!enabled)reveal();},
    update(){
      camera.updateMatrixWorld();view.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
      const moved=view.elements.some((v,i)=>Math.abs(v-lastView.elements[i])>.00002);
      if(moved){epoch++;stable=0;reveal();lastView.copy(view);}else stable++;
      frustum.setFromProjectionMatrix(view);
      for(const e of entries){
        if(e.pending&&gl.getQueryParameter(e.query,gl.QUERY_RESULT_AVAILABLE)){
          const visible=gl.getQueryParameter(e.query,gl.QUERY_RESULT);e.pending=false;
          if(enabled&&e.epoch===epoch){e.hidden=visible?0:e.hidden+1;e.mesh.visible=e.hidden<3;}
        }
      }
    },
    // Call immediately after rendering beauty, before switching its target.
    query(){
      lastFrameQueries=0;
      if(!enabled||stable<5||!entries.length)return;
      for(const e of entries)e.proxy.visible=false;
      for(let tries=0;tries<entries.length&&lastFrameQueries<2;tries++){
        const e=entries[cursor++%entries.length];
        if(e.pending||e.bounds.containsPoint(camera.position)||!frustum.intersectsBox(e.bounds))continue;
        e.proxy.visible=true;lastFrameQueries++;
      }
      if(lastFrameQueries){const clear=renderer.autoClear;renderer.autoClear=false;renderer.render(queryScene,camera);renderer.autoClear=clear;gl.flush();}
    },
    stats:()=>({supported,enabled,stableFrames:stable,pending:entries.filter(e=>e.pending).length,chunks:entries.length,culled:entries.filter(e=>!e.mesh.visible).length,queries,lastFrameQueries}),
    dispose(){reveal();for(const e of entries)if(e.query)gl.deleteQuery(e.query);boxGeometry.dispose();material.dispose();},
  };
}
