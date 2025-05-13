import { useCallback } from 'react';
import Konva from 'konva';
import { Shape } from './utils';

interface EllipseToolProps {
  shapes: Shape[];
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
  color: string;
  scale: number;
  isDrawing: boolean;
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  currentPointerId: number | null;
}

export const useEllipseTool = ({
  shapes,
  setShapes,
  color,
  scale,
  isDrawing,
  setIsDrawing,
  currentPointerId,
}: EllipseToolProps) => {
  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>, stage: Konva.Stage) => {
    const pointerType = e.evt.pointerType;
    const pressure = e.evt.pressure || 0;
    const pos = stage.getPointerPosition();
    if (!pos) return false;

    if (pointerType === 'pen' && pressure === 0) return false;
    if (pointerType !== 'pen' && !e.evt.isPrimary) return false;

    const isShiftPressed = e.evt.shiftKey;
    const newShape: Shape = {
      type: 'ellipse',
      id: `ellipse_${shapes.length}`,
      x: pos.x / scale,
      y: pos.y / scale,
      width: 1,
      height: 1,
      stroke: color,
      strokeWidth: pointerType === 'pen' ? 2 + (pressure || 0.5) * 2 : 2,
      dash: [0],
      roughness: 0,
      fill: 'transparent',
    };
    if (isShiftPressed) {
      newShape.width = newShape.height = 1;
    }
    setShapes([...shapes, newShape]);
    setIsDrawing(true);
    return true;
  };

  const handlePointerMove = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>, stage: Konva.Stage | null) => {
      if (!stage || !isDrawing) return;

      const pointerType = e.evt.pointerType;
      const pressure = e.evt.pressure || 0;
      const pos = stage.getPointerPosition();
      if (!pos) return;

      if (pointerType === 'pen' && pressure === 0) return;
      if (pointerType !== 'pen' && e.evt.pointerId !== currentPointerId) return;

      const isShiftPressed = e.evt.shiftKey;
      const lastShape = shapes[shapes.length - 1];
      if (lastShape.type !== 'ellipse') return;

      const dx = (pos.x / scale - lastShape.x) || 1;
      const dy = (pos.y / scale - lastShape.y) || 1;
      const newShapes = [...shapes];
      if (isShiftPressed) {
        const size = Math.max(Math.abs(dx), Math.abs(dy));
        newShapes[shapes.length - 1] = {
          ...lastShape,
          width: dx >= 0 ? size : -size,
          height: dy >= 0 ? size : -size,
          strokeWidth: pointerType === 'pen' ? 2 + (pressure || 0.5) * 2 : 2,
        };
      } else {
        newShapes[shapes.length - 1] = {
          ...lastShape,
          width: dx,
          height: dy,
          strokeWidth: pointerType === 'pen' ? 2 + (pressure || 0.5) * 2 : 2,
        };
      }
      setShapes(newShapes);
    },
    [shapes, setShapes, isDrawing, scale, currentPointerId]
  );

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp };
};