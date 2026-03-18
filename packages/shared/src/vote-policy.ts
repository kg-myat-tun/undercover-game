import type {
  RoundOutcome,
  RoundState,
  Room,
  VoteResolutionReason
} from "./schemas.js";

import { getRoleForPlayer } from "./outcome-policy.js";
import { getSafeCounter } from "./game-core.js";
import { determineOutcome } from "./outcome-policy.js";

export function submitVote(
  round: RoundState,
  voterId: string,
  targetPlayerId: string | null
): RoundState {
  return {
    ...round,
    votes: [
      ...round.votes,
      {
        voterId,
        targetPlayerId,
        submittedAt: Date.now()
      }
    ]
  };
}

export function allVotesSubmitted(round: RoundState): boolean {
  return round.votes.length >= round.activePlayerIds.length;
}

export function resolveVotes(round: RoundState): {
  eliminatedPlayerId: string | null;
  reason: VoteResolutionReason;
} {
  const counts = new Map<string, number>();
  let skipVotes = 0;

  for (const vote of round.votes) {
    if (vote.targetPlayerId === null) {
      skipVotes += 1;
      continue;
    }

    counts.set(vote.targetPlayerId, (counts.get(vote.targetPlayerId) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0]);
  });

  const [eliminatedPlayerId, votes] = ranked[0] ?? [null, 0];
  const nextEntry = ranked[1];

  if (votes === 0 || skipVotes >= votes) {
    return {
      eliminatedPlayerId: null,
      reason: "vote-skipped"
    };
  }

  if (nextEntry && nextEntry[1] === votes) {
    return {
      eliminatedPlayerId: null,
      reason: "tie"
    };
  }

  return {
    eliminatedPlayerId,
    reason: "eliminated"
  };
}

export function finalizeRound(room: Room): Room {
  const resolvedAt = Date.now();
  const currentGameNumber = getSafeCounter(room.round.gameNumber, 1);
  const currentRoundNumber = getSafeCounter(room.round.roundNumber, 1);
  const voteResolution = resolveVotes(room.round);
  const activePlayerIds =
    voteResolution.eliminatedPlayerId === null
      ? room.round.activePlayerIds
      : room.round.activePlayerIds.filter((playerId) => playerId !== voteResolution.eliminatedPlayerId);

  const outcome = determineOutcome({
    ...room.round,
    activePlayerIds,
    eliminatedPlayerId: voteResolution.eliminatedPlayerId,
    currentTurnPlayerId: null
  });

  const updatedRound: RoundState = {
    ...room.round,
    gameNumber: currentGameNumber,
    roundNumber: currentRoundNumber,
    phase: outcome ? "results" : "round-resolution",
    activePlayerIds,
    eliminatedPlayerId: voteResolution.eliminatedPlayerId,
    resolutionReason: voteResolution.reason,
    currentTurnPlayerId: null,
    clues: room.round.clues,
    votes: room.round.votes,
    outcome
  };

  const scoreboard = { ...room.scoreboard };
  const players = room.players.map((player) =>
    player.id === voteResolution.eliminatedPlayerId
      ? {
          ...player,
          eliminatedAt: player.eliminatedAt ?? resolvedAt
        }
      : player
  );

  if (updatedRound.outcome) {
    for (const player of room.players) {
      if (!scoreboard[player.id]) {
        scoreboard[player.id] = 0;
      }

      const role = getRoleForPlayer(updatedRound, player.id);
      if (
        (updatedRound.outcome.winner === "civilians" && role === "civilian") ||
        (updatedRound.outcome.winner === "undercover" && role === "undercover")
      ) {
        scoreboard[player.id] += 1;
      }
    }
  }

  return {
    ...room,
    players,
    round: updatedRound,
    scoreboard
  };
}

export function continueRound(room: Room): Room {
  const currentGameNumber = getSafeCounter(room.round.gameNumber, 1);
  const currentRoundNumber = getSafeCounter(room.round.roundNumber, 1);

  return {
    ...room,
    round: {
      ...room.round,
      gameNumber: currentGameNumber,
      roundNumber: currentRoundNumber + 1,
      phase: "clue-entry",
      currentTurnPlayerId: room.round.activePlayerIds[0] ?? null,
      clues: [],
      votes: [],
      eliminatedPlayerId: null,
      resolutionReason: null,
      outcome: null
    }
  };
}
