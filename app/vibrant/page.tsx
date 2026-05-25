"use client";
import ShaderController, { ControlDef } from "../controller";
import {
  VibrantWavesCanvas,
  VibrantWavesProps,
} from "../components/AI generated/vibrant";

const initialValues: Required<VibrantWavesProps> = {
  speed: -0.2,
  scale: 1.3,
  complexity: 1.5,
  colorShift: 3.80,
  distortion: 0.2,
  borderWidth: 0.010,
  mouseForce: 1.5,
  resolutionScale: 1.0,
};

const vibrantControls: ControlDef<VibrantWavesProps>[] = [
  { key: "speed", label: "Wave Speed", min: -3, max: 3, step: 0.1 },
  { key: "scale", label: "Zoom Scale", min: 1.0, max: 10.0, step: 0.1 },
  {
    key: "complexity",
    label: "Complexity (Sections)",
    min: 0.5,
    max: 6.0,
    step: 0.1,
  },
  {
    key: "borderWidth",
    label: "Sharp Border Width",
    min: 0.0,
    max: 0.5,
    step: 0.01,
  },
  {
    key: "distortion",
    label: "Organic Distortion",
    min: 0.0,
    max: 3.0,
    step: 0.1,
  },
  {
    key: "colorShift",
    label: "Color Palette Shift",
    min: 0,
    max: 5.0,
    step: 0.1,
  },
  {
    key: "mouseForce",
    label: "Mouse Liquid Push",
    min: 0,
    max: 5.0,
    step: 0.1,
  },
  {
    key: "resolutionScale",
    label: "Pixelation (Res Scale)",
    min: 0.1,
    max: 2.0,
    step: 0.1,
  },
];

const generateVibrantTemplate = (paramsJson: string) => `
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
uniform float uBorderWidth;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.0, 0.15, 0.20);
    return a + b * cos(6.28318 * (c * t + d));
}

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    
    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x));
    vec2 mDir = uv - mousePos;
    float d = length(mDir);
    float pushEffect = exp(-d * 5.0); 
    uv -= uMouseVelocity * pushEffect * uMouseForce * 0.5;

    vec2 p = uv * uScale;
    float t = uTime * uSpeed;

    p.x += sin(p.y * uDistortion + t);
    p.y += cos(p.x * uDistortion - t);

    float val1 = sin(p.x + t) + cos(p.y * 1.2 + t * 0.8) + sin((p.x + p.y) * 0.7);
    float val2 = cos(p.x * 1.3 - t * 0.9) + sin(p.y * 0.8 - t) + cos((p.x - p.y) * 1.1);
    float val3 = sin(p.x * 0.5 + p.y * 1.5 + t * 1.2) + cos(p.y * 1.5 - p.x * 0.5 - t * 0.7);

    float steps = uComplexity;
    float v1 = val1 * steps;
    float v2 = val2 * steps;
    float v3 = val3 * steps;

    float cell1 = floor(v1);
    float cell2 = floor(v2);
    float cell3 = floor(v3);
    
    float id = cell1 * 13.1 + cell2 * 7.3 + cell3 * 19.7;
    float randVal = hash(id);
    
    vec3 col = palette(randVal + uColorShift + uv.x * 0.1);

    float edge1 = fract(v1);
    float edge2 = fract(v2);
    float edge3 = fract(v3);

    float d1 = min(edge1, 1.0 - edge1);
    float d2 = min(edge2, 1.0 - edge2);
    float d3 = min(edge3, 1.0 - edge3);
    
    float minDist = min(min(d1, d2), d3);

    float edgeThickness = uBorderWidth / uScale; 
    float borderMask = smoothstep(edgeThickness * 0.95, edgeThickness * 1.05, minDist);

    vec3 borderColor = vec3(0.02, 0.02, 0.05);
    col = mix(borderColor, col, borderMask);

    gl_FragColor = vec4(col, 1.0);
}
\`;

export type VibrantWavesProps = {
  speed?: number;
  scale?: number;
  complexity?: number;
  colorShift?: number;
  distortion?: number;
  borderWidth?: number;
  mouseForce?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<VibrantWavesProps> = ${paramsJson};

export function VibrantWavesCanvas(props: VibrantWavesProps) {
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
        uColorShift: { value: propsRef.current.colorShift },
        uDistortion: { value: propsRef.current.distortion },
        uBorderWidth: { value: propsRef.current.borderWidth },
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
      program.uniforms.uComplexity.value = p.complexity;
      program.uniforms.uColorShift.value = p.colorShift;
      program.uniforms.uDistortion.value = p.distortion;
      program.uniforms.uBorderWidth.value = p.borderWidth;

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

export default function VibrantWorkspace() {
  return (
    <ShaderController<VibrantWavesProps>
      title="Vibrant Waves Controls"
      initialValues={initialValues}
      controls={vibrantControls}
      renderShader={(params) => <VibrantWavesCanvas {...params} />}
      exportTemplate={generateVibrantTemplate}
    />
  );
}
