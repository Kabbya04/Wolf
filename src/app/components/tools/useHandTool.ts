import { useCallback } from 'react'; // Add useCallback import
import Konva from 'konva';

interface HandToolProps {
  color: string; // Add color to props for consistency
}

export const useHandTool = ({ color }: HandToolProps) => {
  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>, stage: Konva.Stage) => {
    stage.startDrag();
    return true;
  };

  const handlePointerMove = useCallback(
    (_e: Konva.KonvaEventObject<PointerEvent>, _stage: Konva.Stage | null) => {
      // No-op for hand tool
    },
    [color] // Include color for consistency
  );

  const handlePointerUp = () => {
    // No-op for hand tool
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp };
};