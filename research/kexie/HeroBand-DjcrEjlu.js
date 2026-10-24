import{D as e,E as t,N as n,S as r,T as i,g as a,j as o}from"./vue-vendor-Co0syyBn.js";var s=`
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`,c=`
precision highp float;
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform vec3 uColor;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform float uNoise;
uniform float uBandWidth;
uniform float uYOffset;
uniform float uFadeTop;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform int uIterations;
uniform float uIntensity;
varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;
  vec2 uv = vUv;
  uv.y += uYOffset;
  vec2 p = uv * 2.0 - 1.0;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  float aspect = uCanvas.x / uCanvas.y;
  vec2 q = vec2(rp.x * aspect, rp.y);
  float invScale = 1.0 / max(uScale, 0.0001);
  q *= invScale;
  q /= 0.5 + 0.2 * dot(q, q);
  q += (uPointer - rp) * uMouseInfluence * 0.2;
  q += 0.2 * cos(t) - 7.56;

  for (int i = 0; i < 5; i++) {
    if (i >= uIterations) break;
    vec2 r = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));
    q = q + (r - q) * uWarpStrength;
  }

  float m = length(q + sin(5.0 * q.y * uFrequency - 3.0 * t) * 0.25);

  float w = 1.0 - exp(-6.0 / exp(6.0 * m));
  w = pow(clamp(w, 0.0, 1.0), uBandWidth);
  w *= smoothstep(uFadeTop, 0.0, vUv.y);
  w *= uIntensity;

  vec3 col = uColor * w;
  col += (fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uNoise;
  col = clamp(col, 0.0, 1.0) * w;

  gl_FragColor = vec4(col, w);
}
`,l=r({__name:`HeroBand`,props:{color:{default:`#3b82f6`},rotation:{default:0},speed:{default:.2},scale:{default:1},frequency:{default:1},warpStrength:{default:11},noise:{default:.05},bandWidth:{default:1.4},yOffset:{default:0},fadeTop:{default:.3},mouseInfluence:{default:.3},iterations:{default:1},intensity:{default:1}},setup(r){let l=r,u=n(null),d=new Float32Array([-1,-1,3,-1,-1,3]),f=null,p=null,m=null,h=null,g=null,_=null,v=!0,y={},b=[0,0],x=[0,0],S={left:0,top:0,width:1,height:1};function C(e){let t=e.replace(`#`,``).trim();return[parseInt(t.slice(0,2),16)/255,parseInt(t.slice(2,4),16)/255,parseInt(t.slice(4,6),16)/255]}function w(e,t){if(!f)return null;let n=f.createShader(e);return n?(f.shaderSource(n,t),f.compileShader(n),f.getShaderParameter(n,f.COMPILE_STATUS)?n:(f.deleteShader(n),null)):null}function T(){if(!f||!p)return;f.uniform1f(y.uSpeed,l.speed),f.uniform1f(y.uScale,l.scale),f.uniform1f(y.uFrequency,l.frequency),f.uniform1f(y.uWarpStrength,l.warpStrength),f.uniform1f(y.uNoise,l.noise),f.uniform1f(y.uBandWidth,l.bandWidth),f.uniform1f(y.uYOffset,l.yOffset),f.uniform1f(y.uFadeTop,l.fadeTop),f.uniform1f(y.uMouseInfluence,l.mouseInfluence),f.uniform1i(y.uIterations,l.iterations),f.uniform1f(y.uIntensity,l.intensity);let[e,t,n]=C(l.color);f.uniform3f(y.uColor,e,t,n);let r=l.rotation*Math.PI/180;f.uniform2f(y.uRot,Math.cos(r),Math.sin(r))}return i(()=>{let e=u.value;if(!e)return;let n=document.createElement(`canvas`);if(f=n.getContext(`webgl`,{antialias:!1,alpha:!0,premultipliedAlpha:!0,powerPreference:`high-performance`}),!f)return;let r=w(f.VERTEX_SHADER,s),i=w(f.FRAGMENT_SHADER,c);if(!r||!i||(p=f.createProgram(),!p))return;if(f.attachShader(p,r),f.attachShader(p,i),f.linkProgram(p),f.deleteShader(r),f.deleteShader(i),!f.getProgramParameter(p,f.LINK_STATUS)){f.deleteProgram(p),p=null;return}f.useProgram(p);let a=[`uCanvas`,`uTime`,`uSpeed`,`uRot`,`uColor`,`uScale`,`uFrequency`,`uWarpStrength`,`uNoise`,`uBandWidth`,`uYOffset`,`uFadeTop`,`uPointer`,`uMouseInfluence`,`uIterations`,`uIntensity`];y={};for(let e of a)y[e]=f.getUniformLocation(p,e);m=f.createBuffer(),f.bindBuffer(f.ARRAY_BUFFER,m),f.bufferData(f.ARRAY_BUFFER,d,f.STATIC_DRAW);let o=f.getAttribLocation(p,`aPos`);f.enableVertexAttribArray(o),f.vertexAttribPointer(o,2,f.FLOAT,!1,0,0),f.enable(f.BLEND),f.blendFunc(f.ONE,f.ONE_MINUS_SRC_ALPHA),f.clearColor(0,0,0,0),n.style.width=`100%`,n.style.height=`100%`,n.style.display=`block`,e.appendChild(n);let l=()=>{if(!f)return;let t=e.clientWidth||1,r=e.clientHeight||1;n.width=t,n.height=r,f.viewport(0,0,t,r),f.uniform2f(y.uCanvas,t,r),S=e.getBoundingClientRect()};l(),typeof ResizeObserver<`u`?(h=new ResizeObserver(l),h.observe(e)):window.addEventListener(`resize`,l),typeof IntersectionObserver<`u`&&(g=new IntersectionObserver(([e])=>{v=e.isIntersecting}),g.observe(e));let C=()=>{v=!document.hidden};document.addEventListener(`visibilitychange`,C);let E=e=>{b[0]=(e.clientX-S.left)/S.width*2-1,b[1]=-((e.clientY-S.top)/S.height*2-1)};window.addEventListener(`mousemove`,E,{passive:!0});let D=performance.now(),O=D,k=()=>{if(_=requestAnimationFrame(k),!f||v===!1)return;let e=performance.now();f.uniform1f(y.uTime,(e-O)/1e3);let t=Math.min((e-D)/1e3,.1);D=e;let n=Math.min(1,t*4);x[0]+=(b[0]-x[0])*n,x[1]+=(b[1]-x[1])*n,f.uniform2f(y.uPointer,x[0],x[1]),f.clear(f.COLOR_BUFFER_BIT),f.drawArrays(f.TRIANGLES,0,3)};_=requestAnimationFrame(k),T(),t(()=>{_!==null&&cancelAnimationFrame(_),h?h.disconnect():window.removeEventListener(`resize`,l),g&&g.disconnect(),document.removeEventListener(`visibilitychange`,C),window.removeEventListener(`mousemove`,E),f&&(m&&f.deleteBuffer(m),p&&f.deleteProgram(p),f.getExtension(`WEBGL_lose_context`)?.loseContext()),n.parentElement===e&&e.removeChild(n),f=null,p=null,m=null})}),o(()=>[l.color,l.rotation,l.speed,l.scale,l.frequency,l.warpStrength,l.noise,l.bandWidth,l.yOffset,l.fadeTop,l.mouseInfluence,l.iterations,l.intensity],()=>{T()},{deep:!0}),(t,n)=>(e(),a(`div`,{ref_key:`containerRef`,ref:u},null,512))}});export{l as default};