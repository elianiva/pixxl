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
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
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
import { useDeleteProject, useListProjects } from "@/features/project/hooks/use-project";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  const deleteProjectMutation = useDeleteProject();
  const { data: projects = [], status } = useListProjects({ onlyRecents: true });

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <main className="w-full h-full flex items-center justify-center overflow-y-auto">
      <div className="w-full max-w-3xl px-6 py-12 flex flex-col gap-10">
        {/* Hero */}
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-7xl font-extralight tracking-tight text-foreground">PIXXL</h1>
          <p className="text-sm text-muted-foreground">Yet another agent management tool</p>
        </header>

        {/* Search */}
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

        {/* Quick Actions */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard
              icon={RiFolderOpenLine}
              title="Import Project"
              description="Open an existing folder as a project"
              href="#"
            />
            <QuickActionCard
              icon={RiAddLine}
              title="New Project"
              description="Create a new workspace"
              onClick={() => setNewProjectOpen(true)}
            />
          </div>
        </section>

        {/* Projects */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent Projects
            </h2>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              See All
              <RiArrowRightSLine className="size-3.5" />
            </Button>
          </div>
          <div className="flex flex-col border border-border overflow-hidden">
            {status === "pending" && (
              <div className="flex h-32 items-center justify-center">
                <span className="text-muted-foreground">Loading...</span>
              </div>
            )}
            {status === "error" && (
              <div className="flex h-32 items-center justify-center">
                <span className="text-destructive">Error loading projects</span>
              </div>
            )}
            {status === "success" &&
              (filteredProjects.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No projects found
                </div>
              ) : (
                filteredProjects.map((project, index) => (
                  <RecentProjectItem
                    key={project.path}
                    project={project}
                    isLast={index === filteredProjects.length - 1}
                    onDeleteClick={() => setDeleteProjectId(project.id)}
                    onProjectClick={(id) =>
                      navigate({ to: "/app/$projectId", params: { projectId: id } })
                    }
                  />
                ))
              ))}
          </div>
        </section>

        {/* Footer */}
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

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />

      {/* Delete Project Dialog */}
      <AlertDialog
        open={deleteProjectId !== null}
        onOpenChange={(open) => !open && setDeleteProjectId(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "
              {projects.find((p) => p.id === deleteProjectId)?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteProjectId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteProjectId) {
                  deleteProjectMutation.mutate(
                    { id: deleteProjectId },
                    { onSuccess: () => setDeleteProjectId(null) },
                  );
                }
              }}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

interface QuickActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

function QuickActionCard({ icon: Icon, title, description, href, onClick }: QuickActionCardProps) {
  if (onClick && href) {
    throw new Error("Cannot use onClick and href on the same element");
  }

  const QuickActionElement = onClick ? "button" : "a";

  return (
    <QuickActionElement
      href={href}
      onClick={onClick}
      className="group flex justify-between gap-2 p-4 border border-border bg-card hover:bg-muted hover:border-ring/50 transition-all cursor-pointer text-left"
    >
      <div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center justify-between">
        <Icon className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </QuickActionElement>
  );
}

interface RecentProjectItemProps {
  project: {
    id: string;
    name: string;
    path: string;
    createdAt: string;
  };
  isLast: boolean;
  onDeleteClick: () => void;
  onProjectClick: (id: string) => void;
}

function RecentProjectItem({
  project,
  isLast,
  onDeleteClick,
  onProjectClick,
}: RecentProjectItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onProjectClick(project.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onProjectClick(project.id);
        }
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

interface FooterLinkProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  external?: boolean;
  href?: string;
  onClick?: () => void;
}

function FooterLink(props: FooterLinkProps) {
  if (props.onClick && props.href) {
    throw new Error("Cannot use onClick and href on the same element");
  }

  const FooterElement = props.onClick ? "button" : "a";

  return (
    <FooterElement
      href={props.href}
      onClick={props.onClick}
      target={props.external ? "_blank" : undefined}
      rel={props.external ? "noopener noreferrer" : undefined}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <props.icon className="size-3.5" />
      {props.label}
    </FooterElement>
  );
}
