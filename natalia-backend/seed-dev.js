// Script para poblar la base de datos de desarrollo con usuarios y predicciones
// Ejecutar: node seed-dev.js

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Configuracion local
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'natalia_dev',
  user: 'postgres',
  password: 'Dinocore51720'
});

// Datos de equipos y estructura
const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const teamsPerGroup = {
  'A': [1, 2, 3, 4],
  'B': [5, 6, 7, 8],
  'C': [9, 10, 11, 12],
  'D': [13, 14, 15, 16],
  'E': [17, 18, 19, 20],
  'F': [21, 22, 23, 24],
  'G': [25, 26, 27, 28],
  'H': [29, 30, 31, 32],
  'I': [33, 34, 35, 36],
  'J': [37, 38, 39, 40],
  'K': [41, 42, 43, 44],
  'L': [45, 46, 47, 48]
};

// Playoffs structure - stores team IDs as strings
const playoffTeams = {
  'UEFA_A': { semi1: [101, 103], semi2: [102, 104] }, // Italia vs NIR, Gales vs Bosnia
  'UEFA_B': { semi1: [107, 106], semi2: [105, 108] }, // Ucrania vs Suecia, Polonia vs Albania
  'UEFA_C': { semi1: [109, 110], semi2: [111, 112] }, // Turquia vs Rumania, Eslovaquia vs Kosovo
  'UEFA_D': { semi1: [113, 115], semi2: [114, 116] }, // Dinamarca vs Macedonia, Rep.Checa vs Irlanda
  'FIFA_1': { semi1: [119, 117], finalA: 118 },       // Nueva Caledonia vs Jamaica, RD Congo espera
  'FIFA_2': { semi1: [120, 122], finalA: 121 }        // Bolivia vs Surinam, Irak espera
};

// Knockout matches structure
const r32Matches = ['M73', 'M74', 'M75', 'M76', 'M77', 'M78', 'M79', 'M80', 'M81', 'M82', 'M83', 'M84', 'M85', 'M86', 'M87', 'M88'];
const r16Matches = ['M89', 'M90', 'M91', 'M92', 'M93', 'M94', 'M95', 'M96'];
const qfMatches = ['M97', 'M98', 'M99', 'M100'];
const sfMatches = ['M101', 'M102'];

// Nombres de prueba
const firstNames = [
  'Carlos', 'Maria', 'Juan', 'Ana', 'Pedro', 'Laura', 'Diego', 'Sofia', 'Miguel', 'Elena',
  'Andres', 'Lucia', 'Fernando', 'Carmen', 'Roberto', 'Isabel', 'Jorge', 'Patricia', 'Luis', 'Rosa',
  'Alberto', 'Marta', 'Ricardo', 'Teresa', 'Pablo', 'Beatriz', 'Sergio', 'Cristina', 'Raul', 'Monica',
  'Daniel', 'Alicia', 'Alejandro', 'Veronica', 'Oscar', 'Natalia', 'Manuel', 'Claudia', 'Javier', 'Andrea',
  'Antonio', 'Sandra', 'Francisco', 'Paula', 'Eduardo', 'Adriana', 'Guillermo', 'Carolina', 'Victor', 'Diana'
];

const lastNames = [
  'Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Hernandez', 'Perez', 'Sanchez', 'Ramirez', 'Torres',
  'Flores', 'Rivera', 'Gomez', 'Diaz', 'Reyes', 'Morales', 'Jimenez', 'Ruiz', 'Alvarez', 'Romero',
  'Castro', 'Ortiz', 'Rubio', 'Molina', 'Serrano', 'Blanco', 'Suarez', 'Iglesias', 'Medina', 'Vega'
];

const countries = ['ar', 'mx', 'es', 'co', 'cl', 'pe', 'uy', 've', 'ec', 'pa', 'cr', 'gt', 'us', 'br', 'py'];

const predictionNames = [
  'Mi prediccion', 'Prediccion optimista', 'Apuesta segura', 'El favorito gana',
  'Sorpresas 2026', 'Mi corazon dice', 'Prediccion logica', 'Instinto puro',
  'La buena', 'Analisis completo', 'Apuesta arriesgada', 'Conservadora'
];

// Funciones auxiliares
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateUsername(firstName, lastName, index) {
  const num = Math.floor(Math.random() * 1000);
  return `${firstName.toLowerCase()}${lastName.toLowerCase().substring(0, 3)}${num}`;
}

function generateEmail(firstName, lastName, index) {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@test.com`;
}

// Generar predicciones de grupos (shuffle del orden)
function generateGroupPredictions(setId, userId) {
  const predictions = [];
  for (const group of groups) {
    const teamIds = shuffle(teamsPerGroup[group]);
    teamIds.forEach((teamId, position) => {
      predictions.push({
        user_id: userId,
        prediction_set_id: setId,
        group_letter: group,
        team_id: teamId,
        predicted_position: position + 1
      });
    });
  }
  return predictions;
}

// Generar predicciones de playoffs
// Estructura de tabla: playoff_id, semifinal_winner_1, semifinal_winner_2, final_winner (all varchar)
function generatePlayoffPredictions(setId, userId) {
  const predictions = [];

  for (const [playoffId, structure] of Object.entries(playoffTeams)) {
    const semi1Winner = pickRandom(structure.semi1);
    let semi2Winner = null;
    let finalWinner;

    if (structure.semi2) {
      // UEFA style: 2 semis -> final
      semi2Winner = pickRandom(structure.semi2);
      finalWinner = pickRandom([semi1Winner, semi2Winner]);
    } else {
      // FIFA style: 1 semi + seeded team -> final
      finalWinner = pickRandom([semi1Winner, structure.finalA]);
    }

    predictions.push({
      user_id: userId,
      prediction_set_id: setId,
      playoff_id: playoffId,
      semifinal_winner_1: String(semi1Winner),
      semifinal_winner_2: semi2Winner ? String(semi2Winner) : null,
      final_winner: String(finalWinner)
    });
  }
  return predictions;
}

// Generar prediccion de terceros (8 grupos aleatorios)
// Tabla solo tiene: selected_groups (varchar 50)
function generateThirdPlacePrediction(setId, userId) {
  const shuffled = shuffle(groups);
  const selected = shuffled.slice(0, 8).sort().join('');
  return {
    user_id: userId,
    prediction_set_id: setId,
    selected_groups: selected
  };
}

// Generar predicciones de knockout
function generateKnockoutPredictions(setId, userId, groupPredictions) {
  const predictions = [];

  // Obtener los clasificados de cada grupo
  const getTeamByGroupPosition = (group, pos) => {
    const pred = groupPredictions.find(p => p.group_letter === group && p.predicted_position === pos);
    return pred ? pred.team_id : 1;
  };

  // Pool de equipos clasificados
  const allTeams = [];
  for (const group of groups) {
    allTeams.push(getTeamByGroupPosition(group, 1));
    allTeams.push(getTeamByGroupPosition(group, 2));
  }

  // Generar ganadores para R32
  const r32Winners = {};
  for (const match of r32Matches) {
    const winner = pickRandom(allTeams);
    r32Winners[match] = winner;
    predictions.push({
      user_id: userId,
      prediction_set_id: setId,
      match_key: match,
      winner_team_id: winner
    });
  }

  // R16
  const r16Winners = {};
  const r16Sources = [
    ['M74', 'M77'], ['M73', 'M75'], ['M76', 'M78'], ['M79', 'M80'],
    ['M83', 'M84'], ['M81', 'M82'], ['M86', 'M88'], ['M85', 'M87']
  ];
  for (let i = 0; i < r16Matches.length; i++) {
    const match = r16Matches[i];
    const sources = r16Sources[i];
    const options = sources.map(s => r32Winners[s]);
    const winner = pickRandom(options);
    r16Winners[match] = winner;
    predictions.push({
      user_id: userId,
      prediction_set_id: setId,
      match_key: match,
      winner_team_id: winner
    });
  }

  // QF
  const qfWinners = {};
  const qfSources = [['M89', 'M90'], ['M93', 'M94'], ['M91', 'M92'], ['M95', 'M96']];
  for (let i = 0; i < qfMatches.length; i++) {
    const match = qfMatches[i];
    const sources = qfSources[i];
    const options = sources.map(s => r16Winners[s]);
    const winner = pickRandom(options);
    qfWinners[match] = winner;
    predictions.push({
      user_id: userId,
      prediction_set_id: setId,
      match_key: match,
      winner_team_id: winner
    });
  }

  // SF
  const sfWinners = {};
  const sfLosers = {};
  const sfSources = [['M97', 'M98'], ['M99', 'M100']];
  for (let i = 0; i < sfMatches.length; i++) {
    const match = sfMatches[i];
    const sources = sfSources[i];
    const options = sources.map(s => qfWinners[s]);
    const winner = pickRandom(options);
    const loser = options.find(t => t !== winner);
    sfWinners[match] = winner;
    sfLosers[match] = loser;
    predictions.push({
      user_id: userId,
      prediction_set_id: setId,
      match_key: match,
      winner_team_id: winner
    });
  }

  // 3rd place (M103)
  const thirdPlaceOptions = [sfLosers['M101'], sfLosers['M102']].filter(Boolean);
  if (thirdPlaceOptions.length > 0) {
    predictions.push({
      user_id: userId,
      prediction_set_id: setId,
      match_key: 'M103',
      winner_team_id: pickRandom(thirdPlaceOptions)
    });
  }

  // Final (M104)
  const finalists = [sfWinners['M101'], sfWinners['M102']];
  predictions.push({
    user_id: userId,
    prediction_set_id: setId,
    match_key: 'M104',
    winner_team_id: pickRandom(finalists)
  });

  return predictions;
}

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Iniciando seed de datos de prueba...\n');

    // Limpiar datos anteriores de prueba (usuarios que no son el admin)
    console.log('Limpiando datos anteriores...');
    await client.query(`
      DELETE FROM knockout_predictions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com');
      DELETE FROM third_place_predictions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com');
      DELETE FROM group_predictions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com');
      DELETE FROM playoff_predictions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com');
      DELETE FROM prediction_sets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com');
      DELETE FROM private_group_members WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com');
      DELETE FROM users WHERE email LIKE '%@test.com';
    `);

    const passwordHash = await bcrypt.hash('test123', 10);
    const createdUsers = [];

    // Crear 130 usuarios (para tener 250+ predicciones completas)
    console.log('Creando usuarios...');
    for (let i = 0; i < 130; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const username = generateUsername(firstName, lastName, i);
      const email = generateEmail(firstName, lastName, i);
      const country = pickRandom(countries);
      const birthYear = 1970 + Math.floor(Math.random() * 35);
      const birthDate = `${birthYear}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;

      const result = await client.query(
        `INSERT INTO users (name, email, password, username, country, birth_date)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [`${firstName} ${lastName}`, email, passwordHash, username, country, birthDate]
      );

      createdUsers.push({ id: result.rows[0].id, name: `${firstName} ${lastName}` });
      process.stdout.write(`\rUsuarios creados: ${i + 1}/130`);
    }
    console.log('\n');

    // Crear predicciones para cada usuario
    console.log('Creando predicciones...');
    let totalSets = 0;
    let completedSets = 0;

    for (const user of createdUsers) {
      // Cada usuario tiene 1-3 prediction sets
      const numSets = Math.floor(Math.random() * 3) + 1;

      for (let s = 0; s < numSets; s++) {
        const mode = Math.random() > 0.5 ? 'positions' : 'scores';
        const setName = `${pickRandom(predictionNames)} ${s + 1}`;

        // Crear prediction set
        const setResult = await client.query(
          `INSERT INTO prediction_sets (user_id, name, mode) VALUES ($1, $2, $3) RETURNING id`,
          [user.id, setName, mode]
        );
        const setId = setResult.rows[0].id;
        totalSets++;

        // 95% de probabilidad de completar la prediccion (para testing de paginacion)
        const shouldComplete = Math.random() > 0.05;

        // Playoffs
        const playoffPreds = generatePlayoffPredictions(setId, user.id);
        for (const pred of playoffPreds) {
          await client.query(
            `INSERT INTO playoff_predictions (user_id, prediction_set_id, playoff_id, semifinal_winner_1, semifinal_winner_2, final_winner)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [pred.user_id, pred.prediction_set_id, pred.playoff_id, pred.semifinal_winner_1, pred.semifinal_winner_2, pred.final_winner]
          );
        }

        // Groups
        const groupPreds = generateGroupPredictions(setId, user.id);
        for (const pred of groupPreds) {
          await client.query(
            `INSERT INTO group_predictions (user_id, prediction_set_id, group_letter, team_id, predicted_position)
             VALUES ($1, $2, $3, $4, $5)`,
            [pred.user_id, pred.prediction_set_id, pred.group_letter, pred.team_id, pred.predicted_position]
          );
        }

        // Third places
        const thirdPred = generateThirdPlacePrediction(setId, user.id);
        await client.query(
          `INSERT INTO third_place_predictions (user_id, prediction_set_id, selected_groups)
           VALUES ($1, $2, $3)`,
          [thirdPred.user_id, thirdPred.prediction_set_id, thirdPred.selected_groups]
        );

        // Knockout (solo si debe completar)
        if (shouldComplete) {
          const knockoutPreds = generateKnockoutPredictions(setId, user.id, groupPreds);
          for (const pred of knockoutPreds) {
            await client.query(
              `INSERT INTO knockout_predictions (user_id, prediction_set_id, match_key, winner_team_id)
               VALUES ($1, $2, $3, $4)`,
              [pred.user_id, pred.prediction_set_id, pred.match_key, pred.winner_team_id]
            );
          }
          completedSets++;
        }
      }

      process.stdout.write(`\rPredicciones creadas: ${totalSets} sets (${completedSets} completos)`);
    }
    console.log('\n');

    // Crear algunos grupos privados de prueba
    console.log('Creando grupos privados...');
    const groupNames = ['Familia Garcia', 'Amigos del Trabajo', 'Futboleros Unidos', 'La Quiniela', 'Los Expertos'];

    for (let i = 0; i < groupNames.length; i++) {
      const owner = createdUsers[i * 5]; // Diferentes owners
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const groupResult = await client.query(
        `INSERT INTO private_groups (name, code, owner_id) VALUES ($1, $2, $3) RETURNING id`,
        [groupNames[i], code, owner.id]
      );
      const groupId = groupResult.rows[0].id;

      // Agregar owner como miembro
      await client.query(
        `INSERT INTO private_group_members (group_id, user_id) VALUES ($1, $2)`,
        [groupId, owner.id]
      );

      // Agregar 4-8 miembros adicionales aleatorios
      const numMembers = Math.floor(Math.random() * 5) + 4;
      const shuffledUsers = shuffle(createdUsers.filter(u => u.id !== owner.id));

      for (let j = 0; j < Math.min(numMembers, shuffledUsers.length); j++) {
        await client.query(
          `INSERT INTO private_group_members (group_id, user_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [groupId, shuffledUsers[j].id]
        );
      }

      console.log(`  - ${groupNames[i]} (codigo: ${code})`);
    }

    console.log('\n=== Seed completado ===');
    console.log(`Usuarios creados: ${createdUsers.length}`);
    console.log(`Prediction sets: ${totalSets} (${completedSets} completos)`);
    console.log(`Grupos privados: ${groupNames.length}`);
    console.log('\nTodos los usuarios de prueba tienen password: test123');

  } catch (err) {
    console.error('Error durante seed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
