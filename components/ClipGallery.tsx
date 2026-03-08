"use client";

import React, { useState } from "react";
import { RecordedClip } from "@/lib/types";
import { formatDuration, formatTimestamp, cn } from "@/lib/utils";
import { Play, Trash2, Download, X, Video, Clock, HardDrive } from "lucide-react";

interface ClipGalleryProps {
  clips: RecordedClip[];
  onDelete: (id: string) => void;
}

const ClipGallery: React.FC<ClipGalleryProps> = ({ clips, onDelete }) => {
  const [selectedClip, setSelectedClip] = useState<RecordedClip | null>(null);

  const handleDownload = (clip: RecordedClip) => {
    const a = document.createElement("a");
    a.href = clip.url;
    a.download = `clip_${clip.timestamp}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const storageLabels = {
    local: "Локально",
    google_drive: "Google Drive",
    skydrive: "OneDrive",
    telegram: "Telegram",
  };

  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
          <Video className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Нет записей</h3>
        <p className="text-muted-foreground text-center">
          Записанные видео будут отображаться здесь
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Записи</h2>
          <span className="text-sm text-muted-foreground">{clips.length} видео</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clips.map((clip) => (
            <div
              key={clip.id}
              className="group bg-secondary rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition"
            >
              {/* Thumbnail / Preview */}
              <div
                className="relative aspect-video bg-background cursor-pointer"
                onClick={() => setSelectedClip(clip)}
              >
                <video
                  src={clip.url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(clip.duration)}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-medium truncate">
                    {formatTimestamp(clip.timestamp)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <HardDrive className="w-3 h-3" />
                    {storageLabels[clip.storageLocation]}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(clip)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded text-sm hover:bg-primary/20 transition"
                  >
                    <Download className="w-4 h-4" />
                    Скачать
                  </button>
                  <button
                    onClick={() => onDelete(clip.id)}
                    className="px-3 py-1.5 bg-destructive/10 text-destructive rounded text-sm hover:bg-destructive/20 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      {selectedClip && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedClip(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-background rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedClip(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <video
              src={selectedClip.url}
              className="w-full aspect-video"
              controls
              autoPlay
            />

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{formatTimestamp(selectedClip.timestamp)}</p>
                <p className="text-sm text-muted-foreground">
                  Длительность: {formatDuration(selectedClip.duration)}
                </p>
              </div>
              <button
                onClick={() => handleDownload(selectedClip)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
              >
                <Download className="w-4 h-4" />
                Скачать
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClipGallery;
