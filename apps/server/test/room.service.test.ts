import { describe, expect, it } from "vitest";

import { RoomService } from "../src/game/room.service.js";
import { RoomError } from "../src/game/errors.js";
import { RoomStoreFactory } from "../src/redis/room-store.factory.js";

async function createStartedRoom() {
  const service = new RoomService(new RoomStoreFactory());
  const created = await service.createRoom({ nickname: "Host" });
  const joinedA = await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });
  const joinedB = await service.joinRoom({ roomCode: created.roomCode, nickname: "Blair" });

  const started = await service.startRound({
    roomCode: created.roomCode,
    playerSessionId: created.playerSessionId,
  });

  return {
    service,
    created,
    joinedA,
    joinedB,
    room: started.room,
    secrets: started.secrets,
  };
}

describe("RoomService", () => {
  it("creates a room with a host and default classic word pack", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });

    expect(created.room.wordPackId).toBe("classic");
    expect(created.room.locale).toBe("en");
    expect(created.room.players).toHaveLength(1);
    expect(created.room.players[0]?.isHost).toBe(true);
  });

  it("uses a selected word pack when creating a room", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({
      nickname: "Host",
      wordPackId: "family-fun",
    });

    expect(created.room.wordPackId).toBe("family-fun");
  });

  it("uses a selected locale when creating a room", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({
      nickname: "Host",
      locale: "my",
    });

    expect(created.room.locale).toBe("my");
  });

  it("rejects duplicate nicknames", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });
    await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });

    await expect(
      service.joinRoom({ roomCode: created.roomCode, nickname: "alex" }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "DUPLICATE_NICKNAME",
    });
  });

  it("caps the room at eight players", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });

    for (const nickname of ["A", "B", "C", "D", "E", "F", "G"]) {
      await service.joinRoom({ roomCode: created.roomCode, nickname: `P${nickname}` });
    }

    await expect(
      service.joinRoom({ roomCode: created.roomCode, nickname: "Overflow" }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "ROOM_FULL",
    });
  });

  it("reuses an existing session when join is called with the same session id", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });

    const samePlayer = await service.joinRoom({
      roomCode: created.roomCode,
      nickname: "Host",
      playerSessionId: created.playerSessionId,
    });

    expect(samePlayer.playerId).toBe(created.playerId);
    expect(samePlayer.playerSessionId).toBe(created.playerSessionId);
    expect(samePlayer.room.players).toHaveLength(1);
  });

  it("reconnects an existing player session", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });
    await service.disconnect(created.roomCode, created.playerSessionId);
    const room = await service.reconnect({
      roomCode: created.roomCode,
      playerSessionId: created.playerSessionId,
    });
    const player = room.players.find((item) => item.sessionId === created.playerSessionId);

    expect(player?.isConnected).toBe(true);
  });

  it("reassigns host to the longest-connected remaining player when the host disconnects", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });
    const joinedA = await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });
    await service.joinRoom({ roomCode: created.roomCode, nickname: "Blair" });

    const room = await service.disconnect(created.roomCode, created.playerSessionId);

    const newHost = room?.players.find((player) => player.isHost);
    expect(newHost?.sessionId).toBe(joinedA.playerSessionId);
  });

  it("deletes the room when the last player leaves", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });

    const room = await service.leaveRoom({
      roomCode: created.roomCode,
      playerSessionId: created.playerSessionId,
    });

    expect(room).toBeNull();
    await expect(service.getPublicRoom(created.roomCode)).rejects.toMatchObject<
      Partial<RoomError>
    >({
      code: "ROOM_NOT_FOUND",
    });
  });

  it("allows only the host to kick a player", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });
    const joined = await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });

    await expect(
      service.kickPlayer({
        roomCode: created.roomCode,
        playerSessionId: joined.playerSessionId,
        targetPlayerId: created.playerId,
      }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "NOT_HOST",
    });
  });

  it("allows only the host to start a round", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });
    await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });
    const joinedB = await service.joinRoom({ roomCode: created.roomCode, nickname: "Blair" });

    await expect(
      service.startRound({
        roomCode: created.roomCode,
        playerSessionId: joinedB.playerSessionId,
      }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "NOT_HOST",
    });
  });

  it("requires at least three players to start", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });
    await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });

    await expect(
      service.startRound({
        roomCode: created.roomCode,
        playerSessionId: created.playerSessionId,
      }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "BAD_REQUEST",
    });
  });

  it("creates player secrets for everyone when a round starts", async () => {
    const { room, secrets } = await createStartedRoom();

    expect(room.round.phase).toBe("clue-entry");
    expect(secrets).toHaveLength(room.players.length);
    expect(secrets.filter((secret) => secret.role === "undercover")).toHaveLength(1);
    expect(new Set(secrets.map((secret) => secret.playerId)).size).toBe(room.players.length);
  });

  it("lets the host change the word pack between games", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });

    const updated = await service.updateWordPack({
      roomCode: created.roomCode,
      playerSessionId: created.playerSessionId,
      wordPackId: "hard-mode",
    });

    expect(updated.wordPackId).toBe("hard-mode");
  });

  it("rejects word pack changes from non-host players", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });
    await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });
    const joinedB = await service.joinRoom({ roomCode: created.roomCode, nickname: "Blair" });

    await expect(
      service.updateWordPack({
        roomCode: created.roomCode,
        playerSessionId: joinedB.playerSessionId,
        wordPackId: "hard-mode",
      }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "NOT_HOST",
    });
  });

  it("rejects word pack changes during an active round", async () => {
    const { service, created } = await createStartedRoom();

    await expect(
      service.updateWordPack({
        roomCode: created.roomCode,
        playerSessionId: created.playerSessionId,
        wordPackId: "hard-mode",
      }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "INVALID_PHASE",
    });
  });

  it("lets the host change the room locale between games", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });

    const updated = await service.updateLocale({
      roomCode: created.roomCode,
      playerSessionId: created.playerSessionId,
      locale: "my",
    });

    expect(updated.locale).toBe("my");
  });

  it("rejects room locale changes from non-host players", async () => {
    const service = new RoomService(new RoomStoreFactory());
    const created = await service.createRoom({ nickname: "Host" });
    await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });
    const joinedB = await service.joinRoom({ roomCode: created.roomCode, nickname: "Blair" });

    await expect(
      service.updateLocale({
        roomCode: created.roomCode,
        playerSessionId: joinedB.playerSessionId,
        locale: "my",
      }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "NOT_HOST",
    });
  });

  it("enforces turn order for clue submission", async () => {
    const { service, room } = await createStartedRoom();
    const wrongPlayer = room.players.find(
      (player) => player.id !== room.round.currentTurnPlayerId,
    )!;

    await expect(
      service.submitClue({
        roomCode: room.code,
        playerSessionId: wrongPlayer.sessionId,
        clue: "Oops",
      }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "NOT_YOUR_TURN",
    });
  });

  it("rejects clue submission outside clue-entry", async () => {
    const { service, room } = await createStartedRoom();
    let currentRoom = room;

    for (const playerId of currentRoom.round.activePlayerIds) {
      const player = currentRoom.players.find((item) => item.id === playerId)!;
      currentRoom = await service.submitClue({
        roomCode: currentRoom.code,
        playerSessionId: player.sessionId,
        clue: `clue-${playerId.slice(0, 4)}`,
      });
    }

    const anyPlayer = currentRoom.players[0]!;

    await expect(
      service.submitClue({
        roomCode: currentRoom.code,
        playerSessionId: anyPlayer.sessionId,
        clue: "late clue",
      }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "INVALID_PHASE",
    });
  });

  it("rejects duplicate votes from the same player", async () => {
    const { service, room } = await createStartedRoom();
    let currentRoom = room;

    for (const playerId of currentRoom.round.activePlayerIds) {
      const player = currentRoom.players.find((item) => item.id === playerId)!;
      currentRoom = await service.submitClue({
        roomCode: currentRoom.code,
        playerSessionId: player.sessionId,
        clue: `clue-${playerId.slice(0, 4)}`,
      });
    }

    const voter = currentRoom.players[0]!;
    const targetId = currentRoom.round.activePlayerIds[0]!;
    await service.submitVote({
      roomCode: currentRoom.code,
      playerSessionId: voter.sessionId,
      targetPlayerId: targetId,
    });

    await expect(
      service.submitVote({
        roomCode: currentRoom.code,
        playerSessionId: voter.sessionId,
        targetPlayerId: targetId,
      }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "BAD_REQUEST",
    });
  });

  it("rejects votes for players who are not active in the round", async () => {
    const { service, room } = await createStartedRoom();
    let currentRoom = room;

    for (const playerId of currentRoom.round.activePlayerIds) {
      const player = currentRoom.players.find((item) => item.id === playerId)!;
      currentRoom = await service.submitClue({
        roomCode: currentRoom.code,
        playerSessionId: player.sessionId,
        clue: `clue-${playerId.slice(0, 4)}`,
      });
    }

    const voter = currentRoom.players[0]!;

    await expect(
      service.submitVote({
        roomCode: currentRoom.code,
        playerSessionId: voter.sessionId,
        targetPlayerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "PLAYER_NOT_FOUND",
    });
  });

  it("creates, joins, starts, and finishes a round", async () => {
    const { service, joinedA, joinedB, room: startedRoom } = await createStartedRoom();
    let room = startedRoom;

    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitClue({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        clue: `clue-${playerId.slice(0, 4)}`,
      });
    }

    const targetId = room.round.activePlayerIds[0]!;
    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitVote({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        targetPlayerId: targetId,
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

  it("allows skip votes and continues the same game into the next round", async () => {
    const { service, room: startedRoom } = await createStartedRoom();
    let room = startedRoom;

    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitClue({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        clue: `clue-${playerId.slice(0, 4)}`,
      });
    }

    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitVote({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        targetPlayerId: null,
      });
    }

    expect(room.round.phase).toBe("clue-entry");
    expect(room.round.gameNumber).toBe(1);
    expect(room.round.roundNumber).toBe(2);
    expect(room.round.eliminatedPlayerId).toBeNull();
    expect(room.round.outcome).toBeNull();
  });

  it("starts a fresh game from results with round number reset", async () => {
    const { service, created, room: startedRoom } = await createStartedRoom();
    let room = startedRoom;

    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitClue({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        clue: `clue-${playerId.slice(0, 4)}`,
      });
    }

    const targetId = room.round.activePlayerIds[0]!;
    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitVote({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        targetPlayerId: targetId,
      });
    }

    expect(room.round.phase).toBe("results");

    const restarted = await service.startRound({
      roomCode: created.roomCode,
      playerSessionId: created.playerSessionId,
    });

    expect(restarted.room.round.phase).toBe("clue-entry");
    expect(restarted.room.round.gameNumber).toBe(2);
    expect(restarted.room.round.roundNumber).toBe(1);
  });

  it("reveals the undercover publicly after results", async () => {
    const { service, created, room: startedRoom } = await createStartedRoom();
    let room = startedRoom;

    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitClue({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        clue: `clue-${playerId.slice(0, 4)}`,
      });
    }

    const targetId = room.round.activePlayerIds[0]!;
    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitVote({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        targetPlayerId: targetId,
      });
    }

    const publicRoom = await service.getPublicRoom(created.roomCode);

    expect(publicRoom.round.phase).toBe("results");
    expect(publicRoom.round.revealedUndercoverPlayerId).toBeTruthy();
  });
});
