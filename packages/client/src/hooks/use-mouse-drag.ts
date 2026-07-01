import { useCallback, useRef } from "react";

interface UseMouseDragOptions {
  onDragStart?: (e: MouseEvent) => void;
  onDragMove?: (e: MouseEvent, delta: { dx: number; dy: number }) => void;
  onDragEnd?: (e: MouseEvent, didMove: boolean) => void;
  enabled?: boolean;
}

export function useMouseDrag(opts: UseMouseDragOptions) {
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const handlersRef = useRef(opts);
  handlersRef.current = opts;

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    hasMoved.current = true;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    handlersRef.current.onDragMove?.(e, { dx, dy });
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    handlersRef.current.onDragEnd?.(e, hasMoved.current);
    hasMoved.current = false;
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (opts.enabled === false) return;
      if (e.button !== 0) return;
      e.preventDefault();
      isDragging.current = true;
      hasMoved.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      handlersRef.current.onDragStart?.(e.nativeEvent);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [opts.enabled, handleMouseMove, handleMouseUp],
  );

  return { handleMouseDown, isDragging };
}
