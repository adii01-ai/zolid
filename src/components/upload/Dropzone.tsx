"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { validateImageFile } from "@/lib/validation/image";

type DropzoneProps = {
  onFileChange?: (file: File | null) => void;
  compact?: boolean;
  examples?: { label: string; src: string }[];
  fileRequest?: { id: number; file: File } | null;
};

export default function Dropzone({
  onFileChange,
  compact = false,
  examples = [],
  fileRequest = null,
}: DropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [loadingExample, setLoadingExample] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const validationRun = useRef(0);

  useEffect(() => {
    if (fileRequest) void selectFile(fileRequest.file);
    // Request identity, not callback identity, controls external file selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileRequest]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  async function selectFile(file: File) {
    const run = ++validationRun.current;
    setSelectedFile(null);
    setError(null);
    setIsValidating(true);
    onFileChange?.(null);

    const result = await validateImageFile(file);
    if (run !== validationRun.current) return;

    setIsValidating(false);
    if (result.valid) {
      setSelectedFile(file);
      onFileChange?.(file);
    } else {
      setError(result.error);
    }
  }

  async function selectExample(example: { label: string; src: string }) {
    setLoadingExample(example.label);
    try {
      const response = await fetch(example.src);
      if (!response.ok) throw new Error("Could not load example image.");
      const blob = await response.blob();
      const filename = `${example.label.toLowerCase().replace(/\s+/g, "-")}.jpg`;
      await selectFile(new File([blob], filename, { type: blob.type }));
    } catch {
      setError("Could not load this example image. Please try another.");
    } finally {
      setLoadingExample(null);
    }
  }

  function clearSelection() {
    validationRun.current += 1;
    setSelectedFile(null);
    setError(null);
    setIsValidating(false);
    onFileChange?.(null);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void selectFile(file);
  }

  return (
    <section
      aria-label="Image upload"
      className={`w-full ${compact ? "mt-4 max-w-none" : "mt-10 max-w-2xl"}`}
    >
      {selectedFile && previewUrl ? (
        <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-800 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-100">
                {selectedFile.name}
              </p>
              <p className="text-xs text-neutral-400">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="shrink-0 rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              Remove image
            </button>
          </div>
          <div
            className={`relative w-full bg-black/30 p-4 ${compact ? "h-32 sm:h-40" : "h-80"}`}
          >
            <Image
              src={previewUrl}
              alt={`Preview of ${selectedFile.name}`}
              fill
              unoptimized
              sizes="(max-width: 672px) 100vw, 640px"
              className="rounded object-contain"
            />
          </div>
        </div>
      ) : (
        <label
          htmlFor="image-file"
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed text-center transition-colors focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-cyan-300 ${compact ? "min-h-36 gap-1 px-4 py-6" : "min-h-56 px-6 py-10"} ${
            isDragging
              ? "border-cyan-300 bg-cyan-300/10"
              : "border-neutral-700 bg-neutral-900/70 hover:border-neutral-500"
          }`}
        >
          <input
            id="image-file"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void selectFile(file);
            }}
          />
          <span className="text-base font-medium text-neutral-100">
            {isValidating
              ? "Checking image..."
              : isDragging
                ? "Drop image to check it"
                : "Drop an image here or browse"}
          </span>
          <span className="mt-2 text-sm text-neutral-400">
            JPG, PNG, or WebP · up to 10 MB · minimum 256 × 256 px
          </span>
        </label>
      )}
      {examples.length > 0 && (
        <div className="mt-5 border-t border-neutral-800 pt-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">
                Try an example
              </h3>
              <p className="mt-1 text-xs leading-5 text-neutral-400">
                Use one image to create a front-facing depth relief.
              </p>
            </div>
            {loadingExample && (
              <span role="status" className="shrink-0 text-xs text-cyan-200">
                Loading {loadingExample}...
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {examples.map((example) => (
              <button
                key={example.src}
                type="button"
                onClick={() => void selectExample(example)}
                disabled={loadingExample !== null}
                aria-label={`Use ${example.label} example image`}
                className="group overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 text-left transition hover:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-wait disabled:opacity-60"
              >
                <span className="relative block aspect-[4/3] overflow-hidden bg-neutral-800">
                  <Image
                    src={example.src}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 45vw, 140px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </span>
                <span className="block truncate px-2.5 py-2 text-xs font-medium text-neutral-200">
                  {example.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}
