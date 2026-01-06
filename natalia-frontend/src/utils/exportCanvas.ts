import { getAllGroups } from '@/data/mockData';
import {
  roundOf32Structure,
  roundOf16Structure,
  quarterFinalsStructure,
  semiFinalsStructure,
  thirdPlaceMatch,
  finalMatch,
} from '@/data/knockoutBracket';
import type { PlayoffWinnerTeam } from '@/utils/predictionHelpers';

// Colors
const colors = {
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray900: '#111827',
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  sky500: '#0ea5e9',
  green50: '#f0fdf4',
  green100: '#dcfce7',
  green200: '#bbf7d0',
  yellow50: '#fefce8',
  yellow100: '#fef9c3',
  yellow400: '#facc15',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  amber400: '#fbbf24',
};

// Modern font stack
const fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

interface ExportData {
  predictionName: string;
  username?: string;
  predictions: Record<string, number[]>;
  knockoutPredictions: Record<string, number>;
  bestThirdPlaces: string[];
  getTeamById: (teamId: number | string | null | undefined) => PlayoffWinnerTeam | null;
}

// Load image with promise
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Pre-load all flag images
const preloadFlags = async (
  predictions: Record<string, number[]>,
  knockoutPredictions: Record<string, number>,
  getTeamById: (id: number | string | null | undefined) => PlayoffWinnerTeam | null
): Promise<Map<number, HTMLImageElement>> => {
  const flagMap = new Map<number, HTMLImageElement>();
  const teamIds = new Set<number>();

  Object.values(predictions).forEach(teams => {
    teams.forEach(id => teamIds.add(id));
  });
  Object.values(knockoutPredictions).forEach(id => teamIds.add(id));

  const loadPromises: Promise<void>[] = [];
  teamIds.forEach(id => {
    const team = getTeamById(id);
    if (team?.flag_url) {
      loadPromises.push(
        loadImage(team.flag_url)
          .then(img => { flagMap.set(id, img); })
          .catch(() => { /* ignore failed loads */ })
      );
    }
  });

  await Promise.all(loadPromises);
  return flagMap;
};

// Helper to draw rounded rectangle
const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

export const exportToCanvas = async (data: ExportData): Promise<string> => {
  const { predictionName, username, predictions, knockoutPredictions, bestThirdPlaces, getTeamById } = data;

  const groups = getAllGroups();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // 3x scale for better quality
  const scale = 3;

  // Dimensions
  const matchBoxW = 58;
  const colGap = 8;
  const colSpacing = matchBoxW + colGap;
  const bracketWidth = 2 * matchBoxW + 7 * colSpacing + colGap;
  const sidePadding = 14;
  const width = bracketWidth + 2 * sidePadding;

  const headerHeight = 54;
  const groupHeight = 72;
  const groupGap = 4;
  const groupsHeight = 2 * groupHeight + groupGap;
  const groupToBracketGap = 12;
  const matchBoxH = 28;
  const r32Gap = 4;
  const bracketContentHeight = 8 * matchBoxH + 7 * r32Gap;
  const thirdPlaceMatchHeight = 45;
  const podiumHeight = 60;
  const footerHeight = 18;
  const height = headerHeight + groupsHeight + groupToBracketGap + bracketContentHeight + thirdPlaceMatchHeight + podiumHeight + footerHeight;

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);

  // Pre-load flags
  const flagMap = await preloadFlags(predictions, knockoutPredictions, getTeamById);
  const getFlag = (teamId: number | undefined): HTMLImageElement | null => {
    if (!teamId) return null;
    return flagMap.get(teamId) || null;
  };

  // === GRADIENT BACKGROUND ===
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#f8fafc');
  gradient.addColorStop(1, '#f1f5f9');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // === HEADER ===
  ctx.textBaseline = 'middle';
  const logoY = 28;

  // Logo "Mundalia"
  ctx.font = `bold 24px ${fontFamily}`;
  ctx.fillStyle = colors.blue600;
  ctx.fillText('Mund', 16, logoY);
  const mundWidth = ctx.measureText('Mund').width;
  ctx.fillStyle = colors.sky500;
  ctx.fillText('alia', 16 + mundWidth, logoY);
  const aliaWidth = ctx.measureText('alia').width;

  // Separator
  ctx.fillStyle = colors.gray300;
  ctx.font = `300 18px ${fontFamily}`;
  ctx.fillText('|', 16 + mundWidth + aliaWidth + 12, logoY);

  // Prediction name
  ctx.fillStyle = colors.gray900;
  ctx.font = `600 14px ${fontFamily}`;
  ctx.fillText(predictionName, 16 + mundWidth + aliaWidth + 28, logoY);

  // Username
  if (username) {
    const nameWidth = ctx.measureText(predictionName).width;
    ctx.fillStyle = colors.gray500;
    ctx.font = `400 12px ${fontFamily}`;
    ctx.fillText(`@${username}`, 16 + mundWidth + aliaWidth + 36 + nameWidth, logoY);
  }

  // Header line with gradient
  const lineGradient = ctx.createLinearGradient(16, 0, width - 16, 0);
  lineGradient.addColorStop(0, colors.blue500);
  lineGradient.addColorStop(1, colors.sky500);
  ctx.strokeStyle = lineGradient;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, 48);
  ctx.lineTo(width - 16, 48);
  ctx.stroke();

  // === GROUPS ===
  const groupStartY = headerHeight;
  const groupWidth = 60;
  const groupsPerRow = 6;
  const totalGroupsWidth = groupsPerRow * groupWidth + (groupsPerRow - 1) * groupGap;
  const groupStartX = (width - totalGroupsWidth) / 2;
  const groupHeaderH = 14;
  const groupRadius = 4;

  groups.forEach((group, groupIndex) => {
    const row = Math.floor(groupIndex / groupsPerRow);
    const col = groupIndex % groupsPerRow;
    const x = groupStartX + col * (groupWidth + groupGap);
    const y = groupStartY + row * (groupHeight + groupGap);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    roundRect(ctx, x + 1, y + 1, groupWidth, groupHeight, groupRadius);
    ctx.fill();

    // Group background
    ctx.fillStyle = colors.white;
    roundRect(ctx, x, y, groupWidth, groupHeight, groupRadius);
    ctx.fill();
    ctx.strokeStyle = colors.gray200;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Group header background
    ctx.fillStyle = colors.blue50;
    ctx.beginPath();
    ctx.moveTo(x + groupRadius, y);
    ctx.lineTo(x + groupWidth - groupRadius, y);
    ctx.quadraticCurveTo(x + groupWidth, y, x + groupWidth, y + groupRadius);
    ctx.lineTo(x + groupWidth, y + groupHeaderH);
    ctx.lineTo(x, y + groupHeaderH);
    ctx.lineTo(x, y + groupRadius);
    ctx.quadraticCurveTo(x, y, x + groupRadius, y);
    ctx.closePath();
    ctx.fill();

    // Header border
    ctx.strokeStyle = colors.blue100;
    ctx.beginPath();
    ctx.moveTo(x, y + groupHeaderH);
    ctx.lineTo(x + groupWidth, y + groupHeaderH);
    ctx.stroke();

    // Group label
    ctx.fillStyle = colors.blue600;
    ctx.font = `600 8px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Grupo ${group}`, x + groupWidth / 2, y + groupHeaderH / 2);
    ctx.textAlign = 'left';

    // Teams
    const teamIds = predictions[group] || [];
    const rowHeight = 14;
    const teamsStartY = y + groupHeaderH + 2;

    teamIds.forEach((teamId, index) => {
      const team = getTeamById(teamId);
      if (!team) return;

      const rowY = teamsStartY + index * rowHeight;
      const rowCenterY = rowY + rowHeight / 2;
      const qualifies = index < 2;
      const isThird = index === 2 && bestThirdPlaces.includes(group);

      // Team row background
      if (qualifies) {
        ctx.fillStyle = colors.green50;
        ctx.fillRect(x + 2, rowY, groupWidth - 4, rowHeight);
      } else if (isThird) {
        ctx.fillStyle = colors.yellow50;
        ctx.fillRect(x + 2, rowY, groupWidth - 4, rowHeight);
      }

      // Position number
      ctx.fillStyle = colors.gray400;
      ctx.font = `500 7px ${fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(`${index + 1}`, x + 5, rowCenterY);

      // Flag
      const flag = getFlag(teamId);
      const flagH = 8;
      if (flag) {
        ctx.drawImage(flag, x + 13, rowCenterY - flagH / 2, 12, flagH);
      }

      // Team code
      ctx.fillStyle = colors.gray900;
      ctx.font = `500 8px ${fontFamily}`;
      ctx.fillText(team.code, x + 28, rowCenterY);
      ctx.textBaseline = 'alphabetic';
    });
  });

  // === BRACKET ===
  const bracketY = groupStartY + groupsHeight + groupToBracketGap;
  const matchRadius = 3;

  const matchPositions: Record<string, { x: number; y: number; side: 'left' | 'right' | 'center' }> = {};

  // Draw match box with rounded corners and shadow
  const drawMatchBox = (
    x: number,
    y: number,
    teamA: PlayoffWinnerTeam | null,
    teamB: PlayoffWinnerTeam | null,
    winnerId: number | null,
    matchId?: string,
    side: 'left' | 'right' | 'center' = 'left'
  ) => {
    if (matchId) {
      matchPositions[matchId] = { x, y, side };
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    roundRect(ctx, x + 0.5, y + 0.5, matchBoxW, matchBoxH, matchRadius);
    ctx.fill();

    // Box background
    ctx.fillStyle = colors.white;
    roundRect(ctx, x, y, matchBoxW, matchBoxH, matchRadius);
    ctx.fill();
    ctx.strokeStyle = colors.gray300;
    ctx.lineWidth = 1;
    ctx.stroke();

    const halfH = matchBoxH / 2;
    const teamACenterY = y + halfH / 2;
    const teamBCenterY = y + halfH + halfH / 2;

    // Team A background if winner
    const isAWinner = teamA && winnerId === teamA.id;
    if (isAWinner) {
      ctx.fillStyle = colors.green100;
      // Top half with rounded top corners
      ctx.beginPath();
      ctx.moveTo(x + matchRadius, y + 1);
      ctx.lineTo(x + matchBoxW - matchRadius, y + 1);
      ctx.quadraticCurveTo(x + matchBoxW - 1, y + 1, x + matchBoxW - 1, y + matchRadius);
      ctx.lineTo(x + matchBoxW - 1, y + halfH);
      ctx.lineTo(x + 1, y + halfH);
      ctx.lineTo(x + 1, y + matchRadius);
      ctx.quadraticCurveTo(x + 1, y + 1, x + matchRadius, y + 1);
      ctx.closePath();
      ctx.fill();
    }

    if (teamA) {
      const flagA = getFlag(teamA.id);
      const flagW = 12;
      const flagH = 8;
      if (flagA) ctx.drawImage(flagA, x + 3, teamACenterY - flagH / 2, flagW, flagH);
      ctx.fillStyle = colors.gray900;
      ctx.font = isAWinner ? `600 8px ${fontFamily}` : `400 8px ${fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(teamA.code, x + 28, teamACenterY);
    }

    // Divider line
    ctx.strokeStyle = colors.gray200;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + halfH);
    ctx.lineTo(x + matchBoxW - 2, y + halfH);
    ctx.stroke();

    // Team B background if winner
    const isBWinner = teamB && winnerId === teamB.id;
    if (isBWinner) {
      ctx.fillStyle = colors.green100;
      // Bottom half with rounded bottom corners
      ctx.beginPath();
      ctx.moveTo(x + 1, y + halfH);
      ctx.lineTo(x + matchBoxW - 1, y + halfH);
      ctx.lineTo(x + matchBoxW - 1, y + matchBoxH - matchRadius);
      ctx.quadraticCurveTo(x + matchBoxW - 1, y + matchBoxH - 1, x + matchBoxW - matchRadius, y + matchBoxH - 1);
      ctx.lineTo(x + matchRadius, y + matchBoxH - 1);
      ctx.quadraticCurveTo(x + 1, y + matchBoxH - 1, x + 1, y + matchBoxH - matchRadius);
      ctx.closePath();
      ctx.fill();
    }

    if (teamB) {
      const flagB = getFlag(teamB.id);
      const flagW = 12;
      const flagH = 8;
      if (flagB) ctx.drawImage(flagB, x + 3, teamBCenterY - flagH / 2, flagW, flagH);
      ctx.fillStyle = colors.gray900;
      ctx.font = isBWinner ? `600 8px ${fontFamily}` : `400 8px ${fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(teamB.code, x + 28, teamBCenterY);
    }

    ctx.textBaseline = 'alphabetic';
  };

  // Draw bracket lines
  const drawBracketLine = (fromMatch1: string, fromMatch2: string, toMatch: string) => {
    const from1 = matchPositions[fromMatch1];
    const from2 = matchPositions[fromMatch2];
    const to = matchPositions[toMatch];
    if (!from1 || !from2 || !to) return;

    ctx.strokeStyle = colors.gray300;
    ctx.lineWidth = 1;

    const startX1 = from1.side === 'left' ? from1.x + matchBoxW : from1.x;
    const startY1 = from1.y + matchBoxH / 2;
    const startX2 = from2.side === 'left' ? from2.x + matchBoxW : from2.x;
    const startY2 = from2.y + matchBoxH / 2;
    const endX = from1.side === 'left' ? to.x : to.x + matchBoxW;
    const endY = to.y + matchBoxH / 2;
    const midX = (startX1 + endX) / 2;

    ctx.beginPath();
    ctx.moveTo(startX1, startY1);
    ctx.lineTo(midX, startY1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX2, startY2);
    ctx.lineTo(midX, startY2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(midX, startY1);
    ctx.lineTo(midX, startY2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(midX, endY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  };

  // Team resolution helpers
  const getR32Teams = (match: typeof roundOf32Structure[0]) => {
    const resolveTeam = (source: any): PlayoffWinnerTeam | null => {
      if (!source) return null;
      if (source.type === 'winner' && source.group) {
        const groupPreds = predictions[source.group];
        return groupPreds?.[0] ? getTeamById(groupPreds[0]) : null;
      }
      if (source.type === 'runner_up' && source.group) {
        const groupPreds = predictions[source.group];
        return groupPreds?.[1] ? getTeamById(groupPreds[1]) : null;
      }
      if (source.type === 'third_place' && source.pools) {
        const matchedGroup = bestThirdPlaces.find(g => source.pools.includes(g));
        if (!matchedGroup) return null;
        const groupPreds = predictions[matchedGroup];
        return groupPreds?.[2] ? getTeamById(groupPreds[2]) : null;
      }
      return null;
    };
    return { teamA: resolveTeam(match.teamA), teamB: resolveTeam(match.teamB) };
  };

  const getWinner = (matchId: string): PlayoffWinnerTeam | null => {
    const winnerId = knockoutPredictions[matchId];
    return winnerId ? getTeamById(winnerId) : null;
  };

  // Bracket layout
  const r32Left = roundOf32Structure.slice(0, 8);
  const r32Right = roundOf32Structure.slice(8, 16);
  const r16Left = roundOf16Structure.slice(0, 4);
  const r16Right = roundOf16Structure.slice(4, 8);
  const qfLeft = quarterFinalsStructure.slice(0, 2);
  const qfRight = quarterFinalsStructure.slice(2, 4);

  const bracketStartY = bracketY;
  const centerX = width / 2;
  const colFinal = centerX - matchBoxW / 2;
  const colSFL = colFinal - colSpacing;
  const colQFL = colSFL - colSpacing;
  const colR16L = colQFL - colSpacing;
  const colR32L = colR16L - colSpacing;
  const colSFR = colFinal + matchBoxW + colGap;
  const colQFR = colSFR + colSpacing;
  const colR16R = colQFR + colSpacing;
  const colR32R = colR16R + colSpacing;

  const getR32Y = (i: number) => bracketStartY + i * (matchBoxH + r32Gap);
  const getCenteredY = (y1: number, y2: number) => (y1 + y2) / 2;

  const r32LeftY: number[] = [];
  const r32RightY: number[] = [];

  // Draw R32 Left
  r32Left.forEach((match, i) => {
    const { teamA, teamB } = getR32Teams(match);
    const y = getR32Y(i);
    r32LeftY.push(y);
    drawMatchBox(colR32L, y, teamA, teamB, knockoutPredictions[match.matchId] || null, match.matchId, 'left');
  });

  // Draw R16 Left
  const r16LeftY: number[] = [];
  r16Left.forEach((match, i) => {
    const teamA = getWinner(r32Left[i * 2]?.matchId);
    const teamB = getWinner(r32Left[i * 2 + 1]?.matchId);
    const y = getCenteredY(r32LeftY[i * 2], r32LeftY[i * 2 + 1]);
    r16LeftY.push(y);
    drawMatchBox(colR16L, y, teamA, teamB, knockoutPredictions[match.matchId] || null, match.matchId, 'left');
  });

  // Draw QF Left
  const qfLeftY: number[] = [];
  qfLeft.forEach((match, i) => {
    const teamA = getWinner(r16Left[i * 2]?.matchId);
    const teamB = getWinner(r16Left[i * 2 + 1]?.matchId);
    const y = getCenteredY(r16LeftY[i * 2], r16LeftY[i * 2 + 1]);
    qfLeftY.push(y);
    drawMatchBox(colQFL, y, teamA, teamB, knockoutPredictions[match.matchId] || null, match.matchId, 'left');
  });

  // Draw SF Left
  const sfLeftMatch = semiFinalsStructure[0];
  const sfLeftY = getCenteredY(qfLeftY[0], qfLeftY[1]);
  drawMatchBox(colSFL, sfLeftY, getWinner(qfLeft[0]?.matchId), getWinner(qfLeft[1]?.matchId), knockoutPredictions[sfLeftMatch.matchId] || null, sfLeftMatch.matchId, 'left');

  // Draw R32 Right
  r32Right.forEach((match, i) => {
    const { teamA, teamB } = getR32Teams(match);
    const y = getR32Y(i);
    r32RightY.push(y);
    drawMatchBox(colR32R, y, teamA, teamB, knockoutPredictions[match.matchId] || null, match.matchId, 'right');
  });

  // Draw R16 Right
  const r16RightY: number[] = [];
  r16Right.forEach((match, i) => {
    const teamA = getWinner(r32Right[i * 2]?.matchId);
    const teamB = getWinner(r32Right[i * 2 + 1]?.matchId);
    const y = getCenteredY(r32RightY[i * 2], r32RightY[i * 2 + 1]);
    r16RightY.push(y);
    drawMatchBox(colR16R, y, teamA, teamB, knockoutPredictions[match.matchId] || null, match.matchId, 'right');
  });

  // Draw QF Right
  const qfRightY: number[] = [];
  qfRight.forEach((match, i) => {
    const teamA = getWinner(r16Right[i * 2]?.matchId);
    const teamB = getWinner(r16Right[i * 2 + 1]?.matchId);
    const y = getCenteredY(r16RightY[i * 2], r16RightY[i * 2 + 1]);
    qfRightY.push(y);
    drawMatchBox(colQFR, y, teamA, teamB, knockoutPredictions[match.matchId] || null, match.matchId, 'right');
  });

  // Draw SF Right
  const sfRightMatch = semiFinalsStructure[1];
  const sfRightY = getCenteredY(qfRightY[0], qfRightY[1]);
  drawMatchBox(colSFR, sfRightY, getWinner(qfRight[0]?.matchId), getWinner(qfRight[1]?.matchId), knockoutPredictions[sfRightMatch.matchId] || null, sfRightMatch.matchId, 'right');

  // Draw bracket lines
  for (let i = 0; i < 4; i++) {
    drawBracketLine(r32Left[i * 2].matchId, r32Left[i * 2 + 1].matchId, r16Left[i].matchId);
    drawBracketLine(r32Right[i * 2].matchId, r32Right[i * 2 + 1].matchId, r16Right[i].matchId);
  }
  for (let i = 0; i < 2; i++) {
    drawBracketLine(r16Left[i * 2].matchId, r16Left[i * 2 + 1].matchId, qfLeft[i].matchId);
    drawBracketLine(r16Right[i * 2].matchId, r16Right[i * 2 + 1].matchId, qfRight[i].matchId);
  }
  drawBracketLine(qfLeft[0].matchId, qfLeft[1].matchId, sfLeftMatch.matchId);
  drawBracketLine(qfRight[0].matchId, qfRight[1].matchId, sfRightMatch.matchId);

  // === FINAL ===
  const finalY = getCenteredY(sfLeftY, sfRightY);
  const finalistA = getWinner(sfLeftMatch.matchId);
  const finalistB = getWinner(sfRightMatch.matchId);
  const championId = knockoutPredictions[finalMatch.matchId];
  const champion = championId ? getTeamById(championId) : null;

  // Final box with golden border
  const finalBoxPadding = 5;
  ctx.fillStyle = colors.amber100;
  roundRect(ctx, colFinal - finalBoxPadding, finalY - 12, matchBoxW + finalBoxPadding * 2, matchBoxH + 16, 5);
  ctx.fill();
  ctx.strokeStyle = colors.amber400;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Final label
  ctx.fillStyle = colors.gray600;
  ctx.font = `600 7px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FINAL', centerX, finalY - 5);

  drawMatchBox(colFinal, finalY, finalistA, finalistB, championId || null, finalMatch.matchId, 'center');

  // SF to Final lines
  ctx.strokeStyle = colors.gray300;
  ctx.lineWidth = 1;
  const sfLPos = matchPositions[sfLeftMatch.matchId];
  if (sfLPos) {
    ctx.beginPath();
    ctx.moveTo(sfLPos.x + matchBoxW, sfLPos.y + matchBoxH / 2);
    ctx.lineTo(colFinal - finalBoxPadding, finalY + matchBoxH / 2);
    ctx.stroke();
  }
  const sfRPos = matchPositions[sfRightMatch.matchId];
  if (sfRPos) {
    ctx.beginPath();
    ctx.moveTo(sfRPos.x, sfRPos.y + matchBoxH / 2);
    ctx.lineTo(colFinal + matchBoxW + finalBoxPadding, finalY + matchBoxH / 2);
    ctx.stroke();
  }

  // === THIRD PLACE MATCH ===
  // Position below the final match box (finalY + matchBoxH + final box padding + gap)
  const thirdPlaceMatchY = finalY + matchBoxH + 12;

  // Get SF losers for third place match
  // SF teams are QF winners, loser is whichever QF winner didn't win the SF
  const qfLeftWinner0 = getWinner(qfLeft[0]?.matchId);
  const qfLeftWinner1 = getWinner(qfLeft[1]?.matchId);
  const qfRightWinner0 = getWinner(qfRight[0]?.matchId);
  const qfRightWinner1 = getWinner(qfRight[1]?.matchId);

  // The SF loser is the team that played in SF but didn't win (isn't the finalist)
  const thirdPlaceTeamA = finalistA?.id === qfLeftWinner0?.id ? qfLeftWinner1 : qfLeftWinner0;
  const thirdPlaceTeamB = finalistB?.id === qfRightWinner0?.id ? qfRightWinner1 : qfRightWinner0;

  const thirdPlaceWinnerId = knockoutPredictions[thirdPlaceMatch.matchId];
  const thirdPlaceWinner = thirdPlaceWinnerId ? getTeamById(thirdPlaceWinnerId) : null;

  // Third place match label
  ctx.fillStyle = colors.gray500;
  ctx.font = `600 7px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('3er Lugar', centerX, thirdPlaceMatchY);

  // Draw third place match box
  drawMatchBox(colFinal, thirdPlaceMatchY + 8, thirdPlaceTeamA, thirdPlaceTeamB, thirdPlaceWinnerId || null, thirdPlaceMatch.matchId, 'center');

  // === PODIUM (Champion, Runner-up & Third Place) ===
  const podiumY = bracketY + bracketContentHeight + thirdPlaceMatchHeight + 5;
  const podiumBoxW = 55;
  const podiumBoxH = 45;
  const podiumGap = 12;

  // Determine runner-up (finalist who didn't win)
  const runnerUp = champion && finalistA && finalistB
    ? (champion.id === finalistA.id ? finalistB : finalistA)
    : null;

  // Champion box (center)
  if (champion) {
    const champBoxX = centerX - podiumBoxW / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    roundRect(ctx, champBoxX + 1, podiumY + 1, podiumBoxW, podiumBoxH, 6);
    ctx.fill();

    // Background gradient
    const champGradient = ctx.createLinearGradient(champBoxX, podiumY, champBoxX, podiumY + podiumBoxH);
    champGradient.addColorStop(0, colors.amber100);
    champGradient.addColorStop(1, colors.amber200);
    ctx.fillStyle = champGradient;
    roundRect(ctx, champBoxX, podiumY, podiumBoxW, podiumBoxH, 6);
    ctx.fill();
    ctx.strokeStyle = colors.amber400;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Trophy
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆', centerX, podiumY + 10);

    // Flag
    const champFlag = getFlag(champion.id);
    if (champFlag) {
      ctx.drawImage(champFlag, centerX - 9, podiumY + 18, 18, 12);
    }

    // Name
    ctx.fillStyle = colors.gray900;
    ctx.font = `600 8px ${fontFamily}`;
    ctx.fillText(champion.name, centerX, podiumY + 38);
  }

  // Runner-up box (left of champion)
  if (runnerUp) {
    const runnerBoxX = centerX - podiumBoxW / 2 - podiumGap - podiumBoxW;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    roundRect(ctx, runnerBoxX + 1, podiumY + 1, podiumBoxW, podiumBoxH, 5);
    ctx.fill();

    // Background
    ctx.fillStyle = colors.gray100;
    roundRect(ctx, runnerBoxX, podiumY, podiumBoxW, podiumBoxH, 5);
    ctx.fill();
    ctx.strokeStyle = colors.gray300;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Medal
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🥈', runnerBoxX + podiumBoxW / 2, podiumY + 10);

    // Flag
    const runnerFlag = getFlag(runnerUp.id);
    if (runnerFlag) {
      ctx.drawImage(runnerFlag, runnerBoxX + podiumBoxW / 2 - 8, podiumY + 18, 16, 10);
    }

    // Name
    ctx.fillStyle = colors.gray600;
    ctx.font = `600 7px ${fontFamily}`;
    ctx.fillText(runnerUp.name, runnerBoxX + podiumBoxW / 2, podiumY + 38);
  }

  // Third place box (right of champion)
  if (thirdPlaceWinner) {
    const thirdBoxX = centerX + podiumBoxW / 2 + podiumGap;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    roundRect(ctx, thirdBoxX + 1, podiumY + 1, podiumBoxW, podiumBoxH, 5);
    ctx.fill();

    // Background
    ctx.fillStyle = colors.gray100;
    roundRect(ctx, thirdBoxX, podiumY, podiumBoxW, podiumBoxH, 5);
    ctx.fill();
    ctx.strokeStyle = colors.gray300;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Medal
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🥉', thirdBoxX + podiumBoxW / 2, podiumY + 10);

    // Flag
    const thirdFlag = getFlag(thirdPlaceWinner.id);
    if (thirdFlag) {
      ctx.drawImage(thirdFlag, thirdBoxX + podiumBoxW / 2 - 8, podiumY + 18, 16, 10);
    }

    // Name
    ctx.fillStyle = colors.gray600;
    ctx.font = `600 7px ${fontFamily}`;
    ctx.fillText(thirdPlaceWinner.name, thirdBoxX + podiumBoxW / 2, podiumY + 38);
  }

  // === FOOTER ===
  ctx.fillStyle = colors.gray400;
  ctx.font = `400 9px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('mundalia.vercel.app', width / 2, height - 10);

  return canvas.toDataURL('image/png');
};
