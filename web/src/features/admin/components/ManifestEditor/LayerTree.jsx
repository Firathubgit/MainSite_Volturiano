import React, { useState } from 'react';
import { Layers, Eye, EyeOff, MoreVertical, GripVertical, AlertTriangle } from 'lucide-react';
import styles from './LayerTree.module.css';

export default function LayerTree({
  layers,
  selectedLayerId,
  onSelectLayer,
  onReorderLayers,
  onToggleVisibility,
}) {
  const [draggedLayerId, setDraggedLayerId] = useState(null);

  // Sort layers by zIndex descending so top of list = top of stack
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  const handleDragStart = (e, id) => {
    setDraggedLayerId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedLayerId || draggedLayerId === targetId) return;

    const sourceIndex = sortedLayers.findIndex(l => l.id === draggedLayerId);
    const targetIndex = sortedLayers.findIndex(l => l.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Move in the sorted array
    const newSorted = [...sortedLayers];
    const [moved] = newSorted.splice(sourceIndex, 1);
    newSorted.splice(targetIndex, 0, moved);

    // Re-assign zIndexes based on new position (reverse index because list is DESC)
    const total = newSorted.length;
    const reindexedLayers = newSorted.map((layer, index) => ({
      ...layer,
      zIndex: total - 1 - index
    }));

    onReorderLayers(reindexedLayers);
    setDraggedLayerId(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Layers size={14} /> Layers
        </h3>
        <button className={styles.addButton}>
          + Add
        </button>
      </div>
      
      <div className={styles.list}>
        {sortedLayers.length === 0 ? (
          <div className={styles.empty}>
            No layers defined.
          </div>
        ) : (
          sortedLayers.map((layer) => (
            <div
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, layer.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, layer.id)}
              onClick={() => onSelectLayer(layer.id)}
              className={`${styles.layerItem} ${selectedLayerId === layer.id ? styles.selected : ''} ${draggedLayerId === layer.id ? styles.dragging : ''}`}
            >
              <div className={styles.dragHandle}>
                <GripVertical size={14} />
              </div>

              <div className={`${styles.indicator} ${selectedLayerId === layer.id ? styles.indicatorSelected : ''}`}></div>

              <div className={styles.info}>
                <div className={styles.infoRow}>
                  <span className={`${styles.label} ${selectedLayerId === layer.id ? styles.labelSelected : ''}`}>
                    {layer.label || layer.id}
                  </span>
                  <span className={styles.zIndex}>
                    z:{layer.zIndex}
                  </span>
                </div>
                <div className={styles.meta}>
                  <span className={styles.type}>{layer.type}</span>
                  {layer.dependencies && layer.dependencies.length > 0 && (
                    <span className={styles.deps}>
                      <AlertTriangle size={10} /> {layer.dependencies.length} deps
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.actions}>
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                  className={styles.actionButton}
                >
                  {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button className={styles.actionButton}>
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.footer}>
        {selectedLayerId ? `Selected: ${selectedLayerId}` : 'No layer selected'}
      </div>
    </div>
  );
}

