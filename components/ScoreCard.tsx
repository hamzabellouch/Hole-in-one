/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';
import { LevelData } from '../types';
import { RotateCcw, User, MapPin } from 'lucide-react';

interface ScoreCardProps {
  currentLevel: LevelData;
  strokes: number;
  totalScore: number;
  par: number;
  totalPar: number;
  levelIndex: number;
  commentary: string | null;
  onReset: () => void;
  onRetry: () => void;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ 
  currentLevel, 
  strokes, 
  totalScore, 
  par, 
  totalPar,
  levelIndex, 
  commentary,
  onReset,
  onRetry
}) => {
  return (
    <div className="w-full max-w-[800px] flex flex-col gap-4 mb-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center bg-[#202124] p-4 rounded-2xl shadow-lg border border-gray-700">
        <div className="flex items-center gap-6">
           {/* Level Info */}
           <div className="flex items-center gap-3">
              <div className="bg-[#303134] p-2 rounded-lg">
                <MapPin size={20} style={{ color: currentLevel.color }} />
              </div>
              <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-500 tracking-widest">Hole {levelIndex + 1}</span>
                  <span className="text-xl font-bold text-white tracking-tight">
                    {currentLevel.name}
                  </span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-8">
           {/* Par */}
           <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-gray-500 tracking-widest">Par</span>
              <span className="text-xl font-bold text-gray-300">
                {par}
              </span>
           </div>

           {/* Strokes */}
           <div className="flex flex-col items-end min-w-[60px]">
              <span className="text-xs font-bold text-gray-500 tracking-widest">Strokes</span>
              <span className={`text-3xl font-black ${strokes > par ? 'text-red-400' : 'text-white'}`}>
                {strokes}
              </span>
           </div>
           
           <div className="h-10 w-px bg-gray-700 mx-2"></div>
           
           <button 
             onClick={onRetry}
             className="p-3 bg-[#303134] hover:bg-[#3C4043] text-gray-300 rounded-xl transition-colors active:scale-95 group"
             title="Retry level"
           >
             <RotateCcw size={20} className="group-hover:-rotate-180 transition-transform duration-500" />
           </button>
        </div>
      </div>

      {/* Commentary Bar */}
      <div className="flex items-start gap-4 bg-[#303134] border border-gray-700 p-4 rounded-xl shadow-md relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
        <div className="bg-blue-500/20 p-2 rounded-lg shrink-0">
            <User size={20} className="text-blue-400" />
        </div>
        <div className="flex flex-col gap-1">
             <span className="text-[10px] font-bold text-blue-400 tracking-widest">AI caddy</span>
             <p className="text-sm font-medium text-gray-300 italic leading-relaxed">
              "{commentary || "Focus on your swing..."}"
            </p>
        </div>
      </div>
    </div>
  );
};

export default ScoreCard;
