import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';

export type SwipeDirection = 'left' | 'right';

export interface SwipeGestureOptions {
  onSwipe: (direction: SwipeDirection, fromDx: number) => void;
  /** Horizontal distance (px) beyond which releasing the card counts as a decision. */
  threshold?: number;
  /** Speed (px/ms) beyond which a short flick also counts as a decision. */
  velocityThreshold?: number;
  disabled?: boolean;
  /** Skip rotation and transitions when the user prefers reduced motion. */
  reducedMotion?: boolean;
}

export interface SwipeGestureHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

export interface SwipeGestureState {
  dx: number;
  dragging: boolean;
  /** Direction the card would take if released now, once past the threshold. */
  direction: SwipeDirection | null;
  /** 0–1 ratio of the drag against the threshold, used to fade the overlay label. */
  progress: number;
  style: CSSProperties;
  handlers: SwipeGestureHandlers;
}

interface PointerTracking {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  axis: 'unknown' | 'x' | 'y';
}

const DEFAULT_THRESHOLD = 80;
const DEFAULT_VELOCITY = 0.5;
/** Movement (px) needed before deciding whether the gesture is horizontal or vertical. */
const AXIS_LOCK = 8;
/** Fraction of the threshold a fast flick must still cover to count. */
const FLICK_MIN_RATIO = 0.5;
const INTERACTIVE_SELECTOR = 'button, a, input, textarea, select, [contenteditable="true"]';

function prefersReducedMotionQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia('(prefers-reduced-motion: reduce)');
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => prefersReducedMotionQuery()?.matches ?? false);
  useEffect(() => {
    const query = prefersReducedMotionQuery();
    if (!query) return;
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * Horizontal drag on a card using pointer events only. Vertical movement is
 * left to the browser (pair it with `touch-action: pan-y` on the element).
 */
export function useSwipeGesture({
  onSwipe,
  threshold = DEFAULT_THRESHOLD,
  velocityThreshold = DEFAULT_VELOCITY,
  disabled = false,
  reducedMotion = false,
}: SwipeGestureOptions): SwipeGestureState {
  const tracking = useRef<PointerTracking | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  const reset = useCallback(() => {
    tracking.current = null;
    setDragging(false);
    setDx(0);
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled || tracking.current) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR)) return;
      tracking.current = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastTime: event.timeStamp,
        velocity: 0,
        axis: 'unknown',
      };
      const element = event.currentTarget;
      if (typeof element.setPointerCapture === 'function') {
        try {
          element.setPointerCapture(event.pointerId);
        } catch {
          // Capture is a nicety: the gesture still works without it.
        }
      }
    },
    [disabled],
  );

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const state = tracking.current;
    if (!state || state.id !== event.pointerId) return;
    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    if (state.axis === 'unknown') {
      if (Math.abs(deltaY) > AXIS_LOCK && Math.abs(deltaY) > Math.abs(deltaX)) {
        state.axis = 'y';
      } else if (Math.abs(deltaX) > AXIS_LOCK) {
        state.axis = 'x';
        setDragging(true);
      }
    }
    if (state.axis !== 'x') return;
    const elapsed = event.timeStamp - state.lastTime;
    if (elapsed > 0) {
      const instant = (event.clientX - state.lastX) / elapsed;
      state.velocity = state.velocity * 0.3 + instant * 0.7;
    }
    state.lastX = event.clientX;
    state.lastTime = event.timeStamp;
    setDx(deltaX);
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const state = tracking.current;
      if (!state || state.id !== event.pointerId) return;
      const deltaX = event.clientX - state.startX;
      const sameWay = Math.sign(state.velocity) === Math.sign(deltaX);
      const farEnough = Math.abs(deltaX) >= threshold;
      const fastEnough =
        sameWay &&
        Math.abs(state.velocity) >= velocityThreshold &&
        Math.abs(deltaX) >= threshold * FLICK_MIN_RATIO;
      const decided = state.axis === 'x' && (farEnough || fastEnough);
      reset();
      if (decided) onSwipeRef.current(deltaX > 0 ? 'right' : 'left', deltaX);
    },
    [reset, threshold, velocityThreshold],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (tracking.current?.id === event.pointerId) reset();
    },
    [reset],
  );

  const handlers = useMemo<SwipeGestureHandlers>(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel }),
    [onPointerDown, onPointerMove, onPointerUp, onPointerCancel],
  );

  const progress = Math.min(1, Math.abs(dx) / threshold);
  const direction: SwipeDirection | null =
    Math.abs(dx) >= threshold ? (dx > 0 ? 'right' : 'left') : null;
  const rotation = reducedMotion ? 0 : dx * 0.05;
  const style: CSSProperties = {
    transform: dx === 0 ? undefined : `translateX(${dx}px) rotate(${rotation}deg)`,
    transition: dragging || reducedMotion ? 'none' : 'transform 200ms ease-out',
  };

  return { dx, dragging, direction, progress, style, handlers };
}
