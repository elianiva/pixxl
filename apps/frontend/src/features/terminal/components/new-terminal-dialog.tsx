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
import { useCreateTerminal } from "../hooks/use-terminal";

interface NewTerminalDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTerminalDialog({ projectId, open, onOpenChange }: NewTerminalDialogProps) {
  const [name, setName] = useState("");
  const [shell, setShell] = useState("bash");
  const createTerminal = useCreateTerminal();

  function submit() {
    if (!name.trim()) return;

    createTerminal.mutate(
      { projectId, name, shell },
      {
        onSuccess: () => {
          setName("");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Terminal</DialogTitle>
          <DialogDescription>Create a new terminal in your project.</DialogDescription>
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
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Shell</label>
            <Input value={shell} onChange={(e) => setShell(e.target.value)} placeholder="bash" />
          </div>
          {createTerminal.error instanceof Error && (
            <p className="text-xs text-destructive">{createTerminal.error.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange.bind(null, false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={createTerminal.isPending}>
            {createTerminal.isPending ? "Creating..." : "Create Terminal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
