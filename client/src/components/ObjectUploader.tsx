import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { upload } from "@vercel/blob/client";
import { Upload as UploadIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Wire-compatible shape with the Uppy implementation this file used to use, so
// existing onComplete callsites in fast-pricing.tsx / pricing-management.tsx
// continue to read `result.successful[0].uploadURL` without modification.
export type UploadCompleteResult = {
  successful?: Array<{ uploadURL: string; name?: string; size?: number }>;
  failed?: unknown[];
};

interface ObjectUploaderProps {
  // Kept for prop-compat; ignored in this implementation. The Vercel-Blob
  // direct upload path does not need a token endpoint per-callsite — there's a
  // single /api/blob-upload-token route on the server that handles all of
  // them.
  onGetUploadParameters?: () => Promise<{ method: "PUT"; url: string }>;
  // Called after a successful upload with a wire-compatible result shape.
  onComplete?: (result: UploadCompleteResult) => void;

  maxNumberOfFiles?: number;
  // Max file size in bytes. Defaults to 50 MB (was 10 MB under the old
  // stream-through-Vercel-function path, which was capped by the platform).
  // Vercel Blob itself supports up to 5 TB; the cap here is purely a sanity
  // limit so admins don't accidentally upload a video as a "model image".
  maxFileSize?: number;
  // File-extension or MIME-type allow-list passed straight to <input accept>.
  // e.g. ['image/*'] or ['.glb','.gltf'].
  allowedFileTypes?: string[];

  // Optional UI affordances kept from the prior implementation.
  buttonClassName?: string;
  children: ReactNode;
  currentImageUrl?: string;
  modelName?: string;
  noteOverride?: string;
  skipPreview?: boolean;
}

/**
 * File-upload component for the admin UI.
 *
 * Uses Vercel Blob's direct-to-Blob client upload pattern: the browser PUTs
 * the file straight to Blob storage using a one-time signed URL minted by
 * POST /api/blob-upload-token on our server. The function is only involved in
 * minting the token — the file bytes never stream through Vercel Functions,
 * which means the previous ~4.5 MB platform request-body limit no longer
 * applies. Files up to several hundred MB (3D GLBs in particular) now work
 * reliably.
 *
 * The earlier Uppy + AwsS3 implementation tried to stream the file body
 * through a /api/blob-upload/:path Express route. That fails on Vercel for two
 * reasons: (1) the body cap, and (2) Vercel pre-buffers request bodies so
 * passing the raw Node `req` stream to @vercel/blob.put() races with that
 * buffering. The user-visible symptom was "Failed to Upload" on any file —
 * even small ones.
 */
export function ObjectUploader({
  maxNumberOfFiles = 1, // currently single-file; reserved for future use
  maxFileSize = 50 * 1024 * 1024,
  allowedFileTypes,
  onComplete,
  buttonClassName,
  children,
  currentImageUrl,
  modelName,
  noteOverride,
  skipPreview = false,
}: ObjectUploaderProps) {
  void maxNumberOfFiles; // explicit no-op so the unused-param lint is silent

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const acceptAttr = (allowedFileTypes || ["image/*"]).join(",");
  const noteMessage =
    noteOverride ||
    (currentImageUrl
      ? `Replacing existing image for ${modelName || "this model"}. Recommended dimensions: 1600x1200px or 4:3 aspect ratio (max ${formatMb(maxFileSize)}).`
      : `Upload an image for ${modelName || "this model"}. Recommended dimensions: 1600x1200px or 4:3 aspect ratio (max ${formatMb(maxFileSize)}).`);

  const handleButtonClick = () => {
    if (currentImageUrl && !skipPreview) {
      setShowPreviewModal(true);
    } else {
      openUploadDialog();
    }
  };

  const openUploadDialog = () => {
    setProgress(null);
    setStatus(null);
    setErrorMessage(null);
    setShowUploadModal(true);
  };

  const handleReplaceImage = () => {
    setShowPreviewModal(false);
    openUploadDialog();
  };

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;
    setErrorMessage(null);

    if (file.size > maxFileSize) {
      setErrorMessage(
        `File is ${formatMb(file.size)} — exceeds the ${formatMb(maxFileSize)} limit for this upload.`,
      );
      return;
    }

    try {
      setStatus(`Uploading ${file.name}…`);
      setProgress(0);

      // Hand the file off to Vercel Blob via the /api/blob-upload-token route.
      // The server mints a short-lived signed URL inside handleUpload(); the
      // browser then PUTs the bytes directly to Blob.
      const blob = await upload(safePathname(file.name), file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload-token",
        contentType: file.type || undefined,
        onUploadProgress: (event) => {
          // `event.percentage` is 0..100 in @vercel/blob v2.x
          const pct = typeof (event as any).percentage === "number"
            ? (event as any).percentage
            : typeof (event as any).loaded === "number" && typeof (event as any).total === "number"
              ? Math.round(((event as any).loaded / (event as any).total) * 100)
              : null;
          if (pct != null) setProgress(pct);
        },
      });

      setProgress(100);
      setStatus("Upload complete.");

      // Wire-compatible shape: every existing call site reads
      // `result.successful[0].uploadURL`. Pass the final Blob URL so the
      // subsequent PATCH to /api/models/:id/image (or /options/:id/image,
      // /series/:id/image, /categories/:id/image) writes the canonical URL
      // that the server then normalizes to /objects/<pathname> via
      // ObjectStorageService.normalizeObjectEntityPath().
      onComplete?.({
        successful: [{ uploadURL: blob.url, name: file.name, size: file.size }],
        failed: [],
      });

      // Close the modal after a short beat so the success state is visible.
      setTimeout(() => setShowUploadModal(false), 300);
    } catch (err: any) {
      console.error("Direct blob upload failed:", err);
      setProgress(null);
      setStatus(null);
      setErrorMessage(err?.message || "Upload failed. Please try again.");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleButtonClick}
        className={buttonClassName}
        title={currentImageUrl ? "Click to view/replace existing image" : "Click to upload image"}
      >
        {children}
      </button>

      {/* Preview Modal for Existing Image */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Current Image for {modelName || "Model"}</DialogTitle>
            <DialogDescription>
              View the current image or replace it with a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <img
              src={currentImageUrl}
              alt={modelName || "Current image"}
              className="w-full h-64 object-contain rounded-lg border bg-gray-50"
              onError={(e: any) => {
                e.target.onerror = null;
                e.target.src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="256" fill="none"%3E%3Crect width="400" height="256" fill="%23f3f4f6"/%3E%3Ctext x="200" y="128" text-anchor="middle" fill="%239ca3af" font-family="system-ui" font-size="14"%3EImage not available%3C/text%3E%3C/svg%3E';
              }}
            />
            <p className="text-sm text-gray-500 mt-2">
              Recommended dimensions: 1600x1200px or 4:3 aspect ratio
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Keep Current
            </Button>
            <Button onClick={handleReplaceImage}>Replace Image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>{noteMessage}</DialogDescription>
          </DialogHeader>

          <div
            className={`mt-2 mb-4 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
              dragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400 bg-gray-50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileSelected(f);
            }}
          >
            <UploadIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <div className="text-sm text-gray-700 font-medium">
              Drop file here or click to browse
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Max {formatMb(maxFileSize)} · {(allowedFileTypes || ["image/*"]).join(", ")}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptAttr}
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] || null)}
            />
          </div>

          {progress != null && (
            <div className="mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-1">
                {progress < 100 ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                <span>{status}</span>
                <span className="ml-auto text-xs text-gray-500">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {errorMessage && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">
              {errorMessage}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUploadModal(false)}
              disabled={progress != null && progress < 100}
            >
              {progress != null && progress < 100 ? "Uploading…" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 100) return `${Math.round(mb)} MB`;
  if (mb >= 10) return `${mb.toFixed(0)} MB`;
  return `${mb.toFixed(1)} MB`;
}

// Produce a stable, URL-safe pathname for the Blob. We keep the user's chosen
// filename (lower-cased, spaces and oddities replaced) under a "models/"
// prefix to mirror the existing /objects/models/<…> URL shape stored in the DB.
function safePathname(filename: string): string {
  const base = filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
  // Append a short random suffix so two uploads of "image.jpg" don't collide.
  const suffix = Math.random().toString(36).slice(2, 8);
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  return `models/${stem}-${suffix}${ext}`;
}
