import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Italic, Underline, List, IndentIncrease, IndentDecrease } from "lucide-react";

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

    const triggerChange = (newValue: string) => {
      if (onValueChange) {
        onValueChange(newValue);
      }
      if (onChange) {
        const event = {
          target: { value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
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

      const beforeSelection = currentValue.substring(0, start);
      const afterSelection = currentValue.substring(end);

      let newValue: string;
      let newStart: number;
      let newEnd: number;

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
        newValue = beforeSelection + marker + selectedText + marker + afterSelection;
        newStart = start + marker.length;
        newEnd = end + marker.length;
      }

      triggerChange(newValue);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newStart, newEnd);
      }, 0);
    };

    const handleNumberedList = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = (value as string) || '';
      const selectedText = currentValue.substring(start, end);

      if (!selectedText) return;

      const lines = selectedText.split('\n');
      const numberedLines = lines.map((line, index) => {
        // Check if line already has a number prefix
        const numberMatch = line.match(/^\d+\.\s*/);
        if (numberMatch) {
          // Remove the number prefix
          return line.substring(numberMatch[0].length);
        } else {
          // Add number prefix
          return `${index + 1}. ${line}`;
        }
      });

      const newText = numberedLines.join('\n');
      const beforeSelection = currentValue.substring(0, start);
      const afterSelection = currentValue.substring(end);
      const newValue = beforeSelection + newText + afterSelection;

      triggerChange(newValue);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + newText.length);
      }, 0);
    };

    const handleIndent = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = (value as string) || '';
      const selectedText = currentValue.substring(start, end);

      if (!selectedText) return;

      const lines = selectedText.split('\n');
      const indentedLines = lines.map(line => '    ' + line);
      const newText = indentedLines.join('\n');

      const beforeSelection = currentValue.substring(0, start);
      const afterSelection = currentValue.substring(end);
      const newValue = beforeSelection + newText + afterSelection;

      triggerChange(newValue);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + newText.length);
      }, 0);
    };

    const handleOutdent = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = (value as string) || '';
      const selectedText = currentValue.substring(start, end);

      if (!selectedText) return;

      const lines = selectedText.split('\n');
      const outdentedLines = lines.map(line => {
        // Remove up to 4 leading spaces or a tab
        if (line.startsWith('    ')) {
          return line.substring(4);
        } else if (line.startsWith('\t')) {
          return line.substring(1);
        } else if (line.startsWith('  ')) {
          return line.substring(2);
        }
        return line;
      });
      const newText = outdentedLines.join('\n');

      const beforeSelection = currentValue.substring(0, start);
      const afterSelection = currentValue.substring(end);
      const newValue = beforeSelection + newText + afterSelection;

      triggerChange(newValue);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + newText.length);
      }, 0);
    };

    const handleBold = () => wrapSelection('**');
    const handleItalic = () => wrapSelection('_');
    const handleUnderline = () => wrapSelection('__');

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1 items-center">
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
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNumberedList}
            className="h-8 w-8 p-0"
            title="Numbered list (select lines first)"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleIndent}
            className="h-8 w-8 p-0"
            title="Indent (select text first)"
          >
            <IndentIncrease className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOutdent}
            className="h-8 w-8 p-0"
            title="Outdent (select text first)"
          >
            <IndentDecrease className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
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
