/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Ball, LevelData, Vector2, Wall, Decoration, PortalExitConfig } from '../types';
import { 
  TILE_SIZE, 
  COLORS, 
  CHAR_WALL, 
  CHAR_ARC,
  CHAR_INSIDE_ARC,
  CHAR_START, 
  CHAR_HOLE, 
  CHAR_VOID,
  CHAR_ANDROID,
  CHAR_TREX,
  CHAR_BOUNCY_PAD,
  CHAR_BOOST_LEFT,
  CHAR_BOOST_RIGHT,
  CHAR_BOOST_UP,
  CHAR_BOOST_DOWN,
  CHAR_WATER,
  CHAR_WATER_ARC,
  CHAR_SAND,
  CHAR_SAND_ARC,
  BALL_RADIUS, 
  FRICTION, 
  SAND_FRICTION,
  VELOCITY_THRESHOLD, 
  MAX_POWER, 
  POWER_MULTIPLIER, 
  HOLE_RADIUS,
  ALLOW_HIT_WHILE_MOVING,
  TELEPORT_TIME,
  USE_ANDROID_SVG
} from '../constants';
import useAudio from "../hooks/useAudio";
import { getPath } from "../utils/path";

import { ICON_PATHS } from './Icons';
import { PORTRAIT_SCALE_OVERRIDES } from '../levels';

interface BoostTile extends Vector2 {
  dx: number;
  dy: number;
}

interface WaterArcTile extends Vector2 {
  orientation: 'NW' | 'NE' | 'SW' | 'SE';
}

interface SandArcTile extends Vector2 {
  orientation: 'NW' | 'NE' | 'SW' | 'SE';
}

interface PortalTile extends Vector2 {
  id: string; // '1' - '9'
}

interface PendingTeleport {
  targetPortal: PortalTile;
  exitConfig?: PortalExitConfig;
}

interface GameCanvasProps {
  level: LevelData;
  onStroke: () => void;
  onHole: () => void;
}

const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

const GameCanvas: React.FC<GameCanvasProps> = ({ level, onStroke, onHole }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wallsRef = useRef<Wall[]>([]);
  const decorationsRef = useRef<Decoration[]>([]);
  const boostTilesRef = useRef<BoostTile[]>([]);
  const waterTilesRef = useRef<Vector2[]>([]);
  const waterArcsRef = useRef<WaterArcTile[]>([]);
  const sandTilesRef = useRef<Vector2[]>([]);
  const sandArcsRef = useRef<SandArcTile[]>([]);
  const portalsRef = useRef<PortalTile[]>([]);
  const holeRef = useRef<Vector2 | null>(null);
  const startPosRef = useRef<Vector2 | null>(null);
  const offsetRef = useRef<Vector2>({ x: 0, y: 0 });
  const physicalScaleRef = useRef<number>(1);
  
  const portalCooldownRef = useRef<number>(0);
  const lastExitedPortalRef = useRef<PortalTile | null>(null);
  const pendingTeleportRef = useRef<PendingTeleport | null>(null);
  
  const requestRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const ballRef = useRef<Ball | null>(null); 
  const textureRef = useRef<HTMLImageElement | null>(null);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isAiming, setIsAiming] = useState(false);
  const [dragStart, setDragStart] = useState<Vector2 | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Vector2 | null>(null);
  const { playForeground } = useAudio();

  useEffect(() => {
    const img = new Image();
    const gridWidth = level.grid[0].length;
    const gridHeight = level.grid.length;
    const isHorizontal = gridWidth > gridHeight;
    
    img.src = getPath(isHorizontal 
      ? '/media/images/builds/brand-gradient-horizontal.png'
      : '/media/images/builds/brand-gradient-vertical.png'
    );
    img.onload = () => {
      textureRef.current = img;
    };
  }, [level]);

  const calculateLayout = useCallback((width: number, height: number) => {
    if (width === 0 || height === 0) return { x: 0, y: 0 };
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const gridWidth = level.grid[0].length * TILE_SIZE;
    const gridHeight = level.grid.length * TILE_SIZE;
    
    const isPortrait = height > width && width < 640; // Treat narrow screens as portrait regardless of height
    
    if (isPortrait) {
      // In portrait mode: prefer full width but respect height constraints
      const widthScale = width / gridWidth;
      const heightScale = height / gridHeight;
      
      // Use width scale if it fits, otherwise constrain by height
      let baseScale = Math.min(widthScale, heightScale);
      
      // Apply manual scale override if configured for this level
      const scaleOverride = PORTRAIT_SCALE_OVERRIDES[level.id];
      if (scaleOverride !== undefined) {
        baseScale *= scaleOverride;
      }
      
      const physicalTileSize = Math.max(1, Math.ceil(TILE_SIZE * baseScale * dpr));
      physicalScaleRef.current = physicalTileSize / TILE_SIZE;
      
      const scaledWidth = gridWidth * (physicalTileSize / (TILE_SIZE * dpr));
      const scaledHeight = gridHeight * (physicalTileSize / (TILE_SIZE * dpr));
      
      return {
        x: Math.floor((width - scaledWidth) / 2), // Center horizontally
        y: Math.floor((height - scaledHeight) / 2) // Center vertically
      };
    } else {
      // In landscape mode: fit within available space
      let availableW = width;
      let availableH = height - 84 - 180; // Account for header and footer
      
      const baseScale = Math.min(availableW / gridWidth, availableH / gridHeight, 1);
      const physicalTileSize = Math.max(1, Math.floor(TILE_SIZE * baseScale * dpr));
      physicalScaleRef.current = physicalTileSize / TILE_SIZE;
      
      return {
        x: Math.floor((width - (gridWidth * (physicalTileSize / (TILE_SIZE * dpr)))) / 2),
        y: Math.floor((height - (gridHeight * (physicalTileSize / (TILE_SIZE * dpr)))) / 2)
      };
    }
  }, [level]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
        offsetRef.current = calculateLayout(width, height);
      }
    });

    resizeObserver.observe(containerRef.current);
    
    const rect = containerRef.current.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });
    offsetRef.current = calculateLayout(rect.width, rect.height);

    return () => resizeObserver.disconnect();
  }, [calculateLayout]);

  useEffect(() => {
    const walls: Wall[] = [];
    const decorations: Decoration[] = [];
    const boostTiles: BoostTile[] = [];
    const waterTiles: Vector2[] = [];
    const waterArcs: WaterArcTile[] = [];
    const sandTiles: Vector2[] = [];
    const sandArcs: SandArcTile[] = [];
    const portals: PortalTile[] = [];
    let start: Vector2 = { x: 0, y: 0 };
    let hole: Vector2 = { x: 0, y: 0 };

    const isSolid = (r: number, c: number) => {
      if (r < 0 || r >= level.grid.length || c < 0 || c >= level.grid[0].length) return false;
      const char = level.grid[r][c];
      return char === CHAR_WALL || char === CHAR_ARC || char === CHAR_INSIDE_ARC;
    };

    const isWatery = (r: number, c: number) => {
      if (r < 0 || r >= level.grid.length || c < 0 || c >= level.grid[0].length) return false;
      const char = level.grid[r][c];
      return char === CHAR_WATER || char === CHAR_WATER_ARC || char === CHAR_SAND_ARC;
    };

    const isSandy = (r: number, c: number) => {
      if (r < 0 || r >= level.grid.length || c < 0 || c >= level.grid[0].length) return false;
      const char = level.grid[r][c];
      return char === CHAR_SAND || char === CHAR_SAND_ARC || char === CHAR_WATER_ARC;
    };
    
    level.grid.forEach((row, rowIndex) => {
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const char = row[colIndex];
        const x = colIndex * TILE_SIZE;
        const y = rowIndex * TILE_SIZE;

        if (char === CHAR_WALL) {
          walls.push({ x, y, w: TILE_SIZE, h: TILE_SIZE, type: 'SQUARE' });
        } else if (char === CHAR_ARC || char === CHAR_INSIDE_ARC) {
          let N = isSolid(rowIndex - 1, colIndex);
          let S = isSolid(rowIndex + 1, colIndex);
          let W = isSolid(rowIndex, colIndex - 1);
          let E = isSolid(rowIndex, colIndex + 1);
          if(char === CHAR_INSIDE_ARC) {
            N=!N; S=!S; W=!W; E=!E;
          }

          let orientation: 'NW' | 'NE' | 'SW' | 'SE' = 'NW';
          if (N && W) orientation = 'NW';
          else if (N && E) orientation = 'NE';
          else if (S && W) orientation = 'SW';
          else if (S && E) orientation = 'SE';
          
          walls.push({ 
            x, y, w: TILE_SIZE, h: TILE_SIZE, 
            type: char === CHAR_ARC ? 'ARC' : 'INSIDE_ARC', 
            orientation 
          });
        } else if (char === CHAR_START) {
          start = { x: x + TILE_SIZE / 2, y: y + TILE_SIZE / 2 };
        } else if (char === CHAR_HOLE) {
          hole = { x: x + TILE_SIZE / 2, y: y + TILE_SIZE / 2 };
        } else if (char === CHAR_ANDROID) {
          decorations.push({ 
            type: 'ANDROID', 
            pos: { x: x + TILE_SIZE/2, y: y + TILE_SIZE/2 }, 
            radius: TILE_SIZE/2,
            vel: { x: 0, y: 1.2 } 
          });
        } else if (char === CHAR_TREX) {
          decorations.push({ 
            type: 'TREX', 
            pos: { x: x + TILE_SIZE/2, y: y + TILE_SIZE/2 }, 
            radius: TILE_SIZE/2,
            vel: { x: 1.5, y: 0 } 
          });
        } else if (char === CHAR_BOUNCY_PAD) {
          decorations.push({
            type: 'BOUNCY_PAD',
            pos: { x: x + TILE_SIZE / 2, y: y + TILE_SIZE / 2 },
            radius: TILE_SIZE / 2,
            scale: 1,
            targetScale: 1
          });
        } else if (char === CHAR_BOOST_LEFT || char === CHAR_BOOST_RIGHT || char === CHAR_BOOST_UP || char === CHAR_BOOST_DOWN) {
          let dx = 0, dy = 0;
          if (char === CHAR_BOOST_LEFT) dx = -1;
          else if (char === CHAR_BOOST_RIGHT) dx = 1;
          else if (char === CHAR_BOOST_UP) dy = -1;
          else if (char === CHAR_BOOST_DOWN) dy = 1;
          boostTiles.push({ x: colIndex * TILE_SIZE, y: rowIndex * TILE_SIZE, dx, dy });
        } else if (char === CHAR_WATER) {
          waterTiles.push({ x: colIndex * TILE_SIZE, y: rowIndex * TILE_SIZE });
        } else if (char === CHAR_WATER_ARC) {
          const N = isWatery(rowIndex - 1, colIndex);
          const S = isWatery(rowIndex + 1, colIndex);
          const W = isWatery(rowIndex, colIndex - 1);
          const E = isWatery(rowIndex, colIndex + 1);
          let orientation: 'NW' | 'NE' | 'SW' | 'SE' = 'NW';
          if (N && W) orientation = 'NW';
          else if (N && E) orientation = 'NE';
          else if (S && W) orientation = 'SW';
          else if (S && E) orientation = 'SE';
          waterArcs.push({ x, y, orientation });
        } else if (char === CHAR_SAND) {
          sandTiles.push({ x: colIndex * TILE_SIZE, y: rowIndex * TILE_SIZE });
        } else if (char === CHAR_SAND_ARC) {
          const N = isSandy(rowIndex - 1, colIndex);
          const S = isSandy(rowIndex + 1, colIndex);
          const W = isSandy(rowIndex, colIndex - 1);
          const E = isSandy(rowIndex, colIndex + 1);
          let orientation: 'NW' | 'NE' | 'SW' | 'SE' = 'NW';
          if (N && W) orientation = 'NW';
          else if (N && E) orientation = 'NE';
          else if (S && W) orientation = 'SW';
          else if (S && E) orientation = 'SE';
          sandArcs.push({ x, y, orientation });
        } else if (/[1-9]/.test(char)) {
          portals.push({ x: x + TILE_SIZE/2, y: y + TILE_SIZE/2, id: char });
        }
      }
    });

    wallsRef.current = walls;
    decorationsRef.current = decorations;
    boostTilesRef.current = boostTiles;
    waterTilesRef.current = waterTiles;
    waterArcsRef.current = waterArcs;
    sandTilesRef.current = sandTiles;
    sandArcsRef.current = sandArcs;
    portalsRef.current = portals;
    holeRef.current = hole;
    startPosRef.current = start;
    
    if (dimensions.width > 0) {
      offsetRef.current = calculateLayout(dimensions.width, dimensions.height);
    }

    ballRef.current = {
      pos: { ...start },
      vel: { x: 0, y: 0 },
      radius: BALL_RADIUS,
      isMoving: false,
      sunk: false,
      teleportTimer: 0
    };
  }, [level, calculateLayout]);

  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const cssScale = physicalScaleRef.current / dpr;
    
    const x = (clientX - rect.left - offsetRef.current.x) / cssScale;
    const y = (clientY - rect.top - offsetRef.current.y) / cssScale;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!ballRef.current || ballRef.current.sunk || ballRef.current.teleportTimer > 0) return;
    if (!ALLOW_HIT_WHILE_MOVING && ballRef.current.isMoving) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const { x, y } = getCanvasCoords(clientX, clientY);

    setIsAiming(true);
    setDragStart({ x, y });
    setDragCurrent({ x, y });
    playForeground(getPath("/media/audio/sfx/global/buttonclick.mp3"));
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isAiming || !dragStart || !canvasRef.current) return;
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    const { x, y } = getCanvasCoords(clientX, clientY);
    setDragCurrent({ x, y });
  }, [isAiming, dragStart]);

  const handleMouseUp = useCallback(() => {
    if (!isAiming || !dragStart || !dragCurrent || !ballRef.current) {
        setIsAiming(false);
        return;
    }
    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;
    const power = Math.sqrt(dx*dx + dy*dy) * POWER_MULTIPLIER;
    
    if (power > 1) { 
        const angle = Math.atan2(dy, dx);
        const cappedPower = Math.min(power, MAX_POWER);
        ballRef.current.vel.x = Math.cos(angle) * cappedPower;
        ballRef.current.vel.y = Math.sin(angle) * cappedPower;
        ballRef.current.isMoving = true;
        playForeground(getPath("/media/audio/sfx/minigolf/putt.mp3"));
        onStroke();
    }
    setIsAiming(false);
    setDragStart(null);
    setDragCurrent(null);
  }, [isAiming, dragStart, dragCurrent, onStroke]);

  useEffect(() => {
    if (isAiming) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleMouseMove);
        window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isAiming, handleMouseMove, handleMouseUp]);

  const update = useCallback(() => {
    const b = ballRef.current;
    if (!b || b.sunk) return;

    if (portalCooldownRef.current > 0) {
      portalCooldownRef.current--;
    }

    // Handle Teleportation Delay
    if (b.teleportTimer > 0) {
      b.teleportTimer--;
      if (b.teleportTimer === 0 && pendingTeleportRef.current) {
        playForeground(getPath("/media/audio/sfx/minigolf/outofholehole.mp3"));

        const { targetPortal, exitConfig } = pendingTeleportRef.current;
        b.pos.x = targetPortal.x;
        b.pos.y = targetPortal.y;
        lastExitedPortalRef.current = targetPortal;
        portalCooldownRef.current = 60;
        
        if (exitConfig) {
          const currentSpeed = Math.sqrt(b.vel.x**2 + b.vel.y**2);
          const newSpeed = currentSpeed * exitConfig.boost;
          const rad = (exitConfig.angle * Math.PI) / 180;
          b.vel.x = Math.cos(rad) * newSpeed;
          b.vel.y = Math.sin(rad) * newSpeed;
        }
        b.isMoving = true;
        pendingTeleportRef.current = null;
      }
      return; // Ball is "frozen" during teleport
    }

    decorationsRef.current.forEach(d => {
      if (d.type === 'BOUNCY_PAD') {
        if (d.scale !== undefined && d.targetScale !== undefined) {
          d.scale += (d.targetScale - d.scale) * 0.15;
          if (Math.abs(d.scale - 1) < 0.01) d.scale = 1;
        }
      }

      if (d.type === 'TREX' && d.pauseTimer !== undefined && d.pauseTimer > 0) {
        d.pauseTimer--;
        if (d.pauseTimer > 30) {
          b.pos.x = d.pos.x;
          b.pos.y = d.pos.y - 10;
          b.vel.x = 0;
          b.vel.y = 0;
          b.isMoving = false;
        }
        if (d.pauseTimer === 30) {
          b.vel.y = 25;
          b.vel.x = d.originalVel!.x * 3;
          b.isMoving = true;
          playForeground(getPath("/media/audio/sfx/minigolf/putt.mp3"))
        }
        if (d.pauseTimer === 0 && d.originalVel) {
          d.vel = { ...d.originalVel };
          d.originalVel = undefined;
        }
      }

      if (d.vel && (d.vel.x !== 0 || d.vel.y !== 0)) {
        d.pos.x += d.vel.x;
        d.pos.y += d.vel.y;
        wallsRef.current.forEach(w => {
          const closestX = Math.max(w.x, Math.min(d.pos.x, w.x + w.w));
          const closestY = Math.max(w.y, Math.min(d.pos.y, w.y + w.h));
          const dx = d.pos.x - closestX;
          const dy = d.pos.y - closestY;
          const distSq = dx * dx + dy * dy;
          if (distSq < (d.radius * 0.8) ** 2) {
            if (d.vel!.x !== 0) { d.vel!.x *= -1; d.pos.x += d.vel!.x; }
            if (d.vel!.y !== 0) { d.vel!.y *= -1; d.pos.y += d.vel!.y; }
          }
        });
        
        const gridH = level.grid.length * TILE_SIZE;
        const gridW = level.grid[0].length * TILE_SIZE;
        if (d.pos.y < 0 || d.pos.y > gridH) d.vel.y *= -1;
        if (d.pos.x < 0 || d.pos.x > gridW) d.vel.x *= -1;
      }
    });

    // Android to Android collision detection
    for (let i = 0; i < decorationsRef.current.length; i++) {
        const d1 = decorationsRef.current[i];
        if (d1.type !== 'ANDROID' || !d1.vel) continue;

        for (let j = i + 1; j < decorationsRef.current.length; j++) {
            const d2 = decorationsRef.current[j];
            if (d2.type !== 'ANDROID' || !d2.vel) continue;

            const dx = d1.pos.x - d2.pos.x;
            const dy = d1.pos.y - d2.pos.y;
            const distSq = dx * dx + dy * dy;
            const minDist = d1.radius + d2.radius;

            if (distSq < minDist * minDist) {
                // Reverse both androids
                d1.vel.x *= -1;
                d1.vel.y *= -1;
                d2.vel.x *= -1;
                d2.vel.y *= -1;

                // Simple separation to avoid sticking
                const dist = Math.sqrt(distSq);
                const overlap = (minDist - dist) / 2;
                const nx = dx / (dist || 1);
                const ny = dy / (dist || 1);
                d1.pos.x += nx * overlap;
                d1.pos.y += ny * overlap;
                d2.pos.x -= nx * overlap;
                d2.pos.y -= ny * overlap;
            }
        }
    }

    if (!holeRef.current) return;

    let appliedFriction = FRICTION;
    
    const gridWidth = level.grid[0].length * TILE_SIZE;
    const gridHeight = level.grid.length * TILE_SIZE;

    // Check Android collisions even when ball is stationary
    decorationsRef.current.forEach(d => {
        if (d.type === 'ANDROID' && d.vel) {
            const dx = b.pos.x - d.pos.x;
            const dy = b.pos.y - d.pos.y;
            const distSq = dx * dx + dy * dy;
            const minDist = b.radius + d.radius * 0.6;
            
            if (distSq < minDist * minDist && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                
                // Calculate new position after push
                let newX = b.pos.x + nx * (minDist - dist);
                let newY = b.pos.y + ny * (minDist - dist);
                
                // Clamp to boundaries
                newX = Math.max(b.radius, Math.min(gridWidth - b.radius, newX));
                newY = Math.max(b.radius, Math.min(gridHeight - b.radius, newY));
                
                // Apply the clamped position
                b.pos.x = newX;
                b.pos.y = newY;
                
                // Transfer android's velocity to the ball
                b.vel.x = d.vel.x * 2;
                b.vel.y = d.vel.y * 2;
                b.isMoving = true;
                
                playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
            }
        }
    });

    if (b.isMoving) {
        const SUBSTEPS = 12;
        let collided = false;
        
        for (let i = 0; i < SUBSTEPS; i++) {
            b.pos.x += b.vel.x / SUBSTEPS;
            b.pos.y += b.vel.y / SUBSTEPS;
            
            // Boundary checking - keep ball within gameboard
            if (b.pos.x - b.radius < 0) {
                b.pos.x = b.radius;
                b.vel.x = -b.vel.x * 0.8;
                playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
            } else if (b.pos.x + b.radius > gridWidth) {
                b.pos.x = gridWidth - b.radius;
                b.vel.x = -b.vel.x * 0.8;
                playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
            }
            
            if (b.pos.y - b.radius < 0) {
                b.pos.y = b.radius;
                b.vel.y = -b.vel.y * 0.8;
                playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
            } else if (b.pos.y + b.radius > gridHeight) {
                b.pos.y = gridHeight - b.radius;
                b.vel.y = -b.vel.y * 0.8;
                playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
            }

            const speed = Math.sqrt(b.vel.x * b.vel.x + b.vel.y * b.vel.y);
            const SINK_THRESHOLD = 6.0;

            // Check if on sand (applies extra friction)
            sandTilesRef.current.forEach(t => {
                if (b.pos.x >= t.x && b.pos.x <= t.x + TILE_SIZE &&
                    b.pos.y >= t.y && b.pos.y <= t.y + TILE_SIZE) {
                    appliedFriction = SAND_FRICTION;
                }
            });

            sandArcsRef.current.forEach(t => {
              let cx = t.x, cy = t.y;
              if (t.orientation === 'NE') cx = t.x + TILE_SIZE;
              else if (t.orientation === 'SW') cy = t.y + TILE_SIZE;
              else if (t.orientation === 'SE') { cx = t.x + TILE_SIZE; cy = t.y + TILE_SIZE; }

              const dx = b.pos.x - cx;
              const dy = b.pos.y - cy;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < TILE_SIZE && 
                  b.pos.x >= t.x && b.pos.x <= t.x + TILE_SIZE &&
                  b.pos.y >= t.y && b.pos.y <= t.y + TILE_SIZE) {
                  appliedFriction = SAND_FRICTION;
              }
            });

            // Portal Logic - skip all portals during cooldown
            if (portalCooldownRef.current === 0) {
              for (const p of portalsRef.current) {
                const dx = b.pos.x - p.x;
                const dy = b.pos.y - p.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < (HOLE_RADIUS * 1.5) ** 2) {
                  const sibling = portalsRef.current.find(sp => sp.id === p.id && sp !== p);
                  if (sibling) {
                    // Enter portal: Disappear and wait
                    b.teleportTimer = TELEPORT_TIME;
                    b.isMoving = false;
                    
                    const pIdx = parseInt(p.id) - 1;
                    pendingTeleportRef.current = {
                      targetPortal: sibling,
                      exitConfig: level.portalExitConfigs ? level.portalExitConfigs[pIdx] : undefined
                    };
                    playForeground(getPath("/media/audio/sfx/minigolf/intohole.mp3"));
                    break;
                  }
                }
              }
            }
            if (b.teleportTimer > 0) break; // Stop substepping if we just entered a portal

            // Water Tile Hazard Logic
            waterTilesRef.current.forEach(t => {
                if (b.pos.x >= t.x && b.pos.x <= t.x + TILE_SIZE &&
                    b.pos.y >= t.y && b.pos.y <= t.y + TILE_SIZE) {
                    if (speed < SINK_THRESHOLD) {
                      // TODO (jsylvester): use splash audio (pending)
                        b.pos.x = startPosRef.current!.x;
                        b.pos.y = startPosRef.current!.y;
                        b.vel.x = 0; b.vel.y = 0; b.isMoving = false;
                        onStroke(); 
                    }
                }
            });

            // Water Arc Hazard Logic
            waterArcsRef.current.forEach(t => {
                let cx = t.x, cy = t.y;
                if (t.orientation === 'NE') cx = t.x + TILE_SIZE;
                else if (t.orientation === 'SW') cy = t.y + TILE_SIZE;
                else if (t.orientation === 'SE') { cx = t.x + TILE_SIZE; cy = t.y + TILE_SIZE; }

                const dx = b.pos.x - cx;
                const dy = b.pos.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < TILE_SIZE && 
                    b.pos.x >= t.x && b.pos.x <= t.x + TILE_SIZE &&
                    b.pos.y >= t.y && b.pos.y <= t.y + TILE_SIZE) {
                    if (speed < SINK_THRESHOLD) {
                        // TODO (jsylvester): use splash audio (pending)
                        b.pos.x = startPosRef.current!.x;
                        b.pos.y = startPosRef.current!.y;
                        b.vel.x = 0; b.vel.y = 0; b.isMoving = false;
                        onStroke();
                    }
                }
            });

            // Boost Tile Logic
            boostTilesRef.current.forEach(t => {
                if (b.pos.x >= t.x && b.pos.x <= t.x + TILE_SIZE &&
                    b.pos.y >= t.y && b.pos.y <= t.y + TILE_SIZE) {
                    b.vel.x += t.dx * 0.4;
                    b.vel.y += t.dy * 0.4;
                    const speedSq = b.vel.x**2 + b.vel.y**2;
                    if (speedSq > 30 * 30) {
                      const sp = Math.sqrt(speedSq);
                      b.vel.x = (b.vel.x / sp) * 30;
                      b.vel.y = (b.vel.y / sp) * 30;
                    }
                    b.isMoving = true;
                }
            });

            wallsRef.current.forEach(w => {
                if (w.type === 'SQUARE' && !collided) {
                  const closestX = Math.max(w.x, Math.min(b.pos.x, w.x + w.w));
                  const closestY = Math.max(w.y, Math.min(b.pos.y, w.y + w.h));
                  const dx = b.pos.x - closestX;
                  const dy = b.pos.y - closestY;
                  const distSq = dx * dx + dy * dy;

                  if (distSq < b.radius * b.radius && distSq > 0) {
                      const dist = Math.sqrt(distSq);
                      const normalX = dx / dist;
                      const normalY = dy / dist;
                      b.pos.x += normalX * (b.radius - dist);
                      b.pos.y += normalY * (b.radius - dist);
                      playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
                      collided = true;
                      if (distSq < b.radius * b.radius) {
                        if(Math.abs(dx)>Math.abs(dy)) {
                          b.vel.x = -b.vel.x * 0.8;
                        } else {
                          b.vel.y = -b.vel.y * 0.8;
                        }
                      }
                  }
                } else if (w.type === 'ARC' || w.type === 'INSIDE_ARC') {
                  let cx = w.x, cy = w.y;
                  if (w.orientation === 'NE') cx = w.x + w.w;
                  else if (w.orientation === 'SW') cy = w.y + w.h;
                  else if (w.orientation === 'SE') { cx = w.x + w.w; cy = w.y + w.h; }

                  const dx = b.pos.x - cx;
                  const dy = b.pos.y - cy;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  const radius = TILE_SIZE;

                  if (w.type === 'ARC') {
                    if (dist < radius + b.radius && dist > radius - b.radius) {
                      if (b.pos.x >= w.x - b.radius && b.pos.x <= w.x + w.w + b.radius &&
                          b.pos.y >= w.y - b.radius && b.pos.y <= w.y + w.h + b.radius) {
                        const normalX = dx / dist;
                        const normalY = dy / dist;
                        const overlap = (radius + b.radius) - dist;
                        
                        b.pos.x += normalX * overlap;
                        b.pos.y += normalY * overlap;
                        const dot = b.vel.x * normalX + b.vel.y * normalY;
                        playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
                        b.vel.x = (b.vel.x - 2 * dot * normalX) * 0.8;
                        b.vel.y = (b.vel.y - 2 * dot * normalY) * 0.8;
                      }
                    }
                  } 
                  else if (w.type === 'INSIDE_ARC') {
                    if (dist > radius - b.radius) {
                      if (b.pos.x >= w.x - b.radius && b.pos.x <= w.x + w.w + b.radius &&
                          b.pos.y >= w.y - b.radius && b.pos.y <= w.y + w.h + b.radius) {
                        const normalX = -dx / dist;
                        const normalY = -dy / dist;
                        const overlap = dist - (radius - b.radius);
                        
                        b.pos.x += normalX * overlap;
                        b.pos.y += normalY * overlap;
                        const dot = b.vel.x * normalX + b.vel.y * normalY;
                        playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
                        b.vel.x = (b.vel.x - 2 * dot * normalX) * 0.8;
                        b.vel.y = (b.vel.y - 2 * dot * normalY) * 0.8;
                      }
                    }
                  }
                }
            });

            decorationsRef.current.forEach(d => {
                const dx = b.pos.x - d.pos.x;
                const dy = b.pos.y - d.pos.y;
                const distSq = dx * dx + dy * dy;
                
                if (d.type === 'BOUNCY_PAD') {
                  const minDist = b.radius + d.radius;
                  if (distSq < minDist * minDist && distSq > 0) {
                      const dist = Math.sqrt(distSq);
                      const nx = dx / dist;
                      const ny = dy / dist;
                      const boost = 18;
                      b.vel.x = nx * boost;
                      b.vel.y = ny * boost;
                      b.pos.x = d.pos.x + nx * (minDist + 2);
                      b.pos.y = d.pos.y + ny * (minDist + 2);
                      b.isMoving = true;
                      d.scale = 1.4;
                      d.targetScale = 1;
                      playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
                  }
                } else if (d.type === 'TREX') {
                  const minDist = b.radius + d.radius * 0.6;
                  if (distSq < minDist * minDist && distSq > 0 && (!d.pauseTimer || d.pauseTimer === 0)) {
                      d.pauseTimer = 70; 
                      d.originalVel = { ...d.vel! };
                      d.vel = { x: 0, y: 0 };
                      b.pos.x = d.pos.x;
                      b.pos.y = d.pos.y;
                      b.vel.x = 0;
                      b.vel.y = 0;
                      b.isMoving = false;
                      playForeground(getPath("/media/audio/sfx/minigolf/hitwall.mp3"));
                  }
                }
            });
        }

        const h = holeRef.current;
        const dx = b.pos.x - h.x;
        const dy = b.pos.y - h.y;
        if (Math.sqrt(dx*dx + dy*dy) < HOLE_RADIUS) {
            const sp = Math.sqrt(b.vel.x**2 + b.vel.y**2);
            if (sp < 15) {
                b.pos.x = h.x; b.pos.y = h.y;
                b.vel.x = 0; b.vel.y = 0;
                b.isMoving = false; b.sunk = true;
                playForeground(getPath("/media/audio/sfx/minigolf/intohole.mp3"));
                onHole();
            }
        }

        b.vel.x *= appliedFriction;
        b.vel.y *= appliedFriction;
        if (Math.abs(b.vel.x) < VELOCITY_THRESHOLD && Math.abs(b.vel.y) < VELOCITY_THRESHOLD) {
            b.vel.x = 0; b.vel.y = 0; b.isMoving = false;
        }
    }
  }, [onHole, level.grid, onStroke]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ballRef.current || !holeRef.current || dimensions.width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(dimensions.width * dpr);
    canvas.height = Math.floor(dimensions.height * dpr);

    const isFloor = (r: number, c: number) => {
      if (r < 0 || r >= level.grid.length || c < 0 || c >= level.grid[0].length) return false;
      const char = level.grid[r][c];
      return char !== CHAR_VOID && char !== CHAR_WALL && char !== CHAR_ARC && char !== CHAR_INSIDE_ARC;
    };

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // ctx.fillStyle = COLORS.GRASS_DARK;
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(Math.floor(offsetRef.current.x * dpr), Math.floor(offsetRef.current.y * dpr));
    const finalScale = physicalScaleRef.current;
    ctx.scale(finalScale, finalScale);

    // Create a clipping mask from all grass tiles and grass areas in arc walls
    ctx.save();
    ctx.beginPath();
    level.grid.forEach((row, r) => {
        row.split('').forEach((char, c) => {
            if (char !== CHAR_VOID && char !== CHAR_WALL && char !== CHAR_ARC && char !== CHAR_INSIDE_ARC && char !== CHAR_WATER_ARC ) {
               ctx.rect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        });
    });
    
    // Add grass areas from INSIDE_ARC and neighboring grass areas in ARC walls to the mask
    wallsRef.current.forEach(w => {
        const r = Math.floor(w.y / TILE_SIZE);
        const c = Math.floor(w.x / TILE_SIZE);
        
        if (w.type === 'INSIDE_ARC') {
          let cx = w.x, cy = w.y;
          let startAngle = 0;
          if (w.orientation === 'NE') { cx = w.x + w.w; startAngle = Math.PI/2; }
          else if (w.orientation === 'SW') { cy = w.y + w.h; startAngle = 1.5*Math.PI; }
          else if (w.orientation === 'SE') { cx = w.x + w.w; cy = w.y + w.h; startAngle = Math.PI; }
          
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, TILE_SIZE, startAngle, startAngle + Math.PI/2);
          ctx.lineTo(cx, cy);
        } else if (w.type === 'ARC') {
          const hasFloorNeighbor = isFloor(r-1, c) || isFloor(r+1, c) || isFloor(r, c-1) || isFloor(r, c+1);
          if (hasFloorNeighbor) {
            ctx.rect(w.x, w.y, w.w, w.h);
          }
        }
    });
    
    ctx.clip();

    // Draw the background texture through the mask
    if (textureRef.current) {
      const gridWidth = level.grid[0].length * TILE_SIZE;
      const gridHeight = level.grid.length * TILE_SIZE;
      ctx.drawImage(textureRef.current, 0, 0, gridWidth, gridHeight);
    } else {
      // Fallback to solid color if texture not loaded
      ctx.fillStyle = COLORS.GRASS_LIGHT;
      ctx.fillRect(0, 0, level.grid[0].length * TILE_SIZE, level.grid.length * TILE_SIZE);
    }
    ctx.restore();

    // Render Sand Tiles
    sandTilesRef.current.forEach(t => {
      ctx.fillStyle = COLORS.SAND;
      ctx.fillRect(t.x, t.y, TILE_SIZE, TILE_SIZE);
    });

    // Render Sand Arc Tiles
    sandArcsRef.current.forEach(t => {
      ctx.fillStyle = COLORS.SAND;
      let cx = t.x, cy = t.y;
      let startAngle = 0;
      if (t.orientation === 'NE') { cx = t.x + TILE_SIZE; startAngle = Math.PI/2; }
      else if (t.orientation === 'SW') { cy = t.y + TILE_SIZE; startAngle = 1.5*Math.PI; }
      else if (t.orientation === 'SE') { cx = t.x + TILE_SIZE; cy = t.y + TILE_SIZE; startAngle = Math.PI; }

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, TILE_SIZE, startAngle, startAngle + Math.PI/2);
      ctx.closePath();
      ctx.fill();
    });

    // Render Water Tiles
    waterTilesRef.current.forEach(t => {
      ctx.fillStyle = COLORS.WATER;
      ctx.fillRect(t.x, t.y, TILE_SIZE, TILE_SIZE);
    });

    // Render Water Arc Tiles
    waterArcsRef.current.forEach(t => {
      ctx.fillStyle = COLORS.WATER;
      let cx = t.x, cy = t.y;
      let startAngle = 0;
      if (t.orientation === 'NE') { cx = t.x + TILE_SIZE; startAngle = Math.PI/2; }
      else if (t.orientation === 'SW') { cy = t.y + TILE_SIZE; startAngle = 1.5*Math.PI; }
      else if (t.orientation === 'SE') { cx = t.x + TILE_SIZE; cy = t.y + TILE_SIZE; startAngle = Math.PI; }

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, TILE_SIZE, startAngle, startAngle + Math.PI/2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, TILE_SIZE * 0.8, startAngle, startAngle + Math.PI/2);
      ctx.stroke();
    });

    // Render Portals (as holes with no numbers)
    portalsRef.current.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, HOLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#111111'; // Slightly darker hole to hint it's a portal
      ctx.fill();
      
      // Subtle rim
      ctx.strokeStyle = '#4B008288';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Render Boost Tiles
    boostTilesRef.current.forEach(t => {
      ctx.fillStyle = COLORS.BOOST;
      ctx.fillRect(t.x, t.y, TILE_SIZE, TILE_SIZE);
      ctx.save();
      ctx.translate(t.x + TILE_SIZE / 2, t.y + TILE_SIZE / 2);
      if (t.dx === 1) ctx.rotate(0);
      else if (t.dx === -1) ctx.rotate(Math.PI);
      else if (t.dy === -1) ctx.rotate(-Math.PI / 2);
      else if (t.dy === 1) ctx.rotate(Math.PI / 2);
      ctx.strokeStyle = '#FFFFFF88';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
          const ox = -5 + i * 10;
          ctx.beginPath();
          ctx.moveTo(ox - 5, -8);
          ctx.lineTo(ox + 5, 0);
          ctx.lineTo(ox - 5, 8);
          ctx.stroke();
      }
      ctx.restore();
    });

    wallsRef.current.forEach(w => {
        if (w.type === 'ARC') {
          // ARC: Draw the curved dark wall portion
          let cx = w.x, cy = w.y;
          let startAngle = 0;
          if (w.orientation === 'NE') { cx = w.x + w.w; startAngle = Math.PI/2; }
          else if (w.orientation === 'SW') { cy = w.y + w.h; startAngle = 1.5*Math.PI; }
          else if (w.orientation === 'SE') { cx = w.x + w.w; cy = w.y + w.h; startAngle = Math.PI; }

          ctx.fillStyle = COLORS.GRASS_DARK;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, TILE_SIZE, startAngle, startAngle + Math.PI/2);
          ctx.closePath();
          ctx.fill();
        } else if (w.type === 'INSIDE_ARC') {
          // INSIDE_ARC: Textured grass arc is already drawn via mask, 
          // and dark corners are already black from canvas background.
          // No additional rendering needed.
        } else {
          // SQUARE walls: Fill with dark color
          ctx.fillStyle = COLORS.GRASS_DARK;
          ctx.fillRect(w.x, w.y, w.w, w.h);
        }
    });
    // Render shadows for decorations
    // decorationsRef.current.forEach(d => {
    //   if (d.type === 'ANDROID' || d.type === 'TREX') {
    //     ctx.beginPath();
    //     ctx.ellipse(d.pos.x + 2, d.pos.y + 16, d.radius * 0.5, d.radius * 0.2, 0, 0, Math.PI * 2);
    //     ctx.fillStyle = COLORS.SHADOW;
    //     ctx.fill();
    //   }
    // });

    decorationsRef.current.forEach(d => {
        if (d.type === 'ANDROID') {
            if (USE_ANDROID_SVG) {
                ctx.save();
                ctx.translate(d.pos.x-13, d.pos.y-15);
                ctx.scale(1.5,1.5);
                const path = new Path2D(ICON_PATHS.android);
                ctx.fillStyle = COLORS.ANDROID;
                ctx.fill(path);
                ctx.restore();
            } else {
                ctx.fillStyle = COLORS.ANDROID; 
                ctx.beginPath(); ctx.arc(d.pos.x, d.pos.y - 5, 12, Math.PI, 0); ctx.fill();
                ctx.fillStyle = COLORS.GRASS_LIGHT;
                ctx.beginPath(); ctx.arc(d.pos.x - 5, d.pos.y - 10, 2, 0, Math.PI * 2); ctx.arc(d.pos.x + 5, d.pos.y - 10, 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = COLORS.ANDROID; 
                ctx.strokeStyle = COLORS.ANDROID; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(d.pos.x - 8, d.pos.y - 15); ctx.lineTo(d.pos.x - 12, d.pos.y - 22); ctx.moveTo(d.pos.x + 8, d.pos.y - 15); ctx.lineTo(d.pos.x + 12, d.pos.y - 22); ctx.stroke();
                ctx.beginPath(); ctx.rect(d.pos.x - 12, d.pos.y - 5, 24, 20); ctx.fill();
            }
        } else if (d.type === 'TREX') {
          if (USE_ANDROID_SVG) {
                const isFlipped = (d.vel && d.vel.x < 0) || (d.originalVel && d.originalVel.x < 0);
                ctx.save();
                ctx.translate(d.pos.x+2, d.pos.y);
                if (isFlipped) { ctx.scale(-1, 1); }
                ctx.scale(0.4,0.4);
                ctx.translate(-30,-35);
                const path = new Path2D(ICON_PATHS.dino);
                ctx.fillStyle = COLORS.ANDROID;
                ctx.fill(path);
                ctx.restore();
            } else {
              ctx.save();
              const isFlipped = (d.vel && d.vel.x < 0) || (d.originalVel && d.originalVel.x < 0);
              if (isFlipped) { ctx.translate(d.pos.x, d.pos.y); ctx.scale(-1, 1); ctx.translate(-d.pos.x, -d.pos.y); }
              ctx.fillStyle = COLORS.DINO;
              ctx.fillRect(d.pos.x - 10, d.pos.y - 5, 15, 15); ctx.fillRect(d.pos.x - 5, d.pos.y - 15, 15, 10);
              ctx.fillRect(d.pos.x - 8, d.pos.y + 10, 4, 6); ctx.fillRect(d.pos.x - 2, d.pos.y + 10, 4, 6);
              ctx.fillStyle = '#FFF'; ctx.fillRect(d.pos.x + 2, d.pos.y - 12, 2, 2);
              ctx.fillStyle = COLORS.DINO; ctx.fillRect(d.pos.x - 14, d.pos.y, 4, 4);
              if (d.pauseTimer && d.pauseTimer > 30) {
                ctx.fillStyle = '#FF4444';
                ctx.beginPath();
                ctx.arc(d.pos.x, d.pos.y - 20, 3, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();
            }
        } else if (d.type === 'BOUNCY_PAD') {
            ctx.save();
            ctx.translate(d.pos.x, d.pos.y);
            ctx.scale(d.scale || 1, d.scale || 1);
            // Draw shadow
            ctx.beginPath();
            ctx.ellipse(0, 3, 18, 18, 0, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.BOUNCY_PAD_SHADOW;
            ctx.fill();
            // Draw pad
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.WHITE;
            ctx.fill();
            ctx.restore();
        }
    });

    const h = holeRef.current;
    ctx.beginPath(); ctx.arc(h.x, h.y, HOLE_RADIUS, 0, Math.PI * 2); ctx.fillStyle = COLORS.BLACK; ctx.fill();
    

    const b = ballRef.current;
    // Don't render ball if it's currently "teleporting"
    if (!b.sunk && b.teleportTimer === 0) {
        ctx.beginPath(); ctx.ellipse(b.pos.x + 3, b.pos.y + 7, b.radius, b.radius * 0.6, 0, 0, Math.PI * 2); ctx.fillStyle = COLORS.SHADOW; ctx.fill();
        ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2); ctx.fillStyle = COLORS.BALL_WHITE; ctx.fill();
    }

    if (isAiming && dragStart && dragCurrent && !b.sunk && b.teleportTimer === 0) {
        const dx = dragStart.x - dragCurrent.x;
        const dy = dragStart.y - dragCurrent.y;
        const rawLen = Math.sqrt(dx*dx + dy*dy);
        const displayScaleFactor = Math.min(rawLen, 150) / (rawLen || 1); 
        
        if (rawLen > 5) {
            const angle = Math.atan2(dy, dx);
            const powerRatio = Math.min(rawLen, 150) / 150;
            const arcRadius = 14 / finalScale;
            const arcStartX = b.pos.x + Math.cos(angle) * arcRadius;
            const arcStartY = b.pos.y + Math.sin(angle) * arcRadius;
            const lineEndX = arcStartX + dx * displayScaleFactor;
            const lineEndY = arcStartY + dy * displayScaleFactor;
            
            ctx.beginPath(); 
            ctx.moveTo(arcStartX, arcStartY); 
            ctx.lineTo(lineEndX, lineEndY);
            ctx.strokeStyle = '#FFF'; 
            ctx.lineWidth = 1.5 / finalScale; 
            ctx.setLineDash([6 / finalScale, 6 / finalScale]); 
            ctx.stroke(); 
            ctx.setLineDash([]);
            ctx.beginPath(); 
            ctx.arc(lineEndX, lineEndY, 3 / finalScale, 0, Math.PI * 2); 
            ctx.fillStyle = '#FFF'; 
            ctx.fill();
            ctx.beginPath(); 
            ctx.arc(b.pos.x, b.pos.y, arcRadius, angle - powerRatio * Math.PI, angle + powerRatio * Math.PI);
            ctx.strokeStyle = COLORS.WHITE;
            ctx.lineWidth = 1.5 / finalScale; 
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    // Flag rendering (always rendered on top of everything else)
    ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x, h.y - 40); ctx.strokeStyle = COLORS.WHITE; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(h.x + 2, h.y - 40); ctx.lineTo(h.x + 18, h.y - 32); ctx.lineTo(h.x + 2, h.y - 24); ctx.closePath();
    ctx.fillStyle = COLORS.FLAG; ctx.fill(); ctx.strokeStyle = COLORS.WHITE; ctx.lineWidth = 1; ctx.stroke();

    ctx.restore();
  }, [isAiming, dragStart, dragCurrent, level, dimensions]);

  useEffect(() => {
    const loop = (timestamp: number) => {
      const elapsed = timestamp - lastFrameTimeRef.current;
      
      if (elapsed >= FRAME_DURATION) {
        lastFrameTimeRef.current = timestamp - (elapsed % FRAME_DURATION);
        update();
        render();
      }
      
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [update, render]);

  return (
    <div ref={containerRef} className="w-full h-[calc(100%-100px)] fixed top-0 left-0 overflow-hidden bg-transparent">
      <canvas 
        ref={canvasRef} 
        style={{width: '100%', height: '100%', display: 'block' }}
        className="cursor-crosshair touch-none select-none" 
        onMouseDown={handleMouseDown} 
        onTouchStart={handleMouseDown}
      />
    </div>
  );
};

export default GameCanvas;
