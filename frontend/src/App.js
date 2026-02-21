import { useState, useRef, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopBar } from "@/components/TopBar";
import { DropZone } from "@/components/DropZone";
import { ImagePreview } from "@/components/ImagePreview";
import { ImageInfo } from "@/components/ImageInfo";
import { ExportPanel } from "@/components/ExportPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function AppContent() {
  const [imageInfo, setImageInfo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API}/image/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setImageInfo(response.data);
      setPreviewUrl(`${API}/image/preview/${response.data.id}`);
      toast.success("Image loaded successfully");
    } catch (err) {
      console.error("Upload failed:", err);
      const msg = err.response?.data?.detail || "Failed to load image";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      e.target.value = "";
    },
    [handleUpload]
  );

  const handleClear = useCallback(() => {
    setImageInfo(null);
    setPreviewUrl(null);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" data-testid="app-root">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
        data-testid="hidden-file-input"
      />

      <TopBar onOpenFile={handleOpenFile} onClear={handleClear} hasImage={!!imageInfo} />

      <div className="flex flex-1 overflow-hidden">
        {/* Main Preview Area */}
        <main
          className="flex-1 flex items-center justify-center p-8 overflow-hidden relative"
          data-testid="main-preview-area"
        >
          {uploading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-40" data-testid="upload-loading">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading image...</p>
              </div>
            </div>
          )}

          {!imageInfo && !uploading ? (
            <DropZone onFileSelect={handleUpload} />
          ) : imageInfo && previewUrl ? (
            <ImagePreview src={previewUrl} filename={imageInfo.filename} />
          ) : null}
        </main>

        {/* Right Sidebar */}
        {imageInfo && (
          <aside
            className="w-80 border-l border-border bg-card/30 backdrop-blur-sm flex flex-col"
            data-testid="sidebar"
          >
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                <ImageInfo imageInfo={imageInfo} />
                <Separator className="bg-border/50" />
                <ExportPanel imageInfo={imageInfo} />
              </div>
            </ScrollArea>
          </aside>
        )}
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "bg-card text-card-foreground border-border shadow-lg",
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
