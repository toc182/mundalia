const fs = require('fs');

// Leer CSV
const csv = fs.readFileSync('combinations.csv', 'utf8').trim().split('\n');
const data = csv.slice(1); // Skip header

// COLUMNS en orden: 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L (indices 0-7)
const COLUMNS = ['1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L'];

// Crear COMPACT_COMBINATIONS: 8 letras por fila
// Cada letra representa el grupo que va a ese slot
const compactCombinations = [];

data.forEach((line) => {
  const cols = line.split(',');
  // cols[1-8] son 3X donde X es el grupo
  let compact = '';
  for (let i = 1; i <= 8; i++) {
    const val = cols[i]?.trim();
    if (val && val.length >= 2) {
      compact += val[1]; // Segunda letra es el grupo
    }
  }
  if (compact.length === 8) {
    compactCombinations.push(compact);
  }
});

console.log('Total combinaciones generadas:', compactCombinations.length);

// Verificar unicidad de grupos ordenados
const uniqueGroups = new Set(compactCombinations.map(c => [...c].sort().join('')));
console.log('Grupos unicos:', uniqueGroups.size);

// Formatear las combinaciones en filas de 8
const formattedCombos = [];
for (let i = 0; i < compactCombinations.length; i += 8) {
  const row = compactCombinations.slice(i, i + 8).map(c => `'${c}'`).join(',');
  formattedCombos.push('  ' + row);
}

// Generar el archivo JS
const jsContent = `// Combinaciones de los 8 mejores terceros lugares - FIFA World Cup 2026
// Generado directamente desde combinations.csv (archivo oficial FIFA)
// Total: 495 combinaciones unicas
// Formato compacto: cada string tiene 8 caracteres representando [1A,1B,1D,1E,1G,1I,1K,1L]

const COMPACT_COMBINATIONS = [
${formattedCombos.join(',\n')}
];

// Columnas en orden: 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L
const COLUMNS = ['1A', '1B', '1D', '1E', '1G', '1I', '1K', '1L'];

// Expande una combinacion compacta a objeto completo
function expandCombination(compactStr, optionNum) {
  const assignments = {};
  const groups = [];

  for (let i = 0; i < 8; i++) {
    const group = compactStr[i];
    assignments[COLUMNS[i]] = group;
    groups.push(group);
  }

  return {
    option: optionNum,
    qualifyingGroups: [...groups].sort(),
    assignments
  };
}

// Cache para combinaciones expandidas (lazy loading)
let _expandedCache = null;

// Obtener todas las combinaciones (expandidas bajo demanda)
export function getThirdPlaceCombinations() {
  if (!_expandedCache) {
    _expandedCache = COMPACT_COMBINATIONS.map((c, i) => expandCombination(c, i + 1));
  }
  return _expandedCache;
}

// Alias para compatibilidad
export const thirdPlaceCombinations = {
  get length() { return COMPACT_COMBINATIONS.length; },
  [Symbol.iterator]: function* () { yield* getThirdPlaceCombinations(); },
  find: (fn) => getThirdPlaceCombinations().find(fn),
  filter: (fn) => getThirdPlaceCombinations().filter(fn),
  map: (fn) => getThirdPlaceCombinations().map(fn),
};

// Funcion para obtener la combinacion correcta basada en los grupos que clasificaron terceros
export function getThirdPlaceCombination(qualifyingThirdPlaceGroups) {
  const sortedGroups = [...qualifyingThirdPlaceGroups].sort().join('');

  for (let i = 0; i < COMPACT_COMBINATIONS.length; i++) {
    const combo = expandCombination(COMPACT_COMBINATIONS[i], i + 1);
    if (combo.qualifyingGroups.join('') === sortedGroups) {
      return combo;
    }
  }
  return undefined;
}

// Funcion para determinar los 8 mejores terceros lugares
export function determineBestThirdPlaces(thirdPlaceTeams) {
  return [...thirdPlaceTeams]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      if (b.conductScore !== a.conductScore) return b.conductScore - a.conductScore;
      return a.fifaRanking - b.fifaRanking;
    })
    .slice(0, 8);
}

// Mapeo de partidos Round of 32
export const thirdPlaceMatchMapping = {
  'M74': '1E', 'M77': '1I', 'M79': '1A', 'M80': '1L',
  'M81': '1D', 'M82': '1G', 'M85': '1B', 'M87': '1K',
};

// Pools de grupos para cada partido
export const thirdPlacePools = {
  'M74': ['A', 'B', 'C', 'D', 'F'],
  'M77': ['C', 'D', 'F', 'G', 'H'],
  'M79': ['C', 'E', 'F', 'H', 'I'],
  'M80': ['E', 'H', 'I', 'J', 'K'],
  'M81': ['B', 'E', 'F', 'I', 'J'],
  'M82': ['A', 'E', 'H', 'I', 'J'],
  'M85': ['E', 'F', 'G', 'I', 'J'],
  'M87': ['D', 'E', 'I', 'J', 'L'],
};

// Obtener asignaciones para el Round of 32
export function getThirdPlaceAssignments(qualifyingGroups) {
  const combination = getThirdPlaceCombination(qualifyingGroups);
  if (!combination) {
    console.error('No se encontro combinacion para los grupos:', qualifyingGroups);
    return null;
  }
  return {
    'M74': combination.assignments['1E'],
    'M77': combination.assignments['1I'],
    'M79': combination.assignments['1A'],
    'M80': combination.assignments['1L'],
    'M81': combination.assignments['1D'],
    'M82': combination.assignments['1G'],
    'M85': combination.assignments['1B'],
    'M87': combination.assignments['1K'],
  };
}

export default {
  thirdPlaceCombinations,
  getThirdPlaceCombinations,
  getThirdPlaceCombination,
  determineBestThirdPlaces,
  thirdPlaceMatchMapping,
  thirdPlacePools,
  getThirdPlaceAssignments,
};
`;

fs.writeFileSync('natalia-frontend/src/data/thirdPlaceCombinations.js', jsContent);
console.log('Archivo generado: natalia-frontend/src/data/thirdPlaceCombinations.js');
