"use client";

import { OceanCanvas, OceanProps } from "../components/AI generated/ocean";
import ShaderController, { ControlDef } from "../controller";

const initialValues: Required<OceanProps> = {
  speed: 0.5,
  scale: 3.0,
  distortion: 1.2,
  frequency: 1.5,
  foam: 1.2,
  colorShift: 0.0,
  brightness: 1.1,
  mouseForce: 1.5,
  resolutionScale: 1.0,
};

const oceanControls: ControlDef<OceanProps>[] = [
  { key: "speed", label: "Tide Speed", min: 0.0, max: 2.0, step: 0.01 },
  { key: "scale", label: "View Scale (Height)", min: 1.0, max: 8.0, step: 0.1 },
  { key: "frequency", label: "Wave Frequency", min: 0.5, max: 4.0, step: 0.1 },
  {
    key: "distortion",
    label: "Wave Bend / Storminess",
    min: 0.0,
    max: 4.0,
    step: 0.1,
  },
  { key: "foam", label: "Seafoam Highlights", min: 0.0, max: 3.0, step: 0.1 },
  {
    key: "colorShift",
    label: "Water Color Temp",
    min: -0.5,
    max: 1.0,
    step: 0.05,
  },
  { key: "brightness", label: "Brightness", min: 0.5, max: 2.0, step: 0.05 },
  {
    key: "mouseForce",
    label: "Wake Drag Force",
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

const generateOceanTemplate = (paramsJson: string) => `
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
uniform float uDistortion;
uniform float uFrequency;
uniform float uFoam;
uniform float uColorShift;
uniform float uBrightness;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    vec2 p = uv * uScale;

    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x)) * uScale;
    vec2 mDir = p - mousePos;
    float d = length(mDir);
    float push = exp(-d * 1.5); 
    p -= uMouseVelocity * push * uMouseForce * 2.0;

    p.y *= 1.5; 

    float time = uTime * uSpeed;
    
    float h = 0.0;
    float amp = 1.0;
    float freq = uFrequency;
    vec2 current_p = p;

    for (int i = 0; i < 4; i++) {
        current_p.y += sin(current_p.x * freq * 0.4 + time) * uDistortion * amp;
        current_p.x += cos(current_p.y * freq * 0.5 - time * 0.8) * (uDistortion * 0.5) * amp;
        
        h += sin(current_p.y * freq + time * 1.2) * amp;
        
        freq *= 1.8; 
        amp *= 0.5;  
    }

    h /= 1.8;

    vec3 deepWater = vec3(0.01, 0.08 + uColorShift * 0.1, 0.25); 
    vec3 midWater = vec3(0.02, 0.35 + uColorShift * 0.2, 0.55); 
    vec3 foamColor = vec3(0.7, 0.9, 0.95); 

    vec3 col = mix(deepWater, midWater, smoothstep(-0.8, 0.2, h));
    col = mix(col, foamColor, smoothstep(0.5, 1.0, h) * uFoam);

    float reflection = max(0.0, sin(h * 5.0 - time * 2.0));
    col += reflection * 0.05 * uBrightness;

    col *= uBrightness;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
\`;

export type OceanProps = {
  speed?: number;
  scale?: number;
  distortion?: number;
  frequency?: number;
  foam?: number;
  colorShift?: number;
  brightness?: number;
  mouseForce?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<OceanProps> = ${paramsJson};

export function OceanCanvas(props: OceanProps) {
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
        uDistortion: { value: propsRef.current.distortion },
        uFrequency: { value: propsRef.current.frequency },
        uFoam: { value: propsRef.current.foam },
        uColorShift: { value: propsRef.current.colorShift },
        uBrightness: { value: propsRef.current.brightness },
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
      program.uniforms.uDistortion.value = p.distortion;
      program.uniforms.uFrequency.value = p.frequency;
      program.uniforms.uFoam.value = p.foam;
      program.uniforms.uColorShift.value = p.colorShift;
      program.uniforms.uBrightness.value = p.brightness;

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
`;

export default function OceanWorkspace() {
  return (
    <ShaderController<OceanProps>
      title="Calm Ocean Controller"
      initialValues={initialValues}
      controls={oceanControls}
      renderShader={(params) => <OceanCanvas {...params} />}
      exportTemplate={generateOceanTemplate}
    />
  );
}
