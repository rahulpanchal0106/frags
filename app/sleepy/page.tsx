"use client";

import ShaderController, { ControlDef } from "@/app/controller";
import { SleepyCanvas, SleepyProps } from "../components/AI generated/sleepy";

const initialValues: Required<SleepyProps> = {
  speed: 0.15,
  breathSpeed: 0.628,
  colorShift: 0.5,
  brightness: 1.0,
  vignette: 1.8,
  zoom: 1.2,
  resolutionScale: 1.0,
};

const sleepyControls: ControlDef<SleepyProps>[] = [
  { key: "speed", label: "Fluid Flow Speed", min: 0.01, max: 0.5, step: 0.01 },
  {
    key: "breathSpeed",
    label: "Breathing Rhythm (Hypnosis)",
    min: 0.1,
    max: 1.5,
    step: 0.01,
  },
  { key: "zoom", label: "Depth Zoom", min: 0.5, max: 3.0, step: 0.1 },
  {
    key: "vignette",
    label: "Heavy Eyelids (Vignette)",
    min: 0.5,
    max: 3.0,
    step: 0.1,
  },
  {
    key: "brightness",
    label: "Soft Glow Intensity",
    min: 0.1,
    max: 2.0,
    step: 0.05,
  },
  {
    key: "colorShift",
    label: "Dream Color Phase",
    min: 0.0,
    max: 1.0,
    step: 0.01,
  },
  {
    key: "resolutionScale",
    label: "Softness Blur (Res Scale)",
    min: 0.1,
    max: 1.0,
    step: 0.05,
  },
];

const generateSleepyTemplate = (paramsJson: string) => `
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
uniform float uSpeed;
uniform float uBreathSpeed;
uniform float uColorShift;
uniform float uBrightness;
uniform float uVignette;
uniform float uZoom;

float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);
    float res = mix(
        mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
        mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
    return res*res;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    uv *= uZoom;

    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x)) * uZoom;
    vec2 mDir = uv - mousePos;
    float d = length(mDir);
    uv -= normalize(mDir) * exp(-d * 2.5) * 0.03; 

    float t = uTime * uSpeed;
    
    float breath = sin(uTime * uBreathSpeed) * 0.5 + 0.5;
    uv *= 1.0 - (breath * 0.08); 

    vec2 p = uv;
    for(float i = 1.0; i < 5.0; i++) {
        float iFloat = float(i);
        vec2 newP = p;
        newP.x += 0.5 / iFloat * sin(iFloat * p.y + t + 0.3 * iFloat) + 1.0;
        newP.y += 0.5 / iFloat * cos(iFloat * p.x + t + 0.3 * iFloat) - 1.0;
        p = newP;
    }

    float f = noise(p * 1.5 + t * 0.5);
    
    vec3 darkColor = vec3(0.01, 0.02, 0.05); 
    vec3 midColor = vec3(0.08, 0.04, 0.15);  
    
    float shift = uColorShift * 6.28318;
    vec3 lightColor = vec3(
        0.05 + 0.05 * sin(shift),
        0.10 + 0.05 * sin(shift + 2.0),
        0.15 + 0.05 * sin(shift + 4.0)
    );

    float mixVal = sin(p.x + p.y) * 0.5 + 0.5;
    vec3 col = mix(darkColor, midColor, mixVal);
    col = mix(col, lightColor, f * (breath * 0.4 + 0.6));

    float vignette = smoothstep(uVignette, 0.0, length(uv));
    col *= vignette;

    col *= uBrightness;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
\`;

export type SleepyProps = {
  speed?: number;
  breathSpeed?: number;
  colorShift?: number;
  brightness?: number;
  vignette?: number;
  zoom?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<SleepyProps> = ${paramsJson};

export function SleepyCanvas(props: SleepyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
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
        uSpeed: { value: propsRef.current.speed },
        uBreathSpeed: { value: propsRef.current.breathSpeed },
        uColorShift: { value: propsRef.current.colorShift },
        uBrightness: { value: propsRef.current.brightness },
        uVignette: { value: propsRef.current.vignette },
        uZoom: { value: propsRef.current.zoom },
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

      m.x += (m.targetX - m.x) * 0.03;
      m.y += (m.targetY - m.y) * 0.03;
      
      program.uniforms.uTime.value = (performance.now() - start) / 1000;
      program.uniforms.uMouse.value.set(m.x, m.y);
      
      program.uniforms.uSpeed.value = p.speed;
      program.uniforms.uBreathSpeed.value = p.breathSpeed;
      program.uniforms.uColorShift.value = p.colorShift;
      program.uniforms.uBrightness.value = p.brightness;
      program.uniforms.uVignette.value = p.vignette;
      program.uniforms.uZoom.value = p.zoom;

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
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-black block">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
`;

export default function SleepyWorkspace() {
  return (
    <ShaderController<SleepyProps>
      title="Deep REM Controller"
      initialValues={initialValues}
      controls={sleepyControls}
      renderShader={(params) => <SleepyCanvas {...params} />}
      exportTemplate={generateSleepyTemplate}
    />
  );
}
