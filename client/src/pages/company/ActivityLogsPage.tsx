import React, { useState, useEffect } from 'react';
import { FileText, Clock, RotateCw, Shield } from 'lucide-react';
import { dashboardApi } from '../../api/index.js';
import { ActivityLogItem } from '../../types/index.js';
import { Card, Button, Badge } from '../../components/common/index.js';

export const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getActivity();
      setLogs(res.data.data || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] font-heading">
            Company Activity & Audit Logs
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Full compliance audit trail of watermark operations, member updates, and file downloads.
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={fetchLogs}>
          <RotateCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-heading">
                <th className="py-3 px-5">Event Action</th>
                <th className="py-3 px-5">Target Resource</th>
                <th className="py-3 px-5">Actor</th>
                <th className="py-3 px-5">IP Address</th>
                <th className="py-3 px-5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#64748B]">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#64748B]">
                    No activity logs recorded.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#F8FAFC]/60 transition">
                    <td className="py-3 px-5">
                      <span className="font-semibold text-[#1E293B] font-mono">{log.action}</span>
                    </td>
                    <td className="py-3 px-5">
                      <Badge variant="primary" size="sm">
                        {log.resourceType}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 text-[#64748B]">
                      {log.actorId?.name || 'System Actor'}
                    </td>
                    <td className="py-3 px-5 text-[#64748B] font-mono text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-5 text-right text-[#64748B]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
