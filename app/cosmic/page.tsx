"use client";

import {
  CosmicFluidCanvas,
  CosmicFluidProps,
} from "../components/AI generated/cosmic";
import ShaderController, { ControlDef } from "../controller";

const initialValues: Required<CosmicFluidProps> = {
  speed: 1.0,
  scale: 2.0,
  colorShift: 0.0,
  distortion: 3.0,
  brightness: 1.2,
  glow: 1.5,
  mouseForce: 1.5,
  resolutionScale: 1.0,
};

const cosmicControls: ControlDef<CosmicFluidProps>[] = [
  { key: "speed", label: "Fluid Speed", min: -3, max: 3, step: 0.1 },
  { key: "scale", label: "Zoom Scale", min: 0.5, max: 5.0, step: 0.1 },
  { key: "distortion", label: "Swirl Distortion", min: 0, max: 10, step: 0.1 },
  { key: "mouseForce", label: "Mouse Liquid Push", min: 0, max: 5, step: 0.1 },
  {
    key: "colorShift",
    label: "Color Palette Shift",
    min: 0,
    max: 10,
    step: 0.1,
  },
  { key: "brightness", label: "Brightness", min: 0.1, max: 3.0, step: 0.1 },
  { key: "glow", label: "Center Glow", min: 0.0, max: 5.0, step: 0.1 },
  {
    key: "resolutionScale",
    label: "Pixelation (Res Scale)",
    min: 0.1,
    max: 2.0,
    step: 0.1,
  },
];

const generateCosmicTemplate = (paramsJson: string) => `
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
uniform float uColorShift;
uniform float uDistortion;
uniform float uBrightness;
uniform float uGlow;

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    uv *= uScale;

    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x)) * uScale;
    vec2 p = uv;

    vec2 mDir = p - mousePos;
    float d = length(mDir);
    float pushEffect = exp(-d * 4.0); 
    
    uv -= uMouseVelocity * pushEffect * uMouseForce * 2.0;
    uv += normalize(mDir) * sin(d * 15.0 - uTime * 10.0) * pushEffect * (length(uMouseVelocity) * uMouseForce) * 0.1;

    for(float i = 1.0; i < 6.0; i++) {
        uv *= rot(i * 0.7);
        vec2 q = uv * 2.0;
        q.x += sin(uTime * uSpeed * 0.5 + uv.y * uDistortion);
        q.y += cos(uTime * uSpeed * 0.4 + uv.x * uDistortion);
        uv += q * 0.15;
    }

    float colVal = length(uv) + uColorShift;
    vec3 col = vec3(
        sin(colVal * 3.3) * 0.5 + 0.5,
        sin(colVal * 2.3 + 2.0) * 0.5 + 0.5,
        sin(colVal * 1.3 + 4.0) * 0.5 + 0.5
    );

    col *= uBrightness;
    
    float centerGlow = uGlow * 0.1 / (length(p - mousePos) + 0.05);
    col += vec3(centerGlow * 0.5, centerGlow * 0.8, centerGlow) * clamp(length(uMouseVelocity) * 2.0, 0.5, 2.0);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
\`;

export type CosmicFluidProps = {
  speed?: number;
  scale?: number;
  colorShift?: number;
  distortion?: number;
  brightness?: number;
  glow?: number;
  mouseForce?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<CosmicFluidProps> = ${paramsJson};

export function CosmicFluidCanvas(props: CosmicFluidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const mouseRef = useRef({ 
    x: 0.5, y: 0.5, 
    targetX: 0.5, targetY: 0.5, 
    lastX: 0.5, lastY: 0.5, 
    vx: 0, vy: 0 
  });
  
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
        uColorShift: { value: propsRef.current.colorShift },
        uDistortion: { value: propsRef.current.distortion },
        uBrightness: { value: propsRef.current.brightness },
        uGlow: { value: propsRef.current.glow },
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

      m.x += (m.targetX - m.x) * 0.1;
      m.y += (m.targetY - m.y) * 0.1;
      m.vx = (m.x - m.lastX) * 15.0; 
      m.vy = (m.y - m.lastY) * 15.0;
      m.lastX = m.x;
      m.lastY = m.y;
      
      program.uniforms.uTime.value = (performance.now() - start) / 1000;
      program.uniforms.uMouse.value.set(m.x, m.y);
      program.uniforms.uMouseVelocity.value.set(m.vx, m.vy);
      program.uniforms.uMouseForce.value = p.mouseForce;
      
      program.uniforms.uSpeed.value = p.speed;
      program.uniforms.uScale.value = p.scale;
      program.uniforms.uColorShift.value = p.colorShift;
      program.uniforms.uDistortion.value = p.distortion;
      program.uniforms.uBrightness.value = p.brightness;
      program.uniforms.uGlow.value = p.glow;

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
    <div ref={containerRef} className="w-full h-full relative overflow-hidden block">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
`;

export default function CosmicWorkspace() {
  return (
    <ShaderController<CosmicFluidProps>
      title="Cosmic Fluid Controls"
      initialValues={initialValues}
      controls={cosmicControls}
      renderShader={(params) => <CosmicFluidCanvas {...params} />}
      exportTemplate={generateCosmicTemplate}
    />
  );
}
