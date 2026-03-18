import type { Player, PublicRoom, Room, RoundState } from "./schemas.js"

function safeCounter(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

export function createEmptyRound(): RoundState {
  return {
    gameNumber: 0,
    roundNumber: 0,
    phase: "lobby",
    currentTurnPlayerId: null,
    activePlayerIds: [],
    clues: [],
    votes: [],
    eliminatedPlayerId: null,
    resolutionReason: null,
    undercoverPlayerId: null,
    civilianWord: null,
    undercoverWord: null,
    outcome: null,
  }
}

export function getActivePlayers(room: Room): Player[] {
  if (room.round.phase === "lobby") {
    return room.players
  }

  const activeSet = new Set(room.round.activePlayerIds)
  return room.players.filter((player) => activeSet.has(player.id))
}

export function toPublicRoom(room: Room): PublicRoom {
  return {
    id: room.id,
    code: room.code,
    wordPackId: room.wordPackId,
    locale: room.locale,
    createdAt: room.createdAt,
    players: room.players.map(({ sessionId: _sessionId, ...player }) => player),
    scoreboard: room.scoreboard,
    round: {
      gameNumber: safeCounter(room.round.gameNumber, 1),
      roundNumber: safeCounter(room.round.roundNumber, 1),
      phase: room.round.phase,
      currentTurnPlayerId: room.round.currentTurnPlayerId,
      activePlayerIds: room.round.activePlayerIds,
      clues: room.round.clues,
      votes: room.round.votes,
      eliminatedPlayerId: room.round.eliminatedPlayerId,
      resolutionReason: room.round.resolutionReason,
      revealedUndercoverPlayerId:
        room.round.phase === "results" ? (room.round.undercoverPlayerId ?? null) : null,
      outcome: room.round.outcome,
    },
  }
}

export function getSafeCounter(value: number | undefined, fallback: number): number {
  return safeCounter(value, fallback)
}
