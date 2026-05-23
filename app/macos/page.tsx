"use client";

import { MacosCanvas, MacosProps } from "../components/AI generated/macos";
import ShaderController, { ControlDef } from "../controller";

const initialValues: Required<MacosProps> = {
  speed: 0.15,
  scale: 1.5,
  complexity: 2.5,
  distortion: 1.2,
  colorShift: 0.0,
  lighting: 1.0,
  contrast: 0.8,
  mouseForce: 1.5,
  resolutionScale: 1.0,
};

const macosControls: ControlDef<MacosProps>[] = [
  { key: "speed", label: "Animation Speed", min: 0.0, max: 1.0, step: 0.01 },
  { key: "scale", label: "Zoom Scale", min: 0.5, max: 4.0, step: 0.1 },
  { key: "complexity", label: "Ribbon Folds", min: 1.0, max: 5.0, step: 0.1 },
  { key: "distortion", label: "Fluid Swirls", min: 0.0, max: 3.0, step: 0.1 },
  {
    key: "colorShift",
    label: "Hue Rotation (Theme)",
    min: 0.0,
    max: 360.0,
    step: 1.0,
  },
  {
    key: "lighting",
    label: "Glossy 3D Specular",
    min: 0.0,
    max: 1.5,
    step: 0.05,
  },
  {
    key: "contrast",
    label: "Shadow Depth (AO)",
    min: 0.0,
    max: 1.0,
    step: 0.05,
  },
  {
    key: "mouseForce",
    label: "Liquid Drag Force",
    min: 0.0,
    max: 5.0,
    step: 0.1,
  },
  {
    key: "resolutionScale",
    label: "Resolution Scale",
    min: 0.1,
    max: 2.0,
    step: 0.1,
  },
];

const generateMacosTemplate = (paramsJson: string) => `
"use client";
import { useRef, useEffect } from "react";
import { Renderer, Program, Mesh, Triangle, Vec2 } from "ogl";

const vertex = \`
attribute vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);}
\`;

const fragment = \`
#ifdef GL_ES
precision highp float;
#endif

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uMouseVelocity;
uniform float uMouseForce;
uniform float uSpeed;
uniform float uScale;
uniform float uComplexity;
uniform float uColorShift;
uniform float uDistortion;
uniform float uLighting;
uniform float uContrast;

mat3 rgb2yiq = mat3(0.299, 0.587, 0.114, 0.596, -0.274, -0.322, 0.211, -0.523, 0.312);
mat3 yiq2rgb = mat3(1.0, 0.956, 0.621, 1.0, -0.272, -0.647, 1.0, -1.106, 1.703);

vec3 hueShiftRGB(vec3 col, float deg) {
    vec3 yiq = rgb2yiq * col;
    float rad = radians(deg);
    float cosh = cos(rad), sinh = sin(rad);
    vec3 yiqShift = vec3(yiq.x, yiq.y * cosh - yiq.z * sinh, yiq.y * sinh + yiq.z * cosh);
    return clamp(yiq2rgb * yiqShift, 0.0, 1.0);
}

float getFluid(vec2 p, float t) {
    vec2 q = vec2(0.0);
    q.x = sin(p.x * 1.5 + t) + cos(p.y * 1.2 - t);
    q.y = sin(p.y * 1.5 - t) + cos(p.x * 1.2 + t);
    
    vec2 r = vec2(0.0);
    r.x = sin(p.x * 2.0 + q.x * uDistortion + t * 1.2);
    r.y = cos(p.y * 2.0 + q.y * uDistortion - t * 0.8);

    float f = sin(p.x * uComplexity + r.x) * cos(p.y * uComplexity + r.y);
    return f * 0.5 + 0.5;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    
    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x));
    vec2 mDir = uv - mousePos;
    float d = length(mDir);
    float pushEffect = exp(-d * 3.0); 
    uv -= uMouseVelocity * pushEffect * uMouseForce * 0.1;

    vec2 p = uv * uScale;
    float t = uTime * uSpeed;

    float f = getFluid(p, t);

    float eps = 0.01;
    float fx = getFluid(p + vec2(eps, 0.0), t);
    float fy = getFluid(p + vec2(0.0, eps), t);
    
    vec3 normal = normalize(vec3((fx - f) / eps, (fy - f) / eps, 1.5 - uLighting));
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.5));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float specular = pow(max(dot(reflect(-lightDir, normal), viewDir), 0.0), 40.0) * uLighting;

    vec3 col1 = vec3(0.1, 0.05, 0.3); 
    vec3 col2 = vec3(0.8, 0.1, 0.4);  
    vec3 col3 = vec3(1.0, 0.6, 0.1);  

    vec3 col = mix(col1, col2, smoothstep(0.1, 0.7, f));
    col = mix(col, col3, smoothstep(0.5, 0.9, f + (fx - f) * 10.0)); 

    col *= mix(1.0, smoothstep(0.0, 0.6, f + 0.1), uContrast);
    col = hueShiftRGB(col, uColorShift);
    col += specular;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
\`;

export type MacosProps = {
  speed?: number;
  scale?: number;
  complexity?: number;
  distortion?: number;
  colorShift?: number;
  lighting?: number;
  contrast?: number;
  mouseForce?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<MacosProps> = ${paramsJson};

export function MacosCanvas(props: MacosProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, lastX: 0.5, lastY: 0.5, vx: 0, vy: 0 });
  const mergedProps = { ...DEFAULT_PARAMS, ...props };
  const propsRef = useRef(mergedProps);

  useEffect(() => {
    propsRef.current = { ...DEFAULT_PARAMS, ...props };
  }, [props]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = containerRef.current;
    if (!canvas || !parent) return;

    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), canvas });
    const gl = renderer.gl;
    const geometry = new Triangle(gl);
    
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vec2() },
        uMouse: { value: new Vec2(0.5, 0.5) },
        uMouseVelocity: { value: new Vec2(0, 0) },
        uMouseForce: { value: propsRef.current.mouseForce },
        uSpeed: { value: propsRef.current.speed },
        uScale: { value: propsRef.current.scale },
        uComplexity: { value: propsRef.current.complexity },
        uDistortion: { value: propsRef.current.distortion },
        uColorShift: { value: propsRef.current.colorShift },
        uLighting: { value: propsRef.current.lighting },
        uContrast: { value: propsRef.current.contrast },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const currentProps = propsRef.current;
      renderer.setSize(w * currentProps.resolutionScale, h * currentProps.resolutionScale);
      program.uniforms.uResolution.value.set(gl.canvas.width, gl.canvas.height);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      mouseRef.current.targetX = (e.clientX - rect.left) / rect.width;
      mouseRef.current.targetY = 1.0 - ((e.clientY - rect.top) / rect.height);
    };

    window.addEventListener("resize", resize);
    parent.addEventListener("pointermove", handleMouseMove);
    resize();

    const start = performance.now();
    let frame = 0;

    const loop = () => {
      const p = propsRef.current;
      const m = mouseRef.current;

      m.x += (m.targetX - m.x) * 0.05;
      m.y += (m.targetY - m.y) * 0.05;
      m.vx = (m.x - m.lastX) * 10.0; 
      m.vy = (m.y - m.lastY) * 10.0;
      m.lastX = m.x;
      m.lastY = m.y;
      
      program.uniforms.uTime.value = (performance.now() - start) / 1000;
      program.uniforms.uMouse.value.set(m.x, m.y);
      program.uniforms.uMouseVelocity.value.set(m.vx, m.vy);
      
      program.uniforms.uMouseForce.value = p.mouseForce;
      program.uniforms.uSpeed.value = p.speed;
      program.uniforms.uScale.value = p.scale;
      program.uniforms.uComplexity.value = p.complexity;
      program.uniforms.uDistortion.value = p.distortion;
      program.uniforms.uColorShift.value = p.colorShift;
      program.uniforms.uLighting.value = p.lighting;
      program.uniforms.uContrast.value = p.contrast;

      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      parent.removeEventListener("pointermove", handleMouseMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden block bg-black">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
\`;
`;

export default function MacosWorkspace() {
  return (
    <ShaderController<MacosProps>
      title="macOS Fluid Controller"
      initialValues={initialValues}
      controls={macosControls}
      renderShader={(params) => <MacosCanvas {...params} />}
      exportTemplate={generateMacosTemplate}
    />
  );
}
