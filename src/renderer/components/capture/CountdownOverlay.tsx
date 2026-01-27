import React, { useEffect, useState, useCallback } from 'react';

interface CountdownOverlayProps {
  duration: number;
  onComplete: () => void;
  onCancel: () => void;
}

function CountdownOverlay({ duration, onComplete, onCancel }: CountdownOverlayProps) {
  const [count, setCount] = useState(duration);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }

    // Trigger animation
    setIsAnimating(true);
    const animationTimeout = setTimeout(() => {
      setIsAnimating(false);
    }, 200);

    // Countdown tick
    const countdownTimeout = setTimeout(() => {
      setCount((prev) => prev - 1);
    }, 1000);

    return () => {
      clearTimeout(animationTimeout);
      clearTimeout(countdownTimeout);
    };
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Countdown number */}
      <div
        className={`
          text-[200px] font-bold text-white
          transition-transform duration-200 ease-out
          ${isAnimating ? 'scale-125' : 'scale-100'}
        `}
        style={{
          textShadow: '0 0 40px rgba(255, 255, 255, 0.5)',
        }}
      >
        {count}
      </div>

      {/* Cancel hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 text-sm">
        Press <kbd className="px-2 py-1 bg-white/20 rounded mx-1">ESC</kbd> to cancel
      </div>

      {/* Pulse ring animation */}
      <div
        className={`
          absolute w-80 h-80 rounded-full border-4 border-white/30
          transition-all duration-1000 ease-out
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-150 opacity-0'}
        `}
      />
    </div>
  );
}

export default CountdownOverlay;
