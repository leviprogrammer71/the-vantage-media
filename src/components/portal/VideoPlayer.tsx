import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Eye, EyeOff, ExternalLink, Clock, Video } from 'lucide-react';
import type { VideoDeliverable } from '@/types/portal';
import { formatDate, formatRelativeTime } from '@/lib/portal-utils';

interface VideoPlayerProps {
  videos: VideoDeliverable[];
  onMarkViewed?: (videoId: string) => void;
}

const typeLabels: Record<string, string> = {
  walkthrough: 'Walkthrough',
  presentation: 'Presentation',
  tutorial: 'Tutorial',
};

const typeColors: Record<string, string> = {
  walkthrough: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  presentation: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  tutorial: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export function VideoPlayer({ videos, onMarkViewed }: VideoPlayerProps) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  if (videos.length === 0) {
    return (
      <div className="text-center py-8">
        <Video className="h-10 w-10 mx-auto mb-3" style={{ color: '#6B6B80' }} />
        <p className="text-sm" style={{ color: '#6B6B80' }}>
          No video deliverables yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {videos.map((video) => {
        const isActive = activeVideo === video.id;
        return (
          <Card
            key={video.id}
            className="border overflow-hidden transition-all duration-200"
            style={{
              background: isActive ? 'rgba(233,69,96,0.05)' : 'rgba(255,255,255,0.03)',
              borderColor: isActive ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.06)',
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${typeColors[video.video_type] || ''}`}
                    >
                      {typeLabels[video.video_type] || video.video_type}
                    </Badge>
                    {video.is_viewed ? (
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: '#6B6B80' }}>
                        <Eye className="h-3 w-3" /> Viewed
                      </span>
                    ) : (
                      <Badge
                        className="text-[10px] px-1.5"
                        style={{ background: 'rgba(233,69,96,0.15)', color: '#E94560', border: '1px solid rgba(233,69,96,0.3)' }}
                      >
                        New
                      </Badge>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold truncate" style={{ color: '#F7F5F2' }}>
                    {video.title}
                  </h4>

                  {video.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: '#B8B8CC' }}>
                      {video.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[11px] flex items-center gap-1" style={{ color: '#6B6B80' }}>
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(video.created_at)}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="flex-shrink-0 transition-all duration-200"
                  style={
                    isActive
                      ? { background: 'rgba(255,255,255,0.1)', color: '#B8B8CC' }
                      : { background: '#E94560', color: '#fff' }
                  }
                  onClick={() => {
                    setActiveVideo(isActive ? null : video.id);
                    if (!video.is_viewed && onMarkViewed) {
                      onMarkViewed(video.id);
                    }
                  }}
                >
                  <Play className="h-4 w-4 mr-1" />
                  {isActive ? 'Close' : 'Watch'}
                </Button>
              </div>

              {/* Embedded Video Area */}
              {isActive && (
                <div className="mt-4">
                  <Separator className="mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div
                    className="w-full aspect-video rounded-lg flex items-center justify-center"
                    style={{ background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {video.video_url ? (
                      <div className="text-center">
                        <Play
                          className="h-12 w-12 mx-auto mb-3"
                          style={{ color: '#E94560' }}
                        />
                        <p className="text-sm mb-3" style={{ color: '#B8B8CC' }}>
                          Video hosted externally
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10"
                          style={{ color: '#B8B8CC' }}
                          onClick={() => window.open(video.video_url!, '_blank')}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Open in New Tab
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: '#6B6B80' }}>
                        Video not yet available
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
