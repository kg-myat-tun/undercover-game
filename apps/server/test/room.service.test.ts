import { describe, expect, it } from "vitest";

import { RoomStoreFactory } from "../src/redis/room-store.factory.js";
import { RoomService } from "../src/game/room.service.js";

describe("RoomService", () => {
  it("creates, joins, starts, and finishes a round", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });
    const joinedA = await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });
    const joinedB = await service.joinRoom({ roomCode: created.roomCode, nickname: "Blair" });

    const started = await service.startRound({
      roomCode: created.roomCode,
      playerSessionId: created.playerSessionId
    });

    let room = started.room;
    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId);
      room = await service.submitClue({
        roomCode: room.code,
        playerSessionId: player!.sessionId,
        clue: `clue-${playerId.slice(0, 4)}`
      });
    }

    const targetId = room.round.activePlayerIds[0];
    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitVote({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        targetPlayerId: targetId
      });
    }

    expect(room.round.phase).toBe("results");
    expect(room.round.gameNumber).toBe(1);
    expect(room.round.roundNumber).toBe(1);
    expect(room.round.outcome).toBeTruthy();
    expect(room.round.votes).toHaveLength(3);
    expect(room.players).toHaveLength(3);
    expect(joinedA.playerId).not.toBe(joinedB.playerId);
  });

  it("reconnects an existing player session", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });
    await service.disconnect(created.roomCode, created.playerSessionId);
    const room = await service.reconnect({
      roomCode: created.roomCode,
      playerSessionId: created.playerSessionId
    });
    const player = room.players.find((item) => item.sessionId === created.playerSessionId);

    expect(player?.isConnected).toBe(true);
  });

  it("allows skip votes and continues the round", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });
    await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });
    await service.joinRoom({ roomCode: created.roomCode, nickname: "Blair" });

    let room = (
      await service.startRound({
        roomCode: created.roomCode,
        playerSessionId: created.playerSessionId
      })
    ).room;

    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitClue({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        clue: `clue-${playerId.slice(0, 4)}`
      });
    }

    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitVote({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        targetPlayerId: null
      });
    }

    expect(room.round.phase).toBe("clue-entry");
    expect(room.round.gameNumber).toBe(1);
    expect(room.round.roundNumber).toBe(2);
    expect(room.round.eliminatedPlayerId).toBeNull();
    expect(room.round.outcome).toBeNull();
  });
});
