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
import { useUpdateAgent } from "../hooks/use-agent";
import type { AgentMetadata } from "@pixxl/shared";

interface EditAgentDialogProps {
  agent: AgentMetadata | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAgentDialog({ agent, open, onOpenChange }: EditAgentDialogProps) {
  const [name, setName] = useState(agent?.name ?? "");
  const updateAgent = useUpdateAgent();

  // Reset form when agent changes
  useState(() => {
    if (agent) {
      setName(agent.name);
    }
  });

  function submit() {
    if (!agent || !name.trim()) return;

    updateAgent.mutate(
      { id: agent.id, name },
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
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>Update agent name.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Agent name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-agent" />
          </div>
          {updateAgent.error instanceof Error && (
            <p className="text-xs text-destructive">{updateAgent.error.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange.bind(null, false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={updateAgent.isPending}>
            {updateAgent.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
