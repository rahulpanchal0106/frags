"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";


// --- IMPORTS ---
import { AestheticCanvas } from "./components/AI generated/aesthetic";
import { RealRoseCanvas } from "./components/AI generated/real-rose";
import { AuroraCanvas } from "./components/AI generated/aurora";
import { HolographicCanvas } from "./components/holographics";
import { ShardsCanvas } from "./components/shards";
import { CrosspointCanvas } from "./components/AI generated/crosspoint";
import { SequoiaCanvas } from "./components/AI generated/sequoia";
import { OceanCanvas } from "./components/AI generated/ocean";
import { TidesCanvas } from "./components/AI generated/tides";
import { BloomingCanvas } from "./components/AI generated/blooming";
import { LotusCanvas } from "./components/AI generated/lotus";
import { SleepyCanvas } from "./components/AI generated/sleepy";
import { OrganicFlowerCanvas } from "./components/AI generated/organic-flower";
import { MacosCanvas } from "./components/AI generated/macos";
import { DarkVeilCanvas } from "./components/exp";
import { CosmicFluidCanvas } from "./components/AI generated/cosmic";
import { VibrantWavesCanvas } from "./components/AI generated/vibrant";

// --- COMPONENT MAP ---
const COMPONENT_MAP: Record<string, { Component: React.ElementType; props: any }> = {
  "holographic": { Component: HolographicCanvas, props: { speed: 0.040, scale: 1.1, complexity: 1.9, distortion: 0.7, iridescence: 0.3, darkness: 0.55, mouseForce: 1.4, resolutionScale: 0.5 } },
  "aesthetic": { Component: AestheticCanvas, props: { scale: 1.5, size: 1.8, petals: 5.0, layers: 10.0, ruffle: 0.8, veins: 0.6, shadows: 0.8, sway: 0.5, resolutionScale: 1.0 } },
  "real-rose": { Component: RealRoseCanvas, props: { scale: 1.2, size: 2.2, bloomSpeed: 0.6, ruffle: 1.0, shadows: 1.0, resolutionScale: 1.0 } },
  "aurora": { Component: AuroraCanvas, props: { speed: 0.385, zoom: 1.200, colorShift: 32.0, grain: 0.2, mouseGlow: 0.9, resolutionScale: 0.6 } },
  "shards": { Component: ShardsCanvas, props: { speed: 0.1, scale: 0.5, complexity: 4.1, colorShift: 0.2, borderWidth: 0.01, brightness: 1.2, mouseForce: 1.0, resolutionScale: 1.0 } },
  "vibrant": { Component: VibrantWavesCanvas, props: { speed: -0.2, scale: 1.3, complexity: 1.5, colorShift: 3.80, distortion: 0.2, borderWidth: 0.010, mouseForce: 1.5, resolutionScale: 1.0 } },
  "crosspoint": { Component: CrosspointCanvas, props: { speed: 0.2, scale: 4.6, complexity: 2.0, warp: 0.4, colorShift: 0.750, borderWidth: 0.00, brightness: 1.150, mouseForce: 0.80, resolutionScale: 1.0 } },
  "ocean": { Component: OceanCanvas, props: { speed: 0.5, scale: 3.0, distortion: 1.2, frequency: 1.5, foam: 1.2, colorShift: 0.0, brightness: 1.1, mouseForce: 1.5, resolutionScale: 1.0 } },
  "tides": { Component: TidesCanvas, props: { speed: 0.220, scale: 1.4, frequency: 0.6, complexity: 1.1, distortion: 0.7, foam: 1.1, colorShift: -0.050, brightness: 1.3, mouseForce: 1.5, resolutionScale: 1.0 } },
  "blooming": { Component: BloomingCanvas, props: { scale: 1.2, size: 0.8, petals: 5.0, layers: 13.0, ruffle: 1.2, veins: 0.0, shadows: 1.0, bloomSpeed: 0.5, resolutionScale: 1.0 } },
  "lotus": { Component: LotusCanvas, props: { speed: 0.5, bloomSpeed: 1.0, scale: 4.0, petals: 7.0, layers: 6.0, twist: 2.5, organic: 0.05, colorShift: 0.1, brightness: 1.2, mouseForce: 1.5, resolutionScale: 0.5 } },
  "sleepy": { Component: SleepyCanvas, props: { speed: 0.15, breathSpeed: 0.628, colorShift: 0.5, brightness: 1.0, vignette: 1.8, zoom: 1.2, resolutionScale: 1.0 } },
  "macos": { Component: MacosCanvas, props: { speed: 0.15, scale: 1.5, complexity: 2.5, distortion: 1.2, colorShift: 0.0, lighting: 1.0, contrast: 0.8, mouseForce: 1.5, resolutionScale: 1.0 } },
  "darkweil": { Component: DarkVeilCanvas, props: { hueShift: 234, noiseIntensity: 0.1, scanlineIntensity: 0.5, speed: 1, scanlineFrequency: 0, warpAmount: 2, resolutionScale: 1, uScanFreqMul: 0.5, uSpotIntensity: 0.02, uLightShadeIntensity: 0.15, uMouseMoves: 1.0, uWeils: 6.283 } },
  "cosmic": { Component: CosmicFluidCanvas, props: { speed: 1.0, scale: 2.0, colorShift: 0.0, distortion: 3.0, brightness: 1.2, glow: 1.5, mouseForce: 1.5, resolutionScale: 1.0 } },
  "organic-flower": { Component: OrganicFlowerCanvas, props: { speed: 0.5, scale: 2.0, bloom: 1.2, petals: 4.0, veins: 0.5, velvet: 1.0, colorShift: 0.0, brightness: 1.2, mouseForce: 1.5, resolutionScale: 1.0 } },
  "sequoia": { Component: SequoiaCanvas, props: { speed: 0.625, scale: 2.1, perspective: 0.750, distortion: 1.5, glassOpacity: 1.0, colorShift: 0.3, brightness: 1.3, mouseForce: 1.5, resolutionScale: 1.0 } },
};

// --- DATA ---
const SHADERS = [
  { category: "Abstract", id: "shards", name: "Stained Glass", desc: "Razor-sharp, vibrant geometric shards with crisp dark borders." },
  { category: "Abstract", id: "vibrant", name: "Pop-Art Waves", desc: "High-contrast, morphing vector fields." },
  { category: "Abstract", id: "crosspoint", name: "Crosspoint", desc: "Sweeping, intersecting curves creating dynamic colorful slices." },
  { category: "Abstract", id: "sequoia", name: "Sequoia Canopy", desc: "Towering, frosted glass vertical silhouettes." },
  { category: "Materials", id: "holographic", name: "Obsidian Silk", desc: "Dark, moody liquid chrome with iridescent rainbow highlights." },
  { category: "Materials", id: "macos", name: "Fluid Folds", desc: "Classic glossy ribbon folds inspired by modern OS wallpapers." },
  { category: "Materials", id: "ocean", name: "Midnight Ocean", desc: "Deep, rolling ocean swells with soft ambient foam crests." },
  { category: "Materials", id: "tides", name: "Calm Tides", desc: "Smooth, sweeping horizontal bands of color." },
  { category: "Botanical", id: "real-rose", name: "Crimson Rose", desc: "A hyper-realistic blooming rose with deep, velvety shadows." },
  { category: "Botanical", id: "aesthetic", name: "Pastel Peony", desc: "Soft, layered botanical depth with a matte pastel finish." },
  { category: "Botanical", id: "organic-flower", name: "Midnight Flora", desc: "Deeply colored, glowing petals gently swaying in the breeze." },
  { category: "Botanical", id: "lotus", name: "Glass Lotus", desc: "A translucent, iridescent 3D lotus that elegantly unfurls." },
  { category: "Botanical", id: "blooming", name: "Time-Lapse", desc: "A minimalist, geometrically expanding floral structure." },
  { category: "Ambient", id: "aurora", name: "SaaS Aurora", desc: "Buttery smooth, out-of-focus mesh gradients for premium UIs." },
  { category: "Ambient", id: "sleepy", name: "Deep REM", desc: "Hypnotic, bioluminescent breathing rhythms for dark modes." },
  { category: "Ambient", id: "cosmic", name: "Cosmic Glow", desc: "Swirling, neon-tinted atmospheric gradients." },
  { category: "Ambient", id: "darkweil", name: "The Veil", desc: "Cinematic, volumetric lighting with a moody green glow." },
];

const CATEGORIES = ["All", "Abstract", "Materials", "Botanical", "Ambient"];

// --- CARD COMPONENT ---
function ShaderCard({ shader, isActive, onSelect, onSetBg }: { shader: any; isActive: boolean; onSelect: () => void; onSetBg: (id: string) => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex flex-col rounded-2xl border bg-zinc-900/30 text-left overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 focus-within:ring-2 focus-within:ring-zinc-400 ${isActive ? 'border-zinc-500' : 'border-zinc-800/60 hover:border-zinc-500'}`}
    >
      {/* TOP HALF (IMAGE): Click to toggle Live Background */}
      <div 
        onClick={() => onSetBg(shader.id)}
        role="button"
        tabIndex={0}
        title={isActive ? "Remove Live Background" : "Set as Live Background"}
        className="h-60 relative bg-zinc-950 overflow-hidden border-b border-zinc-800/60 flex items-center justify-center cursor-pointer"
      >
        {/* Fallback Image */}
        <Image src={`/frags-static/${shader.id}.jpg`} alt={shader.name} fill className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        
        {/* NEW: Replaced GIF Image tag with HTML5 Video tag */}
        {isHovered && (
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="object-cover absolute inset-0 z-20 scale-105 animate-in fade-in duration-300"
          >
            {/* Only request the blazing fast WebM */}
            <source src={`https://res.cloudinary.com/dqpwlqgck/video/upload/v1/frags/videos/${shader.id}.webm`} type="video/webm" />
          </video>
        )}
        
        {/* Floating Action Menu (Appears on Hover) */}
        <div className="absolute bottom-4 inset-x-0 z-40 flex justify-center opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
          <div className="flex items-center gap-1 bg-zinc-950/80 backdrop-blur-md border border-zinc-700/50 p-1.5 rounded-full shadow-lg pointer-events-auto">
            
            {/* 1. Eye Icon: Toggles Live Preview Background */}
            <button 
              onClick={(e) => { e.stopPropagation(); onSetBg(shader.id); }}
              className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors tooltip-trigger ${isActive ? 'bg-white text-black hover:bg-zinc-200' : 'bg-transparent hover:bg-white/10 text-zinc-300 hover:text-white'}`}
              title={isActive ? "Remove Live Background" : "Live Preview"}
            >
              {isActive ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
            
            <div className="w-[1px] h-4 bg-zinc-700/50 mx-1" />
            
            {/* 2. Wrench Icon: Direct to Workspace */}
            <Link 
              href={`/${shader.id}`}
              onClick={(e) => { e.stopPropagation(); }} 
              className="flex items-center justify-center w-9 h-9 rounded-full bg-transparent hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
              title="Make it yours!"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>
              </svg>
            </Link>
          </div>
        </div>

        <div className="absolute inset-0 z-30 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-0 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* BOTTOM HALF (TEXT): Click to open Quick Look Modal */}
      <div 
        onClick={onSelect}
        role="button"
        tabIndex={0}
        title="Open Quick Look"
        className="p-5 relative z-40 cursor-pointer hover:bg-zinc-800/30 transition-colors"
      >
        <h3 className="text-lg font-bold text-zinc-100 font-space tracking-tight">{shader.name}</h3>
        <p className="text-sm text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
          {shader.desc}
        </p>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function Home() {
  const [previewShader, setPreviewShader] = useState<any | null>(null);
  const [activeBg, setActiveBg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("All");

  const activeShaderData = activeBg ? COMPONENT_MAP[activeBg] : null;
  const ActiveBackgroundComponent = activeShaderData?.Component;
  const activeProps = activeShaderData?.props || {};

  useEffect(() => {
    document.body.style.overflow = previewShader ? "hidden" : "auto";
  }, [previewShader]);

  const handleToggleBg = (id: string) => {
    if (activeBg === id) {
      setActiveBg(null);
    } else {
      setActiveBg(id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const filteredShaders = activeTab === "All" 
    ? SHADERS 
    : SHADERS.filter(s => s.category === activeTab);

  return (
    <div className={` font-inter min-h-screen text-zinc-50 selection:bg-white/20 ${activeBg ? 'bg-transparent' : 'bg-[#050505]'}`}>
      
      {/* BACKGROUND LAYER */}
      {ActiveBackgroundComponent && (
        <div className="fixed inset-0 z-[-1] animate-in fade-in duration-1000">
          <ActiveBackgroundComponent {...activeProps} globalEvents={true} />
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-16 md:pt-48 md:pb-24 px-6 flex flex-col items-center text-center overflow-hidden">
        {!activeBg && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/5 blur-[120px] rounded-full pointer-events-none" />}
        
        <h1 className="font-space text-5xl md:text-7xl font-bold tracking-tighter mb-6 pb-4 max-w-4xl bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-transparent drop-shadow-lg">
          Frags, Beyond flat design.
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed drop-shadow-md">
          Elevate your application with tactile Fragment Shaders.
          <br/>Just copy, paste, and ship pure aesthetic.
        </p>

        {/* Action Row */}
        <div className="flex flex-col sm:flex-row items-center gap-4 z-10">
          {activeBg ? (
            <button onClick={() => setActiveBg(null)} className="px-8 py-3 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)]">
              Clear Background
            </button>
          ) : (
            <a href="#collection" className="px-8 py-3 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)]">
              Browse Components
            </a>
          )}
        </div>

        {/* Subtle Dependency Note */}
        <div className="mt-8 text-sm text-zinc-500 z-10">
          Requires exactly one lightweight dependency: <code className="bg-zinc-800/60 text-zinc-400 px-1.5 py-0.5 rounded font-mono text-xs">npm i ogl</code>
        </div>
      </section>

      {/* TABS & GRID SECTION */}
      <section id="collection" className="max-w-7xl mx-auto px-6 pb-32">
        
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === category 
                  ? "bg-white text-black shadow-lg" 
                  : "bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500" key={activeTab}>
          {filteredShaders.map((shader) => (
            <ShaderCard 
              key={shader.id} 
              shader={shader}
              isActive={activeBg === shader.id} 
              onSelect={() => setPreviewShader(shader)} 
              onSetBg={handleToggleBg}
            />
          ))}
        </div>
        
        {filteredShaders.length === 0 && (
          <div className="text-center py-20 text-zinc-500">No shaders found in this category.</div>
        )}
      </section>

      {/* QUICK LOOK MODAL */}
      {previewShader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewShader(null)} />
          <div className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="absolute top-0 inset-x-0 z-50 flex justify-between items-center p-4 bg-gradient-to-b from-zinc-950/90 to-transparent">
              <div>
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">{previewShader.category}</span>
                <h2 className="text-2xl font-bold text-white font-space tracking-tight">{previewShader.name}</h2>
              </div>
              <button onClick={() => setPreviewShader(null)} className="p-2 bg-black/50 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white backdrop-blur-md transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="relative w-full h-[50vh] sm:h-[65vh] bg-black">
              {/* NEW: Replaced GIF Image tag with HTML5 Video tag in the Modal */}
              <video 
                autoPlay 
                loop 
                muted 
                playsInline
                className="object-cover w-full h-full"
              >
                <source src={`/frags-videos/${previewShader.id}.webm`} type="video/webm" />
                <source src={`/frags-videos/${previewShader.id}.mp4`} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-90" />
            </div>

            <div className="relative z-50 bg-zinc-950 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-t border-zinc-800/50">
              <p className="text-zinc-300 max-w-xl leading-relaxed">
                {previewShader.desc}
              </p>
              <Link href={`/${previewShader.id}`} className="shrink-0 px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-transform active:scale-95 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wrench-icon lucide-wrench"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/></svg>
                Make it yours!
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}