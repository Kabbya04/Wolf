'use client';

import { useState, useRef } from 'react';
import {
  Hand,
  MousePointer,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Minus,
  Pen,
  Type,
  Image,
  Eraser,
  Palette
} from 'lucide-react';

interface ToolbarProps {
  onToolSelect?: (tool: string) => void;
  onColorChange?: (color: string) => void;
}

export default function Toolbar({ onToolSelect = () => {}, onColorChange = () => {} }: ToolbarProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>('pen'); // Default to pen tool
  const [selectedColor, setSelectedColor] = useState<string>('#000000');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const tools = [
    { name: 'palette', icon: Palette, label: 'Color Picker' },
    { name: 'hand', icon: Hand, label: 'Pan' },
    { name: 'select', icon: MousePointer, label: 'Select' },
    { name: 'rectangle', icon: Square, label: 'Rectangle' },
    { name: 'diamond', icon: Diamond, label: 'Diamond' },
    { name: 'ellipse', icon: Circle, label: 'Ellipse' },
    { name: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { name: 'line', icon: Minus, label: 'Line' },
    { name: 'pen', icon: Pen, label: 'Pen' },
    { name: 'text', icon: Type, label: 'Text' },
    { name: 'eraser', icon: Eraser, label: 'Eraser' },
    { name: 'image', icon: Image, label: 'Image' },
  ];

  const colors = [
    '#000000', // Black
    '#FFFFFF', // White
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
    '#800080', // Purple
    '#008080', // Teal
    '#FF69B4', // Hot Pink
  ];

  const handleToolSelect = (toolName: string) => {
    if (toolName === 'palette') {
      toggleColorPicker();
      return;
    }
    if (toolName === 'image') {
      const input = document.getElementById('image-upload') as HTMLInputElement;
      if (input) input.click();
    }
    setSelectedTool(toolName);
    onToolSelect(toolName);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    onColorChange(color);
    setShowColorPicker(false);
  };

  const toggleColorPicker = () => {
    setShowColorPicker(!showColorPicker);
  };

  return (
    <div className="absolute left-6 top-1/2 transform -translate-y-1/2 z-10">
      <div className="flex flex-col items-center bg-white rounded-xl shadow-md p-1.5 space-y-2">
        {/* Tools */}
        {tools.map((tool, index) => {
          // Add separator after the first tool (palette)
          const showSeparator = index === 1;
          
          return (
            <div key={tool.name} className="w-full flex flex-col items-center">
              {showSeparator && (
                <div className="w-4/5 h-px bg-gray-200 my-1"></div>
              )}
              <div className="relative group">
                <button
                  className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                    selectedTool === tool.name 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-white hover:bg-gray-100'
                  } transition-colors`}
                  onClick={() => handleToolSelect(tool.name)}
                  title={tool.label}
                >
                  <tool.icon size={20} strokeWidth={1.5} />
                </button>
                <span
                  className="absolute left-full ml-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                >
                  {tool.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Color picker popup */}
      {showColorPicker && (
        <div className="absolute left-20 top-8 bg-white p-2 rounded-md shadow-lg z-20 border border-gray-200">
          <div className="grid grid-cols-4 gap-1 w-28">
            {colors.map((color) => (
              <button
                key={color}
                className="w-5 h-5 rounded-full border border-gray-300 cursor-pointer"
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                title={color}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-center">
            <input 
              type="color" 
              value={selectedColor} 
              onChange={(e) => handleColorSelect(e.target.value)}
              className="w-full h-7 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}