import { describe, expect, it } from "vitest";

import {
  allVotesSubmitted,
  createEmptyRound,
  createRound,
  determineOutcome,
  finalizeRound,
  submitClue,
  submitVote,
  type Room
} from "../src";

function makeRoom(): Room {
  return {
    id: "7e8a19d0-b93a-4976-a6dc-f9a7495b1f8e",
    code: "ABCD",
    wordPackId: "classic",
    createdAt: Date.now(),
    players: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        sessionId: "11111111-1111-4111-8111-111111111112",
        nickname: "Avery",
        isHost: true,
        isConnected: true,
        joinedAt: 1,
        eliminatedAt: null
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        sessionId: "22222222-2222-4222-8222-222222222223",
        nickname: "Blair",
        isHost: false,
        isConnected: true,
        joinedAt: 2,
        eliminatedAt: null
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        sessionId: "33333333-3333-4333-8333-333333333334",
        nickname: "Casey",
        isHost: false,
        isConnected: true,
        joinedAt: 3,
        eliminatedAt: null
      }
    ],
    round: createEmptyRound(),
    scoreboard: {}
  };
}

describe("game engine", () => {
  it("assigns exactly one undercover", () => {
    const room = makeRoom();
    const values = [0.2, 0.8, 0.1, 0.3];
    let index = 0;
    const round = createRound(room, () => values[index++] ?? 0.1);

    expect(round.undercoverPlayerId).toBeTruthy();
    expect(round.gameNumber).toBe(1);
    expect(round.roundNumber).toBe(1);
    expect(round.activePlayerIds).toHaveLength(3);
    expect(round.activePlayerIds.includes(round.undercoverPlayerId!)).toBe(true);
  });

  it("advances clue turns and opens voting", () => {
    const room = makeRoom();
    room.round = createRound(room, () => 0.1);

    const [first, second, third] = room.round.activePlayerIds;
    const afterFirst = submitClue(room.round, first, "Hot");
    const afterSecond = submitClue(afterFirst, second, "Morning");
    const afterThird = submitClue(afterSecond, third, "Cup");

    expect(afterFirst.phase).toBe("clue-entry");
    expect(afterSecond.phase).toBe("clue-entry");
    expect(afterThird.phase).toBe("voting");
    expect(afterThird.currentTurnPlayerId).toBeNull();
  });

  it("resolves civilian victory when undercover is eliminated", () => {
    const room = makeRoom();
    room.round = {
      ...createRound(room, () => 0.1),
      activePlayerIds: room.players.map((player) => player.id),
      undercoverPlayerId: room.players[1].id,
      phase: "voting"
    };

    for (const player of room.players) {
      room.round = submitVote(room.round, player.id, room.players[1].id);
    }

    expect(allVotesSubmitted(room.round)).toBe(true);
    const finalized = finalizeRound(room);

    expect(finalized.round.phase).toBe("results");
    expect(finalized.round.gameNumber).toBe(1);
    expect(finalized.round.roundNumber).toBe(1);
    expect(finalized.round.outcome?.winner).toBe("civilians");
    expect(finalized.round.votes).toHaveLength(3);
    expect(finalized.scoreboard[room.players[0].id]).toBe(1);
    expect(finalized.scoreboard[room.players[1].id]).toBe(0);
  });

  it("restarts clue cycle when skip wins the vote", () => {
    const room = makeRoom();
    room.round = {
      ...createRound(room, () => 0.1),
      activePlayerIds: room.players.map((player) => player.id),
      phase: "voting"
    };

    for (const player of room.players) {
      room.round = submitVote(room.round, player.id, null);
    }

    const finalized = finalizeRound(room);

    expect(finalized.round.phase).toBe("clue-entry");
    expect(finalized.round.gameNumber).toBe(1);
    expect(finalized.round.roundNumber).toBe(2);
    expect(finalized.round.eliminatedPlayerId).toBeNull();
    expect(finalized.round.outcome).toBeNull();
    expect(finalized.round.votes).toHaveLength(0);
    expect(finalized.round.clues).toHaveLength(0);
  });

  it("resolves undercover victory on final parity", () => {
    const room = makeRoom();
    const round = createRound(room, () => 0.1);
    const updated = {
      ...round,
      activePlayerIds: [room.players[0].id, room.players[1].id, room.players[2].id],
      undercoverPlayerId: room.players[2].id,
      eliminatedPlayerId: room.players[1].id
    };

    const outcome = determineOutcome(updated);
    expect(outcome?.winner).toBe("undercover");
  });

  it("falls back cleanly when older room state has no game number", () => {
    const room = makeRoom();
    room.round = {
      ...createEmptyRound(),
      gameNumber: undefined as never,
      roundNumber: 2,
      phase: "results"
    };

    const nextRound = createRound(room, () => 0.1);
    expect(nextRound.gameNumber).toBe(1);
    expect(nextRound.roundNumber).toBe(1);
  });
});
