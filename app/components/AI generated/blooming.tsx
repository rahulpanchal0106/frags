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
uniform float uScale;
uniform float uSize;
uniform float uPetals;
uniform float uLayers;
uniform float uRuffle;
uniform float uVeins;
uniform float uShadows;
uniform float uBloomSpeed;

// Smooth Hash for organic noise
float hash(vec2 p) { 
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); 
}

// Organic Value Noise for natural textures
float noise(vec2 p) {
    vec2 i = floor(p); 
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
    // Perfectly flat coordinates. No fluid distortion.
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    vec2 p = uv * uScale;

    float r = length(p);
    float a = atan(p.y, p.x);

    // The blooming cycle: 0.0 (closed bud) to 1.0 (full bloom)
    // Uses a sine wave for continuous opening and closing
    float cycle = sin(uTime * uBloomSpeed) * 0.5 + 0.5;

    // Aesthetic Light Cyan Background
    vec3 bgBottom = vec3(0.65, 0.85, 0.95);
    vec3 bgTop    = vec3(0.88, 0.96, 1.00);
    vec3 finalCol = mix(bgBottom, bgTop, uv.y * 0.5 + 0.5);

    // Render layers of petals strictly Back-to-Front (Outer to Inner)
    for(int j = 0; j < 25; j++) {
        float i = float(j);
        if(i >= uLayers) break;
        
        float t = i / max(1.0, uLayers - 1.0); // 0.0 (outer layers) to 1.0 (inner core)
        
        // Offset the blooming timing. 
        // Outer petals (t=0) bloom first. Inner petals (t=1) bloom last.
        float layerCycle = smoothstep(t * 0.5, t * 0.5 + 0.5, cycle);
        
        // Calculate the radius for this specific layer
        // When closed (layerCycle=0), the radius is very tight.
        // When open (layerCycle=1), it expands outward.
        float radClosed = uSize * (0.15 + t * 0.1);
        float radOpen = uSize * (0.3 + 0.7 * t);
        float rad = mix(radClosed, radOpen, layerCycle);
        
        // Number of petals varies naturally per layer
        float numP = floor(uPetals + t * 4.0);
        
        // Golden Ratio offset for natural spiral placement
        float rot = i * 2.39996;
        float la = a + rot;
        
        float pIdx = floor(la * numP / 6.28318);
        float pFract = fract(la * numP / 6.28318) * 2.0 - 1.0;
        
        // Natural petal curvature.
        // When closed, petals are pointy and narrow (shapeExp = 3.0).
        // When open, petals fan out wide (shapeExp = 1.4).
        float shapeExp = mix(3.0, 1.4 - t * 0.2, layerCycle);
        float shape = 1.0 - pow(abs(pFract), shapeExp);
        
        // Ruffled edges using noise (only visible when opened)
        shape += noise(vec2(pIdx * 10.0, r * 15.0)) * uRuffle * 0.1 * layerCycle;
        
        // Check if the current pixel is inside this petal
        float dist = r / (rad * max(0.01, shape));
        
        // Smoothstep for perfect anti-aliasing
        float mask = smoothstep(1.0, 0.98, dist);
        
        // Shadow mask: slightly larger than the petal
        float shadowSpread = 1.05 + 0.1 * uShadows * layerCycle;
        float shadow = smoothstep(shadowSpread, 0.95, dist);
        
        if (mask > 0.0 || shadow < 1.0) {
            // CAST SHADOW: Darken the layers already rendered beneath this one
            finalCol = mix(finalCol * (1.0 - 0.5 * uShadows * layerCycle), finalCol, shadow);
            
            if (mask > 0.0) {
                // REALISTIC ROSE PINK PALETTE
                vec3 coreCol = vec3(0.85, 0.15, 0.40); // Deep rich magenta/pink at the base
                vec3 midCol  = vec3(0.98, 0.60, 0.75); // Soft pastel pink
                vec3 edgeCol = vec3(1.00, 0.92, 0.95); // Creamy white-pink edge
                
                // Diffuse color mapping from base to edge
                vec3 col = mix(coreCol, midCol, smoothstep(0.0, 0.6, dist));
                col = mix(col, edgeCol, smoothstep(0.6, 1.0, dist));
                
                // REALISTIC TEXTURE 1: Cellular Micro-Grain (Velvet look)
                float grain = fract(sin(dot(p + i, vec2(127.1, 311.7))) * 43758.5453);
                col *= 0.95 + 0.05 * grain;
                
                // REALISTIC TEXTURE 2: Veins running outward (fades when closed)
                float veinNoise = noise(vec2(r * 40.0, la * 60.0));
                col *= mix(1.0, 0.85, veinNoise * uVeins * layerCycle);
                
                // AMBIENT OCCLUSION (AO) - Deepening the center of the flower
                float ao = mix(0.2, 1.0, r / rad);
                col *= ao;
                
                // SSS (Subsurface Scattering) - Petal edges are slightly translucent
                col += edgeCol * smoothstep(0.85, 1.0, dist) * 0.2;
                
                // Apply the petal over the background
                finalCol = mix(finalCol, col, mask);
            }
        }
    }
    
    // Core (Stamen) - Only really visible when the flower is fully bloomed
    float coreRad = uSize * 0.12 * cycle;
    float coreDist = r / coreRad;
    float coreMask = smoothstep(1.0, 0.9, coreDist);
    if(coreMask > 0.0 && cycle > 0.2){
        vec3 stamenCol = vec3(0.95, 0.8, 0.2); // Warm aesthetic gold
        float stamenTex = noise(p * 150.0); // Bumpy pollen texture
        stamenCol *= 0.7 + 0.3 * stamenTex;
        
        finalCol = mix(finalCol * 0.5, finalCol, smoothstep(1.3, 0.9, coreDist));
        finalCol = mix(finalCol, stamenCol, coreMask);
    }

    // High-end subtle paper/film grain over the whole scene
    float sceneGrain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    finalCol -= sceneGrain * 0.02;

    gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
}
`;

export type BloomingProps = {
  scale?: number;
  size?: number;
  petals?: number;
  layers?: number;
  ruffle?: number;
  veins?: number;
  shadows?: number;
  bloomSpeed?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<BloomingProps> = {
  scale: 1.5,
  size: 1.8,
  petals: 5.0,
  layers: 15.0,
  ruffle: 0.8,
  veins: 0.6,
  shadows: 1.0,
  bloomSpeed: 0.5,
  resolutionScale: 1.0,
};

export function BloomingCanvas(props: BloomingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
        uScale: { value: propsRef.current.scale },
        uSize: { value: propsRef.current.size },
        uPetals: { value: propsRef.current.petals },
        uLayers: { value: propsRef.current.layers },
        uRuffle: { value: propsRef.current.ruffle },
        uVeins: { value: propsRef.current.veins },
        uShadows: { value: propsRef.current.shadows },
        uBloomSpeed: { value: propsRef.current.bloomSpeed },
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

      gl.canvas.style.width = "100%";
      gl.canvas.style.height = "100%";

      program.uniforms.uResolution.value.set(gl.canvas.width, gl.canvas.height);
    };

    window.addEventListener("resize", resize);
    resize();

    const start = performance.now();
    let frame = 0;

    const loop = () => {
      const p = propsRef.current;

      program.uniforms.uTime.value = (performance.now() - start) / 1000;
      program.uniforms.uScale.value = p.scale;
      program.uniforms.uSize.value = p.size;
      program.uniforms.uPetals.value = p.petals;
      program.uniforms.uLayers.value = p.layers;
      program.uniforms.uRuffle.value = p.ruffle;
      program.uniforms.uVeins.value = p.veins;
      program.uniforms.uShadows.value = p.shadows;
      program.uniforms.uBloomSpeed.value = p.bloomSpeed;

      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden block"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
