// ============================================
// VANTCALL — Utilidades de Rango (cálculo de división por MMR)
// Complementa al módulo de emblemas SVG (ranks.js existente)
// ============================================

const RANK_ORDER = ['iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ascendant', 'radiant'];
const RANK_MMR = [
  { id: 'iron', name: 'Hierro', mmr: [0, 199], divisions: ['I', 'II', 'III'] },
  { id: 'bronze', name: 'Bronce', mmr: [200, 399], divisions: ['I', 'II', 'III'] },
  { id: 'silver', name: 'Plata', mmr: [400, 599], divisions: ['I', 'II', 'III'] },
  { id: 'gold', name: 'Oro', mmr: [600, 799], divisions: ['I', 'II', 'III'] },
  { id: 'platinum', name: 'Platino', mmr: [800, 999], divisions: ['I', 'II', 'III'] },
  { id: 'diamond', name: 'Diamante', mmr: [1000, 1199], divisions: ['I', 'II', 'III'] },
  { id: 'ascendant', name: 'Ascendente', mmr: [1200, 1399], divisions: ['I', 'II', 'III'] },
  { id: 'radiant', name: 'Radiante', mmr: [1400, 9999], divisions: ['I', 'II', 'III'] },
];

function getRankInfo(mmr) {
  for (let i = RANK_MMR.length - 1; i >= 0; i--) {
    if (mmr >= RANK_MMR[i].mmr[0]) {
      const rank = RANK_MMR[i];
      const mmrInRank = mmr - rank.mmr[0];
      const divSize = Math.ceil((rank.mmr[1] - rank.mmr[0] + 1) / 3);
      const divIndex = Math.min(2, Math.floor(mmrInRank / divSize));
      const division = rank.divisions[divIndex];
      const nextRank = RANK_MMR[i + 1] || null;
      const mmrToNext = nextRank ? nextRank.mmr[0] - mmr : 0;
      const progress = nextRank ? Math.min(100, Math.round((mmrInRank / (rank.mmr[1] - rank.mmr[0] + 1)) * 100)) : 100;
      return { rank, division, mmrInRank, nextRank, mmrToNext, progress, isMaxRank: i === RANK_MMR.length - 1 };
    }
  }
  return { rank: RANK_MMR[0], division: 'I', mmrInRank: mmr, nextRank: RANK_MMR[1], mmrToNext: RANK_MMR[1].mmr[0] - mmr, progress: Math.round((mmr / RANK_MMR[0].mmr[1]) * 100), isMaxRank: false };
}

function getRankDisplay(mmr) {
  const info = getRankInfo(mmr);
  return {
    ...info,
    display: `${info.rank.name} ${info.division}`,
    emblem: window.VantsRanks ? window.VantsRanks.emblemUse(info.rank.id, 'rank-emblem') : info.rank.icon,
  };
}

window.VantRankCalc = {
  RANK_ORDER,
  RANK_MMR,
  getRankInfo,
  getRankDisplay,
};
