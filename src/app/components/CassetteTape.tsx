"use client";

import React from 'react';

interface CassetteTapeProps {
  isPlaying: boolean;
  currentSong?: {
    title: string;
    artist: string;
  };
}

export default function CassetteTape({ isPlaying, currentSong }: CassetteTapeProps) {
  return (
    <div className="relative w-[300px]">
      <svg
        viewBox="0 0 400 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
      >
        {/* Cassette body */}
        <rect
          x="10"
          y="10"
          width="380"
          height="230"
          rx="20"
          fill="#ffffff"
          stroke="#000"
          strokeWidth="2"
        />
        {/* Label area */}
        <rect
          x="40"
          y="30"
          width="320"
          height="80"
          fill="#fff"
          stroke="#000"
          strokeWidth="1"
        />
        {/* Reel windows */}
        <g className="reels">
          {/* Left reel window */}
          <circle
            cx="120"
            cy="160"
            r="40"
            fill="#ffffff"
            stroke="#000"
            strokeWidth="1"
          />
          {/* Right reel window */}
          <circle
            cx="280"
            cy="160"
            r="40"
            fill="#ffffff"
            stroke="#000"
            strokeWidth="1"
          />
          {/* Spinning reels with teeth */}
          <g
            className={`transition-transform ${isPlaying ? 'animate-[spin_2s_linear_infinite]' : ''}`}
            style={{
              transformOrigin: '120px 160px',
            }}
          >
            <circle cx="120" cy="160" r="20" fill="#333" />
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 120 + Math.cos(angle) * 20;
              const y1 = 160 + Math.sin(angle) * 20;
              const x2 = 120 + Math.cos(angle) * 25;
              const y2 = 160 + Math.sin(angle) * 25;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#333"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
          <g
            className={`transition-transform ${isPlaying ? 'animate-[spin_2s_linear_infinite]' : ''}`}
            style={{
              transformOrigin: '280px 160px',
            }}
          >
            <circle cx="280" cy="160" r="20" fill="#333" />
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 280 + Math.cos(angle) * 20;
              const y1 = 160 + Math.sin(angle) * 20;
              const x2 = 280 + Math.cos(angle) * 25;
              const y2 = 160 + Math.sin(angle) * 25;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#333"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        </g>
        {/* Text */}
        <g>
          <text
            x="200"
            y="65"
            textAnchor="middle"
            fill="black"
            fontFamily="sans-serif"
            fontSize="16"
            fontWeight="bold"
            dominantBaseline="middle"
          >
            {currentSong?.title || 'No song playing'}
          </text>
          <text 
            x="200" 
            y="90" 
            textAnchor="middle"
            fill="black"
            fontFamily="sans-serif"
            fontSize="14"
            dominantBaseline="middle"
          >
            {currentSong?.artist || ''}
          </text>
        </g>
      </svg>
    </div>
  );
} 