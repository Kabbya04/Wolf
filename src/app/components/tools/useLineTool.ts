import { useCallback } from 'react';
import Konva from 'konva';
import { Shape } from './utils';

interface LineToolProps {
  shapes: Shape[];
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
  color: string;
  scale: number;
  isDrawing: boolean;
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  currentPointerId: number | null;
}

export const useLineTool = ({
  shapes,
  setShapes,
  color,
  scale,
  isDrawing,
  setIsDrawing,
  currentPointerId,
}: LineToolProps) => {
  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>, stage: Konva.Stage) => {
    const pointerType = e.evt.pointerType;
    const pressure = e.evt.pressure || 0;
    const pos = stage.getPointerPosition();
    if (!pos) return false;

    if (pointerType === 'pen' && pressure === 0) return false;
    if (pointerType !== 'pen' && !e.evt.isPrimary) return false;

    const newLine: Shape = {
      type: 'line',
      id: `line_${shapes.length}`,
      points: [pos.x / scale, pos.y / scale, pos.x / scale, pos.y / scale],
      x: 0,
      y: 0,
      stroke: color,
      strokeWidth: pointerType === 'pen' ? 2 + (pressure || 0.5) * 2 : 2,
      dash: [0],
      roughness: 0,
      bindPoints: [],
    };
    setShapes([...shapes, newLine]);
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
      if (lastShape.type !== 'line') return;

      const newPoints = [lastShape.points![0], lastShape.points![1], pos.x / scale, pos.y / scale];
      const newShapes = [...shapes];
      if (isShiftPressed) {
        const angle = Math.atan2(newPoints[3] - newPoints[1], newPoints[2] - newPoints[0]);
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        newPoints[2] = newPoints[0] + Math.cos(snapAngle) * Math.hypot(newPoints[2] - newPoints[0], newPoints[3] - newPoints[1]);
        newPoints[3] = newPoints[1] + Math.sin(snapAngle) * Math.hypot(newPoints[2] - newPoints[0], newPoints[3] - newPoints[1]);
      }
      const intersectingShape = shapes.find(s =>
        ['rectangle', 'diamond', 'ellipse'].includes(s.type) &&
        pos.x / scale >= s.x && pos.x / scale <= s.x + (s.width || 0) &&
        pos.y / scale >= s.y && pos.y / scale <= s.y + (s.height || 0)
      );
      newShapes[shapes.length - 1] = {
        ...lastShape,
        points: newPoints,
        bindPoints: intersectingShape ? [{ x: newPoints[2], y: newPoints[3], shapeId: intersectingShape.id }] : [],
        strokeWidth: pointerType === 'pen' ? 2 + (pressure || 0.5) * 2 : 2,
      };
      setShapes(newShapes);
    },
    [shapes, setShapes, isDrawing, scale, currentPointerId]
  );

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp };
};