/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { LevelData, Vector2, PortalExitConfig } from './types';
import { COLORS } from './constants';

const parseLevel = (
  id: number,
  letter: string,
  color: string,
  par: number,
  name: string,
  grid: string[],
  portalExitConfigs?: PortalExitConfig[]
): LevelData => ({
  id,
  letter,
  color,
  par,
  name,
  grid,
  portalExitConfigs
});

// Portrait mode scale adjustments per level (multiplies the base scale)
// Values > 1 make the level larger (extends beyond viewport edges)
// Values < 1 make the level smaller (more padding around edges)
export const PORTRAIT_SCALE_OVERRIDES: Record<number, number> = {
  1: 1.3,  // Droid Head - scale up 30%
  7: 1.1,   // The G - scale up 10%
  10: 1.0,  // The og - scale up 10%
  11: 1.1,  // the le - scale up 10%
  2: 1.1,  // Dino Run - scale up 10%
  15: 1.1,  // TrexIO - scale up 10%
  13: 1.1,  // bridge - scale up 10%
  12: 1.1,  // Cactus jump - scale up 10%
};

export const LEVELS: LevelData[] = [
  // GROUP 1: MOVING ENTITIES (G, o, o)


  parseLevel(1, 'A', COLORS.GREEN, 2, "Droid Head", [
    "               ",
    " ############# ",
    " #_........._# ",
    " #S......A.H.# ",
    " #_........._# ",
    " ############# ",
    "               ",
]),

  parseLevel(7, 'G', COLORS.BLUE, 2, "The G", [
    "###############",
    "#######_....._#",
    "#*..._#.......#",
    "#...1.#.......#",
    "#.....#...H...#",
    "#.....#.......#",
    "#.S...#.......#",
    "#_...*#_......#",
    "#########*....#",
    "#########*....#",
    "#######_......#",
    "#######.1.....#",
    "#######_....._#",
    "###############",
]),
  // GROUP 2: BOUNCE PADS (g, l, e)
  parseLevel(10, 'g', COLORS.BLUE, 3, "The og", [
    "###########",
    "#_......S_#",
    "#B........#",
    "#..########",
    "#..########",
    "#..###.H..#",
    "#..###....#",
    "#..#####..#",
    "#..#####..#",
    "#........B#",
    "#_B......_#",
    "###########",
    "###########",
    "###########",
]),
  parseLevel(11, 'l', COLORS.GREEN, 2, "the le", [
     "         ######",
    "         #_.._#",
    "#####    #....#",
    "#_._###  #.##.#",
    "#..zZZ####.#H.#",
    "#..zZZZ.A.....#",
    "#S...zzA......#",
    "#..........zZZ#",
    "#_.........zZZ#",
    "###############",
]),


  parseLevel(2, 'D', COLORS.GREEN, 3, "Dino Run", [
    "#####################",
    "#...####....#_....._#",
    "#.S.####..2.#2....T.#",
    "#...####....#.......#",
    "#...###....##.......#",
    "#...###....##.......#",
    "#...###....##.......#",
    "#...##....###.......#",
    "#...##....###ZZZZZZZ#",
    "#...##....###ZZZZZZZ#",
    "#...#....####ZZZZZZZ#",
    "#.1.#.1..####...H...#",
    "#...#....####_....._#",
    "#####################",
], [{ angle: 270+25, boost: 1.5 }, { angle: 0, boost: 1.4 }]),
  parseLevel(15, 'I/O', COLORS.YELLOW, 3, "I/O", [
    "         #####",
    "         #.._#",
    "         #.H.#",
    "         #...#",
    "   #########.#",
    "   #wWWWWw##.#",
    "   #zZZZZz#*.#",
    "  #..........#",
    "##*.........T#",
    "#............#",
    "#............#",
    "#.S..*###*...#",
    "#....#   #...#",
    "*#####   #####",
    "*#####   #####",
]),
  parseLevel(13, 'I', COLORS.BLUE, 4, "bridge", [
    "          ##### ",
    "         ##2### ",
    "     #####W.WW# ",
    "    #_.S.#W.WW# ",
    "    #.....Z.WW##",
    "    #.......ZW##",
    "    #1..#..BZW##",
    "############### ",
    "#Zz**1##########",
    "#Zz...###*.H..B#",
    "#Z...*###......#",
    "#Z...*#####..ZZ#",
    "#Zz..........B##",
    "#ZZ#.B....#2####",
    "################",
    "################",
]),
  // GROUP 3: BOOST PANELS (I, /, O)
  parseLevel(13, 'I', COLORS.BLUE, 5, "TrexIO", [
    "####################",
    "#_A._#1#############",
    "#....#.######_.T.._#",
    "#..#...######.T....#",
    "#..###.#..T_#...T..#",
    "#B.._#H#....B......#",
    "#_...###S..........#",
    "##*..*###.#...*#*.*#",
    "##*A..###Z#...###.##",
    "#_A..B###Z#...###.##",
    "#...*####Z#...###1##",
    "#...*####Z#...*#####",
    "#........Zz...zZZZ##",
    "#B.......zZZZZZZZZ##",
    "####################",
]),
  parseLevel(12, 'e', COLORS.RED, 3, "Cactus jump", [
    "###################",
    "###B...B#####WWWWW#",
    "###2....T.###WWWWW#",
    "####*.ZZZB###WZZZW#",
    "#####.#######W.3.W#",
    "#####.##A#A##W...W#",
    "#####3#_A#A##W...W#",
    "#_._###...._#WzZzW#",
    "#B...1#1...2#WzZzW#",
    "#...._#...._#WH..W#",
    "#.S.*##_A#A##WZZZW#",
    "#_._####A#A##WWWWW#",
    "###################",
]),
];
