export type CaptureType = 'screenshot' | 'video';
export type CaptureMode = 'fullscreen' | 'area';

export interface ScreenshotOptions {
  mode: CaptureMode;
  displayId?: number;
  area?: SelectionArea;
}

export interface RecordingOptions {
  mode: CaptureMode;
  displayId?: number;
  area?: SelectionArea;
  audio: {
    enabled: boolean;
    deviceId?: string;
  };
}

export interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureResult {
  id: number;
  type: CaptureType;
  filepath: string;
  filename: string;
  width: number;
  height: number;
  size: number;
  duration?: number;
  thumbnail?: string;
  createdAt: Date;
}

export interface CaptureRecord {
  id: number;
  type: CaptureType;
  filename: string;
  filepath: string;
  width: number;
  height: number;
  duration: number | null;
  size: number;
  thumbnail_path: string | null;
  created_at: string;
}

export interface CaptureFile extends CaptureRecord {
  tags: Tag[];
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
}

export interface DisplayInfo {
  id: number;
  label: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isPrimary: boolean;
  scaleFactor: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  startTime: number | null;
}
