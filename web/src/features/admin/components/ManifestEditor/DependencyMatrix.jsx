import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Check } from 'lucide-react';
import AdminButton from '../ui/AdminButton';
import styles from './DependencyMatrix.module.css';

export default function DependencyMatrix({ layers, onUpdateLayers, onClose }) {
  const [localLayers, setLocalLayers] = useState(JSON.parse(JSON.stringify(layers)));
  const [cycleError, setCycleError] = useState(null);

  // Check for cycle using DFS
  const hasCycle = (testLayers, fromId, toId) => {
    const visited = new Set();
    
    const dfs = (currentId) => {
      if (currentId === fromId) return true;
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const layer = testLayers.find(l => l.id === currentId);
      if (!layer) return false;

      for (const depId of layer.dependencies || []) {
        if (dfs(depId)) return true;
      }
      return false;
    };

    const targetLayer = testLayers.find(l => l.id === toId);
    if (!targetLayer) return false;

    return dfs(toId);
  };

  const toggleDependency = (layerId, dependencyId) => {
    if (layerId === dependencyId) return;

    const layerIndex = localLayers.findIndex(l => l.id === layerId);
    if (layerIndex === -1) return;

    const layer = localLayers[layerIndex];
    const hasDep = (layer.dependencies || []).includes(dependencyId);

    if (hasDep) {
      const newLayers = [...localLayers];
      newLayers[layerIndex] = {
        ...layer,
        dependencies: (layer.dependencies || []).filter(d => d !== dependencyId)
      };
      setLocalLayers(newLayers);
      setCycleError(null);
    } else {
      if (hasCycle(localLayers, layerId, dependencyId)) {
        setCycleError(`Circular dependency detected: ${layerId} -> ${dependencyId} creates a loop.`);
        return;
      }

      const newLayers = [...localLayers];
      newLayers[layerIndex] = {
        ...layer,
        dependencies: [...(layer.dependencies || []), dependencyId]
      };
      setLocalLayers(newLayers);
      setCycleError(null);
    }
  };

  const handleSave = () => {
    onUpdateLayers(localLayers);
    onClose();
  };

  const clearAll = () => {
    const cleared = localLayers.map(l => ({ ...l, dependencies: [] }));
    setLocalLayers(cleared);
    setCycleError(null);
  };

  const autoDetect = () => {
    const autoLayers = localLayers.map(l => {
      let newDeps = [...(l.dependencies || [])];
      if (l.type === 'paint') {
        const base = localLayers.find(b => b.type === 'base');
        if (base && base.id !== l.id && !newDeps.includes(base.id)) newDeps.push(base.id);
      }
      if (l.type === 'decals') {
        const paint = localLayers.find(p => p.type === 'paint');
        if (paint && paint.id !== l.id && !newDeps.includes(paint.id)) newDeps.push(paint.id);
      }
      return { ...l, dependencies: newDeps };
    });
    setLocalLayers(autoLayers);
    setCycleError(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Dependency Matrix</h3>
          <p className={styles.subtitle}>Define rendering order and logical dependencies between layers.</p>
        </div>
        <div className={styles.actions}>
          <AdminButton variant="secondary" size="sm" onClick={autoDetect} icon={RefreshCw}>Auto-Detect</AdminButton>
          <AdminButton variant="danger" size="sm" onClick={clearAll} icon={Trash2}>Clear All</AdminButton>
        </div>
      </div>

      <div className={styles.content}>
        {cycleError && (
          <div className={styles.error}>
            <AlertTriangle size={16} className={styles.errorIcon} />
            {cycleError}
          </div>
        )}

        <div className={styles.matrixWrapper}>
          <div 
            className={styles.matrix}
            style={{ gridTemplateColumns: `auto repeat(${localLayers.length}, minmax(40px, 1fr))` }}
          >
            <div className={styles.headerCell}>Depends On →</div>
            {localLayers.map(colLayer => (
              <div key={colLayer.id} className={styles.headerCell}>
                <div className={styles.rotatedText}>{colLayer.id}</div>
              </div>
            ))}

            {localLayers.map(rowLayer => (
              <React.Fragment key={rowLayer.id}>
                <div className={styles.rowLabel}>
                  {rowLayer.id}
                </div>
                {localLayers.map(colLayer => {
                  const isSelf = rowLayer.id === colLayer.id;
                  const isDependent = (rowLayer.dependencies || []).includes(colLayer.id);
                  
                  return (
                    <div 
                      key={`${rowLayer.id}-${colLayer.id}`} 
                      className={`${styles.cell} ${isSelf ? styles.cellSelf : ''} ${isDependent ? styles.cellDependent : ''}`}
                      onClick={() => !isSelf && toggleDependency(rowLayer.id, colLayer.id)}
                    >
                      {isSelf ? (
                        <span className={styles.dash}>-</span>
                      ) : isDependent ? (
                        <Check size={14} className={styles.check} />
                      ) : (
                        <div className={styles.checkbox}></div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <AdminButton variant="secondary" onClick={onClose}>Cancel</AdminButton>
        <AdminButton variant="primary" onClick={handleSave}>Apply Changes</AdminButton>
      </div>
    </div>
  );
}

