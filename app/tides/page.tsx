"use client";

import { TidesCanvas, TidesProps } from "../components/AI generated/tides";
import ShaderController, { ControlDef } from "../controller";

const initialValues: Required<TidesProps> = {
  speed: 0.220,
  scale: 1.4,
  frequency: 0.6,
  complexity: 1.1,
  distortion: 0.7,
  foam: 1.1,
  colorShift: -0.050,
  brightness: 1.3,
  mouseForce: 1.5,
  resolutionScale: 1.0,
};

const tidesControls: ControlDef<TidesProps>[] = [
  { key: "speed", label: "Tide Speed", min: 0.0, max: 2.0, step: 0.01 },
  {
    key: "scale",
    label: "Camera Height (Scale)",
    min: 1.0,
    max: 8.0,
    step: 0.1,
  },
  { key: "frequency", label: "Wave Density", min: 0.1, max: 4.0, step: 0.1 },
  {
    key: "complexity",
    label: "Number of Tide Bands",
    min: 0.5,
    max: 5.0,
    step: 0.1,
  },
  {
    key: "distortion",
    label: "Organic Shoreline Bend",
    min: 0.0,
    max: 4.0,
    step: 0.1,
  },
  { key: "foam", label: "Leading Edge Foam", min: 0.0, max: 3.0, step: 0.1 },
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
    label: "Mouse Drag Force",
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

const generateTidesTemplate = (paramsJson: string) => `
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
uniform float uComplexity;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    vec2 p = uv * uScale;

    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x)) * uScale;
    vec2 mDir = p - mousePos;
    float d = length(mDir);
    float push = exp(-d * 2.0); 
    p -= uMouseVelocity * push * uMouseForce;

    float time = uTime * uSpeed;
    
    float wave = 0.0;
    float amp = 1.0;
    float freq = uFrequency;
    
    for(int i = 0; i < 3; i++) {
        float xWarp = sin(p.x * freq * 0.8 + time * 0.5) * uDistortion;
        wave += sin(p.y * freq + xWarp - time) * amp;
        freq *= 1.5;
        amp *= 0.5;
    }

    float bands = wave * uComplexity;
    float crest = fract(bands);
    
    float foamEdge = smoothstep(0.8 - (uFoam * 0.1), 0.98, crest);
    float foamNoise = fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) * 0.2;
    float finalFoam = smoothstep(0.5, 1.0, foamEdge + foamNoise) * uFoam;

    vec3 deepWater = vec3(0.01, 0.05, 0.15) + uColorShift * 0.1; 
    vec3 shallowWater = vec3(0.05, 0.45, 0.6) + uColorShift * 0.2; 
    vec3 foamColor = vec3(0.85, 0.95, 1.0); 

    vec3 col = mix(deepWater, shallowWater, crest);
    col = mix(col, foamColor, finalFoam);

    col += vec3(0.0, 0.1, 0.15) * smoothstep(0.4, 0.7, crest) * uBrightness;

    col *= uBrightness;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
\`;

export type TidesProps = {
  speed?: number;
  scale?: number;
  distortion?: number;
  frequency?: number;
  complexity?: number;
  foam?: number;
  colorShift?: number;
  brightness?: number;
  mouseForce?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<TidesProps> = ${paramsJson};

export function TidesCanvas(props: TidesProps) {
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
        uComplexity: { value: propsRef.current.complexity },
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
      program.uniforms.uComplexity.value = p.complexity;
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

export default function TidesWorkspace() {
  return (
    <ShaderController<TidesProps>
      title="Calm Tides Controller"
      initialValues={initialValues}
      controls={tidesControls}
      renderShader={(params) => <TidesCanvas {...params} />}
      exportTemplate={generateTidesTemplate}
    />
  );
}
