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
uniform float uBloomSpeed;
uniform float uScale;
uniform float uPetals;
uniform float uLayers;
uniform float uTwist;
uniform float uOrganic;
uniform float uColorShift;
uniform float uBrightness;

// Premium Iridescent Palette (Deep Midnight -> Cyan -> Magenta)
vec3 iridescence(float t) {
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

// 3D Polar Heightmap: Defines the shape of the flower
float getLotusHeight(vec2 p, float t) {
    float r = length(p);
    float a = atan(p.y, p.x);
    
    // Unfurling Twist: The center twists tight and unwinds towards the edges
    // We animate this over time so the flower "breathes" and opens
    float currentTwist = uTwist * exp(-r * 2.0) * sin(t * uSpeed * 0.5);
    a += currentTwist;
    
    // Petal Lobes
    float lobes = sin(a * uPetals) * 0.5 + 0.5;
    lobes = pow(lobes, 1.5); // Pinch the petals so they aren't perfectly round
    
    // Concentric Blooming Layers
    float rings = sin(r * uLayers - t * uBloomSpeed) * 0.5 + 0.5;
    
    // Organic Wobble (prevents it from looking like a cheap math graph)
    float wobble = sin(r * 12.0 + a * 4.0 + t * uSpeed) * uOrganic;
    
    // Combine to form the 3D topology
    float height = rings * lobes;
    height += wobble;
    
    // Taper the flower off softly into the background
    height *= exp(-r * 1.8);
    
    return height;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    
    // Mouse Drag: Soft physical distortion of the entire flower
    vec2 mousePos = (uMouse - 0.5) * (uResolution.xy / min(uResolution.y, uResolution.x));
    vec2 mDir = uv - mousePos;
    float dMouse = length(mDir);
    uv -= normalize(mDir) * exp(-dMouse * 3.0) * uMouseForce * 0.05;

    vec2 p = uv * uScale;
    float t = uTime;

    // FAKE 3D LIGHTING (Calculating the Normal / Slope of the petals)
    float eps = 0.01;
    float h = getLotusHeight(p, t);
    float hx = getLotusHeight(p + vec2(eps, 0.0), t);
    float hy = getLotusHeight(p + vec2(0.0, eps), t);
    
    // Create the 3D surface vector
    vec3 normal = normalize(vec3((hx - h) / eps, (hy - h) / eps, 1.5));

    // Lighting setup
    vec3 lightDir = normalize(vec3(0.5, 1.0, 1.0)); // Light from top-right
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    // Diffuse & Specular (Glassy highlights on the petals)
    float diffuse = max(dot(normal, lightDir), 0.0);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 40.0); // Sharp, wet glass reflection

    // Fresnel Effect: Edges of the petals reflect differently than the face
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

    // Map the glossy edges to our iridescent rainbow
    vec3 petalColor = iridescence(fresnel * 1.5 + h * 2.0 + uColorShift);

    // Dark Premium Background
    vec3 bg = vec3(0.01, 0.01, 0.03);

    // Composite the layers
    vec3 finalColor = bg;
    finalColor += diffuse * vec3(0.1, 0.15, 0.2); // Subtle base lighting
    finalColor += petalColor * spec * 2.0; // The bright razor-sharp gloss
    finalColor += petalColor * fresnel * h * 1.5; // The glowing translucent silk body

    // High-end film grain to prevent banding
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    finalColor -= grain * 0.04;

    gl_FragColor = vec4(clamp(finalColor * uBrightness, 0.0, 1.0), 1.0);
}
`;

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

const DEFAULT_PARAMS: Required<LotusProps> = {
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
  resolutionScale: 0.5, // Runs at half-res for buttery blur and great performance
};

export function LotusCanvas(props: LotusProps) {
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
      renderer.setSize(
        w * currentProps.resolutionScale,
        h * currentProps.resolutionScale,
      );

      // Keep canvas stretched regardless of internal resolution
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
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden block bg-black"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
