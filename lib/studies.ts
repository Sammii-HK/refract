const uniforms = `precision mediump float;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;`;
/** Authored shader studies. These are local source examples, not model output. */
export const STUDIES = [
  {
    id: "iridescent",
    name: "Iridescent drift",
    source: `${uniforms}
void main(){
 vec2 uv=gl_FragCoord.xy/uResolution.xy;
 float wave=sin(uv.x*4.0+uv.y*2.0+uTime*0.3)*0.5+0.5;
 vec3 ink=vec3(0.07,0.05,0.16);
 vec3 light=vec3(0.74,0.56,0.95);
 vec3 colour=mix(ink,light,smoothstep(0.15,1.0,wave));
 colour+=0.08*sin(uv.y*8.0+uTime*0.2)*vec3(0.5,1.0,0.9);
 gl_FragColor=vec4(colour,1.0);
}`,
  },
  {
    id: "bands",
    name: "Copper bands",
    source: `${uniforms}
void main(){
 vec2 uv=gl_FragCoord.xy/uResolution.xy;
 float lines=0.0;
 for(int i=0;i<4;i++){
  float band=sin(uv.y*10.0+float(i)*0.7+sin(uv.x*3.0+uTime*0.2));
  lines+=pow(max(0.0,band),12.0)*0.15;
 }
 vec3 colour=mix(vec3(0.04,0.025,0.02),vec3(0.95,0.55,0.29),lines);
 gl_FragColor=vec4(colour,1.0);
}`,
  },
  {
    id: "rings",
    name: "Soft rings",
    source: `${uniforms}
void main(){
 vec2 p=(gl_FragCoord.xy-0.5*uResolution.xy)/min(uResolution.x,uResolution.y);
 p-=(uMouse-0.5)*0.12;
 float ring=0.5+0.5*cos(length(p)*18.0-uTime*0.4);
 vec3 colour=mix(vec3(0.06,0.1,0.12),vec3(0.55,0.78,0.72),pow(ring,3.0));
 gl_FragColor=vec4(colour,1.0);
}`,
  },
] as const;
