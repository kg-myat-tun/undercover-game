import type { Player, Room, RoundState } from "./schemas.js";
import { getWordPack } from "./words.js";

import { getSafeCounter } from "./game-core.js";

export function chooseUndercover(players: Player[], random = Math.random): Player {
  const index = Math.floor(random() * players.length);
  return players[index];
}

export function shufflePlayers(players: Player[], random = Math.random): Player[] {
  const copy = [...players];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export function createRound(room: Room, random = Math.random): RoundState {
  const pack = getWordPack(room.wordPackId, room.locale);
  const pair = pack.pairs[Math.floor(random() * pack.pairs.length)];
  const orderedPlayers = shufflePlayers(room.players, random);
  const undercover = chooseUndercover(orderedPlayers, random);
  const previousGameNumber = getSafeCounter(room.round.gameNumber, 0);

  for (const player of room.players) {
    player.eliminatedAt = null;
  }

  return {
    gameNumber: previousGameNumber + 1,
    roundNumber: 1,
    phase: "clue-entry",
    currentTurnPlayerId: orderedPlayers[0]?.id ?? null,
    activePlayerIds: orderedPlayers.map((player) => player.id),
    clues: [],
    votes: [],
    eliminatedPlayerId: null,
    resolutionReason: null,
    undercoverPlayerId: undercover.id,
    civilianWord: pair.civilian,
    undercoverWord: pair.undercover,
    outcome: null
  };
}
