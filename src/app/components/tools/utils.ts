import Konva from 'konva';

export interface Shape {
  type: string;
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  text?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  roughness?: number;
  isSelected?: boolean;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  bindPoints?: { x: number; y: number; shapeId?: string }[];
  fontSize?: number;
  cornerRadius?: number;
  image?: HTMLImageElement;
  groupId?: string;
  pressure?: number[];
}

export interface ContextMenuState {
  x: number;
  y: number;
  ids: string[];
}

// Interface for tool handlers
export interface ToolHandler {
  handlePointerDown: (e: Konva.KonvaEventObject<PointerEvent>, stage: Konva.Stage) => boolean;
  handlePointerMove: (e: Konva.KonvaEventObject<PointerEvent>, stage: Konva.Stage | null) => void;
  handlePointerUp: () => void;
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Point distance-based thinning for stroke simplification
export const thinStroke = (points: number[], pressure: number[], minDistance: number): { points: number[]; pressure: number[] } => {
  if (points.length < 4) return { points, pressure };

  const distance = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  };

  const resultPoints: number[] = [points[0], points[1]];
  const resultPressure: number[] = [pressure[0]];
  let lastX = points[0];
  let lastY = points[1];

  for (let i = 2; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    if (distance(lastX, lastY, x, y) >= minDistance) {
      resultPoints.push(x, y);
      resultPressure.push(pressure[i / 2]);
      lastX = x;
      lastY = y;
    }
  }

  return { points: resultPoints, pressure: resultPressure };
};

// Debounce function for pointermove events
export const debounce = (fn: (e: Konva.KonvaEventObject<PointerEvent>) => void, ms: number, lastPointerMove: React.MutableRefObject<number>) => {
  return (e: Konva.KonvaEventObject<PointerEvent>) => {
    const now = performance.now();
    if (e.evt.pointerType === 'pen') {
      fn(e); // Skip debounce for stylus to ensure low-latency
    } else if (now - lastPointerMove.current > ms) {
      lastPointerMove.current = now;
      fn(e);
    }
  };
};