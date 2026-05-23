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
uniform float uSpeed;
uniform float uZoom;
uniform float uColorShift;
uniform float uGrain;
uniform float uMouseGlow;

void main() {
    // p is used for calculating the spatial blobs
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    p *= uZoom;

    // Mouse acts as a subtle spotlight
    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x)) * uZoom;
    
    float t = uTime * uSpeed;

    // 4 Massive Orbiting Orbs
    vec2 p1 = vec2(sin(t * 0.8), cos(t * 0.6)) * 0.8;
    vec2 p2 = vec2(cos(t * 0.5), sin(t * 0.9)) * 0.7;
    vec2 p3 = vec2(sin(t * 0.3), cos(t * 0.7)) * 0.9;
    vec2 p4 = vec2(cos(t * 0.4), cos(t * 0.5)) * 0.8;

    float d1 = length(p - p1);
    float d2 = length(p - p2);
    float d3 = length(p - p3);
    float d4 = length(p - p4);

    // Soft, diffused exponential falloff (Creates the blur)
    float w1 = exp(-d1 * 1.5);
    float w2 = exp(-d2 * 1.8);
    float w3 = exp(-d3 * 1.6);
    float w4 = exp(-d4 * 1.7);
    
    // 0.1 prevents division by zero and sets a baseline darkness
    float wTotal = w1 + w2 + w3 + w4 + 0.1; 

    // Premium SaaS Dark Mode Palette
    vec3 c1 = vec3(0.1, 0.3, 1.0); // Deep Tech Blue
    vec3 c2 = vec3(0.6, 0.1, 0.8); // Royal Purple
    vec3 c3 = vec3(1.0, 0.2, 0.4); // Vibrant Pink
    vec3 c4 = vec3(0.1, 0.8, 0.7); // Mint / Cyan
    vec3 bg = vec3(0.02, 0.02, 0.04); // Almost black background

    // Hue Shifting Matrix
    mat3 rgb2yiq = mat3(0.299, 0.587, 0.114, 0.596, -0.274, -0.322, 0.211, -0.523, 0.312);
    mat3 yiq2rgb = mat3(1.0, 0.956, 0.621, 1.0, -0.272, -0.647, 1.0, -1.106, 1.703);
    float rad = radians(uColorShift);
    float cosh = cos(rad), sinh = sin(rad);
    mat3 hueRot = yiq2rgb * mat3(1.0, 0.0, 0.0, 0.0, cosh, -sinh, 0.0, sinh, cosh) * rgb2yiq;
    
    c1 = clamp(hueRot * c1, 0.0, 1.0);
    c2 = clamp(hueRot * c2, 0.0, 1.0);
    c3 = clamp(hueRot * c3, 0.0, 1.0);
    c4 = clamp(hueRot * c4, 0.0, 1.0);

    // Blend everything smoothly
    vec3 finalColor = (c1 * w1 + c2 * w2 + c3 * w3 + c4 * w4) / wTotal;
    finalColor = mix(bg, finalColor, min(wTotal, 1.0));

    // Mouse Interaction (Soft follow glow)
    float dMouse = length(p - mousePos);
    finalColor += vec3(0.15, 0.15, 0.2) * exp(-dMouse * 2.0) * uMouseGlow;

    // FILM GRAIN (The secret to high-end gradients. Breaks up banding)
    float grainVal = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    finalColor -= (grainVal * uGrain) * 0.15;

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

export type AuroraProps = {
  speed?: number;
  zoom?: number;
  colorShift?: number;
  grain?: number;
  mouseGlow?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<AuroraProps> = {
  speed: 0.15,
  zoom: 1.5,
  colorShift: 0.0,
  grain: 0.5,
  mouseGlow: 0.8,
  resolutionScale: 0.5, // Lower res scale is actually better for blur & performance
};

export function AuroraCanvas(props: AuroraProps) {
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
        uSpeed: { value: propsRef.current.speed },
        uZoom: { value: propsRef.current.zoom },
        uColorShift: { value: propsRef.current.colorShift },
        uGrain: { value: propsRef.current.grain },
        uMouseGlow: { value: propsRef.current.mouseGlow },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const currentProps = propsRef.current;

      // OGL sets internal resolution AND inline CSS size here...
      renderer.setSize(
        w * currentProps.resolutionScale,
        h * currentProps.resolutionScale,
      );

      // 👇 ADD THESE TWO LINES 👇
      // Force the physical DOM element to stretch back to the full container size
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

      program.uniforms.uTime.value = (performance.now() - start) / 1000;
      program.uniforms.uMouse.value.set(m.x, m.y);
      program.uniforms.uSpeed.value = p.speed;
      program.uniforms.uZoom.value = p.zoom;
      program.uniforms.uColorShift.value = p.colorShift;
      program.uniforms.uGrain.value = p.grain;
      program.uniforms.uMouseGlow.value = p.mouseGlow;

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
