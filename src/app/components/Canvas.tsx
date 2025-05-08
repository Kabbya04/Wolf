'use client';

import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Line, Arrow, Text, Transformer, Group, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface Shape {
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
}

interface ContextMenuState {
  x: number;
  y: number;
  ids: string[];
}

interface CanvasProps {
  tool?: string;
  color?: string;
}

export default function Canvas({ tool: initialTool = 'pen', color: initialColor = '#000000' }: CanvasProps) {
  const [tool, setTool] = useState<string>(initialTool);
  const [color, setColor] = useState<string>(initialColor);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [historyStep, setHistoryStep] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isClient, setIsClient] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Sync tool prop with state
  useEffect(() => {
    console.log('Tool prop changed to:', initialTool);
    setTool(initialTool);
  }, [initialTool]);

  // Sync color prop with state
  useEffect(() => {
    console.log('Color prop changed to:', initialColor);
    setColor(initialColor);
  }, [initialColor]);

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

  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const nodes = selectedIds
        .map(id => stageRef.current!.findOne(`#${id}`))
        .filter(node => node) as Konva.Node[];
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds]);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    console.log('Current tool in handleMouseDown:', tool);
    const stage = e.target.getStage();
    if (!stage || !stageRef.current) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    const isShiftPressed = e.evt.shiftKey;

    if (tool === 'hand') {
      stage.startDrag();
      return;
    }

    if (tool === 'select') {
      const clickedShape = stage.getIntersection(pos);
      if (clickedShape) {
        const id = clickedShape.id();
        if (e.evt.button === 2) {
          setContextMenu({ x: pos.x, y: pos.y, ids: selectedIds.includes(id) ? selectedIds : [id] });
          return;
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
      return;
    }

    if (tool === 'pen' || tool === 'eraser') {
      setIsDrawing(true);
      const newLine: Shape = {
        type: tool,
        id: `${tool}_${shapes.length}`,
        points: [pos.x / scale, pos.y / scale],
        x: 0,
        y: 0,
        stroke: tool === 'eraser' ? 'white' : color,
        strokeWidth: 2,
      };
      setShapes([...shapes, newLine]);
      return;
    }

    if (tool === 'rectangle' || tool === 'diamond' || tool === 'ellipse') {
      const newShape: Shape = {
        type: tool,
        id: `${tool}_${shapes.length}`,
        x: pos.x / scale,
        y: pos.y / scale,
        width: 1,
        height: 1,
        stroke: color,
        strokeWidth: 2,
        dash: [0],
        roughness: 0,
        fill: 'transparent',
        cornerRadius: tool === 'rectangle' ? 0 : undefined,
      };
      if (isShiftPressed && (tool === 'rectangle' || tool === 'ellipse')) {
        newShape.width = newShape.height = 1;
      }
      setShapes([...shapes, newShape]);
      setIsDrawing(true);
      return;
    }

    if (tool === 'arrow' || tool === 'line') {
      const newLine: Shape = {
        type: tool,
        id: `${tool}_${shapes.length}`,
        points: [pos.x / scale, pos.y / scale, pos.x / scale, pos.y / scale],
        x: 0,
        y: 0,
        stroke: color,
        strokeWidth: 2,
        dash: [0],
        roughness: 0,
        bindPoints: [],
      };
      setShapes([...shapes, newLine]);
      setIsDrawing(true);
      return;
    }

    if (tool === 'text') {
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
      return;
    }

    if (tool === 'image') {
      return;
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !stageRef.current) return;

    const stage = stageRef.current;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const isShiftPressed = e.evt.shiftKey;
    const lastShape = shapes[shapes.length - 1];

    if (lastShape.type === 'pen' || lastShape.type === 'eraser') {
      const newPoints = [...(lastShape.points || []), pos.x / scale, pos.y / scale];
      const newShapes = [...shapes];
      newShapes[shapes.length - 1] = { ...lastShape, points: newPoints };
      setShapes(newShapes);
    } else if (lastShape.type === 'rectangle' || lastShape.type === 'diamond' || lastShape.type === 'ellipse') {
      const dx = (pos.x / scale - lastShape.x) || 1;
      const dy = (pos.y / scale - lastShape.y) || 1;
      const newShapes = [...shapes];
      if (isShiftPressed && (lastShape.type === 'rectangle' || lastShape.type === 'ellipse')) {
        const size = Math.max(Math.abs(dx), Math.abs(dy));
        newShapes[shapes.length - 1] = {
          ...lastShape,
          width: dx >= 0 ? size : -size,
          height: dy >= 0 ? size : -size,
        };
      } else {
        newShapes[shapes.length - 1] = {
          ...lastShape,
          width: dx,
          height: dy,
        };
      }
      setShapes(newShapes);
    } else if (lastShape.type === 'arrow' || lastShape.type === 'line') {
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
      };
      setShapes(newShapes);
    }
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    setIsDrawing(false);
    if (shapes.length > 0) {
      const newHistory = history.slice(0, historyStep);
      newHistory.push([...shapes]);
      setHistory(newHistory);
      setHistoryStep(historyStep + 1);
    }
  };

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

  const handleZoomIn = () => setScale(scale * 1.2);
  const handleZoomOut = () => setScale(scale / 1.2);

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

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    // 'e' is used to access e.target.id()
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

  if (!isClient || dimensions.width === 0 || dimensions.height === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative w-full h-full">
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.evt.preventDefault()}
        ref={stageRef}
        draggable={tool === 'hand'}
      >
        <Layer>
          {shapes.map((shape) => {
            const isSelected = selectedIds.includes(shape.id);
            if (shape.type === 'pen' || shape.type === 'eraser') {
              return (
                <Line
                  key={shape.id}
                  id={shape.id}
                  points={shape.points ?? []}
                  stroke={shape.stroke || color}
                  strokeWidth={shape.strokeWidth || 2}
                  lineCap="round"
                  lineJoin="round"
                  draggable={tool === 'select' && isSelected}
                  onDragMove={handleDragMove}
                  onTransformEnd={handleTransformEnd}
                />
              );
            } else if (shape.type === 'rectangle') {
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
            } else if (shape.type === 'diamond') {
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
            } else if (shape.type === 'ellipse') {
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
            } else if (shape.type === 'arrow') {
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
            } else if (shape.type === 'line') {
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
            } else if (shape.type === 'text') {
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
            } else if (shape.type === 'image') {
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
            }
            return null;
          })}
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
                input.onchange = (event: Event) => handleImageUpload(event as unknown as React.ChangeEvent<HTMLInputElement>);
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

      {/* Image Upload Input for Insert Image Tool */}
      {tool === 'image' && (
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          id="image-upload"
        />
      )}
    </div>
  );
}