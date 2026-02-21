import { Image as ImageIcon, Ruler, HardDrive, FileType } from "lucide-react";
import { formatFileSize, getFormatLabel } from "@/lib/utils";

export function ImageInfo({ imageInfo }) {
  if (!imageInfo) return null;

  const items = [
    {
      icon: Ruler,
      label: "Dimensions",
      value: `${imageInfo.width} x ${imageInfo.height}`,
      testId: "info-dimensions",
    },
    {
      icon: HardDrive,
      label: "File Size",
      value: formatFileSize(imageInfo.file_size),
      testId: "info-file-size",
    },
    {
      icon: FileType,
      label: "Format",
      value: getFormatLabel(imageInfo.format),
      testId: "info-format",
    },
    {
      icon: ImageIcon,
      label: "Color Mode",
      value: imageInfo.mode,
      testId: "info-color-mode",
    },
  ];

  return (
    <div data-testid="image-info-panel" className="space-y-3">
      <h3
        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        style={{ fontFamily: "Manrope, sans-serif" }}
      >
        Image Info
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-background/50 rounded-lg p-3 border border-border/50"
            data-testid={item.testId}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <item.icon className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {item.label}
              </span>
            </div>
            <span className="font-mono-data text-xs font-medium text-foreground">
              {item.value}
            </span>
          </div>
        ))}
      </div>
      <div className="bg-background/50 rounded-lg p-3 border border-border/50">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
          Filename
        </span>
        <span
          className="font-mono-data text-xs text-foreground truncate block"
          data-testid="info-filename"
          title={imageInfo.filename}
        >
          {imageInfo.filename}
        </span>
      </div>
    </div>
  );
}
