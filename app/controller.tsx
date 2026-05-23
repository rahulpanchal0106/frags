"use client";
import { useState, ReactNode } from "react";

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
  exportTemplate: (paramsJson: string) => string; // <-- Takes your state and returns the FULL file string
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

  // EXPORTS THE ENTIRE STANDALONE COMPONENT FILE
  const handleExportFullCode = () => {
    const paramsString = JSON.stringify(params, null, 2);
    const fullFileString = exportTemplate(paramsString);

    navigator.clipboard.writeText(fullFileString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen w-full bg-neutral-900 text-white">
      {/* Visualizer Panel */}
      <div className="flex-1 w-screen relative overflow-hidden">
        {renderShader(params)}
      </div>

      {/* Control Panel */}
      <div className="w-80 h-full overflow-y-auto p-6 border-l border-neutral-800 flex flex-col gap-6 relative z-10 bg-neutral-900">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={handleExportFullCode}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded transition-colors whitespace-nowrap"
          >
            {copied ? "Copied Full File!" : "Export Full File"}
          </button>
        </div>

        <div className="flex flex-col gap-5 ">
          {controls.map((ctrl) => (
            <div key={String(ctrl.key)}>
              <label className="text-sm text-neutral-400 flex justify-between">
                <span>{ctrl.label}</span>
                <span>
                  {Number(params[ctrl.key]).toFixed(
                    ctrl.step && ctrl.step < 1 ? 3 : 1,
                  )}
                </span>
              </label>
              <input
                type="range"
                min={ctrl.min}
                max={ctrl.max}
                step={ctrl.step || 1}
                value={params[ctrl.key]}
                onChange={(e) =>
                  updateParam(ctrl.key, parseFloat(e.target.value))
                }
                className="w-full mt-2"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
