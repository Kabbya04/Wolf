'use client';

import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Line, Arrow, Text, Transformer, Group, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Shape, ContextMenuState, debounce, ToolHandler } from './tools/utils';
import { usePenTool } from './tools/usePenTool';
import { useEraserTool } from './tools/useEraserTool';
import { useRectangleTool } from './tools/useRectangleTool';
import { useDiamondTool } from './tools/useDiamondTool';
import { useEllipseTool } from './tools/useEllipseTool';
import { useArrowTool } from './tools/useArrowTool';
import { useLineTool } from './tools/useLineTool';
import { useTextTool } from './tools/useTextTool';
import { useImageTool } from './tools/useImageTool';
import { useSelectTool } from './tools/useSelectTool';
import { useHandTool } from './tools/useHandTool';

// Define tool handlers with specific props for each tool
const toolHandlers: Record<string, (props: any) => ToolHandler> = {
  pen: (props) => usePenTool(props),
  eraser: (props) => useEraserTool(props),
  rectangle: (props) => useRectangleTool(props),
  diamond: (props) => useDiamondTool(props),
  ellipse: (props) => useEllipseTool(props),
  arrow: (props) => useArrowTool(props),
  line: (props) => useLineTool(props),
  text: (props) => useTextTool(props),
  image: (props) => useImageTool(props),
  select: (props) => useSelectTool(props),
  hand: (props) => useHandTool(props),
};

interface CanvasProps {
  tool?: string;
  color?: string;
}

export default function Canvas({ tool: initialTool = 'pen', color: initialColor = '#000000' }: CanvasProps) {
  // State management for canvas
  const [tool, setTool] = useState<string>(initialTool);
  const [color, setColor] = useState<string>(initialColor);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [historyStep, setHistoryStep] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPointerType, setCurrentPointerType] = useState<string | null>(null);
  const [currentPointerId, setCurrentPointerId] = useState<number | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const lastPointerMove = useRef<number>(0);

  // Initialize tool handlers with specific props
  const currentTool = toolHandlers[tool as keyof typeof toolHandlers]({
    shapes,
    setShapes,
    color,
    scale,
    isDrawing,
    setIsDrawing,
    currentPointerId,
    setEditingTextId: tool === 'text' ? setEditingTextId : undefined,
    selectedIds: tool === 'select' ? selectedIds : undefined, // Ensure selectedIds is passed
    setSelectedIds: tool === 'select' ? setSelectedIds : undefined,
    setContextMenu: tool === 'select' ? setContextMenu : undefined,
  });

  // Sync tool and color props
  useEffect(() => {
    setTool(initialTool);
  }, [initialTool]);

  useEffect(() => {
    setColor(initialColor);
  }, [initialColor]);

  // Initialize canvas dimensions and event listeners
  useEffect(() => {
    setIsClient(true);
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') setTool('hand');
      if (e.key === 'v' || e.key === '1') setTool('select');
      if (e.key === 'r' || e.key === '2') setTool('rectangle');
      if (e.key === 'd' || e.key === 'D') setTool('diamond');
      if (e.key === 'o' || e.key === 'O') setTool('ellipse');
      if (e.key === 'l' || e.key === 'L' || e.key === 'a' || e.key === 'A') setTool('arrow');
      if (e.key === 'p' || e.key === 'P' || e.key === '/') setTool('line');
      if (e.key === 'x' || e.key === 'X') setTool('pen');
      if (e.key === 't' || e.key === 'T') setTool('text');
      if (e.key === 'e' || e.key === 'E') setTool('eraser');
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Update transformer when selectedIds change
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const nodes = selectedIds
        .map(id => stageRef.current!.findOne(`#${id}`))
        .filter(node => node) as Konva.Node[];
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds]);

  // Handle pointer events
  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    if (!stage || !stageRef.current) return;

    const pointerType = e.evt.pointerType;
    const pointerId = e.evt.pointerId;

    if (pointerType === 'pen' && e.evt.pressure === 0) return;
    if (pointerType !== 'pen' && !e.evt.isPrimary) return;

    setCurrentPointerType(pointerType);
    setCurrentPointerId(pointerId);

    if (currentTool.handlePointerDown(e, stageRef.current)) {
      e.evt.preventDefault();
    }
  };

  const handlePointerMove = debounce(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      currentTool.handlePointerMove(e, stageRef.current);
    },
    4,
    lastPointerMove
  );

  const handlePointerUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (e.evt.pointerType === 'pen' || e.evt.pointerId === currentPointerId) {
      currentTool.handlePointerUp();
      setCurrentPointerType(null);
      setCurrentPointerId(null);
      if (shapes.length > 0) {
        const newHistory = history.slice(0, historyStep);
        newHistory.push([...shapes]);
        setHistory(newHistory);
        setHistoryStep(historyStep + 1);
      }
    }
  };

  const handlePointerCancel = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (e.evt.pointerType !== 'pen') {
      setIsDrawing(false);
      setCurrentPointerType(null);
      setCurrentPointerId(null);
    }
  };

  // Undo and redo functionality
  const handleUndo = () => {
    if (historyStep === 0) return;
    setHistoryStep(historyStep - 1);
    setShapes([...history[historyStep - 1]]);
  };

  const handleRedo = () => {
    if (historyStep === history.length) return;
    setHistoryStep(historyStep + 1);
    setShapes([...history[historyStep]]);
  };

  // Zoom functionality
  const handleZoomIn = () => setScale(scale * 1.2);
  const handleZoomOut = () => setScale(scale / 1.2);

  // Handle dragging of shapes
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const id = e.target.id();
    const shape = shapes.find(s => s.id === id);
    if (shape) {
      const newX = e.target.x();
      const newY = e.target.y();
      const newShapes = shapes.map(s => {
        if (s.id === id) {
          return { ...s, x: newX, y: newY };
        }
        if ((s.type === 'arrow' || s.type === 'line') && s.bindPoints?.some(bp => bp.shapeId === id)) {
          const updatedPoints = [...(s.points || [])];
          const boundPoint = s.bindPoints!.find(bp => bp.shapeId === id)!;
          const dx = newX - shape.x;
          const dy = newY - shape.y;
          updatedPoints[2] = boundPoint.x + dx;
          updatedPoints[3] = boundPoint.y + dy;
          return { ...s, points: updatedPoints, bindPoints: [{ x: updatedPoints[2], y: updatedPoints[3], shapeId: id }] };
        }
        return s;
      });
      setShapes(newShapes);
    }
  };

  // Handle transformation of shapes
  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    const id = e.target.id();
    const shape = shapes.find(s => s.id === id);
    if (shape) {
      const node = e.target as Konva.Node;
      const newShapes = shapes.map(s => {
        if (s.id === id) {
          return {
            ...s,
            x: node.x(),
            y: node.y(),
            width: node.width() * node.scaleX(),
            height: node.height() * node.scaleY(),
            rotation: node.rotation(),
            scaleX: 1,
            scaleY: 1,
          };
        }
        if ((s.type === 'arrow' || s.type === 'line') && s.bindPoints?.some(bp => bp.shapeId === id)) {
          const updatedPoints = [...(s.points || [])];
          const boundPoint = s.bindPoints!.find(bp => bp.shapeId === id)!;
          const dx = node.x() - shape.x;
          const dy = node.y() - shape.y;
          updatedPoints[2] = boundPoint.x + dx;
          updatedPoints[3] = boundPoint.y + dy;
          return { ...s, points: updatedPoints, bindPoints: [{ x: updatedPoints[2], y: updatedPoints[3], shapeId: id }] };
        }
        return s;
      });
      setShapes(newShapes);
    }
  };

  // Render shapes based on their type
  const renderShape = (shape: Shape) => {
    const isSelected = selectedIds.includes(shape.id);
    switch (shape.type) {
      case 'pen':
      case 'eraser':
        return (
          <Line
            key={shape.id}
            id={shape.id}
            points={shape.points ?? []}
            stroke={shape.stroke || color}
            strokeWidth={shape.strokeWidth || 2}
            lineCap="round"
            lineJoin="round"
            tension={shape.type === 'pen' ? 0.5 : 0}
            draggable={tool === 'select' && isSelected}
            onDragMove={handleDragMove}
            onTransformEnd={handleTransformEnd}
          />
        );
      case 'rectangle':
        return (
          <Rect
            key={shape.id}
            id={shape.id}
            x={shape.x}
            y={shape.y}
            width={shape.width ?? 1}
            height={shape.height ?? 1}
            stroke={shape.stroke || color}
            strokeWidth={shape.strokeWidth || 2}
            dash={shape.dash}
            fill={shape.fill}
            cornerRadius={shape.cornerRadius}
            rotation={shape.rotation}
            draggable={tool === 'select' && isSelected}
            onDragMove={handleDragMove}
            onTransformEnd={handleTransformEnd}
          />
        );
      case 'diamond':
        return (
          <Group
            key={shape.id}
            id={shape.id}
            x={shape.x}
            y={shape.y}
            rotation={shape.rotation}
            draggable={tool === 'select' && isSelected}
            onDragMove={handleDragMove}
            onTransformEnd={handleTransformEnd}
          >
            <Rect
              width={shape.width ?? 1}
              height={shape.height ?? 1}
              offsetX={(shape.width ?? 1) / 2}
              offsetY={(shape.height ?? 1) / 2}
              rotation={45}
              stroke={shape.stroke || color}
              strokeWidth={shape.strokeWidth || 2}
              dash={shape.dash}
              fill={shape.fill}
            />
          </Group>
        );
      case 'ellipse':
        return (
          <Circle
            key={shape.id}
            id={shape.id}
            x={shape.x}
            y={shape.y}
            radius={Math.max((shape.width ?? 1) / 2, (shape.height ?? 1) / 2)}
            stroke={shape.stroke || color}
            strokeWidth={shape.strokeWidth || 2}
            dash={shape.dash}
            fill={shape.fill}
            rotation={shape.rotation}
            draggable={tool === 'select' && isSelected}
            onDragMove={handleDragMove}
            onTransformEnd={handleTransformEnd}
          />
        );
      case 'arrow':
        return (
          <Arrow
            key={shape.id}
            id={shape.id}
            points={shape.points ?? []}
            stroke={shape.stroke || color}
            strokeWidth={shape.strokeWidth || 2}
            dash={shape.dash}
            pointerLength={10}
            pointerWidth={10}
            pointerAtBeginning={false}
            pointerAtEnding={true}
            draggable={tool === 'select' && isSelected}
            onDragMove={handleDragMove}
            onTransformEnd={handleTransformEnd}
          />
        );
      case 'line':
        return (
          <Line
            key={shape.id}
            id={shape.id}
            points={shape.points ?? []}
            stroke={shape.stroke || color}
            strokeWidth={shape.strokeWidth || 2}
            dash={shape.dash}
            draggable={tool === 'select' && isSelected}
            onDragMove={handleDragMove}
            onTransformEnd={handleTransformEnd}
          />
        );
      case 'text':
        return (
          <Text
            key={shape.id}
            id={shape.id}
            x={shape.x}
            y={shape.y}
            text={shape.text ?? 'Text'}
            fontSize={shape.fontSize || 20}
            fill={shape.fill || color}
            rotation={shape.rotation}
            draggable={tool === 'select' && isSelected && !editingTextId}
            onDragMove={handleDragMove}
            onTransformEnd={handleTransformEnd}
            onDblClick={() => setEditingTextId(shape.id)}
          />
        );
      case 'image':
        return (
          <KonvaImage
            key={shape.id}
            id={shape.id}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            image={shape.image}
            rotation={shape.rotation}
            draggable={tool === 'select' && isSelected}
            onDragMove={handleDragMove}
            onTransformEnd={handleTransformEnd}
          />
        );
      default:
        return null;
    }
  };

  // Render loading state if not client-side or dimensions not set
  if (!isClient || dimensions.width === 0 || dimensions.height === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative w-full h-full">
      {/* Canvas Stage */}
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(e) => e.evt.preventDefault()}
        ref={stageRef}
        draggable={tool === 'hand'}
        style={{ touchAction: 'none' }}
      >
        <Layer>
          {shapes.map(renderShape)}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            rotateEnabled={true}
          />
        </Layer>
      </Stage>

      {/* Bottom Controls */}
      <div className="absolute bottom-4 left-4 flex items-center bg-white rounded-lg shadow-md p-1 space-x-1">
        <button
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:bg-gray-100 rounded"
          onClick={handleZoomOut}
        >
          -
        </button>
        <span className="text-sm text-gray-600 px-2">{Math.round(scale * 100)}%</span>
        <button
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:bg-gray-100 rounded"
          onClick={handleZoomIn}
        >
          +
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1"></div>
        <button
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:bg-gray-100 rounded disabled:text-gray-300"
          onClick={handleUndo}
          disabled={historyStep === 0}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:bg-gray-100 rounded disabled:text-gray-300"
          onClick={handleRedo}
          disabled={historyStep === history.length}
        >
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="absolute bg-white border border-gray-200 rounded shadow-md p-2 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={() => setContextMenu(null)}
        >
          <button
            className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
            onClick={() => {
              const newShapes = shapes.map(s => ({
                ...s,
                fill: contextMenu!.ids.includes(s.id) ? '#e0e0e0' : s.fill,
              }));
              setShapes(newShapes);
              setContextMenu(null);
            }}
          >
            Change Fill (Gray)
          </button>
          <button
            className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
            onClick={() => {
              const duplicatedShapes = shapes
                .filter(s => contextMenu!.ids.includes(s.id))
                .map(s => ({ ...s, id: `${s.type}_${shapes.length + Math.random()}`, x: s.x + 10, y: s.y + 10 }));
              setShapes([...shapes, ...duplicatedShapes]);
              setContextMenu(null);
            }}
          >
            Duplicate
          </button>
          <button
            className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
            onClick={() => {
              setShapes(shapes.filter(s => !contextMenu!.ids.includes(s.id)));
              setContextMenu(null);
            }}
          >
            Delete
          </button>
          {contextMenu.ids.length > 1 && (
            <button
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
              onClick={() => {
                const groupId = `group_${shapes.length}`;
                const groupShapes = shapes.map(s =>
                  contextMenu!.ids.includes(s.id) ? { ...s, groupId } : s
                );
                setShapes(groupShapes);
                setContextMenu(null);
              }}
            >
              Group
            </button>
          )}
          {shapes.some(s => contextMenu!.ids.includes(s.id) && s.groupId) && (
            <button
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
              onClick={() => {
                const newShapes = shapes.map(s =>
                  contextMenu!.ids.includes(s.id) ? { ...s, groupId: undefined } : s
                );
                setShapes(newShapes);
                setContextMenu(null);
              }}
            >
              Ungroup
            </button>
          )}
          {contextMenu.ids.length === 1 && shapes.find(s => contextMenu!.ids.includes(s.id))?.type === 'rectangle' && (
            <button
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
              onClick={() => {
                const newShapes = shapes.map(s =>
                  contextMenu!.ids.includes(s.id) ? { ...s, cornerRadius: (s.cornerRadius || 0) + 5 } : s
                );
                setShapes(newShapes);
                setContextMenu(null);
              }}
            >
              Increase Corner Radius
            </button>
          )}
          {contextMenu.ids.length === 1 && shapes.find(s => contextMenu!.ids.includes(s.id))?.type === 'image' && (
            <button
              className="block w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (event: Event) => {
                  if (currentTool.handleImageUpload) {
                    currentTool.handleImageUpload(event as unknown as React.ChangeEvent<HTMLInputElement>);
                  }
                };
                input.click();
                setContextMenu(null);
              }}
            >
              Replace Image
            </button>
          )}
        </div>
      )}

      {/* Text Editing */}
      {editingTextId && (
        <input
          autoFocus
          className="absolute border-none outline-none bg-transparent"
          style={{
            left: shapes.find(s => s.id === editingTextId)!.x * scale,
            top: shapes.find(s => s.id === editingTextId)!.y * scale,
            fontSize: (shapes.find(s => s.id === editingTextId)?.fontSize || 20) * scale,
            color: shapes.find(s => s.id === editingTextId)?.fill || color,
          }}
          defaultValue={shapes.find(s => s.id === editingTextId)?.text || ''}
          onChange={(e) => {
            const newShapes = shapes.map(s =>
              s.id === editingTextId ? { ...s, text: e.target.value } : s
            );
            setShapes(newShapes);
          }}
          onBlur={() => setEditingTextId(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditingTextId(null);
          }}
        />
      )}

      {/* Image Upload Input */}
      {tool === 'image' && (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (currentTool.handleImageUpload) {
              currentTool.handleImageUpload(e);
            }
          }}
          className="hidden"
          id="image-upload"
        />
      )}
    </div>
  );
}