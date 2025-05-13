import { useCallback } from 'react'; // Add useCallback import
import { Shape } from './utils';
import Konva from 'konva';

interface ImageToolProps {
  shapes: Shape[];
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
  scale: number;
  color: string; // Add color to props for consistency
}

export const useImageTool = ({ shapes, setShapes, scale, color }: ImageToolProps) => {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const newImage: Shape = {
          type: 'image',
          id: `image_${shapes.length}`,
          x: 100 / scale,
          y: 100 / scale,
          width: img.width / scale,
          height: img.height / scale,
          image: img,
        };
        setShapes([...shapes, newImage]);
      };
    }
  };

  const handlePointerDown = () => false;

  const handlePointerMove = useCallback(
    (_e: Konva.KonvaEventObject<PointerEvent>, _stage: Konva.Stage | null) => {
      // No-op for image tool
    },
    [shapes, setShapes, color, scale] // Include all dependencies for consistency
  );

  const handlePointerUp = () => {
    // No-op for image tool
  };

  return { handleImageUpload, handlePointerDown, handlePointerMove, handlePointerUp };
};