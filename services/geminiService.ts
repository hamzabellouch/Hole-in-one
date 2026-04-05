/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { ENABLE_AI_CADDY } from "../constants";

const SCORE_ALBATROSS = -3;
const SCORE_EAGLE = -2;
const SCORE_BIRDIE = -1;
const SCORE_PAR = 0;
const SCORE_BOGEY = 1;
const SCORE_DOUBLE_BOGEY = 2;

const SCORE_TERMS: Record<number, string> = {
  [SCORE_ALBATROSS]: "Albatross",
  [SCORE_EAGLE]: "Eagle",
  [SCORE_BIRDIE]: "Birdie",
  [SCORE_PAR]: "Par",
  [SCORE_BOGEY]: "Bogey",
  [SCORE_DOUBLE_BOGEY]: "Double Bogey",
};

const commentaryCache: Record<string, string> = {};
let isQuotaExhausted = false;

const _getScoreTerm = (strokes: number, par: number): string => {
  const diff = strokes - par;
  if (diff <= SCORE_ALBATROSS) return SCORE_TERMS[SCORE_ALBATROSS];
  return SCORE_TERMS[diff] || "Over Par";
};

export const getCaddyCommentary = async (
  levelName: string,
  strokes: number,
  par: number,
  result: 'WIN' | 'START',
  isFinalHole: boolean = false
): Promise<string> => {
  if (!ENABLE_AI_CADDY || isQuotaExhausted) return "";

  const fallbackMsg = result === 'START' ? "Let's play!" : "Nice finish!";
  const cacheKey = result === 'START' ? `start_${levelName}` : `win_${levelName}_${strokes}_${isFinalHole}`;

  if (commentaryCache[cacheKey]) return commentaryCache[cacheKey];
  if (!process.env.API_KEY) return fallbackMsg;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Level descriptions (same as Python)
    const levels: Record<string, string> = {
        "Droid Head": "LAYOUT: A horizontal, pill-shaped arena with rounded ends. The ground is a vibrant gradient transitioning from lime green (left) to sunset orange and deep violet (right).\nSTART: The ball is positioned on the far left, centered vertically.\nGOAL: A black cup with a white flagpole and pink triangular pennant, located on the far right.\nOBSTACLE: A black bot located in the middle-right of the path. The bot is a dynamic hazard that moves vertically, obstructing a direct line of sight to the hole.\nDIFFICULTY: Introductory. Focuses on timing the shot to bypass the moving hazard or utilizing the rounded rails for a bank shot.",
        "The G": "LAYOUT: Two disconnected floating platforms separated by an out of bounds area. Platform A (left) is a square with circular notches in the top-left and bottom-right. Platform B (right) is a large, irregular 'hook' shape.\nMECHANIC: Tunnels. Two holes connected by an underground tunnel link the two platforms.\nSTART: The ball begins on Platform A, bottom-left corner.\nTRANSITION: The tunnel entrance is located at the top-right of Platform A. Entering it teleports the ball to a matching exit at the bottom-left of Platform B.\nGOAL: The hole (white flag, pink pennant) is located in the upper-center of Platform B.\nCHALLENGE: Lining up the shot for platform B from Platform A. A shot with too much power could easily fly off the inner curve on Platform B and miss the goal.",
        "The og": "LAYOUT: A large arena shaped like the letter 'G' with a hollow center. The course follows a long, continuous path with sharp 90-degree turns. The color gradient flows along the path from green (bottom-left) up through blue (top), then down into red and purple (bottom-right).\nSTART: The primary ball is positioned in the top-right corner.\nSECONDARY ELEMENTS: Three additional white bumpers are placed at the bottom-left, top-left, and bottom-right corners. These act as static bumpers that can bounce the ball and accelerrate it greatly.\nGOAL: The hole (white flagpole, pink pennant) is located on an 'island' shelf that juts into the center of the 'G' from the right-hand side.\nCHALLENGE: Managing momentum over long distances. The player must navigate the perimeter and execute a precise 180-degree turn-around to land the ball on the final center shelf without getting bounced backwards.",
        "the le": "LAYOUT: A wide, irregular arena that shifts from a spacious green area on the left to a high-contrast pink and purple zone on the right. The goal is recessed behind a wall.\nSTART: The ball is positioned on the far left edge of the green zone.\nGOAL: Located in the upper-right, marked by a white flag and pink pennant inside an alcove.\nHAZARDS - SANDTRAPS: Two pale-yellow 'sand' regions act as friction zones. A large, irregular trap occupies the center-left path, and a smaller one sits in the bottom-right corner. These areas significantly slow the ball.\nHAZARDS - BOTS: Two black bots patrol the center of the course. They move vertically in a staggered pattern, requiring the player to time their shot to find a gap.\nCHALLENGE: Balancing speed and timing. The player needs enough power to plow through the sand traps without losing so much control that they collide with the moving bots or overtop the final goal alcove.",
        "Dino Run": "LAYOUT: A complex, multi-stage course consisting of three separate platforms. Platform 1 is a narrow vertical rectangle. Platform 2 is a jagged, staircase-like structure. Platform 3 is a large rounded rectangle.\nSTART: The ball begins at the top of Platform 1 (far left).\nMECHANICS - TUNNEL CHAIN: To progress, the ball must enter a series of tunnels. Tunnel A (Bottom of P1) leads to Tunnel B (Bottom of P2). Tunnel C (Top of P2) leads to Tunnel D (Top-left of P3).\nHAZARD - THE DINO: A pixelated dino patrols the top of Platform 3 horizontally. The Dino can catch the ball and throw it; this can be a helpful boost toward the goal or a disastrous redirection depending on timing.\nHAZARD - SANDTRAP: A wide yellow sandtrap spans the middle of Platform 3, drastically slowing the ball as it approaches the finish line.\nGOAL: The hole (white flag, pink pennant) is located at the bottom center of Platform 3, just past the sandtrap.\nCHALLENGE: This hole requires mastering the 'long game.' Players must navigate two tunnels before timing a final run past—or through—the Dino's grasp and managing speed through the heavy sand.",
        "I/O": "LAYOUT: The entire arena is shaped like a large, long-necked dinosaur. The path features a wide open area patrolled by a Dino below a water trap and a high finish point (the dinosaur's head).\nSTART: The ball begins at the bottom-left corner, at the base of the tail.\nGOAL: The hole (white flag, pink pennant) is perched at the very top-right on the dinosaur's head.\nHAZARD - THE DINO: A pixelated dino patrols the central body area horizontally. It can catch and throw the ball.\nHAZARD - ELEVATED SANDTRAP: A long, oval-shaped sandtrap (pale yellow) sits atop the central platform. It acts as a major friction point just before the final ascent to the head. Past the sand trap is water and hitting the ball in the water is out of play and costs a stroke.\nCHALLENGE: Dino negotiation. Players must negotiate with the patroling Dino to reach the 'head,' and maintain enough momentum to reach the finish line on the head. If they misstime their stroke, the Dino could throw their ball into the water.",
        "bridge": "LAYOUT: A high-complexity course split into two main sections. The upper section is a blue island with multiple cutouts and tunnel entrances. The lower section is a large, sprawling green-to-red complex with narrow bridges and circular bays.\nSTART: The ball begins in the upper-center of the top blue platform.\nMECHANICS - MULTI-PATH TUNNELS: This level features multiple tunnels. A tunnel in the bottom-left of the top platform leads to the green section (bottom-left). A tunnel at the top-right of the top platform leads to the orange section (bottom-right).\nHAZARDS - SANDTRAPS: Numerous yellow sand patches are scattered throughout. They guard the entry to narrow bridges and surround several of the circular 'bumpers.'\nGOAL: The hole (white flag, pink pennant) is located on a small, notched platform in the center-right of the lower complex.\nCHALLENGE: Decision making and precision. Players must choose whether to take the left or right path through the tunnels. The 'bridge' path requires extreme accuracy to cross the narrow central neck without falling into the void or losing all speed in the sand.",
        "TrexIO": "LAYOUT: A massive, multi-sectioned map featuring a winding green-to-yellow left side, a central blue valley, and a towering red-to-purple plateau on the right. The path is non-linear and highly vertical.\nSTART: The ball begins on a green ledge in the middle-left of the course.\nHAZARDS - THE HORDE: Three bots patrol the narrow corridors on the left (one bottom, two top). Four dinos dominate the central and right zones, including a 'trio of terror' on the far-right red plateau.\nHAZARDS - TERRAIN: An expansive L-shaped sandtrap (yellow) dominates the bottom-center, while several white bumpers are positioned at key inflection points to disrupt or assist shots.\nMECHANICS: A tunnel at the bottom-right (purple zone) connects to the tunnel at the top of the left-hand yellow corridor, providing direct access to the goal.\nGOAL: The hole is tucked away in a narrow, vertical yellow alcove in the upper-left quadrant, guarded by a bot.\nCHALLENGE: Chaos management. The player must navigate past bots, and survive the sand or use dinos for momentum to travel through the tunnel and reach the isolated goal alcove.",
        "Cactus jump": "LAYOUT: A massive course composed of four distinct islands. 1) The 'meadow' (Bottom-left), 2) The gauntlet (Bottom-center), 3) The 'Dino skyway' (Top-left), and 4) The 'final island' (Far-right).\nSTART: The ball begins on the meadow (far left island).\nMECHANICS - TUNNEL CHAIN: Success requires a precise sequence of jumps. T1 (meadow) -> T2 (gauntlet) -> T3 (Dino skyway) -> T4 (final island).\nHAZARDS: Each island features a unique threat. The Dino skyway has a dino launcher and three white bumpers. The hub is a vertical corridor guarded by eight (8) moving bots. The final island is split by a massive sandtrap.\nGOAL: The hole is located at the bottom-left of the final island, guarded by a narrow sand-free corridor.\nCHALLENGE: Mastery of all systems. The player must time Dino-throws, navigate a dense bot-swarm in the gauntlet, and manage speed through a multi-stage tunnel network to reach the final green."
    };

    let prompt = "";
    if (result === 'START') {
        const desc = levels[levelName] || "";
        prompt = `You are a mini-golf caddy. You are respectful, kids could be around. The player is starting a level. The par is ${par}. Give a one-sentence tip or encouraging remark. Only respond with things that could be in a G rated film. Do NOT mention the hole name. Keep it short (max 15 words). Here is description of the course. use this to provide creative suggestions: ${desc}`;
    } else {
        const scoreTerm = _getScoreTerm(strokes, par);
        const finalNote = isFinalHole ? "This is the FINAL hole - do NOT mention 'next hole' or anything about continuing. " : "";
        prompt = `You are a mini-golf caddy. You are respectful, kids could be around. The player finished a level in ${strokes} strokes (Par ${par}). That's a ${scoreTerm}. Give a one-sentence reaction. Be enthusiastic, positive. Only respond with things that could be in a G rated film. If this is a hole in one, you should mention that. Do NOT mention the hole name. Do not reference the player's robotic helpers. Do not mention bots or droids ever. ${finalNote}Max 15 words.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: {
          includeThoughts: false,
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
        temperature: 1.0, 
      },
    });

    // CRITICAL: Updated response parsing for @google/genai
    const text = response.text?.trim();
    
    if (text) {
      commentaryCache[cacheKey] = text;
      return text;
    }
    
    return fallbackMsg;

  } catch (error: any) {
    console.error("Caddy Error:", error);
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        isQuotaExhausted = true;
    }
    return fallbackMsg;
  }
};