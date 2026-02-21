import { useState, useEffect } from "react";
import { Download, Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function ExportPanel({ imageInfo }) {
  const [format, setFormat] = useState("png");
  const [quality, setQuality] = useState(85);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const aspectRatio = imageInfo ? imageInfo.width / imageInfo.height : 1;

  useEffect(() => {
    if (imageInfo) {
      setWidth("");
      setHeight("");
    }
  }, [imageInfo]);

  const handleWidthChange = (val) => {
    setWidth(val);
    if (maintainAspect && val && !isNaN(val)) {
      setHeight(String(Math.round(Number(val) / aspectRatio)));
    }
  };

  const handleHeightChange = (val) => {
    setHeight(val);
    if (maintainAspect && val && !isNaN(val)) {
      setWidth(String(Math.round(Number(val) * aspectRatio)));
    }
  };

  const handleExport = async () => {
    if (!imageInfo) return;

    setExporting(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append("image_id", imageInfo.id);
      formData.append("format", format);
      formData.append("quality", String(quality));
      formData.append("maintain_aspect", String(maintainAspect));

      if (width) formData.append("width", width);
      if (height) formData.append("height", height);

      setProgress(30);

      const response = await axios.post(`${API}/image/export`, formData, {
        responseType: "blob",
        headers: { "Content-Type": "multipart/form-data" },
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded / progressEvent.total) * 70) + 30;
            setProgress(Math.min(pct, 95));
          }
        },
      });

      setProgress(100);

      const disposition = response.headers["content-disposition"];
      let filename = `export.${format === "jpeg" ? "jpg" : format}`;
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      const exportSize = response.headers["x-export-size"];
      const sizeLabel = exportSize
        ? `(${(Number(exportSize) / 1024).toFixed(1)} KB)`
        : "";

      toast.success(`Exported as ${format.toUpperCase()} ${sizeLabel}`);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const showQuality = format === "jpeg" || format === "webp";

  return (
    <div data-testid="export-panel" className="space-y-6">
      <h3
        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        style={{ fontFamily: "Manrope, sans-serif" }}
      >
        Export Settings
      </h3>

      {/* Format */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Output Format</Label>
        <Select value={format} onValueChange={setFormat} data-testid="format-select">
          <SelectTrigger
            className="bg-background/50 border-border"
            data-testid="format-select-trigger"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png" data-testid="format-png">PNG</SelectItem>
            <SelectItem value="jpeg" data-testid="format-jpeg">JPEG</SelectItem>
            <SelectItem value="webp" data-testid="format-webp">WebP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quality */}
      {showQuality && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Quality</Label>
            <span
              className="font-mono-data text-xs text-foreground"
              data-testid="quality-value"
            >
              {quality}%
            </span>
          </div>
          <Slider
            value={[quality]}
            onValueChange={(v) => setQuality(v[0])}
            min={1}
            max={100}
            step={1}
            data-testid="quality-slider"
          />
        </div>
      )}

      {/* Resize */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Resize</Label>
          <div className="flex items-center gap-2">
            <Link2
              className={`h-3 w-3 transition-colors duration-200 ${
                maintainAspect ? "text-blue-500" : "text-muted-foreground"
              }`}
            />
            <Switch
              checked={maintainAspect}
              onCheckedChange={setMaintainAspect}
              data-testid="aspect-ratio-toggle"
              aria-label="Maintain aspect ratio"
            />
            <span className="text-[10px] text-muted-foreground">Lock</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Width</Label>
            <Input
              type="number"
              placeholder={imageInfo ? String(imageInfo.width) : "Width"}
              value={width}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="bg-background/50 border-border font-mono-data text-xs h-8"
              data-testid="resize-width-input"
              min={1}
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Height</Label>
            <Input
              type="number"
              placeholder={imageInfo ? String(imageInfo.height) : "Height"}
              value={height}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="bg-background/50 border-border font-mono-data text-xs h-8"
              data-testid="resize-height-input"
              min={1}
            />
          </div>
        </div>
        {imageInfo && (
          <p className="text-[10px] text-muted-foreground">
            Original: {imageInfo.width} x {imageInfo.height}px
          </p>
        )}
      </div>

      {/* Export Button */}
      <div className="space-y-3 pt-2">
        {exporting && progress > 0 && (
          <div className="space-y-1">
            <Progress value={progress} data-testid="export-progress" />
            <p className="text-[10px] text-muted-foreground text-center">
              Exporting... {progress}%
            </p>
          </div>
        )}

        <Button
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors duration-200 active:scale-95"
          onClick={handleExport}
          disabled={!imageInfo || exporting}
          data-testid="export-btn"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export as {format.toUpperCase()}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
