import { useCallback } from 'react';
import Konva from 'konva';
import { ContextMenuState } from './utils';

interface SelectToolProps {
  selectedIds: string[]; // Add selectedIds to props
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  setEditingTextId: React.Dispatch<React.SetStateAction<string | null>>;
  color: string;
}

export const useSelectTool = ({
  selectedIds, // Add selectedIds to destructured props
  setSelectedIds,
  setContextMenu,
  setEditingTextId,
  color,
}: SelectToolProps) => {
  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>, stage: Konva.Stage) => {
    const pos = stage.getPointerPosition();
    if (!pos) return false;

    const isShiftPressed = e.evt.shiftKey;
    const isRightClick = e.evt.button === 2;
    const clickedShape = stage.getIntersection(pos);

    if (clickedShape) {
      const id = clickedShape.id();
      if (isRightClick) {
        setContextMenu({ x: pos.x, y: pos.y, ids: selectedIds.includes(id) ? selectedIds : [id] });
        return true;
      }
      if (isShiftPressed) {
        setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      } else {
        setSelectedIds([id]);
      }
      setEditingTextId(null);
    } else if (!isShiftPressed) {
      setSelectedIds([]);
      setEditingTextId(null);
    }
    return true;
  };

  const handlePointerMove = useCallback(
    (_e: Konva.KonvaEventObject<PointerEvent>, _stage: Konva.Stage | null) => {
      // No-op for select tool
    },
    [setSelectedIds, setContextMenu, setEditingTextId, color]
  );

  const handlePointerUp = () => {
    // No-op for select tool
  };

  return { handlePointerDown, handlePointerMove, handlePointerUp };
};