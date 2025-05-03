import React, { ButtonHTMLAttributes } from "react";
import { Popover, Transition } from "@headlessui/react";
import clsx from "clsx";
import {
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";

interface Props {
  button: React.ReactNode;
  children: React.ReactNode;
  panelClasses?: string;
  buttonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}

export interface PopOverItemProps {
  onClick?: () => void;
  children: React.ReactNode;
  isDisabled?: boolean;
}

export const PopOverItem = ({
  onClick,
  children,
  isDisabled,
}: PopOverItemProps) => {
  const clickHandler = () => {
    if (onClick) onClick();
  };

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={clickHandler}
      key={children?.toString()}
      className="mx-4 my-2 flex w-40 items-center rounded-lg bg-white p-2 pl-4 transition duration-150 ease-in-out hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <p className="text-sm font-medium text-blue-900">{children}</p>
    </button>
  );
};

export const PopOver = ({
  button,
  children,
  panelClasses,
  buttonProps,
}: Props) => {
  const { refs, floatingStyles, context } = useFloating();
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss]);

  return (
    <Popover className="relative">
      <Popover.Button
        ref={refs.setReference}
        {...buttonProps}
        {...getReferenceProps()}
      >
        {button}
      </Popover.Button>
      <Transition
        enter="transition duration-100 ease-out"
        enterFrom="transform scale-95 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-75 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-95 opacity-0"
      >
        <FloatingPortal>
          <Popover.Panel
            ref={refs.setFloating}
            style={floatingStyles}
            className={clsx(
              "absolute mt-2 w-48 rounded-lg bg-white shadow-lg",
              panelClasses
            )}
            {...getFloatingProps()}
          >
            {children}
          </Popover.Panel>
        </FloatingPortal>
      </Transition>
    </Popover>
  );
};
