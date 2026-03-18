import { getWordPack } from "./words.js";
export function createEmptyRound() {
    return {
        roundNumber: 0,
        phase: "lobby",
        currentTurnPlayerId: null,
        activePlayerIds: [],
        clues: [],
        votes: [],
        eliminatedPlayerId: null,
        undercoverPlayerId: null,
        civilianWord: null,
        undercoverWord: null,
        outcome: null
    };
}
export function getActivePlayers(room) {
    if (room.round.phase === "lobby") {
        return room.players;
    }
    const activeSet = new Set(room.round.activePlayerIds);
    return room.players.filter((player) => activeSet.has(player.id));
}
export function chooseUndercover(players, random = Math.random) {
    const index = Math.floor(random() * players.length);
    return players[index];
}
export function shufflePlayers(players, random = Math.random) {
    const copy = [...players];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
}
export function createRound(room, random = Math.random) {
    const pack = getWordPack(room.wordPackId);
    const pair = pack.pairs[Math.floor(random() * pack.pairs.length)];
    const orderedPlayers = shufflePlayers(room.players, random);
    const undercover = chooseUndercover(orderedPlayers, random);
    return {
        roundNumber: room.round.roundNumber + 1,
        phase: "clue-entry",
        currentTurnPlayerId: orderedPlayers[0]?.id ?? null,
        activePlayerIds: orderedPlayers.map((player) => player.id),
        clues: [],
        votes: [],
        eliminatedPlayerId: null,
        undercoverPlayerId: undercover.id,
        civilianWord: pair.civilian,
        undercoverWord: pair.undercover,
        outcome: null
    };
}
export function getRoleForPlayer(round, playerId) {
    return round.undercoverPlayerId === playerId ? "undercover" : "civilian";
}
export function submitClue(round, playerId, clue) {
    const nextClues = [
        ...round.clues,
        {
            playerId,
            clue,
            submittedAt: Date.now()
        }
    ];
    const currentIndex = round.activePlayerIds.findIndex((id) => id === playerId);
    const nextTurnPlayerId = currentIndex >= 0 && currentIndex < round.activePlayerIds.length - 1
        ? round.activePlayerIds[currentIndex + 1]
        : null;
    return {
        ...round,
        clues: nextClues,
        currentTurnPlayerId: nextTurnPlayerId,
        phase: nextTurnPlayerId ? "clue-entry" : "voting"
    };
}
export function submitVote(round, voterId, targetPlayerId) {
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
export function allVotesSubmitted(round) {
    return round.votes.length >= round.activePlayerIds.length;
}
export function resolveVotes(round) {
    const counts = new Map();
    for (const vote of round.votes) {
        counts.set(vote.targetPlayerId, (counts.get(vote.targetPlayerId) ?? 0) + 1);
    }
    const ranked = [...counts.entries()].sort((left, right) => {
        if (right[1] !== left[1]) {
            return right[1] - left[1];
        }
        return left[0].localeCompare(right[0]);
    });
    const [eliminatedPlayerId, votes] = ranked[0];
    const nextEntry = ranked[1];
    const reason = nextEntry && nextEntry[1] === votes ? "tie-break" : "undercover-found";
    return { eliminatedPlayerId, reason };
}
export function determineOutcome(round) {
    if (!round.eliminatedPlayerId || !round.undercoverPlayerId) {
        return null;
    }
    if (round.eliminatedPlayerId === round.undercoverPlayerId) {
        return {
            winner: "civilians",
            eliminatedPlayerId: round.eliminatedPlayerId,
            reason: "undercover-found"
        };
    }
    const remainingPlayers = round.activePlayerIds.filter((id) => id !== round.eliminatedPlayerId);
    const undercoverAlive = remainingPlayers.includes(round.undercoverPlayerId);
    if (!undercoverAlive) {
        return {
            winner: "civilians",
            eliminatedPlayerId: round.eliminatedPlayerId,
            reason: "undercover-found"
        };
    }
    if (remainingPlayers.length <= 2) {
        return {
            winner: "undercover",
            eliminatedPlayerId: round.eliminatedPlayerId,
            reason: "undercover-survived"
        };
    }
    return null;
}
export function finalizeRound(room) {
    const voteResolution = resolveVotes(room.round);
    const activePlayerIds = room.round.activePlayerIds.filter((playerId) => playerId !== voteResolution.eliminatedPlayerId);
    const outcome = determineOutcome({
        ...room.round,
        activePlayerIds,
        eliminatedPlayerId: voteResolution.eliminatedPlayerId,
        currentTurnPlayerId: null
    });
    const updatedRound = {
        ...room.round,
        phase: outcome ? "results" : "clue-entry",
        activePlayerIds,
        eliminatedPlayerId: voteResolution.eliminatedPlayerId,
        currentTurnPlayerId: outcome ? null : activePlayerIds[0] ?? null,
        clues: outcome ? room.round.clues : [],
        votes: [],
        outcome
    };
    const scoreboard = { ...room.scoreboard };
    if (updatedRound.outcome) {
        for (const player of room.players) {
            if (!scoreboard[player.id]) {
                scoreboard[player.id] = 0;
            }
            const role = getRoleForPlayer(updatedRound, player.id);
            if ((updatedRound.outcome.winner === "civilians" && role === "civilian") ||
                (updatedRound.outcome.winner === "undercover" && role === "undercover")) {
                scoreboard[player.id] += 1;
            }
        }
    }
    return {
        ...room,
        round: updatedRound,
        scoreboard
    };
}
export function isRoundOver(room) {
    return room.round.phase === "results";
}
export function toPublicRoom(room) {
    return {
        ...room,
        players: room.players.map(({ sessionId: _sessionId, ...player }) => player),
        round: {
            roundNumber: room.round.roundNumber,
            phase: room.round.phase,
            currentTurnPlayerId: room.round.currentTurnPlayerId,
            activePlayerIds: room.round.activePlayerIds,
            clues: room.round.clues,
            votes: room.round.votes,
            eliminatedPlayerId: room.round.eliminatedPlayerId,
            outcome: room.round.outcome
        }
    };
}
//# sourceMappingURL=game.js.map