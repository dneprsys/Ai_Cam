export type StorageType = 'local' | 'google_drive' | 'skydrive' | 'telegram';
export type VideoQuality = 'low' | 'medium' | 'high';

export interface RecordedClip {
  id: string;
  url: string;
  timestamp: number;
  duration: number;
  thumbnail?: string;
  storageLocation: StorageType;
  mimeType?: string;
}

export enum CameraStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  WATCHING = 'WATCHING',
  RECORDING = 'RECORDING',
  ERROR = 'ERROR'
}

export interface ScheduleRule {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  isActive: boolean;
}

export type VideoSourceType = 'webcam' | 'ip' | 'cloud';

export interface AppSettings {
  storageType: StorageType;
  isGoogleAuthenticated: boolean;
  isDockerAuthenticated: boolean;
  isGithubAuthenticated: boolean;
  cloudServerUrl?: string;
  cloudApiKey?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  notificationEmail: string;
  enablePushNotifications: boolean;
  youtubeStreamKey?: string;
  vlcLocalPath?: string;
  videoQuality: VideoQuality;
  preRecordDuration: number;
  postRecordDuration: number;
  detectionThreshold: number;
  // Camera source settings
  cameraSource: 'webcam' | 'ip';
  ipCameraUrl?: string;
  ipCameraType?: 'rtsp' | 'hls' | 'mjpeg';
}

export interface DetectionResult {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}
