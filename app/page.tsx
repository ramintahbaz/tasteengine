"use client";

import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import type {
  TasteFingerprint,
  TasteConfidence,
  ClarifyingQuestion,
} from "@/app/types/taste";
import { TasteSummary } from "@/app/components/TasteSummary";
import { SampleUI } from "@/app/components/SampleUI";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
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

  // Load Google Fonts dynamically when fingerprint changes
  useEffect(() => {
    // Remove all previously added font links
    const existingFontLinks = document.querySelectorAll('link[data-taste-font]');
    existingFontLinks.forEach(link => link.remove());

    if (fingerprint?.typography.fontUrl) {
      // Check if link already exists (by href, not just any link)
      const existingLink = document.querySelector(`link[href="${fingerprint.typography.fontUrl}"]`);
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = fingerprint.typography.fontUrl;
        link.setAttribute("data-taste-font", "true"); // Mark it so we can remove it later
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const selected = Array.from(event.target.files);
    setFiles(selected);
    generatePreviews(selected);
  };

  const generatePreviews = (fileList: File[]) => {
    const previewUrls: string[] = [];
    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          previewUrls.push(e.target.result as string);
          if (previewUrls.length === fileList.length) {
            setPreviews(previewUrls);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith("image/")
    );
    
    if (droppedFiles.length > 0) {
      setFiles(droppedFiles);
      generatePreviews(droppedFiles);
    }
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
    // Clear ALL previous results completely
    setFingerprint(null);
    setConfidence(null);
    setClarifyingQuestions([]);
    setQuestionAnswers({});
    setAnswersSubmitted(false);
    setSelectedImageIndex(null); // Close any open image modal
    setStyleTextUsedInExtraction(""); // Clear previous style text used
    
    // Remove all previously loaded fonts immediately
    const existingFontLinks = document.querySelectorAll('link[data-taste-font]');
    existingFontLinks.forEach(link => link.remove());
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));
      if (styleText.trim()) {
        formData.append("styleText", styleText.trim());
        console.log("📝 Sending styleText to API:", styleText.trim());
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
      
      // Track the styleText that was used for this extraction
      setStyleTextUsedInExtraction(styleText.trim());
      
      // Note: Material spec is now part of the fingerprint, no separate Claude call needed
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">
            Taste Engine Mini
          </h1>
          <p className="text-sm text-zinc-400 max-w-xl">
            Drop a few screenshots or moodboard images. I’ll extract a taste fingerprint and show it as JSON + a visual breakdown,
            then apply it to a sample UI.
          </p>
        </header>

        <section className="space-y-4">
          {/* Upload area with drag and drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-8 transition-colors
              ${isDragging 
                ? "border-zinc-400 bg-zinc-900/80" 
                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
              }
            `}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <svg
                className="w-12 h-12 text-zinc-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-sm text-zinc-400 mb-2">
                Drag and drop images here, or{" "}
                <span className="text-zinc-300 underline">click to browse</span>
              </p>
              <p className="text-xs text-zinc-500">
                Supports multiple images
              </p>
            </label>
          </div>

          {/* Thumbnail previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {previews.map((preview, index) => (
                <div
                  key={index}
                  className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer"
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newFiles = files.filter((_, i) => i !== index);
                      const newPreviews = previews.filter((_, i) => i !== index);
                      setFiles(newFiles);
                      setPreviews(newPreviews);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs z-10"
                  >
                    ×
                  </button>
                  <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate">
                    {files[index]?.name}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Image modal */}
          {selectedImageIndex !== null && (
            <div
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedImageIndex(null)}
            >
              <div className="relative max-w-7xl max-h-full">
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
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 text-white text-sm px-4 py-2 rounded-lg">
                  {files[selectedImageIndex]?.name}
                </div>
              </div>
            </div>
          )}

          {/* Style Text Input */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">
              Style description (optional)
            </label>
            <input
              type="text"
              value={styleText}
              onChange={(e) => setStyleText(e.target.value)}
              placeholder="e.g., glass-like, matte finish, soft shadows, 3D depth..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
            <p className="text-[10px] text-zinc-500">
              Describe the material style you want (affects translucency, blur, gloss, texture, shadows, etc.)
            </p>
          </div>

          {/* Extract button */}
          <button
            onClick={handleSubmit}
            disabled={loading || files.length === 0}
            className="w-full px-4 py-2 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
          >
            {loading ? "Extracting..." : "Extract taste"}
          </button>

          {error && (
            <p className="text-xs text-red-400">
              {error}
            </p>
          )}
        </section>

        {/* Sample UI preview */}
        {fingerprint && (
          <section>
            <SampleUI title="Preview" fingerprint={fingerprint} styleTextUsed={styleTextUsedInExtraction} />
          </section>
        )}

        {/* JSON + Visual breakdown */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950">
            <h2 className="text-sm font-medium mb-2">
              Taste fingerprint (JSON)
            </h2>
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-all max-h-80 overflow-auto">
              {fingerprint
                ? JSON.stringify(fingerprint, null, 2)
                : "Run an extraction to see your taste fingerprint."}
            </pre>
          </div>

          {fingerprint && <TasteSummary fingerprint={fingerprint} />}
        </section>

        {clarifyingQuestions.length > 0 && (
          <section className="border border-zinc-800 rounded-xl p-4 bg-zinc-950 space-y-3">
            <h2 className="text-sm font-medium">Clarifying questions</h2>
            <p className="text-xs text-zinc-400">
              The engine sees some mixed signals in your images and wants your input. Answering these could refine the taste mapping in a next version.
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
                
                // Refine the fingerprint based on answers
                const refinedFingerprint = refineFingerprintFromAnswers(
                  fingerprint,
                  questionAnswers,
                  clarifyingQuestions
                );
                setFingerprint(refinedFingerprint);
                
                console.log("Submitted answers:", questionAnswers);
                console.log("Refined fingerprint:", refinedFingerprint);
                setAnswersSubmitted(true);
                setError(null);
                
                // Clear answers after a delay
                setTimeout(() => {
                  setQuestionAnswers({});
                  setAnswersSubmitted(false);
                }, 3000);
              }}
              disabled={answersSubmitted || !fingerprint}
              className="px-4 py-2 text-xs font-medium bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </main>
  );
}