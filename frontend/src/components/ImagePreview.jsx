import { useState, useCallback, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

export function ImagePreview({ src, filename }) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 5)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 0.1)), []);
  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);
  const fitToView = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.1, Math.min(5, z + delta)));
  }, []);

  const handleMouseDown = useCallback(
    (e) => {
      if (zoom > 1) {
        setDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [zoom, position]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (dragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [dragging, dragStart]
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener("wheel", handleWheel, { passive: false });
      return () => el.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full">
      <div
        ref={containerRef}
        data-testid="image-preview-container"
        className="relative flex-1 w-full overflow-hidden rounded-lg ring-1 ring-border checkerboard flex items-center justify-center"
        style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default", minHeight: "300px" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt={filename || "Preview"}
          data-testid="image-preview"
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transition: dragging ? "none" : "transform 0.15s ease-out",
          }}
          draggable={false}
        />
      </div>

      {/* Zoom controls */}
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-1 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-2 py-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={zoomOut}
                data-testid="zoom-out-btn"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>

          <span
            className="font-mono-data text-xs text-muted-foreground w-12 text-center select-none"
            data-testid="zoom-level"
          >
            {zoomPercent}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={zoomIn}
                data-testid="zoom-in-btn"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={fitToView}
                data-testid="fit-to-view-btn"
                aria-label="Fit to view"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit to View</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={resetZoom}
                data-testid="reset-zoom-btn"
                aria-label="Reset zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
