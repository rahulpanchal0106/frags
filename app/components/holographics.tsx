"use client";
import { useRef, useEffect } from "react";
import { Renderer, Program, Mesh, Triangle, Vec2 } from "ogl";

const vertex = `
attribute vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);}
`;

const fragment = `
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
uniform float uDistortion;
uniform float uIrid; // Iridescence spread
uniform float uDarkness;

// Cosine palette for Holographic Iridescence
vec3 iridescence(float t) {
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

// Organic Fold Math
float map(vec2 p, float t) {
    float f = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    vec2 shift = vec2(0.0);
    for(int i = 0; i < 4; i++) {
        shift.x = cos(p.y * freq + t) * uDistortion;
        shift.y = sin(p.x * freq - t) * uDistortion;
        p += shift;
        f += sin(p.x * uComplexity + p.y * uComplexity) * amp;
        amp *= 0.5;
        freq *= 1.8;
    }
    return f;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    
    // Mouse Interaction: Acts like dragging a finger through thick silk
    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x));
    vec2 mDir = uv - mousePos;
    float dMouse = length(mDir);
    uv -= normalize(mDir) * exp(-dMouse * 4.0) * uMouseForce * 0.1;

    vec2 p = uv * uScale;
    float t = uTime * uSpeed;

    // Fake 3D: Compute surface normal (slope) of the fluid
    float eps = 0.01;
    float h = map(p, t);
    float hx = map(p + vec2(eps, 0.0), t);
    float hy = map(p + vec2(0.0, eps), t);
    vec3 normal = normalize(vec3((hx - h)/eps, (hy - h)/eps, 1.0));

    // Lighting setup
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.5));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    // Diffuse & Specular (Chrome Reflection)
    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 30.0); // Sharp, tight reflection

    // FRESNEL EQUATION (The magic for the holographic look)
    // Angles perpendicular to the viewer get a higher value
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

    // Map fresnel to iridescent color palette (shifts with time so it feels alive)
    vec3 holoColor = iridescence(fresnel * uIrid + t * 0.2);

    // Obsidian base color
    vec3 baseColor = vec3(0.02, 0.02, 0.03);

    // Combine everything
    vec3 finalColor = baseColor * (1.0 - uDarkness) + (diffuse * 0.05); // Deep shadows
    finalColor += holoColor * spec * 2.5; // Bright holographic razor-sharp highlights
    finalColor += holoColor * fresnel * 0.4; // Soft ambient holographic glow on the edges

    // Subtle film grain for a high-end matte finish
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    finalColor -= grain * 0.05;

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

export type HolographicProps = {
  speed?: number;
  scale?: number;
  complexity?: number;
  distortion?: number;
  iridescence?: number;
  darkness?: number;
  mouseForce?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<HolographicProps> = {
  speed: 0.15,
  scale: 1.5,
  complexity: 2.0,
  distortion: 1.2,
  iridescence: 1.5,
  darkness: 0.8, // 0 is gray, 1 is pitch black
  mouseForce: 1.5,
  resolutionScale: 0.5, // Runs at half-res for buttery smooth glow and 60fps
};

export function HolographicCanvas(props: HolographicProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mouseRef = useRef({
    x: 0.5,
    y: 0.5,
    targetX: 0.5,
    targetY: 0.5,
    lastX: 0.5,
    lastY: 0.5,
    vx: 0,
    vy: 0,
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

    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio, 2),
      canvas,
    });
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
        uIrid: { value: propsRef.current.iridescence },
        uDarkness: { value: propsRef.current.darkness },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const currentProps = propsRef.current;
      renderer.setSize(
        w * currentProps.resolutionScale,
        h * currentProps.resolutionScale,
      );

      // Force CSS stretching for lower resolution scales
      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";

      program.uniforms.uResolution.value.set(gl.canvas.width, gl.canvas.height);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      mouseRef.current.targetX = (e.clientX - rect.left) / rect.width;
      mouseRef.current.targetY = 1.0 - (e.clientY - rect.top) / rect.height;
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
      program.uniforms.uIrid.value = p.iridescence;
      program.uniforms.uDarkness.value = p.darkness;

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
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden block bg-black"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
