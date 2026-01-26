import React, { useState, useRef, useEffect } from 'react';

interface ShortcutInputProps {
  value: string;
  onChange: (accelerator: string) => void;
  disabled?: boolean;
}

function formatAcceleratorDisplay(accelerator: string): string {
  if (!accelerator) return '';

  const isMac = navigator.platform.toLowerCase().includes('mac');

  return accelerator
    .replace('CommandOrControl', isMac ? '⌘' : 'Ctrl')
    .replace('Command', '⌘')
    .replace('Control', 'Ctrl')
    .replace('Shift', isMac ? '⇧' : 'Shift')
    .replace('Alt', isMac ? '⌥' : 'Alt')
    .replace('Option', '⌥')
    .replace(/\+/g, ' + ');
}

function ShortcutInput({ value, onChange, disabled }: ShortcutInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const key = e.key;
      const modifiers: string[] = [];

      if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl');
      if (e.altKey) modifiers.push('Alt');
      if (e.shiftKey) modifiers.push('Shift');

      // Update pressed keys display
      setPressedKeys([...modifiers, key]);

      // Only register if we have modifiers + a non-modifier key
      const isModifierKey = ['Control', 'Alt', 'Shift', 'Meta', 'Command'].includes(key);
      if (modifiers.length > 0 && !isModifierKey) {
        const formattedKey = formatKey(key);
        const accelerator = [...modifiers, formattedKey].join('+');
        onChange(accelerator);
        setIsRecording(false);
        setPressedKeys([]);
      }
    };

    const handleKeyUp = () => {
      // Clear pressed keys display after a short delay if recording
      setTimeout(() => {
        if (isRecording) {
          setPressedKeys([]);
        }
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isRecording, onChange]);

  const formatKey = (key: string): string => {
    const keyMap: { [key: string]: string } = {
      ' ': 'Space',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Escape': 'Escape',
      'Enter': 'Enter',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Tab': 'Tab',
    };
    return keyMap[key] || key.toUpperCase();
  };

  const handleClick = () => {
    if (disabled) return;
    setIsRecording(true);
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    setIsRecording(false);
    setPressedKeys([]);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const displayValue = isRecording
    ? pressedKeys.length > 0
      ? pressedKeys.join(' + ')
      : 'Press shortcut...'
    : value
    ? formatAcceleratorDisplay(value)
    : 'Click to set';

  return (
    <div
      ref={inputRef}
      tabIndex={0}
      onClick={handleClick}
      onBlur={handleBlur}
      className={`
        min-w-[180px] px-3 py-2 border rounded-lg text-sm cursor-pointer
        flex items-center justify-between gap-2
        ${isRecording
          ? 'border-primary-500 ring-2 ring-primary-200 bg-primary-50'
          : 'border-gray-300 hover:border-gray-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span className={isRecording ? 'text-primary-600' : value ? 'text-gray-800' : 'text-gray-400'}>
        {displayValue}
      </span>

      {value && !isRecording && (
        <button
          onClick={handleClear}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default ShortcutInput;
