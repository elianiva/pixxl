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
import type { AgentMetadata } from "@pixxl/shared";

interface EditAgentDialogProps {
  agent: AgentMetadata | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, name: string) => void;
}

export function EditAgentDialog({ agent, open, onOpenChange, onUpdate }: EditAgentDialogProps) {
  const [name, setName] = useState(agent?.name ?? "");

  // Sync name when agent changes
  if (agent && agent.name !== name && !open) {
    setName(agent.name);
  }

  function submit() {
    if (!agent || !name.trim()) return;
    onUpdate(agent.id, name);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>Update agent name.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Agent name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-agent" />
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
