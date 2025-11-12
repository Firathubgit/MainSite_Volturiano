import { useEffect, useRef } from 'react';

const renderLogs = [];
let isEnabled = false;
let startTime = null;

export function enableRenderLogger() {
  isEnabled = true;
  startTime = performance.now();
  renderLogs.length = 0;
  console.log('%c[Render Logger] Enabled', 'color: #4CAF50; font-weight: bold;');
}

export function disableRenderLogger() {
  isEnabled = false;
  console.log('%c[Render Logger] Disabled', 'color: #f44336; font-weight: bold;');
}

export function clearRenderLogs() {
  renderLogs.length = 0;
  console.clear();
  console.log('%c[Render Logger] Logs cleared', 'color: #2196F3; font-weight: bold;');
}

export function getRenderLogs() {
  return [...renderLogs];
}

export function useRenderLogger(componentName, props = {}) {
  const renderCountRef = useRef(0);
  const prevPropsRef = useRef(props);

  useEffect(() => {
    if (!isEnabled) return;

    renderCountRef.current += 1;
    const now = performance.now();
    const timeSinceStart = startTime ? (now - startTime).toFixed(2) : '0.00';
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });

    // Detect prop changes
    const propChanges = [];
    if (renderCountRef.current > 1) {
      Object.keys({ ...prevPropsRef.current, ...props }).forEach((key) => {
        if (prevPropsRef.current[key] !== props[key]) {
          propChanges.push(key);
        }
      });
    }
    prevPropsRef.current = { ...props };

    const logEntry = {
      component: componentName,
      renderCount: renderCountRef.current,
      timestamp,
      timeSinceStart: `${timeSinceStart}ms`,
      propChanges: propChanges.length > 0 ? propChanges : null
    };

    renderLogs.push(logEntry);

    // Console output with styling
    const style = renderCountRef.current === 1 ? 'color: #2196F3;' : 'color: #FF9800;';
    const changeInfo = propChanges.length > 0
      ? `%c (props changed: ${propChanges.join(', ')})`
      : '';
    
    console.log(
      `%c[${timestamp}] %c${componentName} %c#${renderCountRef.current}%c ${timeSinceStart}ms${changeInfo}`,
      'color: #666;',
      style + 'font-weight: bold;',
      'color: #9E9E9E; font-size: 0.9em;',
      'color: #666;',
      changeInfo ? 'color: #4CAF50; font-weight: bold;' : ''
    );
  });
}

// Auto-enable in dev mode
if (import.meta.env.DEV) {
  enableRenderLogger();
}

