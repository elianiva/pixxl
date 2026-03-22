import { useState } from "react";
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
import { useUpdateTerminal } from "../hooks/use-terminal";
import type { TerminalMetadata } from "@pixxl/shared";

interface EditTerminalDialogProps {
  terminal: TerminalMetadata | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTerminalDialog({ terminal, open, onOpenChange }: EditTerminalDialogProps) {
  const [name, setName] = useState(terminal?.name ?? "");
  const updateTerminal = useUpdateTerminal();

  // Reset form when terminal changes
  useState(() => {
    if (terminal) {
      setName(terminal.name);
    }
  });

  function submit() {
    if (!terminal || !name.trim()) return;

    updateTerminal.mutate(
      { id: terminal.id, name },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Terminal</DialogTitle>
          <DialogDescription>Update terminal name.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Terminal name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-terminal"
            />
          </div>
          {updateTerminal.error instanceof Error && (
            <p className="text-xs text-destructive">{updateTerminal.error.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange.bind(null, false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={updateTerminal.isPending}>
            {updateTerminal.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
