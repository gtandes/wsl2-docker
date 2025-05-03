import React, { useEffect, useState } from "react";
import { withAuth } from "../../../hooks/withAuth";
import { AdminGroup } from "../../../types/roles";
import { query } from "../../../utils/utils";

interface ILog {
  id: number;
  status: string;
  competency_type: string | null;
  event_type: string | null;
  agency: string | null;
  user_id: string | null;
  date_created: string;
  payload: string;
  method: string;
}

function Webhooks() {
  const [logs, setLogs] = useState<ILog[]>([]);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const logsUrl = new URL(
          `/api/v1/hsh-webhooks/logs`,
          window.location.origin
        );
        const response = await query(logsUrl.toString(), "GET");
        const data = await response.json();
        if (data) {
          setLogs(data);
        } else {
          console.warn("No data in response:", response);
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    }
    fetchLogs();
  }, []);

  return (
    <div className="p-6">
      <h2 className="mb-6 text-2xl font-semibold text-gray-800">
        Webhook Logs (Latest 50)
      </h2>
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md">
        <table className="w-full table-auto">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm font-medium text-gray-600">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Competency Type</th>
              <th className="px-4 py-3">Event Type</th>
              <th className="px-4 py-3">Agency</th>
              <th className="px-4 py-3">Payload</th>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Date Created</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-t transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm text-gray-700">{log.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {log.status}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {log.method}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {log.competency_type || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {log.event_type || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {log.agency || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {log.payload ? (
                      <pre className="bg-gray-100 p-2 text-xs">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {log.user_id || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(log.date_created).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-center text-gray-500">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default withAuth(Webhooks, AdminGroup);
