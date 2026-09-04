import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';

interface DragState {
  /** Index of the row being dragged. */
  from: number;
  /** Index the row would land on if released now. */
  over: number;
  /** Vertical pointer displacement since the drag started, in px. */
  dy: number;
  /** Distance between two consecutive rows, used to shift the neighbours. */
  step: number;
}

export interface RowProps {
  ref: (element: HTMLElement | null) => void;
  style: CSSProperties;
  'data-dragging'?: 'true';
}

export interface HandleProps {
  style: CSSProperties;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
}

/**
 * Pointer-based vertical reordering without any library. Attach `getRowProps`
 * to each row and `getHandleProps` to its drag handle; `onMove(from, to)` is
 * called once when the pointer is released on a new position.
 */
export function useDragReorder(onMove: (from: number, to: number) => void) {
  const rows = useRef<Array<HTMLElement | null>>([]);
  const dragRef = useRef<DragState | null>(null);
  const startY = useRef(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const update = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  useEffect(() => {
    const cancel = () => {
      if (dragRef.current) update(null);
    };
    window.addEventListener('blur', cancel);
    return () => window.removeEventListener('blur', cancel);
  }, [update]);

  const rowStep = (from: number): number => {
    const current = rows.current[from];
    if (!current) return 0;
    const rect = current.getBoundingClientRect();
    const next = rows.current[from + 1];
    if (next) return next.getBoundingClientRect().top - rect.top;
    const previous = rows.current[from - 1];
    if (previous) return rect.top - previous.getBoundingClientRect().top;
    return rect.height;
  };

  /** Number of other rows whose middle lies above the pointer: that is the target index. */
  const targetIndex = (clientY: number, from: number): number => {
    let over = 0;
    rows.current.forEach((element, index) => {
      if (!element || index === from) return;
      const rect = element.getBoundingClientRect();
      if (rect.top + rect.height / 2 < clientY) over += 1;
    });
    return over;
  };

  const getRowProps = useCallback(
    (index: number): RowProps => {
      const style: CSSProperties = {};
      let dragging: 'true' | undefined;
      if (drag) {
        if (index === drag.from) {
          style.transform = `translateY(${drag.dy}px)`;
          dragging = 'true';
        } else if (drag.from < drag.over && index > drag.from && index <= drag.over) {
          style.transform = `translateY(${-drag.step}px)`;
        } else if (drag.over < drag.from && index >= drag.over && index < drag.from) {
          style.transform = `translateY(${drag.step}px)`;
        }
      }
      return {
        ref: (element) => {
          rows.current[index] = element;
        },
        style,
        ...(dragging ? { 'data-dragging': dragging } : {}),
      };
    },
    [drag],
  );

  const getHandleProps = useCallback(
    (index: number): HandleProps => ({
      style: { touchAction: 'none' },
      onPointerDown: (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault();
        const target = event.currentTarget;
        if (typeof target.setPointerCapture === 'function') {
          target.setPointerCapture(event.pointerId);
        }
        startY.current = event.clientY;
        update({ from: index, over: index, dy: 0, step: rowStep(index) });
      },
      onPointerMove: (event) => {
        const current = dragRef.current;
        if (!current) return;
        const dy = event.clientY - startY.current;
        const over = targetIndex(event.clientY, current.from);
        if (dy !== current.dy || over !== current.over) update({ ...current, dy, over });
      },
      onPointerUp: (event) => {
        const current = dragRef.current;
        if (!current) return;
        const target = event.currentTarget;
        if (typeof target.releasePointerCapture === 'function') {
          try {
            target.releasePointerCapture(event.pointerId);
          } catch {
            // The capture may already be gone; nothing to release.
          }
        }
        update(null);
        if (current.over !== current.from) onMoveRef.current(current.from, current.over);
      },
      onPointerCancel: () => {
        if (dragRef.current) update(null);
      },
    }),
    [update],
  );

  return {
    dragging: drag !== null,
    draggingIndex: drag?.from ?? null,
    getRowProps,
    getHandleProps,
  };
}
