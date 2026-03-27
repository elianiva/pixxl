"use client";

import { useMemo } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import type { SessionTreeNode } from "@pixxl/shared";
import { RiFolderOpenLine, RiFileLine, RiCornerDownRightFill } from "@remixicon/react";

interface SessionTreeViewProps {
  nodes: readonly SessionTreeNode[];
  leafId: string;
}

interface TreeNodeWithChildren extends SessionTreeNode {
  children: TreeNodeWithChildren[];
  depth: number;
}

function buildTree(nodes: readonly SessionTreeNode[]): TreeNodeWithChildren[] {
  const nodeMap = new Map<string, TreeNodeWithChildren>();

  // First pass: create nodes with empty children
  for (const node of nodes) {
    nodeMap.set(node.id, {
      ...node,
      children: [],
      depth: 0,
    });
  }

  // Second pass: build parent-child relationships
  const roots: TreeNodeWithChildren[] = [];
  for (const node of nodes) {
    const treeNode = nodeMap.get(node.id)!;
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(treeNode);
        treeNode.depth = parent.depth + 1;
      } else {
        roots.push(treeNode);
      }
    } else {
      roots.push(treeNode);
    }
  }

  return roots;
}

function TreeNodeItem({
  node,
  leafId,
  defaultOpen,
}: {
  node: TreeNodeWithChildren;
  leafId: string;
  defaultOpen: boolean;
}) {
  const isLeaf = node.id === leafId;
  const hasChildren = node.children.length > 0;
  const Icon = hasChildren ? RiFolderOpenLine : RiFileLine;

  const content = (
    <div
      className={`flex items-center gap-1.5 py-1 ${
        isLeaf ? "text-foreground font-medium" : "text-muted-foreground"
      }`}
      style={{ paddingLeft: `${node.depth * 12}px` }}
    >
      {hasChildren && <RiCornerDownRightFill className="size-3 text-muted-foreground/50" />}
      <Icon className={`size-3.5 ${isLeaf ? "text-emerald-500" : ""}`} />
      <span className="truncate text-xs">
        {node.label || node.role || node.type}
        {isLeaf && <span className="ml-1 text-[10px] text-emerald-500">(current)</span>}
      </span>
    </div>
  );

  if (!hasChildren) {
    return content;
  }

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger>{content}</CollapsibleTrigger>
      <CollapsibleContent>
        {node.children.map((child) => (
          <TreeNodeItem key={child.id} node={child} leafId={leafId} defaultOpen={defaultOpen} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SessionTreeView({ nodes, leafId }: SessionTreeViewProps) {
  const treeRoots = useMemo(() => buildTree(nodes), [nodes]);

  if (nodes.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-4 text-center">No session entries found</div>
    );
  }

  return (
    <div className="border rounded p-2 bg-muted/30">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
        Session Tree
      </p>
      <div className="space-y-0.5">
        {treeRoots.map((root) => (
          <TreeNodeItem key={root.id} node={root} leafId={leafId} defaultOpen={true} />
        ))}
      </div>
    </div>
  );
}
