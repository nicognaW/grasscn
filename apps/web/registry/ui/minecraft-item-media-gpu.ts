import {minecraftItemAssets as assets} from "./minecraft-item-assets"
type Painter={canvas:HTMLCanvasElement;gl:WebGLRenderingContext;program:WebGLProgram;textures:Record<keyof typeof assets,WebGLTexture>;buffer:WebGLBuffer}
let painter:Painter|null|undefined,users=0
function create():Painter|null{
 const canvas=document.createElement("canvas"),gl=canvas.getContext("webgl",{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)return null
 const shader=(kind:number,source:string)=>{const value=gl.createShader(kind)!;gl.shaderSource(value,source);gl.compileShader(value);if(!gl.getShaderParameter(value,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(value)??"Item media shader failed");return value}
 const vertex=shader(gl.VERTEX_SHADER,"attribute vec2 position;attribute vec2 uv;uniform vec2 projection;varying vec2 coord;void main(){gl_Position=vec4(position*projection+vec2(-1.,1.),0.,1.);coord=uv;}"),fragment=shader(gl.FRAGMENT_SHADER,"precision highp float;varying vec2 coord;uniform sampler2D image;uniform float shade;void main(){gl_FragColor=shade>0.5?vec4(144./255.,144./255.,144./255.,160./255.):texture2D(image,coord);}")
 const program=gl.createProgram()!;gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.useProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)??"Item media shader link failed");gl.deleteShader(vertex);gl.deleteShader(fragment)
 const textures={} as Painter["textures"]
 for(const name of Object.keys(assets) as (keyof typeof assets)[]){const asset=assets[name],texture=gl.createTexture()!;textures[name]=texture;gl.bindTexture(gl.TEXTURE_2D,texture);for(const parameter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.NEAREST);for(const parameter of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,asset.width,asset.height,0,gl.RGBA,gl.UNSIGNED_BYTE,Uint8Array.from(atob(asset.rgba),char=>char.charCodeAt(0)))}
 const buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(const [name,offset] of [["position",0],["uv",8]] as const){const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,16,offset)}gl.disable(gl.DITHER)
 return {canvas,gl,program,textures,buffer}
}
export function retainItemMedia(){users++}
export function releaseItemMedia(){if(--users>0)return;if(painter){const {gl,textures,buffer,program}=painter;for(const texture of Object.values(textures))gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension("WEBGL_lose_context")?.loseContext()}painter=undefined}
export function itemMediaPixels(state:0|1|2,scale:number,x:number,y:number){
 if(painter?.gl.isContextLost())painter=undefined;if(painter===undefined)painter=create();if(!painter)return undefined
 const {canvas,gl,program,textures}=painter,width=innerWidth,height=innerHeight,size=32*scale,originX=Math.round(x),originY=Math.round(y)
 if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;gl.viewport(0,0,width,height);gl.uniform2f(gl.getUniformLocation(program,"projection"),2/width,-2/height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT)
 const a=[originX,originY,0,0],b=[originX,originY+size,0,1],c=[originX+size,originY+size,1,1],d=[originX+size,originY,1,0];gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([...a,...b,...c,...c,...d,...a]),gl.STREAM_DRAW)
 gl.disable(gl.BLEND);gl.bindTexture(gl.TEXTURE_2D,textures.thumbnail);gl.uniform1f(gl.getUniformLocation(program,"shade"),0);gl.drawArrays(gl.TRIANGLES,0,6)
 if(state){gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.uniform1f(gl.getUniformLocation(program,"shade"),1);gl.drawArrays(gl.TRIANGLES,0,6);gl.uniform1f(gl.getUniformLocation(program,"shade"),0);gl.bindTexture(gl.TEXTURE_2D,state===2?textures.join_highlighted:textures.join);gl.drawArrays(gl.TRIANGLES,0,6);gl.disable(gl.BLEND)}
 const left=Math.max(0,originX),top=Math.max(0,originY),right=Math.min(width,originX+size),bottom=Math.min(height,originY+size),result=new Uint8ClampedArray(size*size*4)
 if(right>left&&bottom>top){const w=right-left,h=bottom-top,raw=new Uint8Array(w*h*4);gl.readPixels(left,height-bottom,w,h,gl.RGBA,gl.UNSIGNED_BYTE,raw);for(let row=0;row<h;row++)result.set(raw.subarray((h-row-1)*w*4,(h-row)*w*4),((top-originY+row)*size+left-originX)*4)}
 return result
}
