# Phase 4: Video Recording

## Objective
Implement full-screen and area-selection video recording with audio narration support.

## Dependencies
- Phase 3 completed (screenshot capture patterns established)

---

## 4.1 Video Recording Architecture

### Flow Diagram
```
User triggers recording (shortcut or tray menu)
    │
    ├─→ Full Screen Mode
    │       ├── Get all displays
    │       ├── (If multi-monitor) Show monitor selector
    │       ├── Select audio source (optional)
    │       ├── Start recording
    │       └── Wait for stop signal
    │
    └─→ Area Selection Mode
            ├── Create fullscreen overlay
            ├── User selects area
            ├── Select audio source (optional)
            ├── Start recording
            └── Wait for stop signal

Stop recording:
    ├── Stop media recorder
    ├── Process video chunks
    ├── Generate filename
    ├── Save to disk
    ├── Insert database record
    └── Show preview popup
```

---

## 4.2 Recording Implementation

### Using MediaRecorder API

```typescript
// src/main/capture/video.ts
import { desktopCapturer, screen } from 'electron';

interface RecordingOptions {
  mode: 'fullscreen' | 'area';
  displayId?: number;
  area?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  audio: {
    enabled: boolean;
    deviceId?: string;  // Microphone device ID
  };
}

interface RecordingState {
  isRecording: boolean;
  startTime: Date | null;
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
  duration: number;
}
```

### Main Process Recording Manager

```typescript
// src/main/capture/video-recorder.ts
class VideoRecorder {
  private state: RecordingState = {
    isRecording: false,
    startTime: null,
    mediaRecorder: null,
    chunks: [],
    duration: 0
  };

  async startRecording(options: RecordingOptions): Promise<void> {
    // 1. Get screen source
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      // Don't use thumbnailSize for video
    });

    // 2. Notify renderer to start actual recording
    // (MediaRecorder must run in renderer process)
    mainWindow.webContents.send('start-recording', {
      sourceId: sources[0].id,
      options
    });

    this.state.isRecording = true;
    this.state.startTime = new Date();
  }

  async stopRecording(): Promise<RecordingResult> {
    // Signal renderer to stop and get video data
    return new Promise((resolve) => {
      ipcMain.once('recording-complete', (event, data) => {
        resolve(this.processRecording(data));
      });
      mainWindow.webContents.send('stop-recording');
    });
  }
}
```

### Renderer Process Recording (Required for MediaRecorder)

```typescript
// src/renderer/utils/recorder.ts
class ScreenRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  async startRecording(sourceId: string, options: RecordingOptions): Promise<void> {
    // 1. Get screen stream
    const screenStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          minWidth: 1280,
          maxWidth: 4096,
          minHeight: 720,
          maxHeight: 2160,
          minFrameRate: 30
        }
      }
    } as any);

    // 2. Get audio stream if enabled
    let combinedStream = screenStream;
    if (options.audio.enabled) {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: options.audio.deviceId
        }
      });

      // Combine streams
      combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);
    }

    // 3. Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000  // 5 Mbps
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    // 4. Start recording
    this.mediaRecorder.start(1000); // Chunk every 1 second
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];
        resolve(blob);
      };
      this.mediaRecorder!.stop();
    });
  }
}
```

---

## 4.3 Audio Narration

### Get Available Audio Devices

```typescript
async function getAudioDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(device => device.kind === 'audioinput');
}
```

### Audio Selection UI

```typescript
// Pre-recording dialog
interface AudioSelectionProps {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onDeviceSelect: (deviceId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}
```

### Visual Design - Pre-Recording Dialog
```
┌────────────────────────────────────┐
│  Start Recording                   │
│                                    │
│  ○ Full Screen                     │
│  ● Selected Area (800 x 600)       │
│                                    │
│  ─────────────────────────────     │
│                                    │
│  Audio Narration                   │
│  [✓] Enable microphone             │
│  Device: [Built-in Microphone  ▼]  │
│                                    │
│  [Cancel]              [Start ●]   │
└────────────────────────────────────┘
```

---

## 4.4 Recording Indicator

### System Tray Updates
- Change tray icon to include red recording dot
- Update tooltip to show recording duration
- Click tray icon to stop recording

### Floating Recording Controls

```typescript
// Small floating window during recording
interface RecordingControlsProps {
  duration: number;       // Seconds elapsed
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}
```

### Visual Design - Recording Controls
```
┌─────────────────────────────────┐
│  ● REC   00:05:23   [⏸] [⏹]    │
└─────────────────────────────────┘

● = Red blinking dot
⏸ = Pause button
⏹ = Stop button
```

### Position
- Draggable floating window
- Default: Top-center of screen
- Always on top
- Semi-transparent when not hovered

---

## 4.5 Area Recording

### Region Capture Approach

**Option 1: Full capture + crop (simpler)**
- Capture full screen
- Crop each frame to selected area
- Higher CPU usage, but more compatible

**Option 2: Native region capture (if supported)**
- Use `getDisplayMedia()` with `displaySurface: 'monitor'`
- Crop using canvas before encoding

### Implementation (Option 1)
```typescript
// Post-process video to crop
async function cropVideo(inputPath: string, outputPath: string, area: Area): Promise<void> {
  // Use ffmpeg (bundled or system)
  // Or use browser-side canvas cropping during recording
}
```

---

## 4.6 Video Processing

### Save Recording

```typescript
async function saveRecording(blob: Blob, options: SaveOptions): Promise<RecordingResult> {
  // 1. Generate filename
  const filename = generateFilename({
    prefix: options.prefix,
    timestamp: new Date(),
    type: 'video'
  });

  // 2. Get save path
  const folder = getDateFolder(options.basePath, new Date());
  const filepath = path.join(folder, filename);

  // 3. Convert blob to buffer and save
  const buffer = Buffer.from(await blob.arrayBuffer());
  await fs.promises.writeFile(filepath, buffer);

  // 4. Get video metadata
  const stats = await fs.promises.stat(filepath);

  return {
    filepath,
    filename,
    size: stats.size,
    duration: options.duration
  };
}
```

### Video Format

```typescript
// Default: WebM (VP9 codec)
// Good compression, wide support

// Optional: Convert to MP4 for better compatibility
// Would require ffmpeg integration
```

---

## 4.7 Open in System Editor

```typescript
// src/main/services/file-manager.ts
import { shell } from 'electron';

async function openInDefaultApp(filepath: string): Promise<void> {
  await shell.openPath(filepath);
}

async function openInEditor(filepath: string): Promise<void> {
  // This opens in the system's default video editor
  // macOS: Usually QuickTime or iMovie
  // Windows: Usually Photos app or Movies & TV

  // Alternative: Open containing folder
  shell.showItemInFolder(filepath);
}
```

---

## 4.8 Database Record

```typescript
interface VideoRecord {
  type: 'video';
  filename: string;
  filepath: string;
  width: number;
  height: number;
  duration: number;  // Seconds
  size: number;
  created_at: Date;
}

async function insertVideoCapture(record: VideoRecord): Promise<number> {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO captures (type, filename, filepath, width, height, duration, size)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    record.type,
    record.filename,
    record.filepath,
    record.width,
    record.height,
    record.duration,
    record.size
  );

  return result.lastInsertRowid;
}
```

---

## 4.9 Recording State Management

### Zustand Store

```typescript
// src/renderer/stores/recording-store.ts
interface RecordingStore {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  options: RecordingOptions | null;

  startRecording: (options: RecordingOptions) => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<RecordingResult>;
}

const useRecordingStore = create<RecordingStore>((set, get) => ({
  isRecording: false,
  isPaused: false,
  duration: 0,
  options: null,

  startRecording: async (options) => {
    set({ isRecording: true, options, duration: 0 });
    // Start duration timer
    // Start actual recording
  },

  stopRecording: async () => {
    set({ isRecording: false, isPaused: false });
    // Stop recording and return result
  }
}));
```

---

## 4.10 Deliverables

After Phase 4 completion:
- [ ] Full-screen video recording works
- [ ] Area selection recording works
- [ ] Audio narration (microphone) works
- [ ] Recording controls (pause/stop) visible
- [ ] Recording duration displayed
- [ ] Tray icon updates during recording
- [ ] Video saved to configured location
- [ ] "Open in editor" launches system editor
- [ ] Database record created
- [ ] Preview popup shows video thumbnail

---

## 4.11 Verification

```bash
# Test scenarios:
# 1. Record fullscreen for 10 seconds
# 2. Record with area selection
# 3. Record with audio narration
# 4. Verify audio in playback
# 5. Stop recording via tray
# 6. Stop recording via floating control
# 7. Check video saved in correct folder
# 8. Open video in system editor
# 9. Verify database record includes duration
# 10. Long recording (5+ minutes) stability
```
