import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SettingTooltipProps {
  text: string;
}

export function SettingTooltip({ text }: SettingTooltipProps) {
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-muted transition-colors ml-1"
          onClick={(e) => e.preventDefault()}
        >
          <Info className="h-3 w-3 text-muted-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[200px] rounded-none border-primary/50 px-3 py-2"
        style={{
          backgroundColor: "#222222",
          fontFamily: "'Space Mono', monospace",
          fontSize: "11px",
          lineHeight: "1.5",
          color: "#e5e5e5",
        }}
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
