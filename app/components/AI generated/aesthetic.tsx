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
uniform float uScale;
uniform float uSize;
uniform float uPetals;
uniform float uLayers;
uniform float uRuffle;
uniform float uVeins;
uniform float uShadows;
uniform float uSway;

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
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    vec2 p = uv * uScale;

    // Gentle Wind Sway (Moves the whole flower slightly, not fluid warping)
    float wind = uTime * uSway;
    p.x += sin(uTime * 0.5 + p.y) * 0.05 * uSway;
    p.y += cos(uTime * 0.4 - p.x) * 0.05 * uSway;

    float r = length(p);
    float a = atan(p.y, p.x);

    // Aesthetic Light Cyan Background
    // Smooth gradient from soft sky blue to pure airy cyan
    vec3 bgBottom = vec3(0.65, 0.85, 0.95);
    vec3 bgTop    = vec3(0.88, 0.96, 1.00);
    vec3 finalCol = mix(bgBottom, bgTop, uv.y * 0.5 + 0.5);

    // Render layers of petals strictly Back-to-Front
    for(int j = 0; j < 20; j++) {
        float i = float(j);
        if(i >= uLayers) break;
        
        float t = i / max(1.0, uLayers - 1.0); // 0.0 (bottom) to 1.0 (top)
        
        // Radius of this specific petal layer
        float rad = uSize * (0.3 + 0.7 * t);
        
        // Petal count increases naturally on the outer layers
        float numP = floor(uPetals + t * 4.0);
        
        // Golden Ratio offset so petals naturally overlap the gaps of the layer below
        float rot = i * 2.39996 + sin(wind * 0.2 + i) * 0.02;
        float la = a + rot;
        
        float pIdx = floor(la * numP / 6.28318);
        float pFract = fract(la * numP / 6.28318) * 2.0 - 1.0;
        
        // Natural petal curvature (Parabola)
        float shape = 1.0 - pow(abs(pFract), 1.6 + t * 0.4);
        
        // Ruffled edges using noise
        shape += noise(vec2(pIdx * 10.0, r * 15.0)) * uRuffle * 0.1;
        
        // Check if the current pixel is inside this petal
        float dist = r / (rad * max(0.01, shape));
        
        // Smoothstep for perfect anti-aliasing
        float mask = smoothstep(1.0, 0.98, dist);
        
        // Shadow mask: slightly larger than the petal
        float shadowSpread = 1.05 + 0.1 * uShadows;
        float shadow = smoothstep(shadowSpread, 0.95, dist);
        
        if (mask > 0.0 || shadow < 1.0) {
            // CAST SHADOW: Darken the layers already rendered beneath this one
            finalCol = mix(finalCol * (1.0 - 0.4 * uShadows), finalCol, shadow);
            
            if (mask > 0.0) {
                // PREMIUM AESTHETIC PINK PALETTE
                vec3 coreCol = vec3(0.85, 0.15, 0.40); // Deep rich magenta/pink at the base
                vec3 midCol  = vec3(0.98, 0.60, 0.75); // Soft pastel pink
                vec3 edgeCol = vec3(1.00, 0.92, 0.95); // Creamy white-pink edge
                
                // Diffuse color mapping from base to edge
                vec3 col = mix(coreCol, midCol, smoothstep(0.0, 0.6, dist));
                col = mix(col, edgeCol, smoothstep(0.6, 1.0, dist));
                
                // REALISTIC TEXTURE 1: Cellular Micro-Grain (Velvet look)
                float grain = fract(sin(dot(p + i, vec2(127.1, 311.7))) * 43758.5453);
                col *= 0.95 + 0.05 * grain;
                
                // REALISTIC TEXTURE 2: Veins / Striae running outward
                float veinNoise = noise(vec2(r * 40.0, la * 60.0));
                col *= mix(1.0, 0.85, veinNoise * uVeins);
                
                // AMBIENT OCCLUSION (AO) - Deepening the center of the flower
                float ao = mix(0.3, 1.0, r / rad);
                col *= ao;
                
                // SSS (Subsurface Scattering) - Petal edges are slightly translucent and lighter
                col += edgeCol * smoothstep(0.85, 1.0, dist) * 0.2;
                
                // Apply the petal over the background
                finalCol = mix(finalCol, col, mask);
            }
        }
    }
    
    // Core (Stamen)
    float coreRad = uSize * 0.12;
    float coreDist = r / coreRad;
    float coreMask = smoothstep(1.0, 0.9, coreDist);
    if(coreMask > 0.0){
        vec3 stamenCol = vec3(0.95, 0.8, 0.2); // Warm aesthetic gold
        float stamenTex = noise(p * 150.0); // Bumpy pollen texture
        stamenCol *= 0.7 + 0.3 * stamenTex;
        
        // Shadow cast by the core
        finalCol = mix(finalCol * 0.5, finalCol, smoothstep(1.3, 0.9, coreDist));
        finalCol = mix(finalCol, stamenCol, coreMask);
    }

    // High-end subtle paper/film grain over the whole scene to tie it together
    float sceneGrain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    finalCol -= sceneGrain * 0.02;

    gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
}
`;

export type AestheticProps = {
  scale?: number;
  size?: number;
  petals?: number;
  layers?: number;
  ruffle?: number;
  veins?: number;
  shadows?: number;
  sway?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<AestheticProps> = {
  scale: 1.5,
  size: 1.8,
  petals: 5.0,
  layers: 10.0,
  ruffle: 0.8,
  veins: 0.6,
  shadows: 0.8,
  sway: 0.5,
  resolutionScale: 1.0,
};

export function AestheticCanvas(props= DEFAULT_PARAMS) {
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
        uSway: { value: propsRef.current.sway },
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
      program.uniforms.uSway.value = p.sway;

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
