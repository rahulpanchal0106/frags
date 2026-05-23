"use client";
import {
  OrganicFlowerCanvas,
  OrganicFlowerProps,
} from "../components/AI generated/organic-flower";
import ShaderController, { ControlDef } from "../controller";

const initialValues: Required<OrganicFlowerProps> = {
  speed: 0.5,
  scale: 2.0,
  bloom: 1.2,
  petals: 4.0,
  veins: 0.5,
  velvet: 1.0,
  colorShift: 0.0,
  brightness: 1.2,
  mouseForce: 1.5,
  resolutionScale: 1.0,
};

const organicControls: ControlDef<OrganicFlowerProps>[] = [
  { key: "speed", label: "Natural Wind Sway", min: 0.0, max: 2.0, step: 0.05 },
  { key: "scale", label: "Camera Zoom", min: 1.0, max: 5.0, step: 0.1 },
  { key: "bloom", label: "Bloom Width", min: 0.5, max: 2.5, step: 0.1 },
  { key: "petals", label: "Petal Density", min: 2.0, max: 10.0, step: 1.0 },
  {
    key: "veins",
    label: "Petal Vein Textures",
    min: 0.0,
    max: 1.0,
    step: 0.05,
  },
  { key: "velvet", label: "Velvet SSS Glow", min: 0.0, max: 2.0, step: 0.1 },
  {
    key: "colorShift",
    label: "Color Profile (Hue)",
    min: 0.0,
    max: 360.0,
    step: 1.0,
  },
  { key: "brightness", label: "Exposure", min: 0.5, max: 2.0, step: 0.05 },
  {
    key: "mouseForce",
    label: "Breeze Push (Mouse)",
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

const generateOrganicTemplate = (paramsJson: string) => `
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
uniform float uBloom;
uniform float uPetals;
uniform float uVeins;
uniform float uVelvet;
uniform float uColorShift;
uniform float uBrightness;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p) {
    vec2 i = floor(p); 
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

mat3 rgb2yiq = mat3(0.299, 0.587, 0.114, 0.596, -0.274, -0.322, 0.211, -0.523, 0.312);
mat3 yiq2rgb = mat3(1.0, 0.956, 0.621, 1.0, -0.272, -0.647, 1.0, -1.106, 1.703);
vec3 hueShiftRGB(vec3 col, float deg) {
    vec3 yiq = rgb2yiq * col;
    float rad = radians(deg);
    float cosh = cos(rad), sinh = sin(rad);
    vec3 yiqShift = vec3(yiq.x, yiq.y * cosh - yiq.z * sinh, yiq.y * sinh + yiq.z * cosh);
    return clamp(yiq2rgb * yiqShift, 0.0, 1.0);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    vec2 p = uv * uScale;

    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x)) * uScale;
    vec2 mDir = p - mousePos;
    float dMouse = length(mDir);
    p -= normalize(mDir) * exp(-dMouse * 3.0) * uMouseForce * 0.05;

    float wind = uTime * uSpeed;
    p.x += (noise(p * 2.0 + wind) - 0.5) * 0.15;
    p.y += (noise(p * 2.0 + vec2(10.0) - wind) - 0.5) * 0.15;

    float r = length(p);
    float a = atan(p.y, p.x);

    vec3 bg = vec3(0.02, 0.05, 0.02); 
    bg += noise(p * 3.0) * 0.02; 

    vec3 finalCol = bg;

    vec3 coreCol = vec3(0.15, 0.0, 0.02); 
    vec3 midCol = vec3(0.85, 0.15, 0.3);  
    vec3 edgeCol = vec3(0.95, 0.75, 0.7); 

    for(int j = 0; j < 15; j++) {
        float i = float(j);
        float t = i / 14.0; 
        
        float layerRadius = (0.2 + t * 0.8) * uBloom;
        float numPetals = floor(uPetals + t * 3.0);
        
        float rot = i * 2.39996 + sin(wind * 0.5 + i) * 0.05;
        float localA = a + rot;
        
        float petalID = floor(localA * numPetals / 6.28318);
        float angleFract = fract(localA * numPetals / 6.28318) * 2.0 - 1.0;
        
        float shape = 1.0 - pow(abs(angleFract), 1.8 + t);
        float edgeNoise = noise(vec2(petalID, r * 10.0)) * 0.1;
        shape += edgeNoise;

        float boundary = r / max(0.001, (layerRadius * shape));
        
        float shadow = smoothstep(1.15, 0.95, boundary);
        finalCol = mix(finalCol * 0.6, finalCol, shadow);

        float mask = smoothstep(1.0, 0.98, boundary);
        if (mask > 0.0) {
            vec3 col = mix(coreCol, midCol, smoothstep(0.0, 0.5, boundary));
            col = mix(col, edgeCol, smoothstep(0.4, 1.0, boundary));
            col *= 0.9 + 0.1 * noise(vec2(i * 10.0, 0.0));
            col = hueShiftRGB(col, uColorShift);

            float veins = abs(sin(r * 40.0 + angleFract * 20.0));
            col *= mix(1.0, 0.85, veins * smoothstep(0.3, 0.9, boundary) * uVeins);

            float velvet = smoothstep(0.8, 1.0, boundary);
            col += edgeCol * velvet * uVelvet;

            float curl = smoothstep(0.7, 0.9, boundary) * smoothstep(1.0, 0.9, boundary);
            col *= 1.0 - curl * 0.4;

            col *= mix(0.1, 1.0, smoothstep(0.0, 0.6, r));

            finalCol = mix(finalCol, col, mask);
        }
    }
    
    float coreMask = smoothstep(0.15 * uBloom, 0.0, r);
    vec3 stamenCol = vec3(0.9, 0.6, 0.1); 
    stamenCol *= 0.5 + 0.5 * noise(p * 50.0); 
    finalCol = mix(finalCol, stamenCol, coreMask * 0.9);

    finalCol *= smoothstep(1.8, 0.3, r);
    finalCol *= uBrightness;

    gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
}
\`;

export type OrganicFlowerProps = {
  speed?: number;
  scale?: number;
  bloom?: number;
  petals?: number;
  veins?: number;
  velvet?: number;
  colorShift?: number;
  brightness?: number;
  mouseForce?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<OrganicFlowerProps> = ${paramsJson};

export function OrganicFlowerCanvas(props: OrganicFlowerProps) {
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
        uBloom: { value: propsRef.current.bloom },
        uPetals: { value: propsRef.current.petals },
        uVeins: { value: propsRef.current.veins },
        uVelvet: { value: propsRef.current.velvet },
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
      program.uniforms.uScale.value = p.scale;
      program.uniforms.uBloom.value = p.bloom;
      program.uniforms.uPetals.value = p.petals;
      program.uniforms.uVeins.value = p.veins;
      program.uniforms.uVelvet.value = p.velvet;
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
    <div ref={containerRef} className="w-full h-full relative overflow-hidden block bg-[#030603]">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
\`;
`;

export default function OrganicWorkspace() {
  return (
    <ShaderController<OrganicFlowerProps>
      title="Realistic Peony Shader"
      initialValues={initialValues}
      controls={organicControls}
      renderShader={(params) => <OrganicFlowerCanvas {...params} />}
      exportTemplate={generateOrganicTemplate}
    />
  );
}
