"use client";

import React, { useState, useEffect } from "react";
import SmartCamera from "@/components/SmartCamera";
import ClipGallery from "@/components/ClipGallery";
import CalendarSchedule from "@/components/CalendarSchedule";
import SettingsTab from "@/components/SettingsTab";
import { RecordedClip, ScheduleRule, AppSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Camera, Video, Calendar, Settings, Eye } from "lucide-react";
import Script from "next/script";

type TabType = "camera" | "gallery" | "calendar" | "settings";

export default function Home() {
  const [clips, setClips] = useState<RecordedClip[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRule[]>([]);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("camera");

  // App Settings State - Load from LocalStorage if available
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === "undefined") {
      return {
        storageType: "local",
        isGoogleAuthenticated: false,
        isDockerAuthenticated: false,
        isGithubAuthenticated: false,
        notificationEmail: "",
        enablePushNotifications: false,
        videoQuality: "medium",
        preRecordDuration: 5,
        postRecordDuration: 5,
        detectionThreshold: 0.7,
      };
    }

    try {
      const saved = localStorage.getItem("appSettings");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migration for existing settings
        if (!parsed.videoQuality) parsed.videoQuality = "medium";
        if (parsed.preRecordDuration === undefined) parsed.preRecordDuration = 5;
        if (parsed.postRecordDuration === undefined) parsed.postRecordDuration = 5;
        if (parsed.isDockerAuthenticated === undefined)
          parsed.isDockerAuthenticated = false;
        if (parsed.isGithubAuthenticated === undefined)
          parsed.isGithubAuthenticated = false;
        if (
          parsed.detectionThreshold === undefined ||
          parsed.detectionThreshold === 0.5
        ) {
          parsed.detectionThreshold = 0.7;
        }
        return parsed;
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }

    return {
      storageType: "local",
      isGoogleAuthenticated: false,
      isDockerAuthenticated: false,
      isGithubAuthenticated: false,
      notificationEmail: "",
      enablePushNotifications: false,
      videoQuality: "medium",
      preRecordDuration: 5,
      postRecordDuration: 5,
      detectionThreshold: 0.7,
    };
  });

  const handleNewClip = (clip: RecordedClip) => {
    setClips((prev) => [clip, ...prev]);
  };

  const handleDeleteClip = (id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "camera", label: "Камера", icon: <Camera className="w-4 h-4" /> },
    {
      id: "gallery",
      label: "Записи",
      icon: <Video className="w-4 h-4" />,
    },
    {
      id: "calendar",
      label: "Расписание",
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: "settings",
      label: "Настройки",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <>
      {/* TensorFlow.js Scripts */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd"
        strategy="afterInteractive"
      />

      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        {/* Header */}
        <header className="bg-secondary border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-primary to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight hidden md:block">
                AI Security
              </h1>
            </div>

            <nav className="flex gap-1 bg-muted/50 p-1 rounded-lg overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "whitespace-nowrap px-4 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2",
                    activeTab === tab.id
                      ? "bg-secondary text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.id === "gallery" && clips.length > 0 && (
                    <span className="ml-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-xs">
                      {clips.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6 flex-grow">
          <div className="max-w-4xl mx-auto">
            {/* Camera Tab */}
            <div className={activeTab === "camera" ? "block" : "hidden"}>
              <SmartCamera
                onNewClip={handleNewClip}
                schedule={schedule}
                isAutoMode={isAutoMode}
                settings={settings}
                setSettings={setSettings}
              />
            </div>

            {/* Gallery Tab */}
            <div className={activeTab === "gallery" ? "block" : "hidden"}>
              <ClipGallery clips={clips} onDelete={handleDeleteClip} />
            </div>

            {/* Calendar Tab */}
            <div className={activeTab === "calendar" ? "block" : "hidden"}>
              <CalendarSchedule
                schedule={schedule}
                setSchedule={setSchedule}
                isAutoMode={isAutoMode}
                setIsAutoMode={setIsAutoMode}
              />
            </div>

            {/* Settings Tab */}
            <div className={activeTab === "settings" ? "block" : "hidden"}>
              <SettingsTab settings={settings} setSettings={setSettings} />
            </div>
          </div>
        </main>

        <footer className="text-center py-6 text-muted-foreground text-sm border-t border-border">
          Powered by TensorFlow.js & Next.js
        </footer>
      </div>
    </>
  );
}
