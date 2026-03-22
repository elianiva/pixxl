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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateCommand } from "../hooks/use-command";

interface NewCommandDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewCommandDialog({ projectId, open, onOpenChange }: NewCommandDialogProps) {
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [description, setDescription] = useState("");
  const createCommand = useCreateCommand();

  function submit() {
    if (!name.trim() || !command.trim()) return;

    createCommand.mutate(
      { projectId, name, command, description },
      {
        onSuccess: () => {
          setName("");
          setCommand("");
          setDescription("");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Command</DialogTitle>
          <DialogDescription>Create a new command in your project.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Command name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="build" />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Command</label>
            <Textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="npm run build"
              rows={2}
            />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Build the project"
            />
          </div>
          {createCommand.error instanceof Error && (
            <p className="text-xs text-destructive">{createCommand.error.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange.bind(null, false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={createCommand.isPending}>
            {createCommand.isPending ? "Creating..." : "Create Command"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
