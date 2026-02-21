import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Image as ImageIcon } from "lucide-react";

export function DropZone({ onFileSelect }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff", ".svg"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div
      {...getRootProps()}
      data-testid="drop-zone"
      className={`
        border-2 border-dashed rounded-xl flex flex-col items-center justify-center
        p-12 text-center cursor-pointer w-full max-w-2xl mx-auto
        transition-colors transition-transform duration-200 ease-out
        ${isDragActive
          ? "border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/10 scale-[1.02]"
          : "border-border bg-card/30 hover:border-muted-foreground/40 hover:bg-card/50"
        }
      `}
    >
      <input {...getInputProps()} data-testid="file-input" />
      <div className={`
        rounded-full p-4 mb-6
        transition-colors duration-200
        ${isDragActive ? "bg-blue-500/10 text-blue-500" : "bg-muted/50 text-muted-foreground"}
      `}>
        {isDragActive ? (
          <ImageIcon className="w-10 h-10" />
        ) : (
          <UploadCloud className="w-10 h-10" />
        )}
      </div>
      <h2 className="text-lg font-semibold tracking-tight mb-2" style={{ fontFamily: "Manrope, sans-serif" }}>
        {isDragActive ? "Drop your image here" : "Drop an image or click to browse"}
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Supports PNG, JPEG, WebP, GIF, BMP, TIFF. Up to 50MB.
      </p>
    </div>
  );
}
