import { Button } from "@/components/ui/button";
import { Heart, Grid, List, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GalleryFiltersProps {
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
  sortBy: "newest" | "oldest" | "preset";
  onSortChange: (sort: "newest" | "oldest" | "preset") => void;
  presetFilter: string | null;
  onPresetFilterChange: (preset: string | null) => void;
  availablePresets: string[];
  getPresetLabel: (preset: string) => string;
}

export const GalleryFilters = ({
  showFavoritesOnly,
  onToggleFavorites,
  sortBy,
  onSortChange,
  presetFilter,
  onPresetFilterChange,
  availablePresets,
  getPresetLabel,
}: GalleryFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Favorites toggle */}
      <Button
        variant={showFavoritesOnly ? "default" : "outline"}
        size="sm"
        onClick={onToggleFavorites}
        className="gap-2"
      >
        <Heart className={`h-4 w-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
        Favorites
      </Button>

      {/* Sort dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Sort: {sortBy === "newest" ? "Newest" : sortBy === "oldest" ? "Oldest" : "Preset"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onSortChange("newest")}>
            Newest First
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange("oldest")}>
            Oldest First
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange("preset")}>
            By Preset
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Preset filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {presetFilter ? getPresetLabel(presetFilter) : "All Presets"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onPresetFilterChange(null)}>
            All Presets
          </DropdownMenuItem>
          {availablePresets.map((preset) => (
            <DropdownMenuItem
              key={preset}
              onClick={() => onPresetFilterChange(preset)}
            >
              {getPresetLabel(preset)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
