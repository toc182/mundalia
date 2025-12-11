// Combinaciones de los 8 mejores terceros lugares - FIFA World Cup 2026
// Generado directamente desde combinations.csv (archivo oficial FIFA)
// Total: 495 combinaciones unicas
// Formato compacto: cada string tiene 8 caracteres representando [1A,1B,1D,1E,1G,1I,1K,1L]

const COMPACT_COMBINATIONS = [
  'EJIFHGLK','HGIDJFLK','EJIDHGLK','EJIDHFLK','EGIDJFLK','EGJDHFLK','EGIDHFLK','EGJDHFLI',
  'EGJDHFIK','HGICJFLK','EJICHGLK','EJICHFLK','EGICJFLK','EGJCHFLK','EGICHFLK','EGJCHFLI',
  'EGJCHFIK','HGICJDLK','CJIDHFLK','CGIDJFLK','CGJDHFLK','CGIDHFLK','CGJDHFLI','CGJDHFIK',
  'EJICHDLK','EGICJDLK','EGJCHDLK','EGICHDLK','EGJCHDLI','EGJCHDIK','CJEDIFLK','CJEDHFLK',
  'CEIDHFLK','CJEDHFLI','CJEDHFIK','CGEDJFLK','CGEDIFLK','CGEDJFLI','CGEDJFIK','CGEDHFLK',
  'CGJDHFLE','CGJDHFEK','CGEDHFLI','CGEDHFIK','CGJDHFEI','HJBFIGLK','EJIBHGLK','EJBFIHLK',
  'EJBFIGLK','EJBFHGLK','EGBFIHLK','EJBFHGLI','EJBFHGIK','HJBDIGLK','HJBDIFLK','IGBDJFLK',
  'HGBDJFLK','HGBDIFLK','HGBDJFLI','HGBDJFIK','EJBDIHLK','EJBDIGLK','EJBDHGLK','EGBDIHLK',
  'EJBDHGLI','EJBDHGIK','EJBDIFLK','EJBDHFLK','EIBDHFLK','EJBDHFLI','EJBDHFIK','EGBDJFLK',
  'EGBDIFLK','EGBDJFLI','EGBDJFIK','EGBDHFLK','HGBDJFLE','HGBDJFEK','EGBDHFLI','EGBDHFIK',
  'HGBDJFEI','HJBCIGLK','HJBCIFLK','IGBCJFLK','HGBCJFLK','HGBCIFLK','HGBCJFLI','HGBCJFIK',
  'EJBCIHLK','EJBCIGLK','EJBCHGLK','EGBCIHLK','EJBCHGLI','EJBCHGIK','EJBCIFLK','EJBCHFLK',
  'EIBCHFLK','EJBCHFLI','EJBCHFIK','EGBCJFLK','EGBCIFLK','EGBCJFLI','EGBCJFIK','EGBCHFLK',
  'HGBCJFLE','HGBCJFEK','EGBCHFLI','EGBCHFIK','HGBCJFEI','HJBCIDLK','IGBCJDLK','HGBCJDLK',
  'HGBCIDLK','HGBCJDLI','HGBCJDIK','CJBDIFLK','CJBDHFLK','CIBDHFLK','CJBDHFLI','CJBDHFIK',
  'CGBDJFLK','CGBDIFLK','CGBDJFLI','CGBDJFIK','CGBDHFLK','CGBDHFLJ','HGBCJFDK','CGBDHFLI',
  'CGBDHFIK','HGBCJFDI','EJBCIDLK','EJBCHDLK','EIBCHDLK','EJBCHDLI','EJBCHDIK','EGBCJDLK',
  'EGBCIDLK','EGBCJDLI','EGBCJDIK','EGBCHDLK','HGBCJDLE','HGBCJDEK','EGBCHDLI','EGBCHDIK',
  'HGBCJDEI','CJBDEFLK','CEBDIFLK','CJBDEFLI','CJBDEFIK','CEBDHFLK','CJBDHFLE','CJBDHFEK',
  'CEBDHFLI','CEBDHFIK','CJBDHFEI','CGBDEFLK','CGBDJFLE','CGBDJFEK','CGBDEFLI','CGBDEFIK',
  'CGBDJFEI','CGBDHFLE','CGBDHFEK','HGBCJFDE','CGBDHFEI','HJIFAGLK','EJIAHGLK','EJIFAHLK',
  'EJIFAGLK','EGJFAHLK','EGIFAHLK','EGJFAHLI','EGJFAHIK','HJIDAGLK','HJIDAFLK','IGJDAFLK',
  'HGJDAFLK','HGIDAFLK','HGJDAFLI','HGJDAFIK','EJIDAHLK','EJIDAGLK','EGJDAHLK','EGIDAHLK',
  'EGJDAHLI','EGJDAHIK','EJIDAFLK','HJEDAFLK','HEIDAFLK','HJEDAFLI','HJEDAFIK','EGJDAFLK',
  'EGIDAFLK','EGJDAFLI','EGJDAFIK','HGEDAFLK','HGJDAFLE','HGJDAFEK','HGEDAFLI','HGEDAFIK',
  'HGJDAFEI','HJICAGLK','HJICAFLK','IGJCAFLK','HGJCAFLK','HGICAFLK','HGJCAFLI','HGJCAFIK',
  'EJICAHLK','EJICAGLK','EGJCAHLK','EGICAHLK','EGJCAHLI','EGJCAHIK','EJICAFLK','HJECAFLK',
  'HEICAFLK','HJECAFLI','HJECAFIK','EGJCAFLK','EGICAFLK','EGJCAFLI','EGJCAFIK','HGECAFLK',
  'HGJCAFLE','HGJCAFEK','HGECAFLI','HGECAFIK','HGJCAFEI','HJICADLK','IGJCADLK','HGJCADLK',
  'HGICADLK','HGJCADLI','HGJCADIK','CJIDAFLK','HJFCADLK','HFICADLK','HJFCADLI','HJFCADIK',
  'CGJDAFLK','CGIDAFLK','CGJDAFLI','CGJDAFIK','HGFCADLK','CGJDAFLH','HGJCAFDK','HGFCADLI',
  'HGFCADIK','HGJCAFDI','EJICADLK','HJECADLK','HEICADLK','HJECADLI','HJECADIK','EGJCADLK',
  'EGICADLK','EGJCADLI','EGJCADIK','HGECADLK','HGJCADLE','HGJCADEK','HGECADLI','HGECADIK',
  'HGJCADEI','CJEDAFLK','CEIDAFLK','CJEDAFLI','CJEDAFIK','HEFCADLK','HJFCADLE','HJECAFDK',
  'HEFCADLI','HEFCADIK','HJECAFDI','CGEDAFLK','CGJDAFLE','CGJDAFEK','CGEDAFLI','CGEDAFIK',
  'CGJDAFEI','HGFCADLE','HGECAFDK','HGJCAFDE','HGECAFDI','HJBAIGLK','HJBAIFLK','IJBFAGLK',
  'HJBFAGLK','HGBAIFLK','HJBFAGLI','HJBFAGIK','EJBAIHLK','EJBAIGLK','EJBAHGLK','EGBAIHLK',
  'EJBAHGLI','EJBAHGIK','EJBAIFLK','EJBFAHLK','EIBFAHLK','EJBFAHLI','EJBFAHIK','EJBFAGLK',
  'EGBAIFLK','EJBFAGLI','EJBFAGIK','EGBFAHLK','HJBFAGLE','HJBFAGEK','EGBFAHLI','EGBFAHIK',
  'HJBFAGEI','IJBDAHLK','IJBDAGLK','HJBDAGLK','IGBDAHLK','HJBDAGLI','HJBDAGIK','IJBDAFLK',
  'HJBDAFLK','HIBDAFLK','HJBDAFLI','HJBDAFIK','FJBDAGLK','IGBDAFLK','FJBDAGLI','FJBDAGIK',
  'HGBDAFLK','HGBDAFLJ','HGBDAFJK','HGBDAFLI','HGBDAFIK','HGBDAFIJ','EJBAIDLK','EJBDAHLK',
  'EIBDAHLK','EJBDAHLI','EJBDAHIK','EJBDAGLK','EGBAIDLK','EJBDAGLI','EJBDAGIK','EGBDAHLK',
  'HJBDAGLE','HJBDAGEK','EGBDAHLI','EGBDAHIK','HJBDAGEI','EJBDAFLK','EIBDAFLK','EJBDAFLI',
  'EJBDAFIK','HEBDAFLK','HJBDAFLE','HJBDAFEK','HEBDAFLI','HEBDAFIK','HJBDAFEI','EGBDAFLK',
  'EGBDAFLJ','EGBDAFJK','EGBDAFLI','EGBDAFIK','EGBDAFIJ','HGBDAFLE','HGBDAFEK','HGBDAFEJ',
  'HGBDAFEI','IJBCAHLK','IJBCAGLK','HJBCAGLK','IGBCAHLK','HJBCAGLI','HJBCAGIK','IJBCAFLK',
  'HJBCAFLK','HIBCAFLK','HJBCAFLI','HJBCAFIK','CJBFAGLK','IGBCAFLK','CJBFAGLI','CJBFAGIK',
  'HGBCAFLK','HGBCAFLJ','HGBCAFJK','HGBCAFLI','HGBCAFIK','HGBCAFIJ','EJBAICLK','EJBCAHLK',
  'EIBCAHLK','EJBCAHLI','EJBCAHIK','EJBCAGLK','EGBAICLK','EJBCAGLI','EJBCAGIK','EGBCAHLK',
  'HJBCAGLE','HJBCAGEK','EGBCAHLI','EGBCAHIK','HJBCAGEI','EJBCAFLK','EIBCAFLK','EJBCAFLI',
  'EJBCAFIK','HEBCAFLK','HJBCAFLE','HJBCAFEK','HEBCAFLI','HEBCAFIK','HJBCAFEI','EGBCAFLK',
  'EGBCAFLJ','EGBCAFJK','EGBCAFLI','EGBCAFIK','EGBCAFIJ','HGBCAFLE','HGBCAFEK','HGBCAFEJ',
  'HGBCAFEI','IJBCADLK','HJBCADLK','HIBCADLK','HJBCADLI','HJBCADIK','CJBDAGLK','IGBCADLK',
  'CJBDAGLI','CJBDAGIK','HGBCADLK','HGBCADLJ','HGBCADJK','HGBCADLI','HGBCADIK','HGBCADIJ',
  'CJBDAFLK','CIBDAFLK','CJBDAFLI','CJBDAFIK','HFBCADLK','CJBDAFLH','HJBCAFDK','HFBCADLI',
  'HFBCADIK','HJBCAFDI','CGBDAFLK','CGBDAFLJ','CGBDAFJK','CGBDAFLI','CGBDAFIK','CGBDAFIJ',
  'CGBDAFLH','HGBCAFDK','HGBCAFDJ','HGBCAFDI','EJBCADLK','EIBCADLK','EJBCADLI','EJBCADIK',
  'HEBCADLK','HJBCADLE','HJBCADEK','HEBCADLI','HEBCADIK','HJBCADEI','EGBCADLK','EGBCADLJ',
  'EGBCADJK','EGBCADLI','EGBCADIK','EGBCADIJ','HGBCADLE','HGBCADEK','HGBCADEJ','HGBCADEI',
  'CEBDAFLK','CJBDAFLE','CJBDAFEK','CEBDAFLI','CEBDAFIK','CJBDAFEI','HFBCADLE','HEBCAFDK',
  'HJBCAFDE','HEBCAFDI','CGBDAFLE','CGBDAFEK','CGBDAFEJ','CGBDAFEI','HGBCAFDE'
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
