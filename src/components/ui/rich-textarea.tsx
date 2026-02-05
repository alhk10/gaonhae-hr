import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Italic, Underline } from "lucide-react";

export interface RichTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

const RichTextarea = React.forwardRef<HTMLTextAreaElement, RichTextareaProps>(
  ({ className, value, onChange, onValueChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const combinedRef = (node: HTMLTextAreaElement) => {
      textareaRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const wrapSelection = (marker: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = (value as string) || '';
      const selectedText = currentValue.substring(start, end);

      if (!selectedText) return;

      // Check if text is already wrapped with this marker
      const beforeSelection = currentValue.substring(0, start);
      const afterSelection = currentValue.substring(end);

      let newValue: string;
      let newStart: number;
      let newEnd: number;

      // Check if already wrapped - remove the markers
      if (
        beforeSelection.endsWith(marker) &&
        afterSelection.startsWith(marker)
      ) {
        newValue =
          beforeSelection.slice(0, -marker.length) +
          selectedText +
          afterSelection.slice(marker.length);
        newStart = start - marker.length;
        newEnd = end - marker.length;
      } else {
        // Add the markers
        newValue = beforeSelection + marker + selectedText + marker + afterSelection;
        newStart = start + marker.length;
        newEnd = end + marker.length;
      }

      // Trigger change
      if (onValueChange) {
        onValueChange(newValue);
      }
      if (onChange) {
        const event = {
          target: { value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
      }

      // Restore selection after state update
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newStart, newEnd);
      }, 0);
    };

    const handleBold = () => wrapSelection('**');
    const handleItalic = () => wrapSelection('_');
    const handleUnderline = () => wrapSelection('__');

    return (
      <div className="space-y-2">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBold}
            className="h-8 w-8 p-0"
            title="Bold (select text first)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleItalic}
            className="h-8 w-8 p-0"
            title="Italic (select text first)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUnderline}
            className="h-8 w-8 p-0"
            title="Underline (select text first)"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2 self-center">
            Select text, then click format
          </span>
        </div>
        <Textarea
          ref={combinedRef}
          className={cn(className)}
          value={value}
          onChange={onChange}
          {...props}
        />
      </div>
    );
  }
);

RichTextarea.displayName = "RichTextarea";

export { RichTextarea };
