import { useState, useEffect } from 'react';

interface OtherLog {
  id: string;
  employee_id: string;
  employee_name: string;
  action: string;
  timestamp: string;
  description: string;
}

export function OtherLogs() {
  const [otherLogs, setOtherLogs] = useState<OtherLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reusable fetching core logic to prevent full-window browser reloads
  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/other-logs');
      const result = await response.json();

      if (result.success) {
        setOtherLogs(result.data);
      } else {
        setError("Failed to retrieve systemic logs from the server.");
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Unable to establish a connection to the backend server pipeline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Safe formatting utility to handle database datetime variations cleanly
  const formatTimestamp = (dateString: string) => {
    if (!dateString) return 'N/A';
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? dateString : parsed.toLocaleString();
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-auto font-sans">
      {/* Breadcrumb Header Nav */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Home</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-400">Logs</span>
          <span className="text-gray-400">/</span>
          <span className="text-blue-600 font-medium">Other Logs</span>
        </div>
      </div>

      {/* Main Container Area */}
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">System Logs</h1>
            <p className="text-xs text-gray-400 mt-1">Immutable monitoring trail of structural and operational actions.</p>
          </div>
          <button 
            onClick={fetchLogs} 
            disabled={loading}
            className="text-sm bg-blue-50 text-blue-600 font-medium px-4 py-2 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {/* Data Matrix Grid Display */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Log ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm font-medium text-gray-400 italic">
                      Loading audit snapshots...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm font-semibold text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : otherLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm font-medium text-gray-400 italic">
                      No matching history logs found within database storage.
                    </td>
                  </tr>
                ) : (
                  otherLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-400 tracking-wider">
                        #{log.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-950">
                        {log.employee_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {log.employee_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 inline-block rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-medium">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate font-medium" title={log.description}>
                        {log.description || '—'}
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