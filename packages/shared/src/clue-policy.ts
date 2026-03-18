import type { RoundState } from "./schemas.js"

export function submitClue(round: RoundState, playerId: string, clue: string): RoundState {
  const nextClues = [
    ...round.clues,
    {
      playerId,
      clue,
      submittedAt: Date.now(),
    },
  ]

  const currentIndex = round.activePlayerIds.findIndex((id) => id === playerId)
  const nextTurnPlayerId =
    currentIndex >= 0 && currentIndex < round.activePlayerIds.length - 1
      ? round.activePlayerIds[currentIndex + 1]
      : null

  return {
    ...round,
    clues: nextClues,
    currentTurnPlayerId: nextTurnPlayerId,
    phase: nextTurnPlayerId ? "clue-entry" : "voting",
  }
}
