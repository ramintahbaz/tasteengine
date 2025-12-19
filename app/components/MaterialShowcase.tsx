"use client";

import type { MaterialSpec } from "@/app/types/taste";

type Props = {
  material: MaterialSpec;
};

export function MaterialShowcase({ material }: Props) {
  // Compute visual styles from numeric values
  const bgAlpha = 1 - material.translucency * 0.5; // More translucency = more transparent
  const backdropBlur = material.blur * 20; // 0-20px blur
  const borderRadius = 8 + material.softness * 8; // 8-16px radius
  const shadowBlur = material.elevation * 24; // 0-24px shadow blur
  const shadowY = material.elevation * 8; // 0-8px shadow offset
  const shadowOpacity = material.elevation * 0.3; // 0-0.3 opacity
  const borderWidth = material.edgeHighlight > 0.3 ? 1 : 0;
  const borderColor = `rgba(255, 255, 255, ${material.edgeHighlight * 0.5})`;
  
  // Gloss effect (gradient overlay)
  const glossGradient = material.gloss > 0.3
    ? `linear-gradient(135deg, rgba(255,255,255,${material.gloss * 0.3}) 0%, transparent 50%)`
    : "none";
  
  // Texture (noise/grain via background-image)
  const textureOpacity = material.texture * 0.1;
  
  const tileStyle: React.CSSProperties = {
    backgroundColor: `rgba(255, 255, 255, ${bgAlpha})`,
    backdropFilter: backdropBlur > 0 ? `blur(${backdropBlur}px)` : "none",
    borderRadius: `${borderRadius}px`,
    boxShadow: material.elevation > 0
      ? `0 ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, ${shadowOpacity})`
      : "none",
    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <div className="border border-zinc-800 rounded-xl p-4 space-y-4 bg-zinc-950">
      <h2 className="text-sm font-medium">Material Properties</h2>
      
      {/* Visual Tile */}
      <div className="flex justify-center">
        <div
          style={tileStyle}
          className="w-48 h-32 flex items-center justify-center"
        >
          {/* Gloss overlay */}
          {material.gloss > 0.3 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: glossGradient,
                pointerEvents: "none",
              }}
            />
          )}
          
          {/* Texture overlay */}
          {material.texture > 0.3 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='${textureOpacity}'/%3E%3C/svg%3E")`,
                opacity: textureOpacity,
                pointerEvents: "none",
              }}
            />
          )}
          
          <span className="text-xs text-zinc-700 font-medium">Material Preview</span>
        </div>
      </div>
      
      {/* Numeric Values Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <MaterialProperty label="Translucency" value={material.translucency} />
        <MaterialProperty label="Blur" value={material.blur} />
        <MaterialProperty label="Gloss" value={material.gloss} />
        <MaterialProperty label="Texture" value={material.texture} />
        <MaterialProperty label="Softness" value={material.softness} />
        <MaterialProperty label="Elevation" value={material.elevation} />
        <MaterialProperty label="Contrast" value={material.contrast} />
        <MaterialProperty label="Edge Highlight" value={material.edgeHighlight} />
      </div>
    </div>
  );
}

function MaterialProperty({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-[10px] font-medium text-zinc-300">
          {percentage}%
        </span>
      </div>
      <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
        <div
          className="h-full bg-zinc-100 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}



