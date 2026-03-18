import type { RoundOutcome, RoundState } from "./schemas.js"

import type { Role } from "./game-types.js"

export function getRoleForPlayer(round: RoundState, playerId: string): Role {
  return round.undercoverPlayerId === playerId ? "undercover" : "civilian"
}

export function determineOutcome(round: RoundState): RoundOutcome | null {
  if (!round.eliminatedPlayerId || !round.undercoverPlayerId) {
    return null
  }

  if (round.eliminatedPlayerId === round.undercoverPlayerId) {
    return {
      winner: "civilians",
      eliminatedPlayerId: round.eliminatedPlayerId,
      reason: "undercover-found",
    }
  }

  const remainingPlayers = round.activePlayerIds.filter((id) => id !== round.eliminatedPlayerId)
  const undercoverAlive = remainingPlayers.includes(round.undercoverPlayerId)

  if (!undercoverAlive) {
    return {
      winner: "civilians",
      eliminatedPlayerId: round.eliminatedPlayerId,
      reason: "undercover-found",
    }
  }

  if (remainingPlayers.length <= 2) {
    return {
      winner: "undercover",
      eliminatedPlayerId: round.eliminatedPlayerId,
      reason: "undercover-survived",
    }
  }

  return null
}
