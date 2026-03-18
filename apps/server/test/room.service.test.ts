import { describe, expect, it } from "vitest";

import { RoomQueryService } from "../src/game/room-query.service.js";
import { RoomService } from "../src/game/room.service.js";
import { RoomError } from "../src/game/errors.js";
import { RoomStoreFactory } from "../src/redis/room-store.factory.js";

function createService() {
  const store = new RoomStoreFactory().getStore();
  return new RoomService(store, new RoomQueryService(store));
}

async function createStartedRoom() {
  return createStartedRoomWithPlayers();
}

async function createStartedRoomWithPlayers(extraNicknames: string[] = []) {
  const store = new RoomStoreFactory().getStore();
  const roomQueryService = new RoomQueryService(store);
  const service = new RoomService(store, roomQueryService);
  const created = await service.createRoom({ nickname: "Host" });
  const joinedA = await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });
  const joinedB = await service.joinRoom({ roomCode: created.roomCode, nickname: "Blair" });
  const extras = [] as Array<{ roomCode: string; playerSessionId: string; playerId: string; room: any }>;

  for (const nickname of extraNicknames) {
    extras.push(await service.joinRoom({ roomCode: created.roomCode, nickname }));
  }

  const started = await service.startRound({
    roomCode: created.roomCode,
    playerSessionId: created.playerSessionId,
  });

  return {
    service,
    roomQueryService,
    created,
    joinedA,
    joinedB,
    extras,
    room: started.room,
    secrets: started.secrets,
  };
}

describe("RoomService", () => {
  it("creates a room with a host and default classic word pack", async () => {
    const service = createService();
    const created = await service.createRoom({ nickname: "Host" });

    expect(created.room.wordPackId).toBe("classic");
    expect(created.room.locale).toBe("en");
    expect(created.room.players).toHaveLength(1);
    expect(created.room.players[0]?.isHost).toBe(true);
  });

  it("uses a selected word pack when creating a room", async () => {
    const service = createService();
    const created = await service.createRoom({
      nickname: "Host",
      wordPackId: "family-fun",
    });

    expect(created.room.wordPackId).toBe("family-fun");
  });

  it("uses a selected locale when creating a room", async () => {
    const service = createService();
    const created = await service.createRoom({
      nickname: "Host",
      locale: "my",
    });

    expect(created.room.locale).toBe("my");
    expect(created.room.wordPackId).toBe("classic");
  });

  it("normalizes legacy Myanmar pack ids when creating a room", async () => {
    const service = createService();
    const created = await service.createRoom({
      nickname: "Host",
      locale: "my",
      wordPackId: "myanmar-classic",
    });

    expect(created.room.wordPackId).toBe("classic");
  });

  it("keeps a requested pack when the locale supports it", async () => {
    const service = createService();
    const created = await service.createRoom({
      nickname: "Host",
      locale: "my",
      wordPackId: "tech-media",
    });

    expect(created.room.wordPackId).toBe("tech-media");
  });

  it("keeps a selected pack when that pack supports Myanmar words", async () => {
    const service = createService();
    const created = await service.createRoom({
      nickname: "Host",
      locale: "my",
      wordPackId: "food-drink",
    });

    expect(created.room.wordPackId).toBe("food-drink");
  });

  it("rejects duplicate nicknames", async () => {
    const service = createService();
    const created = await service.createRoom({ nickname: "Host" });
    await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });

    await expect(
      service.joinRoom({ roomCode: created.roomCode, nickname: "alex" }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "DUPLICATE_NICKNAME",
    });
  });

  it("caps the room at eight players", async () => {
    const service = createService();
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
    const service = createService();
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
    const service = createService();
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
    const service = createService();
    const created = await service.createRoom({ nickname: "Host" });
    const joinedA = await service.joinRoom({ roomCode: created.roomCode, nickname: "Alex" });
    await service.joinRoom({ roomCode: created.roomCode, nickname: "Blair" });

    const room = await service.disconnect(created.roomCode, created.playerSessionId);

    const newHost = room?.players.find((player) => player.isHost);
    expect(newHost?.sessionId).toBe(joinedA.playerSessionId);
  });

  it("deletes the room when the last player leaves", async () => {
    const store = new RoomStoreFactory().getStore();
    const service = new RoomService(store, new RoomQueryService(store));
    const roomQueryService = new RoomQueryService(store);
    const created = await service.createRoom({ nickname: "Host" });

    const room = await service.leaveRoom({
      roomCode: created.roomCode,
      playerSessionId: created.playerSessionId,
    });

    expect(room).toBeNull();
    await expect(roomQueryService.getPublicRoom(created.roomCode)).rejects.toMatchObject<
      Partial<RoomError>
    >({
      code: "ROOM_NOT_FOUND",
    });
  });

  it("allows only the host to kick a player", async () => {
    const service = createService();
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
    const service = createService();
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
    const service = createService();
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

  it("rejects self-votes", async () => {
    const { service, created, joinedA, joinedB, room } = await createStartedRoom();
    const sessionsByPlayerId = new Map([
      [created.playerId, created.playerSessionId],
      [joinedA.playerId, joinedA.playerSessionId],
      [joinedB.playerId, joinedB.playerSessionId],
    ]);

    let currentRoom = room;
    for (const playerId of currentRoom.round.activePlayerIds) {
      currentRoom = await service.submitClue({
        roomCode: created.roomCode,
        playerSessionId: sessionsByPlayerId.get(playerId)!,
        clue: `clue-${playerId.slice(0, 4)}`,
      });
    }

    const voterId = currentRoom.round.activePlayerIds[0];

    await expect(
      service.submitVote({
        roomCode: created.roomCode,
        playerSessionId: sessionsByPlayerId.get(voterId)!,
        targetPlayerId: voterId,
      }),
    ).rejects.toMatchObject<Partial<RoomError>>({
      code: "BAD_REQUEST",
    });
  });

  it("moves the game into round resolution before the next clue round", async () => {
    const { service, created, joinedA, joinedB, extras, room } = await createStartedRoomWithPlayers([
      "Casey",
    ]);
    const sessionsByPlayerId = new Map([
      [created.playerId, created.playerSessionId],
      [joinedA.playerId, joinedA.playerSessionId],
      [joinedB.playerId, joinedB.playerSessionId],
      [extras[0].playerId, extras[0].playerSessionId],
    ]);

    let currentRoom = room;
    for (const playerId of currentRoom.round.activePlayerIds) {
      currentRoom = await service.submitClue({
        roomCode: created.roomCode,
        playerSessionId: sessionsByPlayerId.get(playerId)!,
        clue: `clue-${playerId.slice(0, 4)}`,
      });
    }

    const activePlayerIds = [...currentRoom.round.activePlayerIds];
    const eliminatedPlayerId = activePlayerIds.find(
      (playerId) => playerId !== currentRoom.round.undercoverPlayerId,
    )!;
    const dissentTargetId = activePlayerIds.find((playerId) => playerId !== eliminatedPlayerId)!;

    for (const playerId of activePlayerIds) {
      currentRoom = await service.submitVote({
        roomCode: created.roomCode,
        playerSessionId: sessionsByPlayerId.get(playerId)!,
        targetPlayerId: playerId === eliminatedPlayerId ? dissentTargetId : eliminatedPlayerId,
      });
    }

    expect(currentRoom.round.phase).toBe("round-resolution");
    expect(currentRoom.round.eliminatedPlayerId).toBe(eliminatedPlayerId);
    expect(currentRoom.round.resolutionReason).toBe("eliminated");
    expect(currentRoom.round.outcome).toBeNull();
  });

  it("lets the host continue after round resolution", async () => {
    const { service, created, joinedA, joinedB, extras, room } = await createStartedRoomWithPlayers([
      "Casey",
    ]);
    const sessionsByPlayerId = new Map([
      [created.playerId, created.playerSessionId],
      [joinedA.playerId, joinedA.playerSessionId],
      [joinedB.playerId, joinedB.playerSessionId],
      [extras[0].playerId, extras[0].playerSessionId],
    ]);

    let currentRoom = room;
    for (const playerId of currentRoom.round.activePlayerIds) {
      currentRoom = await service.submitClue({
        roomCode: created.roomCode,
        playerSessionId: sessionsByPlayerId.get(playerId)!,
        clue: `clue-${playerId.slice(0, 4)}`,
      });
    }

    const activePlayerIds = [...currentRoom.round.activePlayerIds];
    const eliminatedPlayerId = activePlayerIds.find(
      (playerId) => playerId !== currentRoom.round.undercoverPlayerId,
    )!;
    const dissentTargetId = activePlayerIds.find((playerId) => playerId !== eliminatedPlayerId)!;

    for (const playerId of activePlayerIds) {
      currentRoom = await service.submitVote({
        roomCode: created.roomCode,
        playerSessionId: sessionsByPlayerId.get(playerId)!,
        targetPlayerId: playerId === eliminatedPlayerId ? dissentTargetId : eliminatedPlayerId,
      });
    }

    const continued = await service.continueRound({
      roomCode: created.roomCode,
      playerSessionId: created.playerSessionId,
    });

    expect(currentRoom.round.phase).toBe("round-resolution");
    expect(continued.round.phase).toBe("clue-entry");
    expect(continued.round.roundNumber).toBe(2);
    expect(continued.round.eliminatedPlayerId).toBeNull();
  });

  it("lets the host change the word pack between games", async () => {
    const service = createService();
    const created = await service.createRoom({ nickname: "Host" });

    const updated = await service.updateWordPack({
      roomCode: created.roomCode,
      playerSessionId: created.playerSessionId,
      wordPackId: "hard-mode",
    });

    expect(updated.wordPackId).toBe("hard-mode");
  });

  it("rejects word pack changes from non-host players", async () => {
    const service = createService();
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
    const service = createService();
    const created = await service.createRoom({ nickname: "Host" });

    const updated = await service.updateLocale({
      roomCode: created.roomCode,
      playerSessionId: created.playerSessionId,
      locale: "my",
    });

    expect(updated.locale).toBe("my");
    expect(updated.wordPackId).toBe("classic");
  });

  it("keeps the room pack when the new locale also supports it", async () => {
    const service = createService();
    const created = await service.createRoom({
      nickname: "Host",
      wordPackId: "tech-media",
    });

    const updated = await service.updateLocale({
      roomCode: created.roomCode,
      playerSessionId: created.playerSessionId,
      locale: "my",
    });

    expect(updated.wordPackId).toBe("tech-media");
  });

  it("rejects room locale changes from non-host players", async () => {
    const service = createService();
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
    const targetId = currentRoom.round.activePlayerIds.find((playerId) => playerId !== voter.id)!;
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

    const targetId = room.round.activePlayerIds[1]!;
    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitVote({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        targetPlayerId: playerId === targetId ? room.round.activePlayerIds[0]! : targetId,
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

    expect(room.round.phase).toBe("round-resolution");
    expect(room.round.gameNumber).toBe(1);
    expect(room.round.roundNumber).toBe(1);
    expect(room.round.eliminatedPlayerId).toBeNull();
    expect(room.round.resolutionReason).toBe("vote-skipped");
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

    const targetId = room.round.activePlayerIds[1]!;
    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitVote({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        targetPlayerId: playerId === targetId ? room.round.activePlayerIds[0]! : targetId,
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
    const { service, roomQueryService, created, room: startedRoom } = await createStartedRoom();
    let room = startedRoom;

    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitClue({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        clue: `clue-${playerId.slice(0, 4)}`,
      });
    }

    const targetId = room.round.activePlayerIds[1]!;
    for (const playerId of room.round.activePlayerIds) {
      const player = room.players.find((item) => item.id === playerId)!;
      room = await service.submitVote({
        roomCode: room.code,
        playerSessionId: player.sessionId,
        targetPlayerId: playerId === targetId ? room.round.activePlayerIds[0]! : targetId,
      });
    }

    const publicRoom = await roomQueryService.getPublicRoom(created.roomCode);

    expect(publicRoom.round.phase).toBe("results");
    expect(publicRoom.round.revealedUndercoverPlayerId).toBeTruthy();
  });
});
