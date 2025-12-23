// Estructura del bracket de eliminatorias - FIFA World Cup 2026
// Basado en el Reglamento Oficial FIFA (Articulo 12)

export interface TeamSlotFromGroup {
  position: string;
  type: 'winner' | 'runner_up' | 'third_place';
  group?: string;
  pools?: string[];
}

export interface TeamSlotFromMatch {
  from: string;
  position?: 'winner' | 'loser';
}

export interface RoundOf32Match {
  matchId: string;
  matchNumber: number;
  teamA: TeamSlotFromGroup;
  teamB: TeamSlotFromGroup;
}

export interface KnockoutMatchStructure {
  matchId: string;
  matchNumber: number;
  teamA: TeamSlotFromMatch;
  teamB: TeamSlotFromMatch;
  label?: string;
}

export interface SpecialMatch {
  matchId: string;
  matchNumber: number;
  teamA: TeamSlotFromMatch;
  teamB: TeamSlotFromMatch;
  label: string;
}

// Round of 32: 16 partidos (M73-M88)
// Los terceros lugares se asignan segun la matriz de 495 combinaciones
export const roundOf32Structure: RoundOf32Match[] = [
  // Partido M73: 2A vs 2B
  { matchId: 'M73', matchNumber: 1, teamA: { position: '2A', type: 'runner_up', group: 'A' }, teamB: { position: '2B', type: 'runner_up', group: 'B' } },

  // Partido M74: 1E vs Best 3rd (ABCDF)
  { matchId: 'M74', matchNumber: 2, teamA: { position: '1E', type: 'winner', group: 'E' }, teamB: { position: '3rd_ABCDF', type: 'third_place', pools: ['A', 'B', 'C', 'D', 'F'] } },

  // Partido M75: 1F vs 2C
  { matchId: 'M75', matchNumber: 3, teamA: { position: '1F', type: 'winner', group: 'F' }, teamB: { position: '2C', type: 'runner_up', group: 'C' } },

  // Partido M76: 1C vs 2F
  { matchId: 'M76', matchNumber: 4, teamA: { position: '1C', type: 'winner', group: 'C' }, teamB: { position: '2F', type: 'runner_up', group: 'F' } },

  // Partido M77: 1I vs Best 3rd (CDFGH)
  { matchId: 'M77', matchNumber: 5, teamA: { position: '1I', type: 'winner', group: 'I' }, teamB: { position: '3rd_CDFGH', type: 'third_place', pools: ['C', 'D', 'F', 'G', 'H'] } },

  // Partido M78: 2E vs 2I
  { matchId: 'M78', matchNumber: 6, teamA: { position: '2E', type: 'runner_up', group: 'E' }, teamB: { position: '2I', type: 'runner_up', group: 'I' } },

  // Partido M79: 1A vs Best 3rd (CEFHI)
  { matchId: 'M79', matchNumber: 7, teamA: { position: '1A', type: 'winner', group: 'A' }, teamB: { position: '3rd_CEFHI', type: 'third_place', pools: ['C', 'E', 'F', 'H', 'I'] } },

  // Partido M80: 1L vs Best 3rd (EHIJK)
  { matchId: 'M80', matchNumber: 8, teamA: { position: '1L', type: 'winner', group: 'L' }, teamB: { position: '3rd_EHIJK', type: 'third_place', pools: ['E', 'H', 'I', 'J', 'K'] } },

  // Partido M81: 1D vs Best 3rd (BEFIJ)
  { matchId: 'M81', matchNumber: 9, teamA: { position: '1D', type: 'winner', group: 'D' }, teamB: { position: '3rd_BEFIJ', type: 'third_place', pools: ['B', 'E', 'F', 'I', 'J'] } },

  // Partido M82: 1G vs Best 3rd (AEHIJ)
  { matchId: 'M82', matchNumber: 10, teamA: { position: '1G', type: 'winner', group: 'G' }, teamB: { position: '3rd_AEHIJ', type: 'third_place', pools: ['A', 'E', 'H', 'I', 'J'] } },

  // Partido M83: 2K vs 2L
  { matchId: 'M83', matchNumber: 11, teamA: { position: '2K', type: 'runner_up', group: 'K' }, teamB: { position: '2L', type: 'runner_up', group: 'L' } },

  // Partido M84: 1H vs 2J
  { matchId: 'M84', matchNumber: 12, teamA: { position: '1H', type: 'winner', group: 'H' }, teamB: { position: '2J', type: 'runner_up', group: 'J' } },

  // Partido M85: 1B vs Best 3rd (EFGIJ)
  { matchId: 'M85', matchNumber: 13, teamA: { position: '1B', type: 'winner', group: 'B' }, teamB: { position: '3rd_EFGIJ', type: 'third_place', pools: ['E', 'F', 'G', 'I', 'J'] } },

  // Partido M86: 1J vs 2H
  { matchId: 'M86', matchNumber: 14, teamA: { position: '1J', type: 'winner', group: 'J' }, teamB: { position: '2H', type: 'runner_up', group: 'H' } },

  // Partido M87: 1K vs Best 3rd (DEIJL)
  { matchId: 'M87', matchNumber: 15, teamA: { position: '1K', type: 'winner', group: 'K' }, teamB: { position: '3rd_DEIJL', type: 'third_place', pools: ['D', 'E', 'I', 'J', 'L'] } },

  // Partido M88: 2D vs 2G
  { matchId: 'M88', matchNumber: 16, teamA: { position: '2D', type: 'runner_up', group: 'D' }, teamB: { position: '2G', type: 'runner_up', group: 'G' } },
];

// Round of 16: 8 partidos (M89-M96)
export const roundOf16Structure: KnockoutMatchStructure[] = [
  { matchId: 'M89', matchNumber: 17, teamA: { from: 'M74' }, teamB: { from: 'M77' } },
  { matchId: 'M90', matchNumber: 18, teamA: { from: 'M73' }, teamB: { from: 'M75' } },
  { matchId: 'M91', matchNumber: 19, teamA: { from: 'M76' }, teamB: { from: 'M78' } },
  { matchId: 'M92', matchNumber: 20, teamA: { from: 'M79' }, teamB: { from: 'M80' } },
  { matchId: 'M93', matchNumber: 21, teamA: { from: 'M83' }, teamB: { from: 'M84' } },
  { matchId: 'M94', matchNumber: 22, teamA: { from: 'M81' }, teamB: { from: 'M82' } },
  { matchId: 'M95', matchNumber: 23, teamA: { from: 'M86' }, teamB: { from: 'M88' } },
  { matchId: 'M96', matchNumber: 24, teamA: { from: 'M85' }, teamB: { from: 'M87' } },
];

// Cuartos de Final: 4 partidos (M97-M100)
export const quarterFinalsStructure: KnockoutMatchStructure[] = [
  { matchId: 'M97', matchNumber: 25, teamA: { from: 'M89' }, teamB: { from: 'M90' }, label: 'QF1' },
  { matchId: 'M98', matchNumber: 26, teamA: { from: 'M93' }, teamB: { from: 'M94' }, label: 'QF2' },
  { matchId: 'M99', matchNumber: 27, teamA: { from: 'M91' }, teamB: { from: 'M92' }, label: 'QF3' },
  { matchId: 'M100', matchNumber: 28, teamA: { from: 'M95' }, teamB: { from: 'M96' }, label: 'QF4' },
];

// Semifinales: 2 partidos (M101-M102)
export const semiFinalsStructure: KnockoutMatchStructure[] = [
  { matchId: 'M101', matchNumber: 29, teamA: { from: 'M97' }, teamB: { from: 'M98' }, label: 'SF1' },
  { matchId: 'M102', matchNumber: 30, teamA: { from: 'M99' }, teamB: { from: 'M100' }, label: 'SF2' },
];

// Tercer Lugar: 1 partido (M103)
export const thirdPlaceMatch: SpecialMatch = {
  matchId: 'M103',
  matchNumber: 31,
  teamA: { from: 'M101', position: 'loser' },
  teamB: { from: 'M102', position: 'loser' },
  label: '3rd Place'
};

// Final: 1 partido (M104)
export const finalMatch: SpecialMatch = {
  matchId: 'M104',
  matchNumber: 32,
  teamA: { from: 'M101', position: 'winner' },
  teamB: { from: 'M102', position: 'winner' },
  label: 'Final'
};

export interface KnockoutBracket {
  roundOf32: RoundOf32Match[];
  roundOf16: KnockoutMatchStructure[];
  quarterFinals: KnockoutMatchStructure[];
  semiFinals: KnockoutMatchStructure[];
  thirdPlace: SpecialMatch;
  final: SpecialMatch;
  totalMatches: number;
}

// Estructura completa del bracket
export const knockoutBracket: KnockoutBracket = {
  roundOf32: roundOf32Structure,
  roundOf16: roundOf16Structure,
  quarterFinals: quarterFinalsStructure,
  semiFinals: semiFinalsStructure,
  thirdPlace: thirdPlaceMatch,
  final: finalMatch,
  totalMatches: 32, // 16 + 8 + 4 + 2 + 1 + 1
};

export interface KnockoutPoints {
  roundOf32: number;
  roundOf16: number;
  quarterFinals: number;
  semiFinals: number;
  thirdPlace: number;
  final: number;
}

// Sistema de puntos para predicciones de eliminatorias
// DEBE coincidir con natalia-backend/utils/scoring.ts
export const knockoutPoints: KnockoutPoints = {
  roundOf32: 1,      // Dieciseisavos (M73-M88)
  roundOf16: 2,      // Octavos (M89-M96)
  quarterFinals: 4,  // Cuartos (M97-M100)
  semiFinals: 6,     // Semifinal (M101-M102)
  thirdPlace: 8,     // Tercer puesto (M103) - mismo que finalista
  final: 15,         // Campeon (M104)
};

export default knockoutBracket;
