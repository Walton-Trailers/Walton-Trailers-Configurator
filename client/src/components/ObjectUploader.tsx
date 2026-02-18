import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
  currentImageUrl?: string;
  modelName?: string;
  allowedFileTypes?: string[];
  noteOverride?: string;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-S3
 *   uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  currentImageUrl,
  modelName,
  allowedFileTypes,
  noteOverride,
}: ObjectUploaderProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: allowedFileTypes || ['image/*'],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onComplete?.(result);
        setShowUploadModal(false);
        setShowPreviewModal(false);
      })
  );

  const noteMessage = noteOverride || (currentImageUrl 
    ? `⚠️ Replacing existing image for ${modelName || 'this model'}. Recommended dimensions: 1600x1200px or 4:3 aspect ratio (max 10MB)`
    : `Upload an image for ${modelName || 'this model'}. Recommended dimensions: 1600x1200px or 4:3 aspect ratio (max 10MB)`);

  const handleButtonClick = () => {
    if (currentImageUrl) {
      setShowPreviewModal(true);
    } else {
      setShowUploadModal(true);
    }
  };

  const handleReplaceImage = () => {
    setShowPreviewModal(false);
    setShowUploadModal(true);
  };

  return (
    <div>
      <Button 
        type="button"
        onClick={handleButtonClick} 
        className={buttonClassName}
        variant="outline"
        size="sm"
        title={currentImageUrl ? "Click to view/replace existing image" : "Click to upload image"}
      >
        {children}
      </Button>

      {/* Preview Modal for Existing Image */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Current Image for {modelName || 'Model'}</DialogTitle>
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
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="256" fill="none"%3E%3Crect width="400" height="256" fill="%23f3f4f6"/%3E%3Ctext x="200" y="128" text-anchor="middle" fill="%239ca3af" font-family="system-ui" font-size="14"%3EImage not available%3C/text%3E%3C/svg%3E';
              }}
            />
            <p className="text-sm text-gray-500 mt-2">
              Recommended dimensions: 1600x1200px or 4:3 aspect ratio
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreviewModal(false)}
            >
              Keep Current
            </Button>
            <Button onClick={handleReplaceImage}>
              Replace Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <DashboardModal
        uppy={uppy}
        open={showUploadModal}
        onRequestClose={() => setShowUploadModal(false)}
        proudlyDisplayPoweredByUppy={false}
        note={noteMessage}
        theme="light"
      />
    </div>
  );
}