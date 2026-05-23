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
uniform float uWarp;
uniform float uColorShift;
uniform float uBorderWidth;
uniform float uBrightness;

// Ultra-Vibrant Pop-Art Palette
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

// Generates an independent, non-uniform wave function
float getWave(vec2 p, float t, float i) {
    float phase = t * (1.0 + i * 0.3);
    
    // Varying directional vectors for each wave
    vec2 dir = vec2(sin(i * 2.4), cos(i * 1.7));
    vec2 dir2 = vec2(cos(i * 3.1), sin(i * 1.2));
    float freq = 0.8 + i * 0.4;
    
    // Base rolling wave
    float val = sin(dot(p, dir) * freq + phase);
    
    // Secondary interference to make the wave shape irregular
    val += cos(dot(p, dir2) * (freq * 1.3) - phase * 1.1) * 0.6;
    
    // Local warp to make it chaotic and prevent perfect geometric shapes
    val += sin(p.x * sin(i) * 1.5 + p.y * cos(i) * 1.5) * uWarp;
    
    return val;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    
    // Mouse Interaction: Acts as a localized magnifying/twisting glass
    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x));
    vec2 mDir = uv - mousePos;
    float dMouse = length(mDir);
    uv -= normalize(mDir) * exp(-dMouse * 4.0) * uMouseForce * 0.1;

    vec2 p = uv * uScale;
    float t = uTime * uSpeed;

    float regionID = 0.0;
    float minDistToEdge = 999.0;
    float eps = 0.01; // Step size for calculating exact gradient width
    
    // Calculate the intersections of up to 8 independent sweeping waves
    for(int i = 0; i < 8; i++) {
        float fi = float(i) + 1.0;
        if (fi > uComplexity) continue;
        
        // Evaluate the curve at current pixel
        float v = getWave(p, t, fi);
        
        // Finite Difference: Mathematically calculate the exact slope of the curve
        // This ensures our dark borders remain a perfect 5px regardless of the wave's distortion
        float vx = getWave(p + vec2(eps, 0.0), t, fi);
        float vy = getWave(p + vec2(0.0, eps), t, fi);
        float gradMag = length(vec2(vx - v, vy - v)) / eps;
        
        // Exact distance to the wave boundary (v = 0)
        float dist = abs(v) / (gradMag + 0.0001);
        minDistToEdge = min(minDistToEdge, dist);
        
        // If we are "above" this wave, add a unique hash to our region ID
        if (v > 0.0) {
            regionID += fract(sin(fi * 112.31) * 43758.54) * 100.0;
        }
    }

    // Every distinct sliced section now has a completely unique regionID
    float normalizedID = fract(regionID * 0.1345);
    vec3 col = palette(normalizedID + uColorShift);

    // Add a very subtle lighting gradient inside the sections so they look like physical pop-art layers
    col *= 0.85 + 0.15 * sin(p.x * 2.0 + p.y * 2.0 + regionID);

    // Razor-sharp thick dark borders
    float thickness = uBorderWidth / uScale;
    // Anti-aliased just enough to look smooth on high-DPI screens, but completely sharp
    float borderMask = smoothstep(thickness - 0.005, thickness + 0.005, minDistToEdge);

    vec3 borderColor = vec3(0.02, 0.01, 0.04);
    vec3 finalCol = mix(borderColor, col * uBrightness, borderMask);

    gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
}
`;

export type CrosspointProps = {
  speed?: number;
  scale?: number;
  complexity?: number;
  warp?: number;
  colorShift?: number;
  borderWidth?: number;
  brightness?: number;
  mouseForce?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<CrosspointProps> = {
  speed: 0.5,
  scale: 2.0,
  complexity: 5.0, // Uses 5 overlapping waves by default
  warp: 0.4,
  colorShift: 0.15,
  borderWidth: 0.05,
  brightness: 1.1,
  mouseForce: 1.5,
  resolutionScale: 1.0,
};

export function CrosspointCanvas(props: CrosspointProps) {
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
        uWarp: { value: propsRef.current.warp },
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
      renderer.setSize(
        w * currentProps.resolutionScale,
        h * currentProps.resolutionScale,
      );
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
      program.uniforms.uWarp.value = p.warp;
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
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden block bg-black"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
