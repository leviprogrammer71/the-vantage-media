import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Home, Sofa, Clock, Monitor, Smartphone } from "lucide-react";

type SceneType = "exterior" | "interior";
type VideoLength = "5s" | "10s";
type AspectRatio = "16:9" | "9:16";

const EXTERIOR_MOTIONS = [
  { id: "drone_overview", label: "Drone Overview" },
  { id: "curbside_pan", label: "Curbside Pan" },
  { id: "twilight_orbit", label: "Twilight Orbit" },
  { id: "front_door_reveal", label: "Door Reveal" },
  { id: "slow_push", label: "Slow Push" },
];

const INTERIOR_MOTIONS = [
  { id: "living_room_pan", label: "Living Room Pan" },
  { id: "kitchen_walkthrough", label: "Kitchen Tour" },
  { id: "cozy_evening", label: "Cozy Evening" },
  { id: "bedroom_showcase", label: "Bedroom Tour" },
  { id: "open_concept_flow", label: "Open Concept" },
];

interface VideoSettingsCardProps {
  sceneType: SceneType;
  setSceneType: (type: SceneType) => void;
  motion: string;
  setMotion: (motion: string) => void;
  length: VideoLength;
  setLength: (length: VideoLength) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  className?: string;
}

export function VideoSettingsCard({
  sceneType,
  setSceneType,
  motion,
  setMotion,
  length,
  setLength,
  aspectRatio,
  setAspectRatio,
  className,
}: VideoSettingsCardProps) {
  const motionOptions = sceneType === "exterior" ? EXTERIOR_MOTIONS : INTERIOR_MOTIONS;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Scene Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Scene Type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSceneType("exterior")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all",
              sceneType === "exterior"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/50"
            )}
          >
            <Home className="h-4 w-4" />
            Exterior
          </button>
          <button
            type="button"
            onClick={() => setSceneType("interior")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all",
              sceneType === "interior"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/50"
            )}
          >
            <Sofa className="h-4 w-4" />
            Interior
          </button>
        </div>
      </div>

      {/* Motion Style - Chips */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Motion Style</label>
        <div className="flex flex-wrap gap-2">
          {motionOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMotion(opt.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                motion === opt.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-border hover:border-primary/50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration & Format Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Duration */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Duration
          </label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setLength("5s")}
              className={cn(
                "flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                length === "5s"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              5s
            </button>
            <button
              type="button"
              onClick={() => setLength("10s")}
              className={cn(
                "flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                length === "10s"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              8s
            </button>
          </div>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Format</label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setAspectRatio("16:9")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                aspectRatio === "16:9"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
              MLS
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio("9:16")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                aspectRatio === "9:16"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Reels
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
