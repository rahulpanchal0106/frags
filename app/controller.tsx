"use client";
import { useState, ReactNode } from "react";
import Link from "next/link"; // Added for the back button

export type ControlDef<T> = {
  key: keyof T;
  label: string;
  min: number;
  max: number;
  step?: number;
};

interface ShaderControllerProps<T extends Record<string, any>> {
  title: string;
  initialValues: T;
  controls: ControlDef<T>[];
  renderShader: (params: T) => ReactNode;
  exportTemplate: (paramsJson: string) => string;
}

export default function ShaderController<T extends Record<string, any>>({
  title,
  initialValues,
  controls,
  renderShader,
  exportTemplate,
}: ShaderControllerProps<T>) {
  const [params, setParams] = useState<T>(initialValues);
  const [copied, setCopied] = useState(false);

  const updateParam = (key: keyof T, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportFullCode = () => {
    const paramsString = JSON.stringify(params, null, 2);
    const fullFileString = exportTemplate(paramsString);

    navigator.clipboard.writeText(fullFileString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#050505] text-zinc-50 overflow-hidden font-sans">
      
      {/* Visualizer Panel (Canvas sits behind everything) */}
      <div className="flex-1 w-full relative overflow-hidden bg-black">
        {renderShader(params)}
      </div>

      {/* Control Panel (Sidebar) */}
      <div className="w-full md:w-96 h-full overflow-y-auto border-l border-zinc-800/60 flex flex-col relative z-10 bg-zinc-950 shadow-2xl">
        
        {/* Sticky Header */}
        <div className="p-6 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-xl sticky top-0 z-20 flex flex-col gap-5">
          
          {/* Navigation & Action Row */}
          <div className="flex items-center justify-between">
            <Link 
              href="/" 
              className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Collection
            </Link>

            <button
              onClick={handleExportFullCode}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
                copied 
                  ? "bg-emerald-500 text-white" 
                  : "bg-white text-black hover:bg-zinc-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Copy React Code
                </>
              )}
            </button>
          </div>

          {/* <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2> */}
        </div>

        {/* Controls Grid */}
        <div className="flex flex-col p-6 gap-6 pb-20">
          {controls.map((ctrl) => (
            <div key={String(ctrl.key)} className="group flex flex-col gap-3">
              
              {/* Label & Value Badge Row */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors cursor-pointer" htmlFor={String(ctrl.key)}>
                  {ctrl.label}
                </label>
                
                {/* Monospace Badge prevents jittering */}
                <div className="font-mono text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-md min-w-[3.5rem] text-center shadow-inner">
                  {Number(params[ctrl.key]).toFixed(ctrl.step && ctrl.step < 1 ? 3 : 1)}
                </div>
              </div>

              {/* Custom Styled Range Slider */}
              <div className="relative flex items-center w-full h-4">
                <input
                  id={String(ctrl.key)}
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step || 1}
                  value={params[ctrl.key]}
                  onChange={(e) => updateParam(ctrl.key, parseFloat(e.target.value))}
                  className="w-full h-1.5 appearance-none bg-zinc-800 rounded-full outline-none cursor-pointer
                    /* Chrome/Safari Custom Thumb */
                    [&::-webkit-slider-thumb]:appearance-none 
                    [&::-webkit-slider-thumb]:w-4 
                    [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:bg-white 
                    [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(255,255,255,0.4)]
                    [&::-webkit-slider-thumb]:transition-transform 
                    [&::-webkit-slider-thumb]:hover:scale-125
                    /* Firefox Custom Thumb */
                    [&::-moz-range-thumb]:appearance-none 
                    [&::-moz-range-thumb]:w-4 
                    [&::-moz-range-thumb]:h-4 
                    [&::-moz-range-thumb]:border-0 
                    [&::-moz-range-thumb]:rounded-full 
                    [&::-moz-range-thumb]:bg-white
                    [&::-moz-range-thumb]:shadow-[0_0_12px_rgba(255,255,255,0.4)]
                    [&::-moz-range-thumb]:transition-transform 
                    [&::-moz-range-thumb]:hover:scale-125"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}