"use client";

import { useState, useRef } from "react";

type Props = {
  materialStyle: string;
  intensity: number; // 0-1
  palette: {
    primary: string[];
    accent: string[];
    neutral: string[];
  };
};

export function MaterialControlTile({ materialStyle, intensity, palette }: Props) {
  const [toggleOn, setToggleOn] = useState(false);
  const [sliderValue, setSliderValue] = useState(0.5);
  const [knobRotation, setKnobRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  
  const style = materialStyle.toLowerCase();
  const clampedIntensity = Math.max(0, Math.min(1, intensity));
  
  // Extract palette colors with fallbacks
  const primaryColor = palette.primary?.[0] || "#3B82F6";
  const accentColor = palette.accent?.[0] || palette.primary?.[0] || "#3B82F6";
  const neutralColor = palette.neutral?.[0] || "#6B7280";
  
  // Helper to calculate luminance for contrast
  const getLuminance = (hex: string): number => {
    const color = hex.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };
  
  // Get contrasting text color
  const getContrastColor = (hex: string): string => {
    return getLuminance(hex) > 0.5 ? '#000000' : '#FFFFFF';
  };
  
  const textColor = getLuminance(neutralColor) > 0.5 ? '#000000' : '#FFFFFF';
  const mutedTextColor = getLuminance(neutralColor) > 0.5 ? '#6B7280' : '#9CA3AF';
  
  // Base dimensions - larger
  const width = 280;
  const height = 200;
  const borderRadius = 12;
  
  // Compute styles based on material style
  let containerStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: `${borderRadius}px`,
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    padding: "20px",
    gap: "16px",
  };
  
  // Skeuomorphic
  if (style.includes("skeuo")) {
    const shadowBlur = 20 * clampedIntensity;
    const shadowY = 8 * clampedIntensity;
    const highlightOpacity = 0.3 * clampedIntensity;
    const insetShadow = `inset 0 2px 4px rgba(0, 0, 0, ${0.2 * clampedIntensity}), inset 0 -2px 4px rgba(255, 255, 255, ${0.3 * clampedIntensity})`;
    const outerShadow = `0 ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, ${0.3 * clampedIntensity}), 0 ${shadowY * 0.5}px ${shadowBlur * 0.5}px rgba(0, 0, 0, ${0.2 * clampedIntensity})`;
    
    containerStyle = {
      ...containerStyle,
      backgroundColor: "#E5E7EB",
      boxShadow: `${outerShadow}, ${insetShadow}`,
      border: `1px solid rgba(255, 255, 255, ${highlightOpacity})`,
    };
  }
  // Neumorphic
  else if (style.includes("neuo")) {
    const shadowDistance = 8 * clampedIntensity;
    const shadowBlur = 16 * clampedIntensity;
    const shadowOpacity = 0.2 * clampedIntensity;
    
    containerStyle = {
      ...containerStyle,
      backgroundColor: "#F3F4F6",
      boxShadow: `
        ${shadowDistance}px ${shadowDistance}px ${shadowBlur}px rgba(0, 0, 0, ${shadowOpacity}),
        -${shadowDistance}px -${shadowDistance}px ${shadowBlur}px rgba(255, 255, 255, 0.8)
      `,
    };
  }
  // Glass
  else if (style.includes("glass")) {
    const blur = 10 * clampedIntensity;
    const alpha = 0.3 + (0.4 * clampedIntensity);
    const borderAlpha = 0.2 + (0.3 * clampedIntensity);
    
    containerStyle = {
      ...containerStyle,
      backgroundColor: `rgba(255, 255, 255, ${alpha})`,
      backdropFilter: `blur(${blur}px)`,
      border: `1px solid rgba(255, 255, 255, ${borderAlpha})`,
      boxShadow: `0 8px 32px rgba(0, 0, 0, ${0.1 * clampedIntensity})`,
    };
  }
  // Solid
  else if (style.includes("solid")) {
    const shadowBlur = 16 * clampedIntensity;
    const shadowY = 6 * clampedIntensity;
    const borderWidth = 2 * clampedIntensity;
    
    containerStyle = {
      ...containerStyle,
      backgroundColor: "#FFFFFF",
      boxShadow: `0 ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, ${0.3 * clampedIntensity})`,
      border: `${borderWidth}px solid #E5E7EB`,
    };
  }
  // Flat (default)
  else {
    containerStyle = {
      ...containerStyle,
      backgroundColor: "#FFFFFF",
      boxShadow: `0 2px 4px rgba(0, 0, 0, ${0.1 * clampedIntensity})`,
      border: "1px solid #E5E7EB",
    };
  }
  
  // Toggle switch style - larger
  const toggleStyle: React.CSSProperties = {
    width: "52px",
    height: "28px",
    borderRadius: "14px",
    position: "relative",
    cursor: "pointer",
    transition: "all 0.2s",
  };
  
  // Slider track style - larger
  const sliderTrackStyle: React.CSSProperties = {
    width: "100%",
    height: "6px",
    borderRadius: "3px",
    position: "relative",
  };
  
  // Knob style - larger
  const knobSize = 40;
  const knobStyle: React.CSSProperties = {
    width: `${knobSize}px`,
    height: `${knobSize}px`,
    borderRadius: "50%",
    position: "relative",
  };
  
  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const color = hex.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  // Apply material-specific styles to controls using palette colors
  if (style.includes("skeuo")) {
    toggleStyle.backgroundColor = neutralColor;
    toggleStyle.boxShadow = `inset 0 2px 4px rgba(0, 0, 0, ${0.2 * clampedIntensity})`;
    sliderTrackStyle.backgroundColor = neutralColor;
    sliderTrackStyle.boxShadow = `inset 0 1px 2px rgba(0, 0, 0, ${0.2 * clampedIntensity})`;
    knobStyle.backgroundColor = accentColor;
    knobStyle.boxShadow = `0 4px 8px rgba(0, 0, 0, ${0.3 * clampedIntensity}), inset 0 1px 2px rgba(255, 255, 255, 0.3)`;
  } else if (style.includes("neuo")) {
    const shadowDist = 4 * clampedIntensity;
    toggleStyle.backgroundColor = neutralColor;
    toggleStyle.boxShadow = `${shadowDist}px ${shadowDist}px ${8 * clampedIntensity}px rgba(0, 0, 0, ${0.15 * clampedIntensity}), -${shadowDist}px -${shadowDist}px ${8 * clampedIntensity}px rgba(255, 255, 255, 0.8)`;
    sliderTrackStyle.backgroundColor = neutralColor;
    sliderTrackStyle.boxShadow = `${shadowDist}px ${shadowDist}px ${8 * clampedIntensity}px rgba(0, 0, 0, ${0.15 * clampedIntensity}), -${shadowDist}px -${shadowDist}px ${8 * clampedIntensity}px rgba(255, 255, 255, 0.8)`;
    knobStyle.backgroundColor = neutralColor;
    knobStyle.boxShadow = `${shadowDist}px ${shadowDist}px ${8 * clampedIntensity}px rgba(0, 0, 0, ${0.15 * clampedIntensity}), -${shadowDist}px -${shadowDist}px ${8 * clampedIntensity}px rgba(255, 255, 255, 0.8)`;
  } else if (style.includes("glass")) {
    toggleStyle.backgroundColor = hexToRgba(neutralColor, 0.3 * clampedIntensity);
    toggleStyle.backdropFilter = `blur(${4 * clampedIntensity}px)`;
    toggleStyle.border = `1px solid ${hexToRgba(neutralColor, 0.4 * clampedIntensity)}`;
    sliderTrackStyle.backgroundColor = hexToRgba(neutralColor, 0.3 * clampedIntensity);
    sliderTrackStyle.backdropFilter = `blur(${4 * clampedIntensity}px)`;
    knobStyle.backgroundColor = hexToRgba(accentColor, 0.5 * clampedIntensity);
    knobStyle.backdropFilter = `blur(${4 * clampedIntensity}px)`;
    knobStyle.border = `1px solid ${hexToRgba(accentColor, 0.6 * clampedIntensity)}`;
  } else if (style.includes("solid")) {
    toggleStyle.backgroundColor = neutralColor;
    toggleStyle.boxShadow = `0 2px 4px rgba(0, 0, 0, ${0.2 * clampedIntensity})`;
    toggleStyle.border = `2px solid ${accentColor}`;
    sliderTrackStyle.backgroundColor = neutralColor;
    knobStyle.backgroundColor = accentColor;
    knobStyle.boxShadow = `0 4px 8px rgba(0, 0, 0, ${0.3 * clampedIntensity})`;
    knobStyle.border = `2px solid ${primaryColor}`;
  } else {
    // Flat
    toggleStyle.backgroundColor = neutralColor;
    toggleStyle.border = `1px solid ${accentColor}`;
    sliderTrackStyle.backgroundColor = neutralColor;
    knobStyle.backgroundColor = accentColor;
  }
  
  // Handle toggle click
  const handleToggleClick = () => {
    setToggleOn(!toggleOn);
  };

  // Handle slider interaction
  const handleSliderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!sliderRef.current) return;
    
    setIsDragging(true);
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newValue = Math.max(0, Math.min(1, x / rect.width));
    setSliderValue(newValue);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const newValue = Math.max(0, Math.min(1, x / rect.width));
      setSliderValue(newValue);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Handle knob interaction
  const handleKnobMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startRotation = knobRotation;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Dragging right rotates clockwise (positive), left rotates counter-clockwise (negative)
      const newRotation = startRotation + deltaX * 2; // 2 degrees per pixel
      setKnobRotation(newRotation);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div style={containerStyle}>
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <div 
          style={{
            ...toggleStyle,
            backgroundColor: toggleOn ? accentColor : toggleStyle.backgroundColor,
          }}
          onClick={handleToggleClick}
          className="cursor-pointer"
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "50%",
              backgroundColor: "#FFFFFF",
              position: "absolute",
              top: "3px",
              left: toggleOn ? "27px" : "3px",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
              transition: "left 0.2s ease",
            }}
          />
        </div>
        <span style={{ fontSize: "12px", color: mutedTextColor, fontWeight: 500 }}>
          Toggle {toggleOn ? "ON" : "OFF"}
        </span>
      </div>
      
      {/* Slider */}
      <div className="flex flex-col gap-2">
        <div 
          ref={sliderRef}
          style={sliderTrackStyle}
          onMouseDown={handleSliderMouseDown}
          className="cursor-pointer"
        >
          <div
            style={{
              width: `${sliderValue * 100}%`,
              height: "100%",
              backgroundColor: accentColor,
              borderRadius: "2px",
              transition: isDragging ? "none" : "width 0.1s ease",
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: "10px", color: mutedTextColor }}>
            Slider
          </span>
          <span style={{ fontSize: "10px", color: mutedTextColor, fontWeight: 500 }}>
            {Math.round(sliderValue * 100)}%
          </span>
        </div>
      </div>
      
      {/* Knob */}
      <div className="flex items-center gap-3">
        <div 
          style={{
            ...knobStyle,
            transform: `rotate(${knobRotation}deg)`,
            cursor: "grab",
          }}
          onMouseDown={handleKnobMouseDown}
          className="active:cursor-grabbing"
        >
          {/* Knob indicator line */}
          <div
            style={{
              position: "absolute",
              top: "6px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "3px",
              height: "10px",
              backgroundColor: getContrastColor((knobStyle.backgroundColor as string) || accentColor),
              borderRadius: "1.5px",
            }}
          />
        </div>
        <div className="flex flex-col">
          <span style={{ fontSize: "12px", color: mutedTextColor, fontWeight: 500 }}>
            Knob
          </span>
          <span style={{ fontSize: "10px", color: mutedTextColor }}>
            {Math.round(knobRotation)}°
          </span>
        </div>
      </div>
    </div>
  );
}

