"use client";
import ShaderController, { ControlDef } from "../controller";
import { ShardsCanvas, ShardsProps } from "../components/shards";

const initialValues: Required<ShardsProps> = {
  speed: 1.0,
  scale: 1.5,
  complexity: 4.0,
  colorShift: 0.1,
  borderWidth: 0.08,
  brightness: 1.2,
  mouseForce: 1.5,
  resolutionScale: 1.0,
};

const shardsControls: ControlDef<ShardsProps>[] = [
  { key: "speed", label: "Fracture Speed", min: 0.0, max: 3.0, step: 0.05 },
  { key: "scale", label: "Zoom Scale", min: 0.5, max: 5.0, step: 0.1 },
  { key: "complexity", label: "Grid Density", min: 1.0, max: 10.0, step: 0.1 },
  {
    key: "borderWidth",
    label: "Sharp Border Thickness",
    min: 0.01,
    max: 0.3,
    step: 0.01,
  },
  {
    key: "colorShift",
    label: "Palette Randomizer",
    min: 0.0,
    max: 1.0,
    step: 0.01,
  },
  { key: "brightness", label: "Brightness", min: 0.5, max: 2.0, step: 0.05 },
  {
    key: "mouseForce",
    label: "Mouse Distortion Push",
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

const generateShardsTemplate = (paramsJson: string) => `
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
uniform float uBorderWidth;
uniform float uBrightness;

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
}

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    
    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x));
    vec2 mDir = uv - mousePos;
    float dMouse = length(mDir);
    uv -= normalize(mDir) * exp(-dMouse * 5.0) * uMouseForce * 0.05;

    vec2 p = uv * uScale * uComplexity;
    
    vec2 g = floor(p); 
    vec2 f = fract(p); 
    
    vec2 best_p;
    vec2 best_n;
    float best_d = 8.0;
    
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            vec2 n = vec2(float(x), float(y));
            vec2 offset = hash2(g + n);
            
            offset = 0.5 + 0.5 * sin(uTime * uSpeed + 6.2831 * offset);
            vec2 r = n + offset - f;
            float d = dot(r, r);
            
            if(d < best_d) {
                best_d = d;
                best_p = r;
                best_n = n;
            }
        }
    }
    
    float minDist = 8.0;
    for(int y = -2; y <= 2; y++) {
        for(int x = -2; x <= 2; x++) {
            vec2 n = vec2(float(x), float(y));
            vec2 offset = hash2(g + n);
            offset = 0.5 + 0.5 * sin(uTime * uSpeed + 6.2831 * offset);
            vec2 r = n + offset - f;
            
            if(dot(best_p - r, best_p - r) > 0.00001) {
                float d = dot(0.5 * (best_p + r), normalize(r - best_p));
                minDist = min(minDist, d);
            }
        }
    }

    float cellID = fract(sin(dot(g + best_n, vec2(12.9898, 78.233))) * 43758.5453);
    vec3 col = palette(cellID + uColorShift);

    float borderThickness = uBorderWidth / (uScale * uComplexity);
    float borderMask = smoothstep(borderThickness * 0.95, borderThickness * 1.05, minDist);

    vec3 borderColor = vec3(0.04, 0.02, 0.06); 
    vec3 finalCol = mix(borderColor, col * uBrightness, borderMask);

    gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
}
\`;

export type ShardsProps = {
  speed?: number;
  scale?: number;
  complexity?: number;
  colorShift?: number;
  borderWidth?: number;
  brightness?: number;
  mouseForce?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<ShardsProps> = ${paramsJson};

export function ShardsCanvas(props: ShardsProps) {
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
        uBorderWidth: { value: propsRef.current.borderWidth },
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
      program.uniforms.uComplexity.value = p.complexity;
      program.uniforms.uColorShift.value = p.colorShift;
      program.uniforms.uBorderWidth.value = p.borderWidth;
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
\`;
`;

export default function ShardsWorkspace() {
  return (
    <ShaderController<ShardsProps>
      title="Vibrant Shards"
      componentName="ShardsCanvas"
      initialValues={initialValues}
      controls={shardsControls}
      renderShader={(params) => <ShardsCanvas {...params} />}
      exportTemplate={generateShardsTemplate}
    />
  );
}
