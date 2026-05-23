"use client";
import {
  BloomingCanvas,
  BloomingProps,
} from "../components/AI generated/blooming";
import ShaderController, { ControlDef } from "../controller";

const initialValues: Required<BloomingProps> = {
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

const bloomingControls: ControlDef<BloomingProps>[] = [
  {
    key: "bloomSpeed",
    label: "Time-Lapse Bloom Speed",
    min: 0.1,
    max: 2.0,
    step: 0.05,
  },
  { key: "scale", label: "Camera Zoom", min: 0.5, max: 4.0, step: 0.1 },
  { key: "size", label: "Max Open Spread", min: 0.5, max: 3.0, step: 0.1 },
  { key: "petals", label: "Base Petal Count", min: 3.0, max: 10.0, step: 1.0 },
  { key: "layers", label: "Depth Layers", min: 1.0, max: 25.0, step: 1.0 },
  {
    key: "ruffle",
    label: "Edge Organic Ruffle",
    min: 0.0,
    max: 2.0,
    step: 0.1,
  },
  {
    key: "veins",
    label: "Petal Vein Textures",
    min: 0.0,
    max: 1.5,
    step: 0.05,
  },
  { key: "shadows", label: "Shadow Depth (AO)", min: 0.0, max: 2.0, step: 0.1 },
  {
    key: "resolutionScale",
    label: "Resolution Scale",
    min: 0.1,
    max: 2.0,
    step: 0.1,
  },
];

const generateBloomingTemplate = (paramsJson: string) => `
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
uniform float uScale;
uniform float uSize;
uniform float uPetals;
uniform float uLayers;
uniform float uRuffle;
uniform float uVeins;
uniform float uShadows;
uniform float uBloomSpeed;

float hash(vec2 p) { 
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); 
}

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

    float r = length(p);
    float a = atan(p.y, p.x);

    float cycle = sin(uTime * uBloomSpeed) * 0.5 + 0.5;

    vec3 bgBottom = vec3(0.65, 0.85, 0.95);
    vec3 bgTop    = vec3(0.88, 0.96, 1.00);
    vec3 finalCol = mix(bgBottom, bgTop, uv.y * 0.5 + 0.5);

    for(int j = 0; j < 25; j++) {
        float i = float(j);
        if(i >= uLayers) break;
        
        float t = i / max(1.0, uLayers - 1.0); 
        
        float layerCycle = smoothstep(t * 0.5, t * 0.5 + 0.5, cycle);
        
        float radClosed = uSize * (0.15 + t * 0.1);
        float radOpen = uSize * (0.3 + 0.7 * t);
        float rad = mix(radClosed, radOpen, layerCycle);
        
        float numP = floor(uPetals + t * 4.0);
        float rot = i * 2.39996;
        float la = a + rot;
        
        float pIdx = floor(la * numP / 6.28318);
        float pFract = fract(la * numP / 6.28318) * 2.0 - 1.0;
        
        float shapeExp = mix(3.0, 1.4 - t * 0.2, layerCycle);
        float shape = 1.0 - pow(abs(pFract), shapeExp);
        
        shape += noise(vec2(pIdx * 10.0, r * 15.0)) * uRuffle * 0.1 * layerCycle;
        
        float dist = r / (rad * max(0.01, shape));
        float mask = smoothstep(1.0, 0.98, dist);
        
        float shadowSpread = 1.05 + 0.1 * uShadows * layerCycle;
        float shadow = smoothstep(shadowSpread, 0.95, dist);
        
        if (mask > 0.0 || shadow < 1.0) {
            finalCol = mix(finalCol * (1.0 - 0.5 * uShadows * layerCycle), finalCol, shadow);
            
            if (mask > 0.0) {
                vec3 coreCol = vec3(0.85, 0.15, 0.40); 
                vec3 midCol  = vec3(0.98, 0.60, 0.75); 
                vec3 edgeCol = vec3(1.00, 0.92, 0.95); 
                
                vec3 col = mix(coreCol, midCol, smoothstep(0.0, 0.6, dist));
                col = mix(col, edgeCol, smoothstep(0.6, 1.0, dist));
                
                float grain = fract(sin(dot(p + i, vec2(127.1, 311.7))) * 43758.5453);
                col *= 0.95 + 0.05 * grain;
                
                float veinNoise = noise(vec2(r * 40.0, la * 60.0));
                col *= mix(1.0, 0.85, veinNoise * uVeins * layerCycle);
                
                float ao = mix(0.2, 1.0, r / rad);
                col *= ao;
                
                col += edgeCol * smoothstep(0.85, 1.0, dist) * 0.2;
                finalCol = mix(finalCol, col, mask);
            }
        }
    }
    
    float coreRad = uSize * 0.12 * cycle;
    float coreDist = r / coreRad;
    float coreMask = smoothstep(1.0, 0.9, coreDist);
    if(coreMask > 0.0 && cycle > 0.2){
        vec3 stamenCol = vec3(0.95, 0.8, 0.2); 
        float stamenTex = noise(p * 150.0); 
        stamenCol *= 0.7 + 0.3 * stamenTex;
        
        finalCol = mix(finalCol * 0.5, finalCol, smoothstep(1.3, 0.9, coreDist));
        finalCol = mix(finalCol, stamenCol, coreMask);
    }

    float sceneGrain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    finalCol -= sceneGrain * 0.02;

    gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
}
\`;

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

const DEFAULT_PARAMS: Required<BloomingProps> = ${paramsJson};

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

    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), canvas });
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
      renderer.setSize(w * currentProps.resolutionScale, h * currentProps.resolutionScale);
      
      gl.canvas.style.width = '100%';
      gl.canvas.style.height = '100%';
      
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
    <div ref={containerRef} className="w-full h-full relative overflow-hidden block">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
\`;
`;

export default function BloomingWorkspace() {
  return (
    <ShaderController<BloomingProps>
      title="Time-Lapse Blooming Rose"
      initialValues={initialValues}
      controls={bloomingControls}
      renderShader={(params) => <BloomingCanvas {...params} />}
      exportTemplate={generateBloomingTemplate}
    />
  );
}
