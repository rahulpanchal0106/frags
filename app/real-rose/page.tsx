"use client";
import {
  RealRoseCanvas,
  RealRoseProps,
} from "../components/AI generated/real-rose";
import ShaderController, { ControlDef } from "../controller";

const initialValues: Required<RealRoseProps> = {
  scale: 2.50,
  size: 2.3,
  bloomSpeed: 0.5,
  ruffle: 1.7,
  shadows: 0.8,
  resolutionScale: 0.7,
};

const realRoseControls: ControlDef<RealRoseProps>[] = [
  {
    key: "bloomSpeed",
    label: "Time-Lapse Bloom Speed",
    min: 0.1,
    max: 2.0,
    step: 0.05,
  },
  { key: "scale", label: "Camera Zoom", min: 0.5, max: 4.0, step: 0.1 },
  { key: "size", label: "Max Open Spread", min: 0.5, max: 4.0, step: 0.1 },
  {
    key: "ruffle",
    label: "Organic Petal Ruffle",
    min: 0.0,
    max: 3.0,
    step: 0.1,
  },
  {
    key: "shadows",
    label: "Ambient Occlusion (Depth)",
    min: 0.0,
    max: 2.0,
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

const generateRealRoseTemplate = (paramsJson: string) => `
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
uniform float uBloomSpeed;
uniform float uRuffle;
uniform float uShadows;

#define PI 3.14159265359
#define GOLDEN_ANGLE 2.39996323

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / min(uResolution.y, uResolution.x);
    vec2 p = uv * uScale;

    float r = length(p);
    float a = atan(p.y, p.x);

    float bloom = sin(uTime * uBloomSpeed) * 0.5 + 0.5;

    vec3 bgBot = vec3(0.55, 0.85, 0.95);
    vec3 bgTop = vec3(0.90, 0.96, 1.00);
    vec3 finalCol = mix(bgBot, bgTop, uv.y * 0.5 + 0.5);

    for (float i = 80.0; i >= 1.0; i -= 1.0) {
        float f = i / 80.0; 
        
        float openFactor = mix(0.15, 1.0, f * bloom + (1.0 - f) * 0.1); 
        float pRadius = uSize * f * mix(0.6, 1.2, openFactor);
        
        float pAngle = i * GOLDEN_ANGLE + uTime * 0.05;
        float diff = mod(a - pAngle + PI, 2.0 * PI) - PI;
        float pWidth = mix(0.8, 2.4, f) * mix(0.6, 1.2, bloom); 
        
        if (abs(diff) < pWidth) {
            float asymmetry = 0.15 * f; 
            float tipShape = mix(1.5, 3.5, f); 
            float curve = 1.0 - pow(abs(diff + asymmetry) / pWidth, tipShape);
            
            float ruffle = sin(diff * 25.0 + i) * 0.025 * f * bloom;
            float edge = pRadius * (curve + ruffle * uRuffle);
            
            if (r < edge) {
                float distFromEdge = edge - r;
                float mask = smoothstep(0.0, 0.015, distFromEdge);
                
                float shadow = smoothstep(0.0, 0.15 * pRadius, distFromEdge + 0.02);
                finalCol = mix(finalCol * (1.0 - 0.5 * uShadows * f), finalCol, shadow);
                
                if (mask > 0.0) {
                    float normR = r / edge; 
                    
                    vec3 cCore = vec3(0.40, 0.00, 0.15); 
                    vec3 cMid  = vec3(0.95, 0.35, 0.55); 
                    vec3 cEdge = vec3(1.00, 0.85, 0.88); 
                    
                    vec3 col = mix(cCore, cMid, smoothstep(0.0, 0.6, normR));
                    col = mix(col, cEdge, smoothstep(0.6, 1.0, normR));
                    
                    float vein = abs(sin(diff * 35.0 + r * 15.0));
                    col *= mix(1.0, 0.85, vein * smoothstep(0.2, 0.9, normR) * 0.4);
                    
                    float grain = fract(sin(dot(p + i, vec2(127.1, 311.7))) * 43758.5453);
                    col *= 0.94 + 0.06 * grain;
                    
                    float curlWidth = 0.06 * pRadius;
                    float curl = smoothstep(0.0, curlWidth, distFromEdge) * smoothstep(curlWidth * 2.0, curlWidth * 0.5, distFromEdge);
                    col = mix(col, vec3(1.0, 0.95, 0.98), curl * 0.7);
                    
                    col *= mix(0.1, 1.0, smoothstep(0.0, 0.4, r / uSize));
                    
                    finalCol = mix(finalCol, col, mask);
                }
            }
        }
    }

    float sceneGrain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    finalCol -= sceneGrain * 0.02;

    gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
}
\`;

export type RealRoseProps = {
  scale?: number;
  size?: number;
  bloomSpeed?: number;
  ruffle?: number;
  shadows?: number;
  resolutionScale?: number;
};

const DEFAULT_PARAMS: Required<RealRoseProps> = ${paramsJson};

export function RealRoseCanvas(props: RealRoseProps) {
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
        uBloomSpeed: { value: propsRef.current.bloomSpeed },
        uRuffle: { value: propsRef.current.ruffle },
        uShadows: { value: propsRef.current.shadows },
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
      program.uniforms.uBloomSpeed.value = p.bloomSpeed;
      program.uniforms.uRuffle.value = p.ruffle;
      program.uniforms.uShadows.value = p.shadows;

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

export default function RealRoseWorkspace() {
  return (
    <ShaderController<RealRoseProps>
      title="Aesthetic Real Rose"
      initialValues={initialValues}
      controls={realRoseControls}
      renderShader={(params) => <RealRoseCanvas {...params} />}
      exportTemplate={generateRealRoseTemplate}
    />
  );
}
