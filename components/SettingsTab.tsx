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
  Server,
  Power,
  PowerOff,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface SettingsTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ settings, setSettings }) => {
  const [mediaMtxStatus, setMediaMtxStatus] = React.useState<'unknown' | 'checking' | 'running' | 'stopped' | 'error'>('unknown');
  const [mediaMtxLoading, setMediaMtxLoading] = React.useState(false);
  const [telegramTestStatus, setTelegramTestStatus] = React.useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [telegramTestMessage, setTelegramTestMessage] = React.useState('');

  // Save to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem("appSettings", JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  }, [settings]);

  // Check MediaMTX status
  const checkMediaMtxStatus = React.useCallback(async () => {
    if (!settings.mediaMtxHost) return;
    
    setMediaMtxStatus('checking');
    try {
      const port = settings.mediaMtxApiPort || 9997;
      const response = await fetch(`http://${settings.mediaMtxHost}:${port}/v3/paths/list`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        setMediaMtxStatus('running');
      } else {
        setMediaMtxStatus('stopped');
      }
    } catch {
      setMediaMtxStatus('stopped');
    }
  }, [settings.mediaMtxHost, settings.mediaMtxApiPort]);

  // Check status when MediaMTX settings change
  useEffect(() => {
    if (settings.mediaMtxEnabled && settings.mediaMtxHost) {
      checkMediaMtxStatus();
    }
  }, [settings.mediaMtxEnabled, settings.mediaMtxHost, checkMediaMtxStatus]);

  // Toggle MediaMTX (sends command to the server)
  const toggleMediaMtx = async (enable: boolean) => {
    if (!settings.mediaMtxHost) return;
    
    setMediaMtxLoading(true);
    try {
      // This would typically call your backend API that controls MediaMTX via SSH or systemctl
      // For now, we just update the setting and check status
      updateSetting('mediaMtxEnabled', enable);
      
      // In production, you would call:
      // await fetch('/api/mediamtx/control', { method: 'POST', body: JSON.stringify({ action: enable ? 'start' : 'stop' }) });
      
      // Wait a moment then check status
      await new Promise(resolve => setTimeout(resolve, 1000));
      await checkMediaMtxStatus();
    } catch (error) {
      console.error('Failed to toggle MediaMTX:', error);
      setMediaMtxStatus('error');
    } finally {
      setMediaMtxLoading(false);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Send test message to Telegram
  const sendTelegramTestMessage = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      setTelegramTestStatus('error');
      setTelegramTestMessage('Укажите Bot Token и Chat ID');
      return;
    }

    setTelegramTestStatus('sending');
    setTelegramTestMessage('');

    try {
      const response = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: `AI Security Cam - Тестовое сообщение\n\nВаши настройки Telegram работают корректно.\nДата: ${new Date().toLocaleString('ru-RU')}`,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setTelegramTestStatus('success');
        setTelegramTestMessage('Сообщение успешно отправлено!');
      } else {
        setTelegramTestStatus('error');
        setTelegramTestMessage(data.description || 'Ошибка отправки');
      }
    } catch (error) {
      setTelegramTestStatus('error');
      setTelegramTestMessage('Ошибка сети. Проверьте подключение.');
    }

    // Reset status after 5 seconds
    setTimeout(() => {
      setTelegramTestStatus('idle');
      setTelegramTestMessage('');
    }, 5000);
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
      mediaMtxEnabled: false,
      mediaMtxHost: "",
      mediaMtxApiPort: 9997,
      mediaMtxStreamName: "camera1",
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

      {/* MediaMTX Settings */}
      <section className="p-4 bg-secondary rounded-lg space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          MediaMTX Медиа-сервер
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium">MediaMTX</p>
            <p className="text-sm text-muted-foreground">
              Конвертация RTSP в HLS для браузера
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-1.5">
              {mediaMtxStatus === 'checking' && (
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
              )}
              {mediaMtxStatus === 'running' && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              {mediaMtxStatus === 'stopped' && (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              {mediaMtxStatus === 'error' && (
                <XCircle className="w-4 h-4 text-orange-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {mediaMtxStatus === 'checking' && 'Проверка...'}
                {mediaMtxStatus === 'running' && 'Работает'}
                {mediaMtxStatus === 'stopped' && 'Остановлен'}
                {mediaMtxStatus === 'error' && 'Ошибка'}
                {mediaMtxStatus === 'unknown' && ''}
              </span>
            </div>
            
            {/* Toggle button */}
            <button
              onClick={() => toggleMediaMtx(!settings.mediaMtxEnabled)}
              disabled={mediaMtxLoading || !settings.mediaMtxHost}
              suppressHydrationWarning
              className={cn(
                "relative w-14 h-8 rounded-full transition-colors disabled:opacity-50",
                settings.mediaMtxEnabled ? "bg-primary" : "bg-muted"
              )}
            >
              <div
                suppressHydrationWarning
                className={cn(
                  "absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center",
                  settings.mediaMtxEnabled ? "translate-x-7" : "translate-x-1"
                )}
              >
                {mediaMtxLoading ? (
                  <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                ) : settings.mediaMtxEnabled ? (
                  <Power className="w-3 h-3 text-green-600" />
                ) : (
                  <PowerOff className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* MediaMTX Configuration */}
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                Хост MediaMTX
              </label>
              <input
                type="text"
                value={settings.mediaMtxHost || ""}
                onChange={(e) => updateSetting("mediaMtxHost", e.target.value)}
                placeholder="192.168.0.100 или localhost"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                API порт
              </label>
              <input
                type="number"
                value={settings.mediaMtxApiPort || 9997}
                onChange={(e) => updateSetting("mediaMtxApiPort", parseInt(e.target.value) || 9997)}
                placeholder="9997"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Имя потока
            </label>
            <input
              type="text"
              value={settings.mediaMtxStreamName || ""}
              onChange={(e) => updateSetting("mediaMtxStreamName", e.target.value)}
              placeholder="camera1"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
            />
          </div>

          {settings.mediaMtxHost && settings.mediaMtxStreamName && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">HLS URL для приложения:</p>
              <code className="text-xs font-mono text-primary break-all">
                http://{settings.mediaMtxHost}:8888/{settings.mediaMtxStreamName}/index.m3u8
              </code>
              <button
                onClick={() => {
                  const hlsUrl = `http://${settings.mediaMtxHost}:8888/${settings.mediaMtxStreamName}/index.m3u8`;
                  updateSetting("ipCameraUrl", hlsUrl);
                  updateSetting("ipCameraType", "hls");
                  updateSetting("cameraSource", "ip");
                }}
                className="mt-2 w-full px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition"
              >
                Применить URL к камере
              </button>
            </div>
          )}

          <button
            onClick={checkMediaMtxStatus}
            disabled={!settings.mediaMtxHost || mediaMtxStatus === 'checking'}
            className="flex items-center gap-2 px-3 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", mediaMtxStatus === 'checking' && "animate-spin")} />
            Проверить статус
          </button>
        </div>
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
            
            {/* Test Telegram Button */}
            <div className="pt-2">
              <button
                onClick={sendTelegramTestMessage}
                disabled={telegramTestStatus === 'sending' || !settings.telegramBotToken || !settings.telegramChatId}
                className={cn(
                  "flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition",
                  telegramTestStatus === 'success' 
                    ? "bg-green-600 text-white"
                    : telegramTestStatus === 'error'
                    ? "bg-red-600 text-white"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {telegramTestStatus === 'sending' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Отправка...
                  </>
                ) : telegramTestStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Отправлено!
                  </>
                ) : telegramTestStatus === 'error' ? (
                  <>
                    <XCircle className="w-4 h-4" />
                    Ошибка
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Отправить тестовое сообщение
                  </>
                )}
              </button>
              {telegramTestMessage && (
                <p className={cn(
                  "text-xs mt-2 text-center",
                  telegramTestStatus === 'success' ? "text-green-600" : "text-red-500"
                )}>
                  {telegramTestMessage}
                </p>
              )}
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
            suppressHydrationWarning
            className={cn(
              "relative w-14 h-8 rounded-full transition-colors",
              settings.enablePushNotifications ? "bg-primary" : "bg-muted"
            )}
          >
            <div
              suppressHydrationWarning
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
