// World Cup 2026 - Official Groups (Draw: December 5, 2025)
// Source: FIFA, UEFA, MLS Soccer

export const mockTeams = [
  // Group A: Mexico, South Africa, Korea Republic, European Play-Off D
  { id: 1, name: 'Mexico', code: 'MEX', group_letter: 'A', flag_url: 'https://flagcdn.com/w80/mx.png' },
  { id: 2, name: 'Sudafrica', code: 'RSA', group_letter: 'A', flag_url: 'https://flagcdn.com/w80/za.png' },
  { id: 3, name: 'Corea del Sur', code: 'KOR', group_letter: 'A', flag_url: 'https://flagcdn.com/w80/kr.png' },
  { id: 4, name: 'Playoff Europa D', code: 'PED', group_letter: 'A', flag_url: 'https://flagcdn.com/w80/eu.png', is_playoff: true, playoff_teams: 'Dinamarca / Rep. Checa / Macedonia del Norte / Irlanda' },

  // Group B: Canada, European Play-Off A, Qatar, Switzerland
  { id: 5, name: 'Canada', code: 'CAN', group_letter: 'B', flag_url: 'https://flagcdn.com/w80/ca.png' },
  { id: 6, name: 'Playoff Europa A', code: 'PEA', group_letter: 'B', flag_url: 'https://flagcdn.com/w80/eu.png', is_playoff: true, playoff_teams: 'Italia / Gales / Irlanda del Norte / Bosnia' },
  { id: 7, name: 'Catar', code: 'QAT', group_letter: 'B', flag_url: 'https://flagcdn.com/w80/qa.png' },
  { id: 8, name: 'Suiza', code: 'SUI', group_letter: 'B', flag_url: 'https://flagcdn.com/w80/ch.png' },

  // Group C: Brazil, Morocco, Haiti, Scotland
  { id: 9, name: 'Brasil', code: 'BRA', group_letter: 'C', flag_url: 'https://flagcdn.com/w80/br.png' },
  { id: 10, name: 'Marruecos', code: 'MAR', group_letter: 'C', flag_url: 'https://flagcdn.com/w80/ma.png' },
  { id: 11, name: 'Haiti', code: 'HAI', group_letter: 'C', flag_url: 'https://flagcdn.com/w80/ht.png' },
  { id: 12, name: 'Escocia', code: 'SCO', group_letter: 'C', flag_url: 'https://flagcdn.com/w80/gb-sct.png' },

  // Group D: United States, Paraguay, Australia, European Play-Off C
  { id: 13, name: 'Estados Unidos', code: 'USA', group_letter: 'D', flag_url: 'https://flagcdn.com/w80/us.png' },
  { id: 14, name: 'Paraguay', code: 'PAR', group_letter: 'D', flag_url: 'https://flagcdn.com/w80/py.png' },
  { id: 15, name: 'Australia', code: 'AUS', group_letter: 'D', flag_url: 'https://flagcdn.com/w80/au.png' },
  { id: 16, name: 'Playoff Europa C', code: 'PEC', group_letter: 'D', flag_url: 'https://flagcdn.com/w80/eu.png', is_playoff: true, playoff_teams: 'Turquia / Rumania / Eslovaquia / Kosovo' },

  // Group E: Germany, Curaçao, Côte d'Ivoire, Ecuador
  { id: 17, name: 'Alemania', code: 'GER', group_letter: 'E', flag_url: 'https://flagcdn.com/w80/de.png' },
  { id: 18, name: 'Curazao', code: 'CUW', group_letter: 'E', flag_url: 'https://flagcdn.com/w80/cw.png' },
  { id: 19, name: 'Costa de Marfil', code: 'CIV', group_letter: 'E', flag_url: 'https://flagcdn.com/w80/ci.png' },
  { id: 20, name: 'Ecuador', code: 'ECU', group_letter: 'E', flag_url: 'https://flagcdn.com/w80/ec.png' },

  // Group F: Netherlands, Japan, European Play-Off B, Tunisia
  { id: 21, name: 'Paises Bajos', code: 'NED', group_letter: 'F', flag_url: 'https://flagcdn.com/w80/nl.png' },
  { id: 22, name: 'Japon', code: 'JPN', group_letter: 'F', flag_url: 'https://flagcdn.com/w80/jp.png' },
  { id: 23, name: 'Playoff Europa B', code: 'PEB', group_letter: 'F', flag_url: 'https://flagcdn.com/w80/eu.png', is_playoff: true, playoff_teams: 'Polonia / Suecia / Ucrania / Albania' },
  { id: 24, name: 'Tunez', code: 'TUN', group_letter: 'F', flag_url: 'https://flagcdn.com/w80/tn.png' },

  // Group G: Belgium, Egypt, IR Iran, New Zealand
  { id: 25, name: 'Belgica', code: 'BEL', group_letter: 'G', flag_url: 'https://flagcdn.com/w80/be.png' },
  { id: 26, name: 'Egipto', code: 'EGY', group_letter: 'G', flag_url: 'https://flagcdn.com/w80/eg.png' },
  { id: 27, name: 'Iran', code: 'IRN', group_letter: 'G', flag_url: 'https://flagcdn.com/w80/ir.png' },
  { id: 28, name: 'Nueva Zelanda', code: 'NZL', group_letter: 'G', flag_url: 'https://flagcdn.com/w80/nz.png' },

  // Group H: Spain, Cabo Verde, Saudi Arabia, Uruguay
  { id: 29, name: 'Espana', code: 'ESP', group_letter: 'H', flag_url: 'https://flagcdn.com/w80/es.png' },
  { id: 30, name: 'Cabo Verde', code: 'CPV', group_letter: 'H', flag_url: 'https://flagcdn.com/w80/cv.png' },
  { id: 31, name: 'Arabia Saudita', code: 'KSA', group_letter: 'H', flag_url: 'https://flagcdn.com/w80/sa.png' },
  { id: 32, name: 'Uruguay', code: 'URU', group_letter: 'H', flag_url: 'https://flagcdn.com/w80/uy.png' },

  // Group I: France, Senegal, FIFA Play-Off 2, Norway
  { id: 33, name: 'Francia', code: 'FRA', group_letter: 'I', flag_url: 'https://flagcdn.com/w80/fr.png' },
  { id: 34, name: 'Senegal', code: 'SEN', group_letter: 'I', flag_url: 'https://flagcdn.com/w80/sn.png' },
  { id: 35, name: 'Playoff FIFA 2', code: 'PF2', group_letter: 'I', flag_url: 'https://flagcdn.com/w80/un.png', is_playoff: true, playoff_teams: 'Bolivia / Irak / Surinam' },
  { id: 36, name: 'Noruega', code: 'NOR', group_letter: 'I', flag_url: 'https://flagcdn.com/w80/no.png' },

  // Group J: Argentina, Algeria, Austria, Jordan
  { id: 37, name: 'Argentina', code: 'ARG', group_letter: 'J', flag_url: 'https://flagcdn.com/w80/ar.png' },
  { id: 38, name: 'Argelia', code: 'ALG', group_letter: 'J', flag_url: 'https://flagcdn.com/w80/dz.png' },
  { id: 39, name: 'Austria', code: 'AUT', group_letter: 'J', flag_url: 'https://flagcdn.com/w80/at.png' },
  { id: 40, name: 'Jordania', code: 'JOR', group_letter: 'J', flag_url: 'https://flagcdn.com/w80/jo.png' },

  // Group K: Portugal, FIFA Play-Off 1, Uzbekistan, Colombia
  { id: 41, name: 'Portugal', code: 'POR', group_letter: 'K', flag_url: 'https://flagcdn.com/w80/pt.png' },
  { id: 42, name: 'Playoff FIFA 1', code: 'PF1', group_letter: 'K', flag_url: 'https://flagcdn.com/w80/un.png', is_playoff: true, playoff_teams: 'Jamaica / RD Congo / Nueva Caledonia' },
  { id: 43, name: 'Uzbekistan', code: 'UZB', group_letter: 'K', flag_url: 'https://flagcdn.com/w80/uz.png' },
  { id: 44, name: 'Colombia', code: 'COL', group_letter: 'K', flag_url: 'https://flagcdn.com/w80/co.png' },

  // Group L: England, Croatia, Ghana, Panama
  { id: 45, name: 'Inglaterra', code: 'ENG', group_letter: 'L', flag_url: 'https://flagcdn.com/w80/gb-eng.png' },
  { id: 46, name: 'Croacia', code: 'CRO', group_letter: 'L', flag_url: 'https://flagcdn.com/w80/hr.png' },
  { id: 47, name: 'Ghana', code: 'GHA', group_letter: 'L', flag_url: 'https://flagcdn.com/w80/gh.png' },
  { id: 48, name: 'Panama', code: 'PAN', group_letter: 'L', flag_url: 'https://flagcdn.com/w80/pa.png' },
];

export const mockUser = {
  id: 1,
  name: 'Usuario Demo',
  email: 'demo@natalia.com',
  role: 'user'
};

export const mockLeaderboard = [
  { id: 1, name: 'Carlos M.', total_points: 45 },
  { id: 2, name: 'Ana G.', total_points: 42 },
  { id: 3, name: 'Pedro L.', total_points: 38 },
  { id: 4, name: 'Maria S.', total_points: 35 },
  { id: 5, name: 'Juan R.', total_points: 33 },
  { id: 6, name: 'Laura P.', total_points: 30 },
  { id: 7, name: 'Usuario Demo', total_points: 28 },
  { id: 8, name: 'Sofia T.', total_points: 25 },
  { id: 9, name: 'Diego H.', total_points: 22 },
  { id: 10, name: 'Elena V.', total_points: 20 },
];

export const getTeamsByGroup = (groupLetter) => {
  return mockTeams.filter(team => team.group_letter === groupLetter);
};

export const getAllGroups = () => {
  return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
};
