import React, { useState, useEffect } from 'react';
import { Terminal, Download, Search } from 'lucide-react';
import AdminLayout from '../../../features/admin/components/AdminLayout/AdminLayout';
import { getAuditLogs } from '../../../features/admin/api/adminService';
import styles from './AuditLogs.module.css';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await getAuditLogs();
        setLogs(data);
      } catch (error) {
        console.error('[AuditLogs] Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Action', 'Admin', 'Resource', 'Status', 'Details'];
    const rows = logs.map(log => [
      log.timestamp,
      log.action,
      log.adminEmail,
      log.resource,
      log.status,
      log.details
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className={styles.auditLogs}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Audit Logs</h1>
            <p className={styles.subtitle}>Immutable record of administrative actions.</p>
          </div>
          <button 
            className={styles.exportButton}
            onClick={handleExportCSV}
          >
            <Download size={16} className={styles.exportIcon} />
            Export CSV
          </button>
        </div>

        <div className={styles.terminalContainer}>
          <div className={styles.terminalHeader}>
            <div className={styles.terminalPrompt}>
              <Terminal size={16} className={styles.terminalIcon} />
              <span className={styles.promptText}>root@volturiano-admin:~/logs</span>
            </div>
            <div className={styles.searchContainer}>
              <Search size={12} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="grep logs..." 
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.terminalBody}>
            {loading ? (
              <div className={styles.loading}>Loading logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className={styles.emptyState}>No logs found matching your search.</div>
            ) : (
              <>
                {filteredLogs.map((log) => (
                  <div key={log.id} className={styles.logRow}>
                    <div className={styles.logTimestamp}>{log.timestamp}</div>
                    <div className={styles.logAction}>{log.action}</div>
                    <div className={styles.logAdmin}>{log.adminEmail}</div>
                    <div className={styles.logDetails}>
                      <span className={`${styles.statusDot} ${log.status === 'success' ? styles.statusDotSuccess : styles.statusDotFailure}`}></span>
                      <span className={styles.logDetailsText}>
                        {log.details} <span className={styles.logResource}>({log.resource})</span>
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Terminal cursor */}
                <div className={styles.cursor}>
                  <span className={styles.cursorPrompt}>➜</span>
                  <span className={styles.cursorBlink}></span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
