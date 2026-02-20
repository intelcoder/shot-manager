import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, FabricImage, IText, Rect, Line, Triangle, Group } from 'fabric';
import type { CaptureFile } from '../../../shared/types/capture';
import { toFileUrl } from '../../utils/file-url';

type Tool = 'select' | 'arrow' | 'text' | 'rectangle';

interface AnnotationEditorProps {
  item: CaptureFile;
  onSave: (updatedItem: CaptureFile) => void;
  onCancel: () => void;
}

function AnnotationEditor({ item, onSave, onCancel }: AnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [isSaving, setIsSaving] = useState(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const activeObjectRef = useRef<import('fabric').FabricObject | null>(null);

  const pushHistory = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      selection: true,
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    const imageUrl = toFileUrl(item.filepath);
    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const container = canvasRef.current?.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth || 800;
      const containerHeight = container.clientHeight || 600;

      const imgWidth = img.width ?? 800;
      const imgHeight = img.height ?? 600;

      const scaleX = containerWidth / imgWidth;
      const scaleY = containerHeight / imgHeight;
      const scale = Math.min(scaleX, scaleY, 1);

      const canvasWidth = imgWidth * scale;
      const canvasHeight = imgHeight * scale;

      canvas.setWidth(canvasWidth);
      canvas.setHeight(canvasHeight);

      img.set({ left: 0, top: 0, scaleX: scale, scaleY: scale, selectable: false, evented: false });
      canvas.add(img);
      canvas.sendObjectToBack(img);

      if (item.annotations) {
        try {
          const saved = JSON.parse(item.annotations);
          canvas.loadFromJSON(saved).then(() => {
            canvas.renderAll();
            pushHistory();
          });
        } catch {
          canvas.renderAll();
          pushHistory();
        }
      } else {
        canvas.renderAll();
        pushHistory();
      }
    });

    return () => {
      canvas.dispose();
    };
  }, [item, pushHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current])).then(() => {
      canvas.renderAll();
    });
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current])).then(() => {
      canvas.renderAll();
    });
  }, []);

  // Tool behavior
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');

    if (activeTool === 'select') {
      canvas.selection = true;
      canvas.forEachObject((obj) => {
        // Keep background image non-selectable
        if (!obj.get('isBackground')) {
          obj.selectable = true;
        }
      });
      return;
    }

    canvas.selection = false;
    canvas.discardActiveObject();
    canvas.renderAll();

    canvas.on('mouse:down', (opt) => {
      isDrawingRef.current = true;
      const pointer = canvas.getPointer(opt.e);
      startPointRef.current = { x: pointer.x, y: pointer.y };

      if (activeTool === 'text') {
        const text = new IText('Label', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: '#FF3B30',
          fontWeight: 'bold',
          editable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        canvas.renderAll();
        isDrawingRef.current = false;
        pushHistory();
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (!isDrawingRef.current) return;
      const pointer = canvas.getPointer(opt.e);
      const { x: x1, y: y1 } = startPointRef.current;

      if (activeTool === 'rectangle') {
        if (activeObjectRef.current) {
          canvas.remove(activeObjectRef.current);
        }
        const rect = new Rect({
          left: Math.min(x1, pointer.x),
          top: Math.min(y1, pointer.y),
          width: Math.abs(pointer.x - x1),
          height: Math.abs(pointer.y - y1),
          fill: 'rgba(255, 235, 59, 0.35)',
          stroke: '#FFC107',
          strokeWidth: 2,
          selectable: false,
        });
        canvas.add(rect);
        activeObjectRef.current = rect;
        canvas.renderAll();
      }

      if (activeTool === 'arrow') {
        if (activeObjectRef.current) {
          canvas.remove(activeObjectRef.current);
        }
        const line = new Line([x1, y1, pointer.x, pointer.y], {
          stroke: '#FF3B30',
          strokeWidth: 3,
          selectable: false,
        });
        const angle = Math.atan2(pointer.y - y1, pointer.x - x1) * (180 / Math.PI);
        const arrowhead = new Triangle({
          width: 14,
          height: 14,
          fill: '#FF3B30',
          left: pointer.x,
          top: pointer.y,
          angle: angle + 90,
          originX: 'center',
          originY: 'center',
          selectable: false,
        });
        const group = new Group([line, arrowhead], { selectable: false });
        canvas.add(group);
        activeObjectRef.current = group;
        canvas.renderAll();
      }
    });

    canvas.on('mouse:up', () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (activeObjectRef.current) {
        activeObjectRef.current.set({ selectable: true });
        activeObjectRef.current = null;
        pushHistory();
      }
    });
  }, [activeTool, pushHistory]);

  const handleSave = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setIsSaving(true);
    try {
      const json = JSON.stringify(canvas.toJSON());
      await window.electronAPI.saveAnnotations(item.id, json);
      onSave({ ...item, annotations: json });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
    window.electronAPI.exportAnnotatedImage(item.id, dataUrl);
  };

  const toolButton = (tool: Tool, label: string, icon: string) => (
    <button
      key={tool}
      onClick={() => setActiveTool(tool)}
      title={label}
      className={`p-2 rounded text-sm font-medium transition-colors ${
        activeTool === tool
          ? 'bg-primary-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700 mr-2">Annotate: {item.filename}</span>
        {toolButton('select', 'Select', '↖')}
        {toolButton('arrow', 'Arrow', '→')}
        {toolButton('text', 'Text', 'T')}
        {toolButton('rectangle', 'Highlight', '▭')}
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          onClick={undo}
          title="Undo"
          className="p-2 rounded text-sm bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
        >
          ↩
        </button>
        <button
          onClick={redo}
          title="Redo"
          className="p-2 rounded text-sm bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
        >
          ↪
        </button>
        <div className="flex-1" />
        <button
          onClick={handleExport}
          title="Copy annotated image to clipboard"
          className="px-3 py-1.5 text-sm rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
        >
          Copy
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1.5 text-sm rounded bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  );
}

export default AnnotationEditor;
