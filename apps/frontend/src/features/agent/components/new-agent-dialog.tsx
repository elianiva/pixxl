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
import { useCreateAgent } from "../hooks/use-agent";

interface NewAgentDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewAgentDialog({ projectId, open, onOpenChange }: NewAgentDialogProps) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [maxTokens, setMaxTokens] = useState(4096);
  const [temperature, setTemperature] = useState(0.7);
  const createAgent = useCreateAgent();

  function submit() {
    if (!name.trim()) return;

    createAgent.mutate(
      { projectId, name, provider, model, maxTokens, temperature },
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
          <DialogTitle>New Agent</DialogTitle>
          <DialogDescription>Create a new agent in your project.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Agent name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-agent" />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Provider</label>
            <Input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="openai"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Model</label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o" />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Max Tokens</label>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">Temperature</label>
            <Input
              type="number"
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </div>
          {createAgent.error instanceof Error && (
            <p className="text-xs text-destructive">{createAgent.error.message}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange.bind(null, false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={createAgent.isPending}>
            {createAgent.isPending ? "Creating..." : "Create Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
