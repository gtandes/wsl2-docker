import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { Spinner } from "../../../Spinner";
import { SyncActionType } from "./enum";

interface SyncResult {
  email: string;
  first_name: string;
  last_name: string;
  status: "success" | "failed";
  reason?: string;
  bullhornId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  isLoading?: boolean;
  results?: SyncResult[];
  error?: string | null;
  actionType: SyncActionType;
}

export default function SyncBullhornModal({
  open,
  onClose,
  isLoading = false,
  results = [],
  error = null,
  actionType,
}: Props) {
  const [filter, setFilter] = useState("");

  const filteredResults = results.filter((r) =>
    `${r.first_name} ${r.last_name} ${r.email}`
      .toLowerCase()
      .includes(filter.toLowerCase())
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-8">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-full p-1 focus:outline-none"
                  aria-label="Close"
                >
                  <span className="text-xl">&times;</span>
                </button>

                <Dialog.Title className="text-xl font-semibold">
                  {actionType === "syncToBH"
                    ? "Syncing Profiles to Bullhorn"
                    : "Syncing Profiles from Bullhorn"}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-gray-500">
                  This process will sync clinicians{" "}
                  {actionType === "syncToBH" ? "to" : "from"} Bullhorn. Once
                  completed, the results will be displayed below.
                </Dialog.Description>

                {error && (
                  <div className="mt-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {results.length > 0 && (
                    <input
                      type="text"
                      className="w-full rounded border px-3 py-1 text-sm"
                      placeholder="Filter by name or email..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  )}

                  <div className="font-mono h-[300px] max-h-[calc(100vh-300px)] overflow-y-auto rounded border bg-gray-50 p-2 text-sm">
                    {isLoading ? (
                      <div className="flex h-full items-center justify-center text-gray-500">
                        <div className="flex items-center gap-2">
                          <Spinner />
                          Syncing candidates...
                        </div>
                      </div>
                    ) : (
                      <>
                        {filteredResults.length > 0 ? (
                          <div className="overflow-hidden">
                            <ul className="divide-y">
                              {paginatedResults.map((r, idx) => (
                                <li
                                  key={`${r.email}-${idx}`}
                                  className="grid grid-cols-3 items-center px-4 py-3 text-sm hover:bg-gray-50"
                                >
                                  <div className="font-medium text-gray-800">
                                    {r.first_name} {r.last_name}
                                  </div>
                                  <div className="text-center text-gray-500">
                                    {r.email}
                                  </div>
                                  <div className="text-right">
                                    <span
                                      className={`font-semibold ${
                                        r.status === "success"
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {r.status === "success"
                                        ? "✔ Completed"
                                        : "✖ Failed"}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center text-gray-500">
                            <div className="flex items-center gap-2">
                              No Results!
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-center gap-2 text-sm text-gray-700">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(p + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded border px-3 py-1 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
