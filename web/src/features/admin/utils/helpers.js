/**
 * Format relative time (e.g., "2 mins ago", "1 hour ago")
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(',', '');
}

/**
 * Format currency
 */
export function formatCurrency(cents, currency = 'EUR') {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: currency
  }).format(cents / 100);
}

/**
 * Format date
 */
export function formatDate(dateString, format = 'short') {
  if (!dateString) return '';
  const date = new Date(dateString);
  
  if (format === 'short') {
    return date.toLocaleDateString();
  } else if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return date.toLocaleDateString();
}

/**
 * Detect circular dependencies in layers using DFS
 */
export function detectCircularDependencies(layers) {
  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  const dfs = (layerId, path) => {
    if (recStack.has(layerId)) {
      cycles.push([...path, layerId]);
      return true;
    }
    
    if (visited.has(layerId)) {
      return false;
    }

    visited.add(layerId);
    recStack.add(layerId);

    const layer = layers.find(l => l.id === layerId);
    if (layer && layer.dependencies) {
      for (const depId of layer.dependencies) {
        dfs(depId, [...path, layerId]);
      }
    }

    recStack.delete(layerId);
    return false;
  };

  layers.forEach(layer => {
    if (!visited.has(layer.id)) {
      dfs(layer.id, []);
    }
  });

  return cycles;
}

/**
 * Increment version number
 */
export function incrementVersion(currentVersion) {
  if (typeof currentVersion === 'string') {
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0]) || 0;
    const minor = parseInt(parts[1]) || 0;
    const patch = parseInt(parts[2]) || 0;
    return `${major}.${minor}.${patch + 1}`;
  }
  return (currentVersion || 0) + 1;
}

