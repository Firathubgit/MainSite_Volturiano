import React, { useEffect, useState } from 'react';
import {
  enableRenderLogger,
  disableRenderLogger,
  clearRenderLogs,
  getRenderLogs,
  useRenderLogger
} from '../../debug/useRenderLogger';
import styles from './RenderLogger.module.css';

function RenderLoggerDisplay() {
  useRenderLogger('RenderLoggerDisplay');
  const [logs, setLogs] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!isEnabled) {
      disableRenderLogger();
      return;
    }
    enableRenderLogger();
  }, [isEnabled]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLogs(getRenderLogs());
    }, 100);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleClear = () => {
    clearRenderLogs();
    setLogs([]);
  };

  const handleToggle = () => {
    setIsEnabled((prev) => !prev);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Component Render Logger</h1>
        <p className={styles.subtitle}>
          Monitor component renders in real-time. Each render is logged with timestamp, render count,
          and prop changes.
        </p>

        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.button} ${isEnabled ? styles.buttonActive : ''}`}
            onClick={handleToggle}
          >
            {isEnabled ? 'Disable Logger' : 'Enable Logger'}
          </button>
          <button type="button" className={styles.buttonSecondary} onClick={handleClear}>
            Clear Logs
          </button>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Total Renders</span>
            <span className={styles.statValue}>{logs.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Unique Components</span>
            <span className={styles.statValue}>
              {new Set(logs.map((log) => log.component)).size}
            </span>
          </div>
        </div>

        <div className={styles.logContainer}>
          {logs.length === 0 ? (
            <p className={styles.empty}>No renders logged yet. Navigate around the app to see renders.</p>
          ) : (
            <div className={styles.logList}>
              {logs.slice(-100).reverse().map((log, index) => (
                <div key={index} className={styles.logEntry}>
                  <span className={styles.logTime}>{log.timestamp}</span>
                  <span className={styles.logComponent}>{log.component}</span>
                  <span className={styles.logCount}>#{log.renderCount}</span>
                  <span className={styles.logDuration}>{log.timeSinceStart}</span>
                  {log.propChanges && (
                    <span className={styles.logProps}>
                      props: {log.propChanges.join(', ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className={styles.note}>
          Tip: Open the browser console to see detailed render logs with color coding. First renders
          are blue, subsequent renders are orange.
        </p>
      </div>
    </div>
  );
}

export default RenderLoggerDisplay;

