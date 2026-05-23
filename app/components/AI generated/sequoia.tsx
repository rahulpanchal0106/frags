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
uniform float uPerspective;
uniform float uDistortion;
uniform float uColorShift;
uniform float uGlassOpacity;
uniform float uBrightness;

// Vibrant macOS Sequoia Palette
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.15, 0.25);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    
    // Mouse Wind Parallax (Swipe to bend the trees)
    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x));
    vec2 mDir = uv - mousePos;
    float dist = length(mDir);
    float pushEffect = exp(-dist * 3.0); 
    uv -= uMouseVelocity * pushEffect * uMouseForce * 0.1;

    // THE SEQUOIA PERSPECTIVE WEDGE: 
    // Compresses the X axis as you look further up the Y axis
    float lookUp = 1.0 - (uv.y * uPerspective);
    uv.x *= lookUp;

    float t = uTime * uSpeed;
    
    // Base sky canopy gradient
    vec3 bg = mix(vec3(0.02, 0.05, 0.12), vec3(0.1, 0.3, 0.5), uv.y * 0.5 + 0.5);
    vec3 finalColor = bg;

    // Generate 12 overlapping, frosted glass tree silhouettes
    for (float i = 0.0; i < 12.0; i++) {
        // Stagger positions across the screen
        float offset = (i - 6.0) * 0.25 + sin(i * 43.1) * 0.2; 
        
        // Varying trunk widths
        float width = 0.06 + sin(i * 17.5) * 0.04;
        
        // Organic sway and curve (Trunks bending slightly in the wind)
        float curve = sin(uv.y * 2.0 + t * 0.5 + i) * uDistortion * 0.1;
        curve += cos(uv.y * 4.0 - t * 0.3 + i * 3.0) * uDistortion * 0.05;
        
        // Local X position relative to this trunk
        float localX = uv.x * uScale + curve - offset;
        
        // Create frosted glass mask with sharp left edges and soft right edges for 3D volume
        float leftEdge = smoothstep(-width, -width + 0.015, localX);
        float rightEdge = smoothstep(width, width - 0.1, localX); 
        float mask = leftEdge * rightEdge;
        
        // Rim lighting (Luminous edge highlights mimicking thick glass/light catching the trunk edge)
        float highlight = smoothstep(-width, -width + 0.005, localX) * smoothstep(-width + 0.02, -width, localX);
        float rightHighlight = smoothstep(width, width - 0.005, localX) * smoothstep(width - 0.03, width, localX);
        
        // Dynamic layer coloring
        vec3 paneColor = palette(i * 0.1 - uv.y * 0.2 + uColorShift);
        
        // Additive Glass Layering
        finalColor = mix(finalColor, paneColor * uBrightness, mask * uGlassOpacity);
        finalColor += (highlight + rightHighlight) * 0.8 * mask * uBrightness;
    }

    // Soft vignette framing
    finalColor *= smoothstep(1.5, 0.2, length(uv * vec2(1.0, 0.5)));

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}
`;

export type SequoiaProps = {
  speed?: number;
  scale?: number;
  perspective?: number;
  distortion?: number;
  colorShift?: number;
  glassOpacity?: number;
  brightness?: number;
  mouseForce?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<SequoiaProps> = {
  speed: 0.15,
  scale: 1.0,
  perspective: 0.8,
  distortion: 1.2,
  colorShift: 0.2,
  glassOpacity: 0.85,
  brightness: 1.2,
  mouseForce: 1.5,
  resolutionScale: 1.0,
};

export function SequoiaCanvas(props: SequoiaProps) {
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
        uPerspective: { value: propsRef.current.perspective },
        uDistortion: { value: propsRef.current.distortion },
        uColorShift: { value: propsRef.current.colorShift },
        uGlassOpacity: { value: propsRef.current.glassOpacity },
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
      program.uniforms.uPerspective.value = p.perspective;
      program.uniforms.uDistortion.value = p.distortion;
      program.uniforms.uColorShift.value = p.colorShift;
      program.uniforms.uGlassOpacity.value = p.glassOpacity;
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
