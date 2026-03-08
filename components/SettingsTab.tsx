"use client";

import React, { useEffect } from "react";
import { AppSettings, VideoQuality, StorageType } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  HardDrive,
  Cloud,
  Send,
  Sliders,
  Video,
  Bell,
  Save,
  RefreshCw,
  Settings,
  Gauge,
  Camera,
  Link,
} from "lucide-react";

interface SettingsTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ settings, setSettings }) => {
  // Save to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem("appSettings", JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const qualityLabels: Record<VideoQuality, string> = {
    low: "Низкое (480p)",
    medium: "Среднее (720p)",
    high: "Высокое (1080p)",
  };

  const storageOptions: { value: StorageType; label: string; icon: React.ReactNode }[] = [
    { value: "local", label: "Локальное", icon: <HardDrive className="w-5 h-5" /> },
    { value: "telegram", label: "Telegram", icon: <Send className="w-5 h-5" /> },
    { value: "google_drive", label: "Google Drive", icon: <Cloud className="w-5 h-5" /> },
  ];

  const resetSettings = () => {
    const defaultSettings: AppSettings = {
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
      cameraSource: "webcam",
      ipCameraUrl: "",
      ipCameraType: "mjpeg",
    };
    setSettings(defaultSettings);
  };

  const cameraSourceOptions: { value: 'webcam' | 'ip'; label: string; icon: React.ReactNode }[] = [
    { value: "webcam", label: "Веб-камера", icon: <Camera className="w-5 h-5" /> },
    { value: "ip", label: "IP/RTSP камера", icon: <Link className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Camera Source */}
      <section className="p-4 bg-secondary rounded-lg space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Источник камеры
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {cameraSourceOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateSetting("cameraSource", option.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition",
                settings.cameraSource === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>

        {settings.cameraSource === "ip" && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                URL камеры
              </label>
              <input
                type="text"
                value={settings.ipCameraUrl || ""}
                onChange={(e) => updateSetting("ipCameraUrl", e.target.value)}
                placeholder="rtsp://192.168.0.203 или http://192.168.0.203/video"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Тип потока
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["mjpeg", "hls", "rtsp"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateSetting("ipCameraType", type)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition uppercase",
                      settings.ipCameraType === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {settings.ipCameraType === "mjpeg" && "MJPEG - Motion JPEG поток (большинство IP камер поддерживают)"}
                {settings.ipCameraType === "hls" && "HLS - HTTP Live Streaming (если камера конвертирует RTSP в HLS)"}
                {settings.ipCameraType === "rtsp" && "RTSP - требует медиа-сервер для конвертации (MediaMTX, ffmpeg)"}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Video Settings */}
      <section className="p-4 bg-secondary rounded-lg space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          Настройки видео
        </h3>

        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Качество видео
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["low", "medium", "high"] as VideoQuality[]).map((quality) => (
              <button
                key={quality}
                onClick={() => updateSetting("videoQuality", quality)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition",
                  settings.videoQuality === quality
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {qualityLabels[quality]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Detection Settings */}
      <section className="p-4 bg-secondary rounded-lg space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" />
          Настройки обнаружения
        </h3>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-muted-foreground">
              Порог обнаружения
            </label>
            <span className="text-sm font-medium">
              {Math.round(settings.detectionThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.99"
            step="0.05"
            value={settings.detectionThreshold}
            onChange={(e) =>
              updateSetting("detectionThreshold", parseFloat(e.target.value))
            }
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Более высокий порог = меньше ложных срабатываний
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Пре-запись (сек)
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={settings.preRecordDuration}
              onChange={(e) =>
                updateSetting("preRecordDuration", parseInt(e.target.value) || 0)
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Пост-запись (сек)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={settings.postRecordDuration}
              onChange={(e) =>
                updateSetting("postRecordDuration", parseInt(e.target.value) || 0)
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </section>

      {/* Storage Settings */}
      <section className="p-4 bg-secondary rounded-lg space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          Хранилище
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {storageOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateSetting("storageType", option.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition",
                settings.storageType === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>

        {settings.storageType === "telegram" && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Bot Token
              </label>
              <input
                type="password"
                value={settings.telegramBotToken || ""}
                onChange={(e) => updateSetting("telegramBotToken", e.target.value)}
                placeholder="123456789:ABCdefGHI..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Chat ID
              </label>
              <input
                type="text"
                value={settings.telegramChatId || ""}
                onChange={(e) => updateSetting("telegramChatId", e.target.value)}
                placeholder="294782364"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </section>

      {/* Notifications */}
      <section className="p-4 bg-secondary rounded-lg space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Уведомления
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Push-уведомления</p>
            <p className="text-sm text-muted-foreground">
              Получать уведомления при обнаружении
            </p>
          </div>
          <button
            onClick={() =>
              updateSetting("enablePushNotifications", !settings.enablePushNotifications)
            }
            className={cn(
              "relative w-14 h-8 rounded-full transition-colors",
              settings.enablePushNotifications ? "bg-primary" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform",
                settings.enablePushNotifications ? "translate-x-7" : "translate-x-1"
              )}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1">
            Email для уведомлений
          </label>
          <input
            type="email"
            value={settings.notificationEmail}
            onChange={(e) => updateSetting("notificationEmail", e.target.value)}
            placeholder="email@example.com"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={resetSettings}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Сбросить
        </button>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Save className="w-4 h-4" />
          Автосохранение
        </span>
      </div>
    </div>
  );
};

export default SettingsTab;
