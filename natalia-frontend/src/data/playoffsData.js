// Playoffs / Repechajes para Mundial 2026
// Se juegan en marzo 2026

export const playoffs = [
  // UEFA Playoffs (4 paths)
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
      semi1: { teamA: 101, teamB: 104 }, // Italia vs Bosnia
      semi2: { teamA: 102, teamB: 103 }, // Gales vs Irlanda del Norte
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
      semi1: { teamA: 105, teamB: 108 }, // Polonia vs Albania
      semi2: { teamA: 106, teamB: 107 }, // Suecia vs Ucrania
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
      semi1: { teamA: 109, teamB: 112 }, // Turquia vs Kosovo
      semi2: { teamA: 110, teamB: 111 }, // Rumania vs Eslovaquia
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
      semi1: { teamA: 113, teamB: 116 }, // Dinamarca vs Irlanda
      semi2: { teamA: 114, teamB: 115 }, // Rep. Checa vs Macedonia del Norte
    }
  },

  // FIFA Intercontinental Playoffs (2 spots)
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
      semi1: { teamA: 118, teamB: 119 }, // RD Congo vs Nueva Caledonia
      finalTeamA: 117, // Jamaica espera al ganador
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
      semi1: { teamA: 121, teamB: 122 }, // Irak vs Surinam
      finalTeamA: 120, // Bolivia espera al ganador
    }
  },
];

export const getPlayoffById = (id) => playoffs.find(p => p.id === id);
export const getPlayoffTeamById = (playoffId, teamId) => {
  const playoff = getPlayoffById(playoffId);
  return playoff?.teams.find(t => t.id === teamId);
};
