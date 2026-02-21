import { Sun, Moon, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

export function TopBar({ onOpenFile, onClear, hasImage }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <TooltipProvider delayDuration={200}>
      <header
        data-testid="top-bar"
        className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50"
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>
              Px
            </span>
          </div>
          <h1
            className="text-sm font-bold tracking-tight"
            style={{ fontFamily: "Manrope, sans-serif" }}
            data-testid="app-title"
          >
            PixelPerfect
          </h1>
          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-mono-data">
            v1.0
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={onOpenFile}
                data-testid="open-file-btn"
                aria-label="Open file"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open File</TooltipContent>
          </Tooltip>

          {hasImage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={onClear}
                  data-testid="clear-image-btn"
                  aria-label="Clear image"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear Image</TooltipContent>
            </Tooltip>
          )}

          <div className="w-px h-5 bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={toggleTheme}
                data-testid="theme-toggle-btn"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
