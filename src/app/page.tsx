'use client';

import { useState, useEffect } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Image from 'next/image';


export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [selectedTool, setSelectedTool] = useState('pen');
  const [selectedColor, setSelectedColor] = useState('#000000');

  useEffect(() => {
    // Simulate loading delay (1 second)
    const loadingTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 1000);

    // Remove splash screen from DOM after fade-out transition (1s loading + 0.5s fade-out)
    const removeSplashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 1500); // Matches loading duration (1000ms) + fade-out duration (500ms)

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(removeSplashTimer);
    };
  }, []);

  const handleToolSelect = (tool: string) => {
    setSelectedTool(tool);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Splash Screen with Centered Logo and Hover Effect */}
      {showSplash && (
        <div
          className={`fixed inset-0 flex items-center justify-center bg-white transition-opacity duration-500 z-50 border-2 border-red-500 ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="animate-hover">
            <Image
              src="/wolf-high-resolution-logo-transparent.png"
              alt="Wolf"
              width={400}
              height={0}
              priority
            />
          </div>
        </div>
      )}

      {/* Main Content - Only show after splash screen is gone */}
      {!showSplash && (
        <div className="relative w-full h-full">
          <Canvas tool={selectedTool} color={selectedColor} />
          <Toolbar onToolSelect={handleToolSelect} onColorChange={handleColorChange} />
        </div>
      )}

      {/* CSS for Hover Animation */}
      <style jsx>{`
        @keyframes hover {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-hover {
          animation: hover 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}