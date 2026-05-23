"use client";
import { LotusCanvas, LotusProps } from "../components/AI generated/lotus";
import ShaderController, { ControlDef } from "../controller";

const initialValues: Required<LotusProps> = {
  speed: 0.5,
  bloomSpeed: 1.0,
  scale: 4.0,
  petals: 7.0,
  layers: 6.0,
  twist: 2.5,
  organic: 0.05,
  colorShift: 0.1,
  brightness: 1.2,
  mouseForce: 1.5,
  resolutionScale: 0.5,
};

const lotusControls: ControlDef<LotusProps>[] = [
  {
    key: "speed",
    label: "Breathing & Unfurling Speed",
    min: 0.0,
    max: 2.0,
    step: 0.05,
  },
  {
    key: "bloomSpeed",
    label: "Outward Blooming Speed",
    min: 0.0,
    max: 5.0,
    step: 0.1,
  },
  { key: "scale", label: "Camera Zoom (Scale)", min: 1.0, max: 8.0, step: 0.1 },
  { key: "petals", label: "Petal Count", min: 3.0, max: 15.0, step: 1.0 },
  { key: "layers", label: "Concentric Layers", min: 1.0, max: 15.0, step: 1.0 },
  {
    key: "twist",
    label: "Center Spiral Twist",
    min: 0.0,
    max: 10.0,
    step: 0.1,
  },
  {
    key: "organic",
    label: "Organic Imperfection",
    min: 0.0,
    max: 0.3,
    step: 0.01,
  },
  {
    key: "colorShift",
    label: "Iridescent Shift",
    min: 0.0,
    max: 2.0,
    step: 0.05,
  },
  {
    key: "brightness",
    label: "Gloss Brightness",
    min: 0.5,
    max: 2.0,
    step: 0.05,
  },
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

const generateLotusTemplate = (paramsJson: string) => `
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
uniform float uBloomSpeed;
uniform float uScale;
uniform float uPetals;
uniform float uLayers;
uniform float uTwist;
uniform float uOrganic;
uniform float uColorShift;
uniform float uBrightness;

vec3 iridescence(float t) {
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

float getLotusHeight(vec2 p, float t) {
    float r = length(p);
    float a = atan(p.y, p.x);
    
    float currentTwist = uTwist * exp(-r * 2.0) * sin(t * uSpeed * 0.5);
    a += currentTwist;
    
    float lobes = sin(a * uPetals) * 0.5 + 0.5;
    lobes = pow(lobes, 1.5); 
    
    float rings = sin(r * uLayers - t * uBloomSpeed) * 0.5 + 0.5;
    
    float wobble = sin(r * 12.0 + a * 4.0 + t * uSpeed) * uOrganic;
    
    float height = rings * lobes;
    height += wobble;
    
    height *= exp(-r * 1.8);
    
    return height;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    
    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x));
    vec2 mDir = uv - mousePos;
    float dMouse = length(mDir);
    uv -= normalize(mDir) * exp(-dMouse * 3.0) * uMouseForce * 0.05;

    vec2 p = uv * uScale;
    float t = uTime;

    float eps = 0.01;
    float h = getLotusHeight(p, t);
    float hx = getLotusHeight(p + vec2(eps, 0.0), t);
    float hy = getLotusHeight(p + vec2(0.0, eps), t);
    
    vec3 normal = normalize(vec3((hx - h) / eps, (hy - h) / eps, 1.5));

    vec3 lightDir = normalize(vec3(0.5, 1.0, 1.0)); 
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 40.0); 

    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

    vec3 petalColor = iridescence(fresnel * 1.5 + h * 2.0 + uColorShift);

    vec3 bg = vec3(0.01, 0.01, 0.03);

    vec3 finalColor = bg;
    finalColor += diffuse * vec3(0.1, 0.15, 0.2); 
    finalColor += petalColor * spec * 2.0; 
    finalColor += petalColor * fresnel * h * 1.5; 

    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    finalColor -= grain * 0.04;

    gl_FragColor = vec4(clamp(finalColor * uBrightness, 0.0, 1.0), 1.0);
}
\`;

export type LotusProps = {
  speed?: number;
  bloomSpeed?: number;
  scale?: number;
  petals?: number;
  layers?: number;
  twist?: number;
  organic?: number;
  colorShift?: number;
  brightness?: number;
  mouseForce?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<LotusProps> = ${paramsJson};

export function LotusCanvas(props: LotusProps) {
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
        uBloomSpeed: { value: propsRef.current.bloomSpeed },
        uScale: { value: propsRef.current.scale },
        uPetals: { value: propsRef.current.petals },
        uLayers: { value: propsRef.current.layers },
        uTwist: { value: propsRef.current.twist },
        uOrganic: { value: propsRef.current.organic },
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
      
      gl.canvas.style.width = '100%';
      gl.canvas.style.height = '100%';
      
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
      program.uniforms.uBloomSpeed.value = p.bloomSpeed;
      program.uniforms.uScale.value = p.scale;
      program.uniforms.uPetals.value = p.petals;
      program.uniforms.uLayers.value = p.layers;
      program.uniforms.uTwist.value = p.twist;
      program.uniforms.uOrganic.value = p.organic;
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
\`;
`;

export default function LotusWorkspace() {
  return (
    <ShaderController<LotusProps>
      title="Glass Lotus Controls"
      initialValues={initialValues}
      controls={lotusControls}
      renderShader={(params) => <LotusCanvas {...params} />}
      exportTemplate={generateLotusTemplate}
    />
  );
}
