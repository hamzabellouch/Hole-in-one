/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export const TILE_SIZE = 40;
export const FRICTION = 0.975; // Less friction so it rolls farther
export const SAND_FRICTION = 0.88; // Much higher friction for sand
export const VELOCITY_THRESHOLD = 0.05;
export const MAX_POWER = 20; 
export const POWER_MULTIPLIER = 0.2; 
export const HOLE_RADIUS = 8;
export const BALL_RADIUS = 7;
export const TELEPORT_TIME = 45; // Frames for teleportation effect (~0.75s)

export const ALLOW_HIT_WHILE_MOVING = true;
export const USE_ANDROID_SVG = true; 
export const ENABLE_AI_CADDY = true; // Configuration to disable the AI caddy to prevent API errors
export const ENABLE_DEV_TOOLS = false; // When false, hides level select, edit, and skip buttons during gameplay

export const COLORS = {
  // Google Brand Colors
  BLUE: '#4285F4',   
  RED: '#EA4335',    
  YELLOW: '#FBBC04', 
  GREEN: '#34A853',  
  GREY: '#535353',   
  INDIGO: '#5C6BC0', 
  ANDROID: "#000",
  DINO: "#404040",
  NEW_GREEN: "127333",
  WHITE: "#FFFFFF",
  BLACK: "#000",
  FLAG: "#F6AEA9",
  
  // Environment
  WALL: '#1B5E20',   
  GRASS_LIGHT: '#1E8E3D', 
  GRASS_DARK: '#000000',  // Deeper dark green
  WATER: '#175ABC',
  SAND: '#FEEFC3',        
  
  // UI & VFX
  VOID: '#004d26',   
  SHADOW: 'rgba(0,0,0,0.15)',
  BALL_WHITE: '#FFFFFF',
  BOUNCY_PAD: '#000000', // Android Green theme for pads
  BOUNCY_PAD_SHADOW: 'rgba(0, 0, 0, 0.25)', // Shadow for bouncy pads
  BOOST: '#4285F4',      // Google Blue for the boost tile
};

// Map characters
export const CHAR_WALL = '#';
export const CHAR_ARC = '*';
export const CHAR_INSIDE_ARC = '_';
export const CHAR_START = 'S';
export const CHAR_HOLE = 'H';
export const CHAR_EMPTY = '.';
export const CHAR_VOID = ' ';
export const CHAR_ANDROID = 'A';
export const CHAR_TREX = 'T';
export const CHAR_BOUNCY_PAD = 'B';
export const CHAR_BOOST_LEFT = '<';
export const CHAR_BOOST_RIGHT = '>';
export const CHAR_BOOST_UP = '^';
export const CHAR_BOOST_DOWN = 'v';
export const CHAR_WATER = 'W';
export const CHAR_WATER_ARC = 'w';
export const CHAR_SAND = 'Z';
export const CHAR_SAND_ARC = 'z';
