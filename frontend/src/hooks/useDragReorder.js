// hooks/useDragReorder.js
// Native HTML5 drag-and-drop reorder for a list. Shared by SuperAdmin (editable
// category lists) and Admin (nav group / tab order). `items` is the current array;
// `onChange` receives the reordered array (splice-to-index).

import { useRef, useState, useCallback } from 'react';

export default function useDragReorder(items, onChange) {
  const dragIdx = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const onDragStart = useCallback(idx => { dragIdx.current = idx; }, []);
  const onDragOver  = useCallback((e, idx) => { e.preventDefault(); setDragOver(idx); }, []);
  const onDragEnd   = useCallback(() => { dragIdx.current = null; setDragOver(null); }, []);

  const onDrop = useCallback((e, idx) => {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === idx) { setDragOver(null); return; }
    const next = [...items];
    const [removed] = next.splice(from, 1);
    next.splice(idx, 0, removed);
    onChange(next);
    dragIdx.current = null;
    setDragOver(null);
  }, [items, onChange]);

  return { dragOver, onDragStart, onDragOver, onDrop, onDragEnd };
}
