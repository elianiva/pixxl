import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { TerminalMetadata } from "@pixxl/shared";

interface EditTerminalDialogProps {
  terminal: TerminalMetadata | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, name: string) => void;
}

export function EditTerminalDialog({
  terminal,
  open,
  onOpenChange,
  onUpdate,
}: EditTerminalDialogProps) {
  const [name, setName] = useState(terminal?.name ?? "");

  // Sync values when terminal changes or dialog opens
  useEffect(() => {
    if (terminal) {
      setName(terminal.name);
    }
  }, [terminal?.id, open]);

  function submit() {
    if (!terminal || !name.trim()) return;
    onUpdate(terminal.id, name);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Terminal</DialogTitle>
          <DialogDescription>Update terminal name.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <label htmlFor="terminal-name" className="text-sm font-medium">
              Terminal name
            </label>
            <Input
              id="terminal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-terminal"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange.bind(null, false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
