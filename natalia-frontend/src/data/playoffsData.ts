// Playoffs / Repechajes para Mundial 2026
// Se juegan en marzo 2026
// Datos oficiales del sorteo FIFA/UEFA - Diciembre 2025

export interface PlayoffTeam {
  id: number;
  name: string;
  code: string;
  flag_url: string;
}

export interface UEFABracket {
  semi1: { teamA: number; teamB: number };
  semi2: { teamA: number; teamB: number };
}

export interface FIFABracket {
  semi1: { teamA: number; teamB: number };
  finalTeamA: number;
}

export interface Playoff {
  id: string;
  name: string;
  confederation: 'UEFA' | 'FIFA';
  destinationGroup: string;
  destinationTeamId: number;
  teams: PlayoffTeam[];
  bracket: UEFABracket | FIFABracket;
}

export const playoffs: Playoff[] = [
  // UEFA Playoffs (4 paths)
  // Fuente: https://www.foxsports.com/stories/soccer/2026-world-cup-playoffs-schedule-bracket-teams
  {
    id: 'UEFA_A',
    name: 'Playoff Europa A',
    confederation: 'UEFA',
    destinationGroup: 'B',
    destinationTeamId: 6,
    teams: [
      { id: 101, name: 'Italia', code: 'ITA', flag_url: 'https://flagcdn.com/w80/it.png' },
      { id: 102, name: 'Gales', code: 'WAL', flag_url: 'https://flagcdn.com/w80/gb-wls.png' },
      { id: 103, name: 'Irlanda del Norte', code: 'NIR', flag_url: 'https://flagcdn.com/w80/gb-nir.png' },
      { id: 104, name: 'Bosnia', code: 'BIH', flag_url: 'https://flagcdn.com/w80/ba.png' },
    ],
    bracket: {
      semi1: { teamA: 101, teamB: 103 }, // Italia vs Irlanda del Norte
      semi2: { teamA: 102, teamB: 104 }, // Gales vs Bosnia
    }
  },
  {
    id: 'UEFA_B',
    name: 'Playoff Europa B',
    confederation: 'UEFA',
    destinationGroup: 'F',
    destinationTeamId: 23,
    teams: [
      { id: 105, name: 'Polonia', code: 'POL', flag_url: 'https://flagcdn.com/w80/pl.png' },
      { id: 106, name: 'Suecia', code: 'SWE', flag_url: 'https://flagcdn.com/w80/se.png' },
      { id: 107, name: 'Ucrania', code: 'UKR', flag_url: 'https://flagcdn.com/w80/ua.png' },
      { id: 108, name: 'Albania', code: 'ALB', flag_url: 'https://flagcdn.com/w80/al.png' },
    ],
    bracket: {
      semi1: { teamA: 107, teamB: 106 }, // Ucrania vs Suecia
      semi2: { teamA: 105, teamB: 108 }, // Polonia vs Albania
    }
  },
  {
    id: 'UEFA_C',
    name: 'Playoff Europa C',
    confederation: 'UEFA',
    destinationGroup: 'D',
    destinationTeamId: 16,
    teams: [
      { id: 109, name: 'Turquia', code: 'TUR', flag_url: 'https://flagcdn.com/w80/tr.png' },
      { id: 110, name: 'Rumania', code: 'ROU', flag_url: 'https://flagcdn.com/w80/ro.png' },
      { id: 111, name: 'Eslovaquia', code: 'SVK', flag_url: 'https://flagcdn.com/w80/sk.png' },
      { id: 112, name: 'Kosovo', code: 'KOS', flag_url: 'https://flagcdn.com/w80/xk.png' },
    ],
    bracket: {
      semi1: { teamA: 109, teamB: 110 }, // Turquia vs Rumania
      semi2: { teamA: 111, teamB: 112 }, // Eslovaquia vs Kosovo
    }
  },
  {
    id: 'UEFA_D',
    name: 'Playoff Europa D',
    confederation: 'UEFA',
    destinationGroup: 'A',
    destinationTeamId: 4,
    teams: [
      { id: 113, name: 'Dinamarca', code: 'DEN', flag_url: 'https://flagcdn.com/w80/dk.png' },
      { id: 114, name: 'Rep. Checa', code: 'CZE', flag_url: 'https://flagcdn.com/w80/cz.png' },
      { id: 115, name: 'Macedonia del Norte', code: 'MKD', flag_url: 'https://flagcdn.com/w80/mk.png' },
      { id: 116, name: 'Irlanda', code: 'IRL', flag_url: 'https://flagcdn.com/w80/ie.png' },
    ],
    bracket: {
      semi1: { teamA: 113, teamB: 115 }, // Dinamarca vs Macedonia del Norte
      semi2: { teamA: 114, teamB: 116 }, // Rep. Checa vs Irlanda
    }
  },

  // FIFA Intercontinental Playoffs (2 spots)
  // Sorteo 20 Nov 2025 - Se juegan en Mexico (Guadalajara y Monterrey)
  {
    id: 'FIFA_1',
    name: 'Playoff FIFA 1',
    confederation: 'FIFA',
    destinationGroup: 'K',
    destinationTeamId: 42,
    teams: [
      { id: 117, name: 'Jamaica', code: 'JAM', flag_url: 'https://flagcdn.com/w80/jm.png' },
      { id: 118, name: 'RD Congo', code: 'COD', flag_url: 'https://flagcdn.com/w80/cd.png' },
      { id: 119, name: 'Nueva Caledonia', code: 'NCL', flag_url: 'https://flagcdn.com/w80/nc.png' },
    ],
    bracket: {
      semi1: { teamA: 119, teamB: 117 }, // Nueva Caledonia vs Jamaica
      finalTeamA: 118, // RD Congo espera al ganador
    }
  },
  {
    id: 'FIFA_2',
    name: 'Playoff FIFA 2',
    confederation: 'FIFA',
    destinationGroup: 'I',
    destinationTeamId: 35,
    teams: [
      { id: 120, name: 'Bolivia', code: 'BOL', flag_url: 'https://flagcdn.com/w80/bo.png' },
      { id: 121, name: 'Irak', code: 'IRQ', flag_url: 'https://flagcdn.com/w80/iq.png' },
      { id: 122, name: 'Surinam', code: 'SUR', flag_url: 'https://flagcdn.com/w80/sr.png' },
    ],
    bracket: {
      semi1: { teamA: 120, teamB: 122 }, // Bolivia vs Surinam
      finalTeamA: 121, // Irak espera al ganador
    }
  },
];

export const getPlayoffById = (id: string): Playoff | undefined =>
  playoffs.find(p => p.id === id);

export const getPlayoffTeamById = (playoffId: string, teamId: number): PlayoffTeam | undefined => {
  const playoff = getPlayoffById(playoffId);
  return playoff?.teams.find(t => t.id === teamId);
};
