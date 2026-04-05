/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import GameCanvas from './components/GameCanvas';
import { LEVELS } from './levels';
import { GameState } from './types';
import { getCaddyCommentary } from './services/geminiService';
import { ENABLE_AI_CADDY, ENABLE_DEV_TOOLS } from './constants';
import { Loader2, RotateCcw, FastForward, Edit } from 'lucide-react';
import { CloseIcon } from './components/Icons';
import Footer from './components/Footer';
import useAudio from "./hooks/useAudio";
import { getPath } from "./utils/path";
import InfoDialog from './components/builds/infoDialog.tsx'

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    return {
      currentLevelIndex: 0,
      strokes: 0,
      totalScore: 0,
      points: 0,
      state: 'AIMING',
      lastCommentary: null,
      commentaryLoading: false,
      bestScores: {},
      resetUnlocked: false,
    };
  });
  
  const [retryCount, setRetryCount] = useState(0);
  const [nextLevelLoading, setNextLevelLoading] = useState(false);
  const [caddyDismissed, setCaddyDismissed] = useState(false);

  const currentLevel = LEVELS[gameState.currentLevelIndex];
  const totalPar = LEVELS.reduce((acc, l) => acc + l.par, 0);

  const { playForeground, preloadCache } = useAudio();

  const audioFiles = [
    getPath("/media/audio/sfx/global/lose.mp3"),
    getPath("/media/audio/sfx/global/win.mp3"),
    getPath("/media/audio/sfx/global/buttonclick.mp3"),
    getPath("/media/audio/sfx/minigolf/goal.mp3"),
    getPath("/media/audio/sfx/minigolf/hitwall.mp3"),
    getPath("/media/audio/sfx/minigolf/intohole.mp3"),
    getPath("/media/audio/sfx/minigolf/outofholehole.mp3"),
    getPath("/media/audio/sfx/minigolf/putt.mp3"),
  ];

  useEffect(() => {
    preloadCache(audioFiles);
  }, []);

  const totalBestDiffInfo = useMemo(() => {
    let totalDiff = 0;
    let playedCount = 0;
    LEVELS.forEach((level, index) => {
      const best = gameState.bestScores[index];
      if (best !== undefined) {
        totalDiff += (best - level.par);
        playedCount++;
      }
    });
    const diffString = playedCount === 0 ? "—" : (totalDiff === 0 ? "Par" : (totalDiff > 0 ? `+${totalDiff}` : totalDiff.toString()));
    return { totalDiff, diffString, playedCount };
  }, [gameState.bestScores]);

  // Handle Intro Commentary
  useEffect(() => {
    if (!ENABLE_AI_CADDY || gameState.state !== 'AIMING' || gameState.lastCommentary !== null) return;

    const loadIntro = async () => {
       setGameState(prev => ({ ...prev, commentaryLoading: true }));
       try {
         const text = await getCaddyCommentary(currentLevel.name, 0, currentLevel.par, 'START');
         setGameState(prev => ({ ...prev, lastCommentary: text, commentaryLoading: false }));
       } catch (e) {
         setGameState(prev => ({ ...prev, commentaryLoading: false }));
       }
    };
    loadIntro();
  }, [gameState.currentLevelIndex, gameState.state, ENABLE_AI_CADDY, currentLevel]);

  useEffect(() => {
    setCaddyDismissed(false);
  }, [gameState.currentLevelIndex, retryCount]); 

  const handleStroke = () => {
    setGameState(prev => ({
      ...prev,
      strokes: prev.strokes + 1,
      state: 'MOVING'
    }));
  };

  const handleHole = useCallback(() => {
    const finalStrokes = gameState.strokes;
    const currentLvlIndex = gameState.currentLevelIndex;
    const currentLvlPar = currentLevel.par;
    const currentLvlName = currentLevel.name;
    const isFinalHole = currentLvlIndex >= LEVELS.length - 1;

    // Transition immediately without setTimeout delay
    setGameState(prev => {
        const newBestScores = { ...prev.bestScores };
        const currentBest = newBestScores[currentLvlIndex];
        if (currentBest === undefined || finalStrokes < currentBest) {
          newBestScores[currentLvlIndex] = finalStrokes;
        }

        const bonus = (currentLvlPar - finalStrokes) * 200;
        const holePoints = Math.max(50, 500 + bonus);

        return { 
          ...prev, 
          state: isFinalHole ? 'GAME_OVER' : 'LEVEL_COMPLETE', 
          commentaryLoading: ENABLE_AI_CADDY,
          lastCommentary: null,
          points: prev.points + holePoints,
          bestScores: newBestScores,
          // If it's final hole, add to total now so screen reflects it
          totalScore: isFinalHole ? prev.totalScore + finalStrokes : prev.totalScore,
          resetUnlocked: isFinalHole ? true : prev.resetUnlocked
        };
    });

    playForeground(getPath("/media/audio/sfx/minigolf/goal.mp3"));

    // Async fetch commentary in background so modal shows up instantly
    if (ENABLE_AI_CADDY) {
        getCaddyCommentary(currentLvlName, finalStrokes, currentLvlPar, 'WIN', isFinalHole)
          .then(commentary => {
            setGameState(prev => ({
              ...prev,
              lastCommentary: commentary,
              commentaryLoading: false
            }));
          })
          .catch(() => {
            setGameState(prev => ({ ...prev, commentaryLoading: false }));
          });
    }
  }, [currentLevel, gameState.strokes, gameState.currentLevelIndex, playForeground]);

  const nextLevel = async () => {
    playForeground(getPath("/media/audio/sfx/global/buttonclick.mp3"));

    if (gameState.currentLevelIndex >= LEVELS.length - 1) {
        setGameState(prev => ({ 
            ...prev, 
            state: 'GAME_OVER',
            totalScore: prev.totalScore + prev.strokes,
            resetUnlocked: true
        }));
        return;
    }

    setNextLevelLoading(true);
    const nextIndex = gameState.currentLevelIndex + 1;
    
    setGameState(prev => ({
        ...prev,
        currentLevelIndex: nextIndex,
        totalScore: prev.totalScore + prev.strokes,
        strokes: 0,
        state: 'AIMING',
        lastCommentary: null,
        commentaryLoading: false
    }));
    
    setNextLevelLoading(false);
  };

  const resetGame = async () => {
    playForeground(getPath("/media/audio/sfx/global/buttonclick.mp3"));
    setGameState(prev => ({
        ...prev,
        currentLevelIndex: 0,
        strokes: 0,
        totalScore: 0,
        points: 0,
        state: 'AIMING',
        lastCommentary: null,
        commentaryLoading: false
    }));
    setRetryCount(0);
  };

  const retryLevel = () => {
    playForeground(getPath("/media/audio/sfx/global/buttonclick.mp3"));
    setGameState(prev => ({
        ...prev,
        strokes: 0,
        state: 'AIMING',
        lastCommentary: null,
        commentaryLoading: false
    }));
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    if (gameState.state === 'GAME_OVER') {
      playForeground(getPath("/media/audio/sfx/global/win.mp3"));
    }
  }, [gameState.state, playForeground]);

  const mulligan = () => {
    playForeground(getPath("/media/audio/sfx/global/buttonclick.mp3"));
    setGameState(prev => ({
      ...prev,
      strokes: prev.strokes + 1, 
      state: 'AIMING',
      lastCommentary: null,
      commentaryLoading: false
    }));
    setRetryCount(prev => prev + 1);
  };

  const renderHUD = () => {
    return (
      <div className="h-full w-full relative">
        {ENABLE_AI_CADDY && !caddyDismissed && (
            <div className="absolute bottom-[200px] lg:bottom-[120px] left-1/2 -translate-x-1/2 z-40 w-full max-w-md select-none px-4">
            <div className="bg-[#131313] backdrop-blur-md p-4 rounded-3xl shadow-2xl flex items-center gap-4 relative pointer-events-auto">
                <div className="flex flex-col text-center justify-center items-center gap-1.5 mx-auto pr-6">
                    <span className="text-base text-[#9BA0A6] font-medium">Caddy analysis</span>
                    {gameState.commentaryLoading ? (
                      <Loader2 className="animate-spin text-white w-5 h-5 mt-1" />
                    ) : (
                      <p className="text-base font-medium text-white text-pretty">
                        "{gameState.lastCommentary || "Line up your shot..."}"
                      </p>
                    )}
                </div>
                <button
                  onClick={() => setCaddyDismissed(true)}
                  className="absolute top-3 right-3 p-1 hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Dismiss caddy message"
                >
                  <CloseIcon className="w-5 h-5 text-[#9BA0A6]" />
                </button>
            </div>
            </div>
        )}
      </div>
    );
  };

  const renderOverlay = () => {
    if (gameState.state === 'LEVEL_COMPLETE') {
        const scoreInfo = getScoreTerm(gameState.strokes, currentLevel.par);
        const isFinal = gameState.currentLevelIndex >= LEVELS.length - 1;
        
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-xl p-[55px]">
                <div className="bg-black text-white px-[30px] lg:px-10 py-10 lg:py-[50px] rounded-3xl text-center w-full rainbow-border animate-rotate-gradient animate-in fade-in zoom-in duration-200 flex flex-col items-center min-w-xs max-w-md">
                    <h2 className="text-[48px] font-medium mb-6 leading-none tracking-tight">Nice shot</h2>
                    
                    <div className="flex flex-col items-center mb-10">
                        <p className="text-lg tracking-tight font-medium leading-none flex gap-1.5">{gameState.strokes} {gameState.strokes !== 1 ? "Strokes" : "Stroke"}
                        {scoreInfo && (
                            <><span>—</span><span>{scoreInfo.term}</span></>
                        )}
                        </p>
                    </div>
                    
                    {ENABLE_AI_CADDY && (
                        <div className="bg-[#202020] p-5 rounded-2xl mb-10 gap-3 flex flex-col justify-center w-full min-h-[100px]">
                            <p className="text-lg text-[#9BA0A6] tracking-tight font-medium">Caddy message</p>
                            {gameState.commentaryLoading ? (
                            <div className="flex justify-center py-2">
                                <Loader2 className="animate-spin text-white" />
                            </div>
                            ) : (
                            <p className="text-lg font-medium text-white tracking-tight">"{gameState.lastCommentary || "Good job!"}"</p>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                      <button 
                          onClick={nextLevel}
                          disabled={nextLevelLoading}
                          className="w-full bg-white text-black hover:opacity-80 leading-none py-[22px] px-[22px] min-w-[175px] lg:min-w-[206px] rounded-full font-medium flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                          {nextLevelLoading ? (
                               <Loader2 className="animate-spin" />
                          ) : (
                              isFinal ? <>View results</> : <>Next hole</>
                          )}
                      </button>
                    </div>
                </div>
            </div>
        );
    }

    if (gameState.state === 'GAME_OVER') {
        const parDiff = gameState.totalScore - totalPar;
        const scoreText = parDiff === 0 ? "Even Par" : (parDiff > 0 ? `${parDiff} Over Par` : `${Math.abs(parDiff)} Under Par`);
        
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-xl p-[55px]">
            <div className="bg-black text-white px-[30px] lg:px-10 py-10 lg:py-[50px] rounded-3xl text-center w-full rainbow-border animate-rotate-gradient animate-in fade-in zoom-in duration-200 flex flex-col items-center min-w-xs max-w-md">
                <h2 className="text-[48px] font-medium mb-6 leading-none tracking-tight">Course Complete</h2>
                
                <div className="flex flex-col items-center mb-10">
                    <p className="text-xl tracking-tight font-bold leading-none mb-2">{scoreText}</p>
                    <p className="text-lg text-[#9BA0A6] font-medium">Total Strokes: {gameState.totalScore} (Par {totalPar})</p>
                </div>
                
                {ENABLE_AI_CADDY && (
                    <div className="bg-[#202020] p-5 rounded-2xl mb-10 gap-3 flex flex-col justify-center w-full min-h-[100px]">
                        <p className="text-lg text-[#9BA0A6] tracking-tight font-medium">Final analysis</p>
                        {gameState.commentaryLoading ? (
                            <div className="flex justify-center py-2">
                                <Loader2 className="animate-spin text-white" />
                            </div>
                        ) : (
                            <p className="text-lg font-medium text-white tracking-tight">"{gameState.lastCommentary || "What a game!"}"</p>
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-4">
                  <button 
                      onClick={resetGame}
                      className="w-full bg-white text-black hover:opacity-80 leading-none py-[22px] px-[22px] min-w-[175px] lg:min-w-[206px] rounded-full font-medium flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                      Play again
                  </button>
                </div>
            </div>
          </div>
        );
    }

    return null;
  };

  const getScoreTerm = (strokes: number, par: number) => {
    if (strokes === 1) return { term: "Hole-in-one", color: "text-black" };
    const diff = strokes - par;
    if (diff === -1) return { term: "Birdie", color: "text-black" };
    if (diff === 0) return { term: "Par", color: "text-black" };
    if (diff === 1) return { term: "Bogey", color: "text-black" };
    if (diff === 2) return { term: "Double bogey", color: "text-black" };
    return null;
  };

  return (
    <>
    <div className="w-full h-[calc(100%-100px)] bg-black font-sans overflow-hidden relative rounded-2xl">
      {renderHUD()}

      <GameCanvas 
          key={`${currentLevel.id}-${retryCount}`}
          level={currentLevel}
          onStroke={handleStroke}
          onHole={handleHole}
      />
      

      {renderOverlay()}

      <InfoDialog title="Can you get a hole in one?" goal="Line up your shot and take a swing! Watch out for obstacles and get helpful hints from your personal caddy." onClose={() => {}} />
    </div>
    <div className="fixed bottom-4 left-0 right-0 flex items-center justify-center px-4 z-100">
      <Footer
        gameState={gameState}
        par={currentLevel.par}
        numLevels={LEVELS.length}
        mulligan={mulligan}
      />
    </div>
    </>
  );
};

export default App;
