import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  RiAddLine,
  RiArrowRightSLine,
  RiDeleteBinLine,
  RiFolderOpenLine,
  RiGithubLine,
  RiSettings4Line,
  RiQuestionLine,
  RiErrorWarningLine,
  RiAlertLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SettingsDialog } from "@/features/config/components/settings-dialog";
import { NewProjectDialog } from "@/features/project/components/new-project-dialog";
import { generateId } from "@/lib/utils";
import { ilike, useLiveQuery } from "@tanstack/react-db";
import { projectsCollection } from "@/features/project/projects-collection";
import { useConfig } from "@/features/config/hooks/use-config";

export const Route = createFileRoute("/")({
  loader: async () => {
    await projectsCollection.preload();
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { data: config } = useConfig();
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<(typeof projects.data)[number] | null>(
    null,
  );

  const hasWorkspacePath = config?.workspace?.directory && config.workspace.directory.length > 0;

  const projects = useLiveQuery((q) => {
    let query = q.from({ project: projectsCollection });
    if (searchQuery) {
      query = query.where(({ project }) => ilike(project.name, `%${searchQuery.toLowerCase()}%`));
    }
    return query;
  });

  function handleCreateProject(name: string) {
    if (!projects.collection) return;
    projectsCollection.insert({
      id: generateId(),
      name,
      path: "", // will be set by server
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  function handleDeleteProject(id: string) {
    if (!projects.collection) return;
    projectsCollection.delete(id);
  }

  return (
    <main className="w-full h-full flex items-center justify-center overflow-y-auto">
      <div className="w-full max-w-3xl px-6 py-12 flex flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-7xl font-extralight tracking-tight text-foreground">PIXXL</h1>
          <p className="text-sm text-muted-foreground">Yet another agent management tool</p>
        </header>

        <div className="relative">
          <RiFolderOpenLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/50 focus:border-ring transition-colors"
          />
        </div>

        {!hasWorkspacePath && (
          <Alert variant="destructive">
            <RiAlertLine className="size-4" />
            <AlertTitle>Workspace not configured</AlertTitle>
            <AlertDescription>
              Set a workspace directory in{" "}
              <button
                onClick={() => setSettingsOpen(true)}
                className="underline underline-offset-3 hover:text-foreground"
              >
                Settings → Workspace
              </button>{" "}
              to create projects.
            </AlertDescription>
          </Alert>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Quick Actions
            </h2>
          </div>
          <button
            onClick={() => hasWorkspacePath && setNewProjectOpen(true)}
            className={`group flex items-center gap-4 border border-border bg-card transition-all text-left px-4 py-3 w-full ${!hasWorkspacePath ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted hover:border-ring/50"}`}
          >
            <RiAddLine
              className={`text-muted-foreground transition-colors size-5 ${!hasWorkspacePath ? "" : "group-hover:text-foreground"}`}
            />
            <div>
              <h3 className="font-medium text-sm">New Project</h3>
              <p className="text-muted-foreground text-xs">
                Create a new Pixxl project allowing you to manage everything in one place.
              </p>
            </div>
          </button>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent Projects
            </h2>
            <Button variant="link" size="sm" className="text-muted-foreground pr-0">
              See All <RiArrowRightSLine className="size-3.5" />
            </Button>
          </div>
          <div className="flex flex-col border border-border overflow-hidden">
            {projects.isLoading && (
              <div className="flex h-32 items-center justify-center">
                <span className="text-muted-foreground">Loading...</span>
              </div>
            )}
            {projects.isError && (
              <div className="flex h-32 flex-col items-center justify-center gap-2 px-4 text-center">
                <RiErrorWarningLine className="size-6 text-destructive" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Failed to load projects</p>
                  <p className="text-xs text-muted-foreground">{projects.status}</p>
                </div>
              </div>
            )}
            {!projects.isLoading && !projects.isError && projects.data.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No projects found
              </div>
            )}
            {!projects.isLoading &&
              !projects.isError &&
              projects.data.map((project, index) => (
                <RecentProjectItem
                  key={project.id}
                  project={project}
                  isLast={index === projects.data.length - 1}
                  onDeleteClick={() => setProjectToDelete(project)}
                  onProjectClick={(id) =>
                    navigate({ to: "/app/$projectId", params: { projectId: id } })
                  }
                />
              ))}
          </div>
        </section>

        <footer className="flex items-center justify-center gap-6 pt-4 border-t border-border">
          <FooterLink
            icon={RiSettings4Line}
            label="Settings"
            onClick={() => setSettingsOpen(true)}
          />
          <FooterLink icon={RiQuestionLine} label="Help" href="#" />
          <FooterLink icon={RiGithubLine} label="GitHub" href="#" external />
        </footer>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onCreate={handleCreateProject}
      />

      <AlertDialog
        open={projectToDelete !== null}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (projectToDelete) handleDeleteProject(projectToDelete.id);
                setProjectToDelete(null);
              }}
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function RecentProjectItem({
  project,
  isLast,
  onDeleteClick,
  onProjectClick,
}: {
  project: { id: string; name: string; path: string; createdAt: string };
  isLast: boolean;
  onDeleteClick: () => void;
  onProjectClick: (id: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onProjectClick(project.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onProjectClick(project.id);
      }}
      className={`group flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors cursor-pointer ${!isLast ? "border-b border-border" : ""}`}
    >
      <RiFolderOpenLine className="size-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{project.name}</p>
        <p className="text-xs text-muted-foreground truncate">{project.path}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground translate-x-8 group-hover:translate-x-0 transition-transform">
          Created {new Date(project.createdAt).toLocaleDateString()}
        </span>
        <Button
          variant="destructive"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick();
          }}
          className="opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 cursor-pointer"
          title="Delete project"
        >
          <RiDeleteBinLine />
        </Button>
      </div>
    </div>
  );
}

function FooterLink({
  icon: Icon,
  label,
  external,
  href,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  external?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const Element = onClick ? "button" : "a";
  return (
    <Element
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <Icon className="size-3.5" />
      {label}
    </Element>
  );
}
