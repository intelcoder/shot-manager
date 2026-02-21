# Fix Video Area Recording Bugs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three bugs in video area recording: recording area border not showing, duplicate recording indicators, and recordings not being saved.

**Architecture:** The root cause is `BrowserWindow.getAllWindows()[0]` in `video.ts` which picks an arbitrary window (often the area-border or recording-overlay window) instead of the main dashboard window. This sends the `RECORDING_START` IPC to the wrong window, and `stopRecording()` destroys overlay windows before sending the stop signal, losing the MediaRecorder data. Additionally, `useMediaRecorder` runs in ALL windows (including overlays) via `App.tsx`, causing potential duplicate recording.

**Tech Stack:** Electron IPC, React hooks, TypeScript

---

## Bug Analysis

### Root Cause: Wrong window targeted for recording IPC

In `src/main/capture/video.ts`, two locations use `BrowserWindow.getAllWindows()[0]`:
- Line 100: sending `RECORDING_COUNTDOWN`
- Line 158: sending `RECORDING_START` and setting `currentRecordingWindow`

After `closeCaptureOverlay()` runs and new overlay windows are created (`showAreaBorderOverlay`, `showRecordingOverlay`), `getAllWindows()[0]` returns the MOST RECENTLY CREATED window — likely the recording-overlay or area-border window, NOT the main dashboard window.

**Consequence chain:**
1. `RECORDING_START` sent to overlay window → overlay's `useMediaRecorder` starts a MediaRecorder there
2. `currentRecordingWindow` set to overlay window
3. `stopRecording()` calls `closeRecordingOverlay()` and `closeAreaBorderOverlay()` BEFORE sending `recording:stop` (lines 247-250 run before line 304)
4. `currentRecordingWindow` is now destroyed → `recording:stop` never arrives → MediaRecorder never stops → no data sent back → video not saved
5. Meanwhile `broadcastRecordingStatus()` sends to ALL windows including dashboard → dashboard shows `RecordingIndicator` → user sees "2 recordings" (overlay + dashboard indicator)

---

### Task 1: Use `getMainWindow()` instead of `getAllWindows()[0]` in video.ts

**Files:**
- Modify: `src/main/capture/video.ts:1-8` (imports)
- Modify: `src/main/capture/video.ts:100` (countdown path)
- Modify: `src/main/capture/video.ts:158` (recording start path)

**Step 1: Update import to include `getMainWindow`**

In `src/main/capture/video.ts`, change the import from:
```ts
import { closeCaptureOverlay } from '../windows/capture-window';
```
to:
```ts
import { closeCaptureOverlay } from '../windows/capture-window';
import { getMainWindow } from '../windows/main-window';
```

**Step 2: Fix countdown path (line 100)**

Replace:
```ts
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.RECORDING_COUNTDOWN, {
        duration: countdownDuration,
        ...recordingData,
      });
    }
```

With:
```ts
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.RECORDING_COUNTDOWN, {
        duration: countdownDuration,
        ...recordingData,
      });
    }
```

**Step 3: Fix recording start path (line 158)**

Replace:
```ts
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    currentRecordingWindow = mainWindow;
    mainWindow.webContents.send(IPC_CHANNELS.RECORDING_START, data);
  }
```

With:
```ts
  const mainWindow = getMainWindow();
  if (mainWindow) {
    currentRecordingWindow = mainWindow;
    mainWindow.webContents.send(IPC_CHANNELS.RECORDING_START, data);
  }
```

**Step 4: Commit**

```bash
git add src/main/capture/video.ts
git commit -m "fix: use getMainWindow() instead of getAllWindows()[0] for recording IPC

getAllWindows()[0] was returning overlay windows instead of the main
dashboard window, causing RECORDING_START to be sent to the wrong
window. This broke MediaRecorder initialization and video saving."
```

---

### Task 2: Fix `stopRecording()` window closing order

**Files:**
- Modify: `src/main/capture/video.ts:232-310` (stopRecording function)

The current order in `stopRecording()`:
1. Close recording overlay (line 247) — **destroys window**
2. Close area border overlay (line 250) — **destroys window**
3. Send `recording:stop` to `currentRecordingWindow` (line 304) — **too late if window was destroyed**

**Step 1: Move overlay closing to AFTER recording data is received**

Replace the entire `stopRecording` function with:

```ts
export async function stopRecording(): Promise<CaptureResult | null> {
  if (!recordingState.isRecording) {
    return null;
  }

  // Clear timer
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }

  // Update tray
  setTrayRecording(false);

  const duration = recordingState.duration;

  // Reset state
  recordingState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    startTime: null,
  };

  // Request video data from renderer BEFORE closing overlay windows
  return new Promise((resolve) => {
    if (currentRecordingWindow) {
      // Set up one-time listener for recording data
      const handler = async (_event: Electron.IpcMainEvent, data: { buffer: ArrayBuffer; width: number; height: number }) => {
        currentRecordingWindow = null;

        // NOW close the overlay windows after data is received
        closeRecordingOverlay();
        closeAreaBorderOverlay();

        if (!data || !data.buffer) {
          broadcastRecordingStatus();
          resolve(null);
          return;
        }

        try {
          const buffer = Buffer.from(data.buffer);
          const result = await saveVideo(buffer, duration, data.width, data.height);

          // Show preview if enabled
          const showPreview = getSetting('showPreview');
          const previewDuration = getSetting('previewDuration');

          if (showPreview) {
            showPreviewPopup(result, previewDuration * 1000);
          }

          // Notify all windows
          BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send('on:capture-complete', result);
          });

          broadcastRecordingStatus();
          resolve(result);
        } catch (error) {
          console.error('Error saving video:', error);
          broadcastRecordingStatus();
          resolve(null);
        }
      };

      const { ipcMain } = require('electron');
      ipcMain.once('recording:data', handler);

      // Send stop signal while window is still alive
      currentRecordingWindow.webContents.send('recording:stop');
    } else {
      // No recording window — clean up overlays anyway
      closeRecordingOverlay();
      closeAreaBorderOverlay();
      broadcastRecordingStatus();
      resolve(null);
    }
  });
}
```

**Step 2: Commit**

```bash
git add src/main/capture/video.ts
git commit -m "fix: close overlay windows after receiving recording data, not before

stopRecording() was closing the overlay windows before sending the
recording:stop signal, which destroyed the window holding the
MediaRecorder. Now overlays close after recording data is received."
```

---

### Task 3: Guard `useMediaRecorder` to only run in the main dashboard window

**Files:**
- Modify: `src/renderer/App.tsx:24` (useMediaRecorder call)

Currently `useMediaRecorder()` runs in ALL windows (dashboard, capture overlay, recording overlay, area border) because it's called unconditionally in `App.tsx`. This means overlay windows also listen for `RECORDING_START` and could start their own MediaRecorder.

**Step 1: Conditionally initialize useMediaRecorder only for dashboard route**

In `App.tsx`, change:
```ts
  // Initialize MediaRecorder listeners for video recording
  useMediaRecorder();
```

To:
```ts
  // Initialize MediaRecorder listeners for video recording (only in dashboard window)
  const isDashboard = route === 'dashboard';
  useMediaRecorder(isDashboard);
```

**Step 2: Add enabled guard to useMediaRecorder hook**

In `src/renderer/hooks/useMediaRecorder.ts`, change the function signature:
```ts
export function useMediaRecorder(enabled: boolean = true) {
```

And wrap the `useEffect` that sets up IPC listeners (line 181) with the guard:
```ts
  useEffect(() => {
    if (!enabled) return;

    // Set up IPC listeners for recording commands
    const unsubscribeStart = window.electronAPI?.onRecordingStart((data) => {
      console.log('Received recording:start', data);
      startRecording(data);
    });

    const unsubscribeStop = window.electronAPI?.onRecordingStop(() => {
      console.log('Received recording:stop');
      handleStop();
    });

    const unsubscribePause = window.electronAPI?.onRecordingPause(() => {
      console.log('Received recording:pause');
      handlePause();
    });

    const unsubscribeResume = window.electronAPI?.onRecordingResume(() => {
      console.log('Received recording:resume');
      handleResume();
    });

    return () => {
      unsubscribeStart?.();
      unsubscribeStop?.();
      unsubscribePause?.();
      unsubscribeResume?.();
      cleanup();
    };
  }, [enabled, startRecording, handleStop, handlePause, handleResume, cleanup]);
```

**Step 3: Commit**

```bash
git add src/renderer/App.tsx src/renderer/hooks/useMediaRecorder.ts
git commit -m "fix: only initialize MediaRecorder in dashboard window

useMediaRecorder was running in all windows including overlays,
which could cause duplicate MediaRecorder instances. Now it only
initializes when the route is 'dashboard'."
```

---

### Task 4: Remove dead `recording:data` handler in handlers.ts

**Files:**
- Modify: `src/main/ipc/handlers.ts:246-249`

**Step 1: Remove the empty handler**

Delete these lines from `handlers.ts`:
```ts
  // Handle recording data from renderer
  ipcMain.on('recording:data', (event, data) => {
    // This is handled in video.ts via one-time listener
  });
```

This handler does nothing — `recording:data` is handled by the `ipcMain.once` listener in `video.ts:stopRecording()`. The permanent `ipcMain.on` here is dead code.

**Step 2: Commit**

```bash
git add src/main/ipc/handlers.ts
git commit -m "fix: remove dead recording:data handler in ipc handlers

The recording:data IPC is handled by a one-time listener in
video.ts stopRecording(). The permanent handler in handlers.ts
was empty dead code."
```

---

### Task 5: Manual verification

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors

**Step 3: Run tests**

Run: `npm run test`
Expected: All tests pass

**Step 4: Manual testing checklist**

1. Start area video recording → verify red border appears around selected area
2. Verify floating recording overlay appears (top-right, red pill with timer)
3. Verify dashboard shows recording indicator (RecordingIndicator component)
4. Stop recording → verify video file is saved
5. Verify preview popup appears after recording stops
6. Verify area border and recording overlay close after stopping
7. Test with countdown enabled: verify countdown → border → recording → save flow
