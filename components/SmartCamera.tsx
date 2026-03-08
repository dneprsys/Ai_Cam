"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Hls from "hls.js";
import { CameraStatus, RecordedClip, ScheduleRule, AppSettings, DetectionResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Camera, Video, VideoOff, AlertCircle, Loader2, Eye, Play, Square, Settings2, Link, Wifi, WifiOff } from "lucide-react";

interface SmartCameraProps {
  onNewClip: (clip: RecordedClip) => void;
  schedule: ScheduleRule[];
  isAutoMode: boolean;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const SmartCamera: React.FC<SmartCameraProps> = ({
  onNewClip,
  schedule,
  isAutoMode,
  settings,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const modelRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState<CameraStatus>(CameraStatus.IDLE);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [ipStreamError, setIpStreamError] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Load COCO-SSD model
  const loadModel = useCallback(async () => {
    if (modelRef.current) return;
    
    setModelLoading(true);
    try {
      // @ts-ignore - TensorFlow loaded via CDN
      if (typeof window !== "undefined" && window.cocoSsd) {
        // @ts-ignore
        modelRef.current = await window.cocoSsd.load();
        console.log("[v0] COCO-SSD model loaded");
      }
    } catch (err) {
      console.error("[v0] Failed to load model:", err);
    } finally {
      setModelLoading(false);
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setStatus(CameraStatus.CONNECTING);
    setError(null);
    setIpStreamError(false);

    // IP Camera mode
    if (settings.cameraSource === 'ip' && settings.ipCameraUrl) {
      try {
        // For MJPEG streams, we use an img tag
        // For HLS streams, we use video with HLS.js
        if (settings.ipCameraType === 'mjpeg') {
          setStatus(CameraStatus.WATCHING);
          await loadModel();
          startDetectionFromImg();
        } else if (settings.ipCameraType === 'hls') {
          if (videoRef.current && settings.ipCameraUrl) {
            // Cleanup previous HLS instance
            if (hlsRef.current) {
              hlsRef.current.destroy();
              hlsRef.current = null;
            }

            if (Hls.isSupported()) {
              const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
              });
              hlsRef.current = hls;
              
              hls.loadSource(settings.ipCameraUrl);
              hls.attachMedia(videoRef.current);
              
              hls.on(Hls.Events.MANIFEST_PARSED, async () => {
                try {
                  await videoRef.current?.play();
                  setStatus(CameraStatus.WATCHING);
                  await loadModel();
                  startDetection();
                } catch (err) {
                  console.error("[v0] HLS play error:", err);
                }
              });

              hls.on(Hls.Events.ERROR, (event, data) => {
                console.error("[v0] HLS error:", data);
                if (data.fatal) {
                  setError(`HLS ошибка: ${data.type}`);
                  setStatus(CameraStatus.ERROR);
                }
              });
            } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
              // Safari native HLS support
              videoRef.current.src = settings.ipCameraUrl;
              await videoRef.current.play();
              setStatus(CameraStatus.WATCHING);
              await loadModel();
              startDetection();
            } else {
              setError("Ваш браузер не поддерживает HLS потоки");
              setStatus(CameraStatus.ERROR);
            }
          }
        } else {
          // RTSP needs conversion - show instructions
          setError("RTSP потоки не поддерживаются напрямую в браузере. Используйте MediaMTX для конвертации в HLS или MJPEG.");
          setStatus(CameraStatus.ERROR);
        }
      } catch (err: any) {
        console.error("[v0] IP Camera error:", err);
        setError(err.message || "Не удалось подключиться к IP камере");
        setStatus(CameraStatus.ERROR);
      }
      return;
    }

    // Webcam mode
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: settings.videoQuality === 'high' ? 1920 : settings.videoQuality === 'medium' ? 1280 : 640 },
          height: { ideal: settings.videoQuality === 'high' ? 1080 : settings.videoQuality === 'medium' ? 720 : 480 },
          facingMode: "environment",
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus(CameraStatus.WATCHING);
      await loadModel();
      startDetection();
    } catch (err: any) {
      console.error("[v0] Camera error:", err);
      setError(err.message || "Не удалось получить доступ к камере");
      setStatus(CameraStatus.ERROR);
    }
  }, [settings.videoQuality, settings.cameraSource, settings.ipCameraUrl, settings.ipCameraType, loadModel]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
    }

    setStatus(CameraStatus.IDLE);
    setDetections([]);
    setIpStreamError(false);
  }, []);

  // Object detection loop for MJPEG (img element)
  const startDetectionFromImg = useCallback(() => {
    if (detectionIntervalRef.current) return;

    detectionIntervalRef.current = setInterval(async () => {
      if (!modelRef.current || !imgRef.current || !canvasRef.current) return;
      if (!imgRef.current.complete || imgRef.current.naturalWidth === 0) return;

      try {
        const predictions = await modelRef.current.detect(imgRef.current);
        const filteredDetections: DetectionResult[] = predictions
          .filter((p: any) => p.score >= settings.detectionThreshold)
          .map((p: any) => ({
            class: p.class,
            score: p.score,
            bbox: p.bbox as [number, number, number, number],
          }));

        setDetections(filteredDetections);

        // Draw bounding boxes on canvas
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          canvasRef.current.width = imgRef.current.naturalWidth;
          canvasRef.current.height = imgRef.current.naturalHeight;
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          filteredDetections.forEach((det) => {
            const [x, y, width, height] = det.bbox;
            ctx.strokeStyle = det.class === "person" ? "#22c55e" : "#3b82f6";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);

            ctx.fillStyle = det.class === "person" ? "#22c55e" : "#3b82f6";
            ctx.font = "bold 16px Inter, sans-serif";
            const label = `${det.class} ${Math.round(det.score * 100)}%`;
            const textWidth = ctx.measureText(label).width;
            ctx.fillRect(x, y - 24, textWidth + 12, 24);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(label, x + 6, y - 6);
          });
        }

        // Auto-record when person detected
        const personDetected = filteredDetections.some(d => d.class === "person");
        if (isAutoMode && personDetected && !isRecording && isScheduleActive()) {
          // For IP cameras we can't record directly, just notify
          console.log("[v0] Person detected on IP camera");
        }
      } catch (err) {
        console.error("[v0] Detection error:", err);
      }
    }, 500);
  }, [settings.detectionThreshold, isAutoMode, isRecording]);

  // Object detection loop
  const startDetection = useCallback(() => {
    if (detectionIntervalRef.current) return;

    detectionIntervalRef.current = setInterval(async () => {
      if (!modelRef.current || !videoRef.current || !canvasRef.current) return;
      if (videoRef.current.readyState !== 4) return;

      try {
        const predictions = await modelRef.current.detect(videoRef.current);
        const filteredDetections: DetectionResult[] = predictions
          .filter((p: any) => p.score >= settings.detectionThreshold)
          .map((p: any) => ({
            class: p.class,
            score: p.score,
            bbox: p.bbox as [number, number, number, number],
          }));

        setDetections(filteredDetections);

        // Draw bounding boxes
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          filteredDetections.forEach((det) => {
            const [x, y, width, height] = det.bbox;
            ctx.strokeStyle = det.class === "person" ? "#22c55e" : "#3b82f6";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            ctx.fillStyle = det.class === "person" ? "#22c55e" : "#3b82f6";
            ctx.font = "14px Inter, sans-serif";
            const label = `${det.class} ${Math.round(det.score * 100)}%`;
            const textWidth = ctx.measureText(label).width;
            ctx.fillRect(x, y - 20, textWidth + 8, 20);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(label, x + 4, y - 5);
          });
        }

        // Auto-record when person detected in auto mode
        const personDetected = filteredDetections.some(d => d.class === "person");
        if (isAutoMode && personDetected && !isRecording && isScheduleActive()) {
          startRecording();
        }
      } catch (err) {
        console.error("[v0] Detection error:", err);
      }
    }, 200);
  }, [settings.detectionThreshold, isAutoMode, isRecording]);

  // Check if current time is within schedule
  const isScheduleActive = useCallback(() => {
    if (!isAutoMode || schedule.length === 0) return true;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    return schedule.some(rule => 
      rule.isActive && 
      rule.dayOfWeek === currentDay &&
      currentTime >= rule.startTime &&
      currentTime <= rule.endTime
    );
  }, [isAutoMode, schedule]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current || isRecording) return;

    chunksRef.current = [];
    const options = { mimeType: "video/webm;codecs=vp9" };
    
    try {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
    } catch {
      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
    }

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      
      const clip: RecordedClip = {
        id: Date.now().toString(),
        url,
        timestamp: Date.now(),
        duration: recordingDuration,
        storageLocation: settings.storageType,
        mimeType: "video/webm",
      };

      onNewClip(clip);
      setRecordingDuration(0);
    };

    mediaRecorderRef.current.start(1000);
    setIsRecording(true);
    setStatus(CameraStatus.RECORDING);
  }, [isRecording, recordingDuration, settings.storageType, onNewClip]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus(CameraStatus.WATCHING);
    }
  }, [isRecording]);

  // Recording duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const personCount = detections.filter(d => d.class === "person").length;

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full",
            status === CameraStatus.IDLE && "bg-muted-foreground",
            status === CameraStatus.CONNECTING && "bg-yellow-500 animate-pulse",
            status === CameraStatus.WATCHING && "bg-green-500",
            status === CameraStatus.RECORDING && "bg-red-500 animate-pulse",
            status === CameraStatus.ERROR && "bg-red-500"
          )} />
          <span className="text-sm font-medium text-muted-foreground">
            {status === CameraStatus.IDLE && "Камера отключена"}
            {status === CameraStatus.CONNECTING && "Подключение..."}
            {status === CameraStatus.WATCHING && "Наблюдение"}
            {status === CameraStatus.RECORDING && `Запись ${formatTime(recordingDuration)}`}
            {status === CameraStatus.ERROR && "Ошибка"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {modelLoading && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Загрузка ИИ...
            </span>
          )}
          
          {personCount > 0 && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-sm rounded-md flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {personCount} чел.
            </span>
          )}

          {isAutoMode && (
            <span className="px-2 py-1 bg-primary/20 text-primary text-sm rounded-md">
              Авто
            </span>
          )}
        </div>
      </div>

      {/* Camera Source Info */}
      {settings.cameraSource === 'ip' && settings.ipCameraUrl && (
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg text-sm">
          <Wifi className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground truncate">{settings.ipCameraUrl}</span>
          <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded uppercase">
            {settings.ipCameraType}
          </span>
        </div>
      )}

      {/* Video Container */}
      <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
        {/* MJPEG stream via img */}
        {settings.cameraSource === 'ip' && settings.ipCameraType === 'mjpeg' && status !== CameraStatus.IDLE && (
          <img
            ref={imgRef}
            src={settings.ipCameraUrl}
            alt="IP Camera Stream"
            crossOrigin="anonymous"
            className={cn(
              "absolute inset-0 w-full h-full object-contain",
              ipStreamError && "hidden"
            )}
            onError={() => {
              setIpStreamError(true);
              setError("Не удалось загрузить видеопоток. Проверьте URL и доступность камеры.");
              setStatus(CameraStatus.ERROR);
            }}
            onLoad={() => setIpStreamError(false)}
          />
        )}
        
        {/* Video element for webcam and HLS */}
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            settings.cameraSource === 'ip' && settings.ipCameraType === 'mjpeg' && "hidden"
          )}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {status === CameraStatus.IDLE && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-secondary">
            <Camera className="w-16 h-16 text-muted-foreground" />
            <p className="text-muted-foreground">Нажмите Старт для включения камеры</p>
          </div>
        )}

        {status === CameraStatus.CONNECTING && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/80">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        )}

        {status === CameraStatus.ERROR && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-secondary">
            <AlertCircle className="w-16 h-16 text-destructive" />
            <p className="text-destructive text-center px-4">{error}</p>
          </div>
        )}

        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-full animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span className="text-white text-sm font-medium">REC</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {status === CameraStatus.IDLE ? (
          <button
            onClick={startCamera}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
          >
            <Play className="w-5 h-5" />
            Старт
          </button>
        ) : (
          <>
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition"
            >
              <VideoOff className="w-5 h-5" />
              Стоп
            </button>

            {isRecording ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition"
              >
                <Square className="w-5 h-5" />
                Остановить запись
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={status !== CameraStatus.WATCHING}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Video className="w-5 h-5" />
                Записать
              </button>
            )}
          </>
        )}
      </div>

      {/* Detection Info */}
      {detections.length > 0 && (
        <div className="p-4 bg-secondary rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Обнаружено объектов: {detections.length}</h3>
          <div className="flex flex-wrap gap-2">
            {detections.map((det, i) => (
              <span
                key={i}
                className={cn(
                  "px-2 py-1 rounded text-sm",
                  det.class === "person" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                )}
              >
                {det.class}: {Math.round(det.score * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCamera;
