import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DragState {
  isDragging: boolean;
  captureIds: number[];
  dropTargetId: number | null | 'uncategorized';
}

interface DragContextValue {
  dragState: DragState;
  startDrag: (captureIds: number[]) => void;
  endDrag: () => void;
  setDropTarget: (targetId: number | null | 'uncategorized') => void;
}

const DragContext = createContext<DragContextValue | null>(null);

export function useDragContext() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDragContext must be used within a DragProvider');
  }
  return context;
}

interface DragProviderProps {
  children: ReactNode;
}

export function DragProvider({ children }: DragProviderProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    captureIds: [],
    dropTargetId: null,
  });

  const startDrag = useCallback((captureIds: number[]) => {
    setDragState({
      isDragging: true,
      captureIds,
      dropTargetId: null,
    });
  }, []);

  const endDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      captureIds: [],
      dropTargetId: null,
    });
  }, []);

  const setDropTarget = useCallback((targetId: number | null | 'uncategorized') => {
    setDragState((prev) => ({
      ...prev,
      dropTargetId: targetId,
    }));
  }, []);

  return (
    <DragContext.Provider value={{ dragState, startDrag, endDrag, setDropTarget }}>
      {children}
    </DragContext.Provider>
  );
}

export default DragContext;
