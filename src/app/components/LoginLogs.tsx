import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, History } from 'lucide-react';

interface LogEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  login_time: string;
  logout_time: string | null;
}

export function LoginLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/logs');
        const result = await response.json();
        if (result.success) {
          setLogs(result.data);
        } else {
          setError(result.message || "Failed to load logs");
        }
      } catch (err) {
        setError("Could not connect to the server.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Home</span>
          <span className="text-gray-400">/</span>
          <span className="text-blue-600">Login Logs</span>
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <History className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Login Logs</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Employee ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Employee Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Login Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Logout Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400">No records found.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{log.employee_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.employee_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(log.login_time).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {log.logout_time ? new Date(log.logout_time).toLocaleString() : (
                          <span className="text-green-600 font-medium">Active Session</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}