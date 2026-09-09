import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Highlighter, 
  Type,
  Undo,
  Redo,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionTimeEstimate } from '@shared/sessionTimeEstimator';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  sessionTimeEstimate?: SessionTimeEstimate;
}

function formatEstimatedTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `~${seconds} sec`;
  if (seconds === 0) return `~${minutes} min`;
  return `~${minutes} min ${seconds} sec`;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter session content...',
  sessionTimeEstimate,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '\t');
    }
  };

  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const setTextColor = (color: string) => {
    executeCommand('foreColor', color);
  };

  const setBackgroundColor = (color: string) => {
    executeCommand('hiliteColor', color);
  };

  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Purple', value: '#A855F7' },
  ];

  const highlightColors = [
    { name: 'Yellow', value: '#FEF08A' },
    { name: 'Green', value: '#BBF7D0' },
    { name: 'Blue', value: '#BFDBFE' },
    { name: 'Pink', value: '#FBCFE8' },
    { name: 'Orange', value: '#FED7AA' },
    { name: 'None', value: 'transparent' },
  ];

  return (
    <div className="border rounded-lg bg-card relative">
      <div className="rounded-t-lg border-b bg-muted/50 p-2 space-y-2">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('bold')}
            className="h-8 w-8 p-0"
            title="Bold"
            data-testid="button-bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('italic')}
            className="h-8 w-8 p-0"
            title="Italic"
            data-testid="button-italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('underline')}
            className="h-8 w-8 p-0"
            title="Underline"
            data-testid="button-underline"
          >
            <Type className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('undo')}
            className="h-8 w-8 p-0"
            title="Undo"
            data-testid="button-undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => executeCommand('redo')}
            className="h-8 w-8 p-0"
            title="Redo"
            data-testid="button-redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">Text:</span>
          {colors.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setTextColor(color.value)}
              className={cn(
                "h-6 w-6 rounded border-2 border-border hover:border-foreground transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
              data-testid={`button-text-color-${color.name.toLowerCase()}`}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">Highlight:</span>
          {highlightColors.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setBackgroundColor(color.value)}
              className={cn(
                "h-6 w-6 rounded border-2 transition-colors",
                color.value === 'transparent' 
                  ? "border-border hover:border-foreground bg-white dark:bg-gray-800" 
                  : "border-border hover:border-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              )}
              style={{ 
                backgroundColor: color.value === 'transparent' ? undefined : color.value 
              }}
              title={color.name}
              data-testid={`button-highlight-${color.name.toLowerCase()}`}
            >
              {color.value === 'transparent' && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-4 h-0.5 bg-red-500 rotate-45" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {sessionTimeEstimate && (
        <div
          className="pointer-events-none sticky top-0 z-10 h-0 overflow-visible"
          data-testid="session-time-estimate"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="pointer-events-auto absolute right-0 top-0 flex w-fit max-w-[90%] items-center rounded-bl-lg border-b border-l bg-card/95 px-2.5 py-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                <Timer className="h-3.5 w-3.5" style={{ color: 'var(--club-primary)' }} />
              </div>
              <div className="min-w-0">
                <p className="whitespace-nowrap text-[10px] font-medium leading-none text-muted-foreground">Estimated swimming time</p>
                {sessionTimeEstimate.recognizedLineCount > 0 ? (
                  <p className="text-base font-semibold leading-tight" data-testid="text-estimated-session-time">
                    {formatEstimatedTime(sessionTimeEstimate.totalSeconds)}
                  </p>
                ) : (
                  <p className="truncate text-xs font-medium leading-tight" data-testid="text-estimated-session-time">
                    Add a distance
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {(!value || value === '<br>' || value === '') && (
          <div 
            className="absolute top-4 left-4 text-muted-foreground pointer-events-none text-sm"
            aria-hidden="true"
          >
            {placeholder}
          </div>
        )}
        
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="min-h-[400px] p-4 outline-none overflow-auto whitespace-pre-wrap font-sans text-sm focus:bg-muted/30 transition-colors"
          style={{ wordBreak: 'break-word' }}
          suppressContentEditableWarning
          data-testid="editor-content"
        />
      </div>
    </div>
  );
}
