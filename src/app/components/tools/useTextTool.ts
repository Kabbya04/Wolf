import { useCallback } from 'react'; // Add useCallback import
import Konva from 'konva';
import { Shape } from './utils';

interface TextToolProps {
  shapes: Shape[];
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
  color: string;
  scale: number;
  setEditingTextId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useTextTool = ({
  shapes,
  setShapes,
  color,
  scale,
  setEditingTextId,
}: TextToolProps) => {
  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>, stage: Konva.Stage) => {
    const pos = stage.getPointerPosition();
    if (!pos) return false;

    const newText: Shape = {
      type: 'text',
      id: `text_${shapes.length}`,
      x: pos.x / scale,
      y: pos.y / scale,
      text: '',
      fill: color,
      fontSize: 20,
    };
    setShapes([...shapes, newText]);
    setEditingTextId(newText.id);
    return true;
  };

  const handlePointerMove = useCallback(
    (_e: Konva.KonvaEventObject<PointerEvent>, _stage: Konva.Stage | null) => {
      // No-op for text tool
    },
    [shapes, setShapes, color, scale] // Include all dependencies for consistency
  );

  const handlePointerUp = () => {
    // No-op for text tool
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp };
};