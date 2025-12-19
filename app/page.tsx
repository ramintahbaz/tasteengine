"use client";

import { useState, useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import type {
  TasteFingerprint,
  TasteConfidence,
  ClarifyingQuestion,
} from "@/app/types/taste";
import { TasteSummary } from "@/app/components/TasteSummary";
import { MaterialControlTile } from "@/app/components/MaterialControlTile";
// React Icons imports
import { FiCheck as FeatherCheck, FiCamera, FiImage } from "react-icons/fi";
import { MdCheckCircle as MaterialCheck, MdCheckCircleOutline as MaterialOutlinedCheck } from "react-icons/md";
import { FaCheckCircle as FaCheck } from "react-icons/fa";
import { MdCheckCircle as MaterialSharpCheck } from "react-icons/md";
import { HiCheck as HeroCheck } from "react-icons/hi";

// Dynamic import for heic2any (browser-only)
const loadHeic2Any = async () => {
  if (typeof window === 'undefined') return null;
  try {
    const module = await import('heic2any');
    return module.default || module;
  } catch (error) {
    console.error('Failed to load heic2any:', error);
    return null;
  }
};

type ViewMode = "landing" | "upload" | "results";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("landing");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [fingerprint, setFingerprint] = useState<TasteFingerprint | null>(null);
  const [confidence, setConfidence] = useState<TasteConfidence | null>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({});
  const [answersSubmitted, setAnswersSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [styleText, setStyleText] = useState<string>("");
  const [styleTextUsedInExtraction, setStyleTextUsedInExtraction] = useState<string>("");
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Load Google Fonts dynamically when fingerprint changes
  useEffect(() => {
    const existingFontLinks = document.querySelectorAll('link[data-taste-font]');
    existingFontLinks.forEach(link => link.remove());

    if (fingerprint?.typography.fontUrl) {
      const existingLink = document.querySelector(`link[href="${fingerprint.typography.fontUrl}"]`);
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = fingerprint.typography.fontUrl;
        link.setAttribute("data-taste-font", "true");
        document.head.appendChild(link);
      }
    }
  }, [fingerprint]);

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedImageIndex !== null) {
        setSelectedImageIndex(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedImageIndex]);

  // Check if file is HEIC
  const isHeicFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type?.toLowerCase() || "";
    return (
      fileName.endsWith('.heic') ||
      fileName.endsWith('.heif') ||
      fileType === 'image/heic' ||
      fileType === 'image/heif'
    );
  };

  // Convert HEIC file to JPEG using heic2any
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    const heic2any = await loadHeic2Any();
    
    if (!heic2any) {
      throw new Error('HEIC conversion library not available. Please refresh the page or use a different browser.');
    }

    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.95,
      });

      // heic2any returns an array, get the first item
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      
      // Create a new File object from the blob
      const jpegFile = new File(
        [blob],
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        { type: 'image/jpeg' }
      );
      
      return jpegFile;
    } catch (error) {
      throw new Error(`Failed to convert HEIC file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const selected = Array.from(event.target.files);
    
    setLoading(true);
    setError(null);
    
    try {
      // Convert HEIC files to JPEG
      const convertedFiles: File[] = [];
      for (const file of selected) {
        if (isHeicFile(file)) {
          try {
            const jpegFile = await convertHeicToJpeg(file);
            convertedFiles.push(jpegFile);
          } catch (error) {
            setError(`Failed to convert ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setLoading(false);
            return;
          }
        } else {
          convertedFiles.push(file);
        }
      }
      
      setFiles(convertedFiles);
      generatePreviews(convertedFiles);
      setViewMode("upload");
    } catch (error) {
      setError(`Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const generatePreviews = (fileList: File[]) => {
    const previewUrls: string[] = new Array(fileList.length);
    let loadedCount = 0;
    
    fileList.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          previewUrls[index] = e.target.result as string;
          loadedCount++;
          if (loadedCount === fileList.length) {
            setPreviews(previewUrls);
          }
        }
      };
      reader.onerror = () => {
        console.error(`Failed to load preview for file ${index}`);
        loadedCount++;
        if (loadedCount === fileList.length) {
          setPreviews(previewUrls.filter(Boolean));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const refineFingerprintFromAnswers = (
    currentFingerprint: TasteFingerprint,
    answers: Record<number, string>,
    questions: ClarifyingQuestion[]
  ): TasteFingerprint => {
    const updated = { ...currentFingerprint };

    questions.forEach((question, idx) => {
      const answer = answers[idx]?.toLowerCase().trim();
      if (!answer) return;

      switch (question.field) {
        case "radius":
          if (answer.includes("sharp") || answer.includes("boxy") || answer.includes("angular")) {
            updated.radius = "sharp";
          } else if (answer.includes("rounded") || answer.includes("soft") || answer.includes("curved")) {
            updated.radius = updated.radius === "sharp" ? "subtle" : updated.radius === "subtle" ? "rounded" : "pill";
          } else if (answer.includes("pill") || answer.includes("very soft")) {
            updated.radius = "pill";
          }
          break;

        case "spacing":
          if (answer.includes("tight") || answer.includes("compact") || answer.includes("dense")) {
            updated.spacing = "tight";
          } else if (answer.includes("airy") || answer.includes("spacious") || answer.includes("roomy")) {
            updated.spacing = "airy";
          } else if (answer.includes("medium") || answer.includes("moderate")) {
            updated.spacing = "medium";
          }
          break;

        case "typography":
          if (answer.includes("serif") || answer.includes("classic") || answer.includes("elegant")) {
            updated.typography.category = "serif";
          } else if (answer.includes("sans") || answer.includes("modern") || answer.includes("clean")) {
            updated.typography.category = "sans-serif";
          } else if (answer.includes("mono") || answer.includes("code") || answer.includes("tech")) {
            updated.typography.category = "mono";
          }
          if (answer.includes("bold") || answer.includes("heavy")) {
            updated.typography.weight = "bold";
          } else if (answer.includes("light") || answer.includes("thin")) {
            updated.typography.weight = "light";
          } else if (answer.includes("medium")) {
            updated.typography.weight = "medium";
          }
          break;

        case "palette":
          if (answer.includes("high") || answer.includes("strong") || answer.includes("bold")) {
            updated.palette.contrast = "high";
          } else if (answer.includes("low") || answer.includes("subtle") || answer.includes("soft")) {
            updated.palette.contrast = "low";
          } else if (answer.includes("medium")) {
            updated.palette.contrast = "medium";
          }
          break;
      }
    });

    return updated;
  };

  const handleSubmit = async () => {
    setError(null);
    if (files.length === 0) {
      setError("Upload at least one image.");
      return;
    }
    setLoading(true);
    setFingerprint(null);
    setConfidence(null);
    setClarifyingQuestions([]);
    setQuestionAnswers({});
    setAnswersSubmitted(false);
    setSelectedImageIndex(null);
    setStyleTextUsedInExtraction("");
    
    const existingFontLinks = document.querySelectorAll('link[data-taste-font]');
    existingFontLinks.forEach(link => link.remove());
    
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));
      if (styleText.trim()) {
        formData.append("styleText", styleText.trim());
      }

      const res = await fetch("/api/taste", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to extract taste.");
      }

      const data = await res.json();
      setFingerprint(data.fingerprint);
      setConfidence(data.confidence || null);
      setClarifyingQuestions(data.clarifyingQuestions || []);
      setStyleTextUsedInExtraction(styleText.trim());
      setViewMode("results");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setViewMode("landing");
    setFiles([]);
    setPreviews([]);
    setFingerprint(null);
    setConfidence(null);
    setClarifyingQuestions([]);
    setQuestionAnswers({});
    setAnswersSubmitted(false);
    setSelectedImageIndex(null);
    setStyleText("");
    setStyleTextUsedInExtraction("");
    setError(null);
  };

  // Landing page view
  if (viewMode === "landing") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md space-y-8">
          <header className="text-center space-y-3">
            <h1 className="text-3xl font-semibold">
              Taste Engine
            </h1>
            <p className="text-sm text-zinc-400">
              Upload images to extract your design taste fingerprint
            </p>
          </header>

          {/* Upload pad */}
          <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-12 bg-zinc-900/50 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
              <FiImage className="w-10 h-10 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-400 mb-8 text-center">
              Choose how you'd like to add images
            </p>

            {/* Camera and Gallery buttons */}
            <div className="w-full space-y-3">
              <button
                onClick={handleCameraClick}
                className="w-full px-6 py-4 rounded-xl bg-zinc-100 text-zinc-900 font-medium flex items-center justify-center gap-3 hover:bg-zinc-200 transition-colors active:scale-95"
              >
                <FiCamera className="w-5 h-5" />
                <span>Use Camera</span>
              </button>
              
              <button
                onClick={handleGalleryClick}
                className="w-full px-6 py-4 rounded-xl bg-zinc-800 text-zinc-100 font-medium flex items-center justify-center gap-3 hover:bg-zinc-700 transition-colors active:scale-95 border border-zinc-700"
              >
                <FiImage className="w-5 h-5" />
                <span>Choose from Gallery</span>
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*,.heic,.heif,image/heic,image/heif"
              capture="environment"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,.heic,.heif,image/heic,image/heif"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </main>
    );
  }

  // Upload/Preview view
  if (viewMode === "upload") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col py-6 px-4">
        <div className="w-full max-w-md mx-auto space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Taste Engine</h1>
            <button
              onClick={handleReset}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              Reset
            </button>
          </header>

          {/* Image previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {previews.map((preview, index) => (
                <div
                  key={index}
                  className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer aspect-square"
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newFiles = files.filter((_, i) => i !== index);
                      const newPreviews = previews.filter((_, i) => i !== index);
                      setFiles(newFiles);
                      setPreviews(newPreviews);
                      if (newFiles.length === 0) {
                        setViewMode("landing");
                      }
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500/90 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-sm z-10"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add more images */}
          <div className="space-y-3">
            <button
              onClick={handleGalleryClick}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              Add More Images
            </button>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,.heic,.heif,image/heic,image/heif"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Style Text Input */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">
              Style description (optional)
            </label>
            <input
              type="text"
              value={styleText}
              onChange={(e) => setStyleText(e.target.value)}
              placeholder="e.g., glass-like, matte finish, soft shadows..."
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Extract button */}
          <button
            onClick={handleSubmit}
            disabled={loading || files.length === 0}
            className="w-full px-4 py-4 rounded-xl bg-zinc-100 text-zinc-900 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors active:scale-95"
          >
            {loading ? "Extracting..." : "Extract Taste"}
          </button>

          {error && (
            <p className="text-sm text-red-400 text-center">
              {error}
            </p>
          )}

          {/* Image modal */}
          {selectedImageIndex !== null && (
            <div
              className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedImageIndex(null)}
            >
              <div className="relative max-w-full max-h-full">
                <img
                  src={previews[selectedImageIndex]}
                  alt={`Preview ${selectedImageIndex + 1}`}
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => setSelectedImageIndex(null)}
                  className="absolute top-4 right-4 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full flex items-center justify-center transition-colors text-xl"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Results view
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col py-6 px-4">
      <div className="w-full max-w-md mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Results</h1>
          <button
            onClick={handleReset}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            New Analysis
          </button>
        </header>

        {/* Source Images */}
        {(previews.length > 0 || files.length > 0) && (
          <section className="border border-zinc-800 rounded-xl p-4 bg-zinc-950">
            <h2 className="text-sm font-medium mb-3">Source Images</h2>
            {previews.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {previews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer aspect-square"
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img
                        src={preview}
                        alt={`Source ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error(`Failed to load preview image ${index}`);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-400 mt-3">
                  Tap an image to view full size
                </p>
              </>
            ) : (
              <div className="text-sm text-zinc-400">
                {files.length} image{files.length !== 1 ? 's' : ''} uploaded
              </div>
            )}
          </section>
        )}

        {/* Sample UI preview */}
        {fingerprint && (
          <section>
            <SampleUI title="Preview" fingerprint={fingerprint} styleTextUsed={styleTextUsedInExtraction} />
          </section>
        )}

        {/* JSON + Visual breakdown */}
        <section className="space-y-4">
          <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950">
            <h2 className="text-sm font-medium mb-2">
              Taste fingerprint (JSON)
            </h2>
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-all max-h-60 overflow-auto">
              {fingerprint
                ? JSON.stringify(fingerprint, null, 2)
                : "No fingerprint available."}
            </pre>
          </div>

          {fingerprint && <TasteSummary fingerprint={fingerprint} />}
        </section>

        {clarifyingQuestions.length > 0 && (
          <section className="border border-zinc-800 rounded-xl p-4 bg-zinc-950 space-y-3">
            <h2 className="text-sm font-medium">Clarifying questions</h2>
            <p className="text-xs text-zinc-400">
              Answer these to refine the taste mapping.
            </p>
            <ul className="space-y-4">
              {clarifyingQuestions.map((q, idx) => (
                <li key={idx} className="space-y-2">
                  <div className="text-xs text-zinc-200">
                    <span className="text-[10px] uppercase text-zinc-500 mr-2">
                      {q.field}
                    </span>
                    {q.question}
                  </div>
                  <input
                    type="text"
                    value={questionAnswers[idx] || ""}
                    onChange={(e) => setQuestionAnswers({ ...questionAnswers, [idx]: e.target.value })}
                    placeholder="Your answer..."
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                const hasAnswers = Object.values(questionAnswers).some(answer => answer.trim().length > 0);
                if (!hasAnswers) {
                  setError("Please provide at least one answer before submitting.");
                  return;
                }
                if (!fingerprint) {
                  setError("No fingerprint to refine. Please extract taste first.");
                  return;
                }
                
                const refinedFingerprint = refineFingerprintFromAnswers(
                  fingerprint,
                  questionAnswers,
                  clarifyingQuestions
                );
                setFingerprint(refinedFingerprint);
                
                setAnswersSubmitted(true);
                setError(null);
                
                setTimeout(() => {
                  setQuestionAnswers({});
                  setAnswersSubmitted(false);
                }, 3000);
              }}
              disabled={answersSubmitted || !fingerprint}
              className="w-full px-4 py-3 text-sm font-medium bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {answersSubmitted ? "Answers applied!" : "Apply answers to fingerprint"}
            </button>
            {answersSubmitted && (
              <p className="text-xs text-green-400">
                ✓ Your answers have been recorded. Thank you for the feedback!
              </p>
            )}
          </section>
        )}

        {/* Image modal */}
        {selectedImageIndex !== null && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImageIndex(null)}
          >
            <div className="relative max-w-full max-h-full">
              <img
                src={previews[selectedImageIndex]}
                alt={`Source ${selectedImageIndex + 1}`}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setSelectedImageIndex(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full flex items-center justify-center transition-colors text-xl"
              >
                ×
              </button>
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 text-white text-sm px-4 py-2 rounded-lg">
                {files[selectedImageIndex]?.name || `Image ${selectedImageIndex + 1}`}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

type SampleProps = {
  title: string;
  fingerprint: TasteFingerprint | null;
  styleTextUsed?: string;
};

function doesMaterialStyleMatchStyleText(materialStyle: string, styleText: string): boolean {
  const style = materialStyle.toLowerCase();
  const text = styleText.toLowerCase();
  
  const keywords: Record<string, string[]> = {
    "skeuo": ["skeuo", "skeuomorphic", "skeuomorphism", "3d", "depth", "bevel", "realistic"],
    "neuo": ["neuo", "neumorphic", "neumorphism", "soft", "extruded", "embossed"],
    "glass": ["glass", "glassmorphic", "glassmorphism", "translucent", "frosted", "blur"],
    "solid": ["solid", "hardware", "crisp", "bold", "defined"],
    "flat": ["flat", "minimal", "simple", "clean"]
  };
  
  for (const [key, terms] of Object.entries(keywords)) {
    if (style.includes(key)) {
      return terms.some(term => text.includes(term));
    }
  }
  
  return true;
}

function getLuminance(hex: string): number {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function getContrastColor(hex: string): string {
  const luminance = getLuminance(hex);
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function getIconComponent(library: string) {
  switch (library) {
    case "feather":
      return FeatherCheck;
    case "material":
      return MaterialCheck;
    case "material-outlined":
      return MaterialOutlinedCheck;
    case "fa":
      return FaCheck;
    case "material-sharp":
      return MaterialSharpCheck;
    case "heroicons":
    default:
      return HeroCheck;
  }
}

function SampleUI({ title, fingerprint, styleTextUsed = "" }: SampleProps) {
  const bg = fingerprint?.palette.neutral[0] || "#111827";
  let primary = fingerprint?.palette.primary?.[0];
  
  if (primary === "#2563EB") {
    primary = undefined;
  }
  
  if (!primary) {
    if (fingerprint?.palette.accent && fingerprint.palette.accent.length > 0) {
      primary = fingerprint.palette.accent[0];
    } else {
      const bgLuminance = getLuminance(bg);
      primary = bgLuminance > 0.5 ? "#000000" : "#FFFFFF";
    }
  }
  
  if (primary === bg) {
    if (fingerprint?.palette.accent && fingerprint.palette.accent.length > 0) {
      primary = fingerprint.palette.accent[0];
    } else {
      const bgLuminance = getLuminance(bg);
      primary = bgLuminance > 0.5 ? "#000000" : "#FFFFFF";
    }
  }
  
  const accent = fingerprint?.palette.accent[0] || null;

  const radiusClass =
    fingerprint?.radius === "sharp"
      ? "rounded-none"
      : fingerprint?.radius === "subtle"
      ? "rounded-md"
      : fingerprint?.radius === "rounded"
      ? "rounded-xl"
      : fingerprint?.radius === "pill"
      ? "rounded-full"
      : "rounded-lg";

  return (
    <div className="border border-zinc-800 rounded-xl p-4 space-y-4 bg-zinc-950">
      <h2 className="text-sm font-medium">{title}</h2>
      
      <div className="flex justify-center gap-4 flex-wrap">
        <div
          className="rounded-lg bg-white"
          style={{ 
            width: "100%",
            maxWidth: "280px",
            padding: "0",
            backgroundColor: fingerprint ? bg : "#FFFFFF",
            borderRadius: fingerprint?.radius === "sharp" ? "0" :
                         fingerprint?.radius === "subtle" ? "6px" :
                         fingerprint?.radius === "rounded" ? "12px" :
                         fingerprint?.radius === "pill" ? "9999px" : "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
          }}
        >
          <div className="flex items-start" style={{ padding: "20px" }}>
            {fingerprint && accent && accent.length > 0 ? (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: accent[0] }}
              >
                {(() => {
                  const IconComponent = getIconComponent(fingerprint.iconography.library);
                  const iconColor = getContrastColor(accent[0]);
                  const strokeWidth = fingerprint.iconography.weight === "thin" ? 1.5 : 
                                     fingerprint.iconography.weight === "bold" ? 3 : 2;
                  return (
                    <IconComponent 
                      size={20} 
                      color={iconColor}
                      strokeWidth={strokeWidth}
                      style={{ 
                        strokeWidth: fingerprint.iconography.style === "filled" ? 0 : strokeWidth,
                        fill: fingerprint.iconography.style === "filled" ? iconColor : "none"
                      }}
                    />
                  );
                })()}
              </div>
            ) : (
              <div 
                className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"
              >
                {(() => {
                  const IconComponent = fingerprint ? getIconComponent(fingerprint.iconography.library) : HeroCheck;
                  const iconColor = getContrastColor("#10B981");
                  const strokeWidth = fingerprint?.iconography.weight === "thin" ? 1.5 : 
                                     fingerprint?.iconography.weight === "bold" ? 3 : 2;
                  return (
                    <IconComponent 
                      size={20} 
                      color={iconColor}
                      strokeWidth={strokeWidth}
                      style={{ 
                        strokeWidth: fingerprint?.iconography.style === "filled" ? 0 : strokeWidth,
                        fill: fingerprint?.iconography.style === "filled" ? iconColor : "none"
                      }}
                    />
                  );
                })()}
              </div>
            )}
            
            <div className="flex-1 min-w-0" style={{ paddingLeft: "12px" }}>
              <h1
                className="font-bold mb-2"
                style={{
                  fontSize: "20px",
                  color: fingerprint ? getContrastColor(bg) : "#000000",
                  fontFamily: fingerprint?.typography.fontFamily 
                    ? `"${fingerprint.typography.fontFamily}", ${fingerprint.typography.category === "serif" ? "serif" : fingerprint.typography.category === "mono" ? "monospace" : "sans-serif"}`
                    : undefined
                }}
              >
                This is a headline title
              </h1>
              
              <p
                className="leading-relaxed"
                style={{
                  fontSize: "14px",
                  color: fingerprint ? getContrastColor(bg) : "#000000",
                  fontFamily: fingerprint?.typography.fontFamily 
                    ? `"${fingerprint.typography.fontFamily}", ${fingerprint.typography.category === "serif" ? "serif" : fingerprint.typography.category === "mono" ? "monospace" : "sans-serif"}`
                    : undefined
                }}
              >
                This is body text
              </p>
            </div>
          </div>
        </div>
        
        {fingerprint && fingerprint.materialStyle && 
         fingerprint.materialStyle.toLowerCase() !== "flat" &&
         styleTextUsed.length > 0 && 
         doesMaterialStyleMatchStyleText(fingerprint.materialStyle, styleTextUsed) && (
          <MaterialControlTile 
            materialStyle={fingerprint.materialStyle} 
            intensity={fingerprint.materialIntensity ?? 0.7}
            palette={fingerprint.palette}
          />
        )}
      </div>
      
      {fingerprint && (
        <div className="mt-4" style={{ textAlign: "center" }}>
          <div
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 500,
              backgroundColor: primary,
              color: getContrastColor(primary),
              borderRadius: fingerprint.radius === "sharp" ? "0" :
                           fingerprint.radius === "subtle" ? "6px" :
                           fingerprint.radius === "rounded" ? "12px" :
                           fingerprint.radius === "pill" ? "9999px" : "8px",
              fontFamily: fingerprint.typography.fontFamily 
                ? `"${fingerprint.typography.fontFamily}", ${fingerprint.typography.category === "serif" ? "serif" : fingerprint.typography.category === "mono" ? "monospace" : "sans-serif"}`
                : undefined,
              border: "none",
              whiteSpace: "nowrap",
              display: "inline-block"
            }}
          >
            Primary action
          </div>
        </div>
      )}
    </div>
  );
}
