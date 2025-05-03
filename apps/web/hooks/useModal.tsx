import { Dialog, Transition } from "@headlessui/react";

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  Fragment,
} from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/pro-solid-svg-icons";
import Button from "../components/Button";
import clsx from "clsx";

interface ContextProps {
  show: (settings: ModalSettings) => Promise<any>;
  showConfirm: (title: string) => Promise<boolean>;
  showAlert: (title: string) => Promise<void>;
  showInfo: (title: string) => Promise<void>;
  close: () => void;
}

export type CloseModalHandler = (result?: any) => void;

interface ModalSettings {
  title: string;
  children: (onClose: CloseModalHandler) => React.ReactNode;
  panelClasses?: string;
  disableClickOutside?: boolean;
}

const ModalContext = createContext<ContextProps>({} as ContextProps);

export function useModal() {
  return useContext(ModalContext);
}

export const ModalProvider: React.FC<{
  children: React.ReactNode;
}> = (props) => {
  const [open, setOpen] = useState(false);
  const [modalSettings, setModalSettings] = useState<
    ModalSettings & { handleClose: CloseModalHandler }
  >();

  const show = useCallback(
    ({
      title,
      children,
      panelClasses,
      disableClickOutside = false,
    }: ModalSettings) => {
      return new Promise((resolve) => {
        setModalSettings({
          title,
          children,
          panelClasses,
          disableClickOutside,
          handleClose: (result: any) => {
            resolve(result);
            setOpen(false);
          },
        });
        setOpen(true);
      });
    },
    []
  );

  const showConfirm = useCallback((title: string) => {
    return new Promise<boolean>((resolve) => {
      setModalSettings({
        title,
        panelClasses: "lg:w-4/12",
        children: (onClose) => (
          <div className="mt-5 grid grid-flow-row-dense grid-cols-2 gap-3 sm:mt-12">
            <Button
              onClick={() => onClose(false)}
              label="No"
              variant="outline"
              type="button"
            />
            <Button type="button" label="Yes" onClick={() => onClose(true)} />
          </div>
        ),
        handleClose: (result: boolean) => {
          resolve(result);
          setOpen(false);
        },
      });
      setOpen(true);
    });
  }, []);

  const showAlert = useCallback((title: string) => {
    return new Promise<void>((resolve) => {
      setModalSettings({
        title,
        children: (onClose) => (
          <div className="flex w-full justify-end">
            <Button
              classes="w-32"
              type="button"
              label="Ok"
              onClick={() => onClose()}
            />
          </div>
        ),
        handleClose: () => {
          resolve();
          setOpen(false);
        },
      });
      setOpen(true);
    });
  }, []);

  const showInfo = useCallback((title: string) => {
    return new Promise<void>((resolve) => {
      setModalSettings({
        title,
        panelClasses: "max-w-[300px]",
        children: (onClose) => <></>,
        handleClose: () => {
          resolve();
          setOpen(false);
        },
      });
      setOpen(true);
    });
  }, []);

  const value = React.useMemo<ContextProps>(
    () => ({
      show,
      showConfirm,
      showAlert,
      showInfo,
      close: () => setOpen(false),
    }),
    [show, showConfirm, showAlert, showInfo]
  );

  return (
    <ModalContext.Provider value={value} {...props}>
      <Transition.Root show={open} as={Fragment}>
        <Dialog
          as="div"
          static={!modalSettings?.disableClickOutside}
          className="relative z-10"
          onClose={() => {
            if (modalSettings?.disableClickOutside) {
              return null;
            }

            return modalSettings?.handleClose();
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel
                  className={clsx(
                    "relative w-full transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-10/12 sm:p-6 md:w-6/12",
                    modalSettings?.panelClasses
                  )}
                >
                  <div className="flex flex-row justify-between gap-4">
                    {modalSettings?.title && (
                      <h3 className="mr-3 whitespace-pre-wrap pb-4 text-xl font-semibold text-gray-900">
                        {modalSettings.title}
                      </h3>
                    )}
                    <FontAwesomeIcon
                      icon={faTimes}
                      className="mr-1 mt-2 hover:cursor-pointer"
                      color="gray"
                      onClick={() => modalSettings?.handleClose()}
                    />
                  </div>
                  {modalSettings?.children(modalSettings.handleClose)}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
      {props.children}
    </ModalContext.Provider>
  );
};
