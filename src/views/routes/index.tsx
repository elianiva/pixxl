import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  RiAddLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiFolderOpenLine,
  RiGithubLine,
  RiSettings4Line,
  RiTimeLine,
  RiQuestionLine,
} from "@remixicon/react";
import { Button } from "@/views/components/ui/button";
import { SettingsDialog } from "@/views/components/ui/settings";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

// Sample data - replace with actual data source
const recentProjects = [
  {
    id: "1",
    name: "pixxl",
    path: "~/Development/personal/pixxl",
    lastOpened: "2 hours ago",
  },
  {
    id: "2",
    name: "api-gateway",
    path: "~/Development/work/api-gateway",
    lastOpened: "Yesterday",
  },
  {
    id: "3",
    name: "dashboard-app",
    path: "~/Development/clients/acme/dashboard",
    lastOpened: "3 days ago",
  },
];

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const filteredProjects = recentProjects.filter((project) =>
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
              title="Open Project"
              description="Open an existing folder"
              href="#"
            />
            <QuickActionCard
              icon={RiAddLine}
              title="New Project"
              description="Create a new workspace"
              href="#"
            />
          </div>
        </section>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
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
              {filteredProjects.map((project, index) => (
                <RecentProjectItem
                  key={project.id}
                  project={project}
                  isLast={index === filteredProjects.length - 1}
                />
              ))}
              {filteredProjects.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No projects found
                </div>
              )}
            </div>
          </section>
        )}

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
    </main>
  );
}

interface QuickActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}

function QuickActionCard({ icon: Icon, title, description, href }: QuickActionCardProps) {
  return (
    <a
      href={href}
      className="group flex justify-between gap-2 p-4 border border-border bg-card hover:bg-muted hover:border-ring/50 transition-all cursor-pointer"
    >
      <div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center justify-between">
        <Icon className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </a>
  );
}

interface RecentProjectItemProps {
  project: {
    id: string;
    name: string;
    path: string;
    lastOpened: string;
  };
  isLast: boolean;
}

function RecentProjectItem({ project, isLast }: RecentProjectItemProps) {
  return (
    <a
      href="#"
      className={`group flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors cursor-pointer ${
        !isLast ? "border-b border-border" : ""
      }`}
    >
      <RiFolderOpenLine className="size-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{project.name}</p>
        <p className="text-xs text-muted-foreground truncate">{project.path}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground translate-x-8 group-hover:translate-x-0 transition-transform">
          <RiTimeLine className="size-3" />
          {project.lastOpened}
        </span>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted-foreground/10 transition-all"
          title="Remove from recents"
        >
          <RiCloseLine className="size-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    </a>
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
