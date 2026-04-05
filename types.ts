/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export interface Vector2 {
  x: number;
  y: number;
}

export interface PortalExitConfig {
  angle: number; // In degrees (0 = right, 90 = down, 180 = left, 270 = up)
  boost: number; // Multiplier for the current velocity magnitude
}

export interface Ball {
  pos: Vector2;
  vel: Vector2;
  radius: number;
  isMoving: boolean;
  sunk: boolean;
  teleportTimer: number; // Duration of current teleportation effect
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'SQUARE' | 'ARC' | 'INSIDE_ARC';
  orientation?: 'NW' | 'NE' | 'SW' | 'SE'; // Center of the arc
}

export interface Decoration {
  type: 'ANDROID' | 'TREX' | 'BOUNCY_PAD';
  pos: Vector2;
  radius: number;
  vel?: Vector2; // Optional velocity for moving obstacles
  scale?: number; // For animation
  targetScale?: number;
  pauseTimer?: number; // For special behaviors like T-Rex throwing
  originalVel?: Vector2;
}

export interface LevelData {
  id: number;
  letter: string;
  color: string;
  grid: string[]; // Map representation
  par: number;
  name: string;
  startPos?: Vector2; // Calculated from grid 'S'
  holePos?: Vector2;  // Calculated from grid 'H'
  walls?: Wall[];     // Calculated from grid '#'
  decorations?: Decoration[];
  portalExitConfigs?: PortalExitConfig[]; // Array where index 0 is config for portal '1', etc.
}

export interface GameState {
  currentLevelIndex: number;
  strokes: number;
  totalScore: number;
  points: number;
  state: 'AIMING' | 'MOVING' | 'SUNK' | 'LEVEL_COMPLETE' | 'GAME_OVER' | 'EDITING';
  lastCommentary: string | null;
  commentaryLoading: boolean;
  bestScores: Record<number, number>; // Maps level index to best strokes
  resetUnlocked: boolean;
}

// ========================================
// Core Domain Types
// ========================================

export type Page =
  | "landing"
  | "puzzle"
  | "date-reveal"
  | "play"
  | "bundles-completed"
  | "hidden-build"
  | "remix";
export type NavigateTo = (page: Page, identifier?: string) => void;

export interface FlippableCardContent {
  title: string;
  ariaLabel: string;
}

// ========================================
// SSR / Static Site Generation Types
// ========================================

/**
 * Data passed from 11ty templates to page components during SSR
 */
export interface SSRPageData {
  pageType?: Page;
  puzzleId?: string | null;
  remixId?: string | null;
  puzzleParentSlug?: string | null;
  puzzleRemixUrl?: string | null;
  bundle?: Bundle | null;
  bundleId?: number | null;
  puzzle?: Build | Remix | null;
  remix?: Build | Remix | null;
  puzzles?: { puzzles: Build[] };
  bundles?: { bundles: Bundle[] };
  remixes?: { remixes: Remix[] };
}

/**
 * Eleventy template data structure
 */
export interface EleventyTemplateData {
  puzzles: {
    puzzles: Build[];
  };
  remixes: {
    remixes: Remix[];
  };
  bundles: { bundles: Bundle[] };
  site: SiteData;
  puzzle?: Build; // For paginated puzzle pages
  remix?: Build; // For paginated remix pages
  bundle?: Bundle; // For paginated bundle pages
}

/**
 * Eleventy page configuration (exported as 'data' from .11ty.tsx files)
 */
export interface EleventyPageConfig {
  title: string;
  description: string;
  ogImage?: string;
  permalink: string | ((data: EleventyTemplateData) => string);
  layout?: string;
  pageData?: SSRPageData;
  eleventyExcludeFromCollections?: boolean;
  eleventyComputed?: Record<string, (data: EleventyTemplateData) => string | SSRPageData>;
  pagination?: {
    data: string;
    size: number;
    alias: string;
  };
}

export interface SiteData {
  stampEmojis: string[];
  shareMessage: string;
  howToSteps: {
    title: string;
    ariaLabel: string;
  }[];
}

// ========================================
// Layout Component Types
// ========================================

export interface LayoutProps {
  className?: string;
  transitionName?: string;
  children?: React.ReactNode;
}

export interface BaseLayoutProps {
  title: string;
  description: string;
  ogImage?: string;
  manifest?: ManifestData;
  pageData?: SSRPageData;
  children?: React.ReactNode;
}

export interface ManifestData {
  mainCss?: string;
  mainJs?: string;
  isDev?: boolean;
  baseUrl?: string;
  siteUrl?: string;
}

// ========================================
// Page Component Props (Universal: SPA + SSR)
// ========================================

/**
 * Base props that work in both SPA and SSR contexts
 */
export interface UniversalPageProps {
  puzzle?: Build;
  puzzles?: Build[];
  navigateTo?: NavigateTo;
  currentPage?: Page;
}

/**
 * SPA-specific page props (includes state and callbacks)
 */

// These interface need to be split
export interface Bundle {
  idx: number;
  displayOrder: number;
  name: string;
  slug: string;
  thumbnailPath: string;
  mainColor: string;
  mainColorLight: string;
  mainColorDark: string;
  constrastColor: string;
  builds: number[];
}

export interface Build {
  idx: number;
  name: string;
  shareUrl: string;
  remixUrl: string;
  goalTitle: string;
  goal: string;
  goalNote: string;
  goalAbout: string;
  bundle: number;
  thumbnailPath: string;
  thumbnailPathCompleted: string;
  mainColor: string;
  solved?: boolean;
  unlocked?: boolean;
  inProgress?: boolean;
  completed?: boolean;
  color1?: string;
  color2?: string;
  custom?: boolean;
}

export interface Remix {
  idx: number;
  name: string;
  shareUrl: string;
  goalTitle: string;
  remixedFrom: number;
  goal: string;
  goalNote: string;
  goalAbout: string;
  bundle: number;
  thumbnailPath: string;
  thumbnailPathCompleted: string;
  mainColor: string;
  solved?: boolean;
  unlocked?: boolean;
  inProgress?: boolean;
  completed?: boolean;
  color1?: string;
  color2?: string;
}
