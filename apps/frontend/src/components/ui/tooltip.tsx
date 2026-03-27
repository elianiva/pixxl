import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";

function TooltipProvider({
  delay = 0,
  ...props
}: React.ComponentProps<typeof BaseTooltip.Provider>) {
  return <BaseTooltip.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}

const createTooltipHandle = BaseTooltip.createHandle;

const Tooltip = BaseTooltip.Root;

const TooltipTrigger = React.forwardRef<
  React.ComponentRef<typeof BaseTooltip.Trigger>,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Trigger>
>(({ className, ...props }, ref) => (
  <BaseTooltip.Trigger
    ref={ref as React.Ref<HTMLButtonElement>}
    data-slot="tooltip-trigger"
    className={cn("data-popup-open:bg-accent data-popup-open:text-accent-foreground", className)}
    {...props}
  />
));
TooltipTrigger.displayName = "TooltipTrigger";

type TooltipTriggerProps = React.ComponentPropsWithoutRef<typeof BaseTooltip.Trigger>;

const TooltipPortal = BaseTooltip.Portal;

const TooltipPositioner = React.forwardRef<
  React.ComponentRef<typeof BaseTooltip.Positioner>,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Positioner>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <BaseTooltip.Positioner
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "isolate z-50",
      "h-(--positioner-height) w-(--positioner-width)",
      "max-w-(--available-width)",
      "transition-[top,left,right,bottom,transform]",
      "duration-[0.35s]",
      "ease-[cubic-bezier(0.22,1,0.36,1)]",
      "data-instant:transition-none",
      className,
    )}
    {...props}
  />
));
TooltipPositioner.displayName = "TooltipPositioner";

const TooltipPopup = React.forwardRef<
  React.ComponentRef<typeof BaseTooltip.Popup>,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup>
>(({ className, ...props }, ref) => (
  <BaseTooltip.Popup
    ref={ref}
    data-slot="tooltip-content"
    className={cn(
      "z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-none bg-foreground px-3 py-1.5 text-xs text-background shadow-md",
      "h-(--popup-height,auto) w-(--popup-width,auto)",
      "transition-[width,height,opacity,scale]",
      "duration-[0.35s]",
      "ease-[cubic-bezier(0.22,1,0.36,1)]",
      "data-starting-style:opacity-0 data-starting-style:scale-90",
      "data-ending-style:opacity-0 data-ending-style:scale-90",
      "data-instant:transition-none",
      "has-data-[slot=kbd]:pr-1.5",
      className,
    )}
    {...props}
  />
));
TooltipPopup.displayName = "TooltipPopup";

const TooltipArrow = React.forwardRef<
  React.ComponentRef<typeof BaseTooltip.Arrow>,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Arrow>
>(({ className, ...props }, ref) => (
  <BaseTooltip.Arrow
    ref={ref}
    className={cn(
      "z-50 size-2.5 rotate-45 bg-foreground fill-foreground",
      "transition-[left,top]",
      "duration-[0.35s]",
      "ease-[cubic-bezier(0.22,1,0.36,1)]",
      "data-instant:transition-none",
      "data-[side=bottom]:-top-1.25",
      "data-[side=top]:-bottom-1.25",
      "data-[side=left]:-right-1",
      "data-[side=right]:-left-1",
      className,
    )}
    {...props}
  />
));
TooltipArrow.displayName = "TooltipArrow";

const TooltipViewport = React.forwardRef<
  React.ComponentRef<typeof BaseTooltip.Viewport>,
  React.ComponentPropsWithoutRef<typeof BaseTooltip.Viewport>
>(({ className, ...props }, ref) => (
  <BaseTooltip.Viewport
    ref={ref}
    className={cn(
      "relative h-full w-full whitespace-nowrap",
      "**:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-none",
      className,
    )}
    {...props}
  />
));
TooltipViewport.displayName = "TooltipViewport";

interface TooltipContentProps {
  handle: TooltipTriggerProps["handle"];
  side?: React.ComponentProps<typeof TooltipPositioner>["side"];
  sideOffset?: number;
  align?: React.ComponentProps<typeof TooltipPositioner>["align"];
  alignOffset?: number;
  className?: string;
}

function TooltipContent({
  handle,
  side = "top",
  sideOffset = 8,
  align = "center",
  alignOffset = 0,
  className,
}: TooltipContentProps) {
  return (
    <Tooltip handle={handle}>
      {({ payload }) => (
        <TooltipPortal>
          <TooltipPositioner
            side={side}
            sideOffset={sideOffset}
            align={align}
            alignOffset={alignOffset}
          >
            <TooltipPopup className={className}>
              <TooltipArrow />
              <TooltipViewport>{payload as React.ReactNode}</TooltipViewport>
            </TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      )}
    </Tooltip>
  );
}

export type { TooltipTriggerProps };
export {
  TooltipProvider,
  createTooltipHandle,
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
  TooltipArrow,
  TooltipViewport,
  TooltipContent,
};
