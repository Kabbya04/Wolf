import { useCallback } from 'react';
import Konva from 'konva';
import { Shape, thinStroke } from './utils';

interface EraserToolProps {
  shapes: Shape[];
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
  scale: number;
  isDrawing: boolean;
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  currentPointerId: number | null;
}

export const useEraserTool = ({
  shapes,
  setShapes,
  scale,
  isDrawing,
  setIsDrawing,
  currentPointerId,
}: EraserToolProps) => {
  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>, stage: Konva.Stage) => {
    const pointerType = e.evt.pointerType;
    const pointerId = e.evt.pointerId;
    const pressure = e.evt.pressure || 0;
    const pos = stage.getPointerPosition();
    if (!pos) return false;

    if (pointerType === 'pen' && pressure === 0) return false;
    if (pointerType !== 'pen' && !e.evt.isPrimary) return false;

    setIsDrawing(true);
    const newLine: Shape = {
      type: 'eraser',
      id: `eraser_${shapes.length}`,
      points: [pos.x / scale, pos.y / scale],
      pressure: [pressure],
      x: 0,
      y: 0,
      stroke: 'white',
      strokeWidth: pointerType === 'pen' ? 2 + (pressure || 0.5) * 4 : 2,
    };
    setShapes([...shapes, newLine]);
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

      const lastShape = shapes[shapes.length - 1];
      if (lastShape.type !== 'eraser') return;

      const MAX_POINTS = 1000;
      let newPoints = [...(lastShape.points || []), pos.x / scale, pos.y / scale];
      let newPressure = [...(lastShape.pressure || []), pressure];

      if (newPoints.length > MAX_POINTS * 2) {
        const newLine: Shape = {
          ...lastShape,
          id: `eraser_${shapes.length}`,
          points: [newPoints[newPoints.length - 2], newPoints[newPoints.length - 1]],
          pressure: [newPressure[newPressure.length - 1]],
        };
        newPoints = newPoints.slice(0, MAX_POINTS * 2);
        newPressure = newPressure.slice(0, MAX_POINTS);
        setShapes([...shapes.slice(0, -1), { ...lastShape, points: newPoints, pressure: newPressure }, newLine]);
      } else {
        const { points: thinnedPoints, pressure: thinnedPressure } = pointerType === 'pen'
          ? thinStroke(newPoints, newPressure, 2)
          : { points: newPoints, pressure: newPressure };
        const newShapes = [...shapes];
        newShapes[shapes.length - 1] = {
          ...lastShape,
          points: thinnedPoints,
          pressure: thinnedPressure,
          strokeWidth: pointerType === 'pen' ? 2 + (pressure || 0.5) * 4 : 2,
        };
        setShapes(newShapes);
      }
    },
    [shapes, setShapes, isDrawing, scale, currentPointerId]
  );

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp };
};