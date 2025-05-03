import {
  useFloating,
  autoUpdate,
  offset,
  shift,
  flip,
  useHover,
  useDismiss,
  useFocus,
  useInteractions,
  useRole,
  FloatingPortal,
  arrow,
  FloatingArrow,
  OffsetOptions,
  Placement,
} from "@floating-ui/react";
import { useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  content: React.ReactNode;
  enabled?: boolean;
  offset?: OffsetOptions;
  showArrow?: boolean;
  arrowOptions?: any;
  placement?: Placement;
}

export const Tooltip: React.FC<Props> = ({
  children,
  content,
  enabled = true,
  offset: _offset,
  showArrow = false,
  arrowOptions,
  placement,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = useRef(null);

  const floating = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(_offset),
      flip({
        fallbackAxisSideDirection: "start",
      }),
      shift(),
      arrow({
        element: arrowRef,
      }),
    ],
  });

  const hover = useHover(floating.context, { move: false });
  const focus = useFocus(floating.context);
  const dismiss = useDismiss(floating.context);
  const role = useRole(floating.context, { role: "tooltip" });

  const floatingInteractions = useInteractions([hover, focus, dismiss, role]);

  if (!enabled || content === null) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className="w-fit"
        ref={floating.refs.setReference}
        {...floatingInteractions.getReferenceProps()}
      >
        {children}
      </div>
      <FloatingPortal>
        {isOpen && (
          <div
            className="z-20"
            ref={floating.refs.setFloating}
            style={floating.floatingStyles}
            {...floatingInteractions.getFloatingProps()}
          >
            {content}
            {showArrow && (
              <FloatingArrow
                ref={arrowRef}
                context={floating.context}
                {...arrowOptions}
              />
            )}
          </div>
        )}
      </FloatingPortal>
    </>
  );
};
