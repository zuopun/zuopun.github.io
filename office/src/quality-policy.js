export const QUALITY_PRESETS=Object.freeze({
  low:Object.freeze({label:'Low',pixelRatio:1,shadowSize:512,lodDistance:28,post:false,ao:false,aoSamples:0,bloom:0,dof:false,smaa:false,texture:'low',propDistance:30}),
  medium:Object.freeze({label:'Medium',pixelRatio:1.25,shadowSize:1024,lodDistance:42,post:true,ao:false,aoSamples:0,bloom:.10,dof:false,smaa:true,texture:'low',propDistance:45}),
  high:Object.freeze({label:'High',pixelRatio:1.5,shadowSize:2048,lodDistance:65,post:true,ao:true,aoSamples:12,bloom:.16,dof:true,smaa:true,texture:'high',propDistance:65}),
  ultra:Object.freeze({label:'Ultra',pixelRatio:2,shadowSize:4096,lodDistance:90,post:true,ao:true,aoSamples:24,bloom:.22,dof:true,smaa:true,texture:'high',propDistance:100}),
});

/** The default is deliberately conservative. A discrete GPU can select Ultra;
 * a phone never gets a desktop tier just because its CSS viewport is large. */
export function detectQuality({mobile=false,memory=8,cores=8,gpu=''}={}) {
  if(mobile||memory<=4||cores<=4||/swiftshader|llvmpipe|software/i.test(gpu))return 'low';
  if(memory<8||cores<8||/intel|mali|adreno|apple gpu/i.test(gpu))return 'medium';
  return 'high';
}

