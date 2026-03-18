import { Inject, Injectable } from "@nestjs/common";
import {
  createEmptyRound,
  createRound,
  continueRound,
  finalizeRound,
  getRoleForPlayer,
  getDefaultWordPackId,
  isWordPackAvailableInLocale,
  normalizeWordPackId,
  submitClue,
  submitVote,
  type CreateRoomInput,
  type JoinRoomInput,
  type KickPlayerInput,
  type LeaveRoomInput,
  type ReconnectRoomInput,
  type ContinueRoundInput,
  type UpdateLocaleInput,
  type Role,
  type Room,
  type StartRoundInput,
  type UpdateWordPackInput,
  type SubmitClueInput,
  type SubmitVoteInput
} from "@undercover/shared";
import { randomUUID } from "node:crypto";

import { ROOM_STORE, type RoomStore } from "../redis/room-store.js";
import { RoomError } from "./errors.js";
import { RoomQueryService } from "./room-query.service.js";

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 8;

type PlayerSecrets = {
  playerId: string;
  role: Role;
  word: string;
};

@Injectable()
export class RoomService {
  constructor(
    @Inject(ROOM_STORE) private readonly store: RoomStore,
    private readonly roomQueryService: RoomQueryService
  ) {}

  async createRoom(input: CreateRoomInput) {
    const roomCode = await this.generateRoomCode();
    const sessionId = randomUUID();
    const playerId = randomUUID();
    const now = Date.now();

    const room: Room = {
      id: randomUUID(),
      code: roomCode,
      wordPackId: normalizeWordPackId(
        input.wordPackId &&
          isWordPackAvailableInLocale(input.wordPackId, input.locale ?? "en")
          ? input.wordPackId
          : getDefaultWordPackId(input.locale ?? "en")
      ),
      locale: input.locale ?? "en",
      createdAt: now,
      players: [
        {
          id: playerId,
          sessionId,
          nickname: input.nickname.trim(),
          isHost: true,
          isConnected: true,
          joinedAt: now,
          eliminatedAt: null
        }
      ],
      round: createEmptyRound(),
      scoreboard: {}
    };

    await this.store.saveRoom(room);

    return {
      room,
      roomCode,
      playerSessionId: sessionId,
      playerId
    };
  }

  async joinRoom(input: JoinRoomInput) {
    const room = await this.roomQueryService.getRoomOrThrow(input.roomCode);
    const reconnectCandidate = input.playerSessionId
      ? room.players.find((player) => player.sessionId === input.playerSessionId)
      : undefined;

    if (reconnectCandidate) {
      reconnectCandidate.isConnected = true;
      await this.store.saveRoom(room);

      return {
        room,
        roomCode: room.code,
        playerSessionId: reconnectCandidate.sessionId,
        playerId: reconnectCandidate.id
      };
    }

    if (room.players.length >= MAX_PLAYERS) {
      throw new RoomError("ROOM_FULL", "This room already has the maximum number of players.");
    }

    const nickname = input.nickname.trim();
    if (
      room.players.some((player) => player.nickname.toLowerCase() === nickname.toLowerCase())
    ) {
      throw new RoomError("DUPLICATE_NICKNAME", "That nickname is already in use in this room.");
    }

    const playerId = randomUUID();
    const playerSessionId = randomUUID();
    room.players.push({
      id: playerId,
      sessionId: playerSessionId,
      nickname,
      isHost: false,
      isConnected: true,
      joinedAt: Date.now(),
      eliminatedAt: null
    });

    await this.store.saveRoom(room);

    return {
      room,
      roomCode: room.code,
      playerSessionId,
      playerId
    };
  }

  async reconnect(input: ReconnectRoomInput): Promise<Room> {
    const room = await this.roomQueryService.getRoomOrThrow(input.roomCode);
    const player = room.players.find((item) => item.sessionId === input.playerSessionId);

    if (!player) {
      throw new RoomError("PLAYER_NOT_FOUND", "Could not restore your player session.");
    }

    player.isConnected = true;
    await this.store.saveRoom(room);
    return room;
  }

  async leaveRoom(input: LeaveRoomInput): Promise<Room | null> {
    const room = await this.roomQueryService.getRoomOrThrow(input.roomCode);
    const playerIndex = room.players.findIndex((player) => player.sessionId === input.playerSessionId);

    if (playerIndex < 0) {
      throw new RoomError("PLAYER_NOT_FOUND", "Player session not found in room.");
    }

    const [player] = room.players.splice(playerIndex, 1);

    if (!player) {
      return room;
    }

    if (room.players.length === 0) {
      await this.store.deleteRoom(room.code);
      return null;
    }

    this.removePlayerFromCurrentRound(room, player.id);
    this.reassignHost(room);
    await this.store.saveRoom(room);
    return room;
  }

  async disconnect(roomCode: string, playerSessionId: string): Promise<Room | null> {
    const room = await this.store.getRoom(roomCode);

    if (!room) {
      return null;
    }

    const player = room.players.find((item) => item.sessionId === playerSessionId);
    if (!player) {
      return room;
    }

    player.isConnected = false;
    this.removePlayerFromCurrentRound(room, player.id);

    if (player.isHost) {
      player.isHost = false;
      this.reassignHost(room);
    }

    await this.store.saveRoom(room);
    return room;
  }

  async kickPlayer(input: KickPlayerInput): Promise<Room> {
    const room = await this.roomQueryService.getRoomOrThrow(input.roomCode);
    const actor = room.players.find((player) => player.sessionId === input.playerSessionId);
    if (!actor?.isHost) {
      throw new RoomError("NOT_HOST", "Only the host can remove players.");
    }

    const targetIndex = room.players.findIndex((player) => player.id === input.targetPlayerId);
    if (targetIndex < 0) {
      throw new RoomError("PLAYER_NOT_FOUND", "That player is no longer in the room.");
    }

    this.removePlayerFromCurrentRound(room, room.players[targetIndex].id);
    room.players.splice(targetIndex, 1);
    this.reassignHost(room);
    await this.store.saveRoom(room);
    return room;
  }

  async startRound(input: StartRoundInput): Promise<{ room: Room; secrets: PlayerSecrets[] }> {
    const room = await this.roomQueryService.getRoomOrThrow(input.roomCode);
    const actor = room.players.find((player) => player.sessionId === input.playerSessionId);

    if (!actor?.isHost) {
      throw new RoomError("NOT_HOST", "Only the host can start a round.");
    }

    if (room.players.length < MIN_PLAYERS) {
      throw new RoomError("BAD_REQUEST", "At least three players are required to start.");
    }

    if (room.round.phase !== "lobby" && room.round.phase !== "results") {
      throw new RoomError("INVALID_PHASE", "The room is already in the middle of a round.");
    }

    room.round = createRound(room);
    await this.store.saveRoom(room);

    return {
      room,
      secrets: room.players.map((player) => ({
        playerId: player.id,
        role: getRoleForPlayer(room.round, player.id),
        word:
          room.round.undercoverPlayerId === player.id
            ? room.round.undercoverWord ?? ""
            : room.round.civilianWord ?? ""
      }))
    };
  }

  async updateWordPack(input: UpdateWordPackInput): Promise<Room> {
    const room = await this.roomQueryService.getRoomOrThrow(input.roomCode);
    const actor = room.players.find((player) => player.sessionId === input.playerSessionId);

    if (!actor?.isHost) {
      throw new RoomError("NOT_HOST", "Only the host can change the word pack.");
    }

    if (room.round.phase !== "lobby" && room.round.phase !== "results") {
      throw new RoomError("INVALID_PHASE", "Word packs can only be changed between games.");
    }

    if (!isWordPackAvailableInLocale(input.wordPackId, room.locale)) {
      throw new RoomError("BAD_REQUEST", "That word pack is not available in this room language.");
    }

    room.wordPackId = normalizeWordPackId(input.wordPackId);
    await this.store.saveRoom(room);
    return room;
  }

  async updateLocale(input: UpdateLocaleInput): Promise<Room> {
    const room = await this.roomQueryService.getRoomOrThrow(input.roomCode);
    const actor = room.players.find((player) => player.sessionId === input.playerSessionId);

    if (!actor?.isHost) {
      throw new RoomError("NOT_HOST", "Only the host can change the room language.");
    }

    if (room.round.phase !== "lobby" && room.round.phase !== "results") {
      throw new RoomError("INVALID_PHASE", "Room language can only be changed between games.");
    }

    room.locale = input.locale;
    if (!isWordPackAvailableInLocale(room.wordPackId, input.locale)) {
      room.wordPackId = getDefaultWordPackId(input.locale);
    }

    await this.store.saveRoom(room);
    return room;
  }

  async submitClue(input: SubmitClueInput): Promise<Room> {
    const room = await this.roomQueryService.getRoomOrThrow(input.roomCode);
    const player = room.players.find((item) => item.sessionId === input.playerSessionId);

    if (!player) {
      throw new RoomError("PLAYER_NOT_FOUND", "Player is not part of this room.");
    }

    if (room.round.phase !== "clue-entry") {
      throw new RoomError("INVALID_PHASE", "Clues can only be submitted during clue entry.");
    }

    if (!room.round.activePlayerIds.includes(player.id)) {
      throw new RoomError("BAD_REQUEST", "You are not active in this round anymore.");
    }

    if (room.round.currentTurnPlayerId !== player.id) {
      throw new RoomError("NOT_YOUR_TURN", "Wait for your turn before submitting a clue.");
    }

    room.round = submitClue(room.round, player.id, input.clue.trim());
    await this.store.saveRoom(room);
    return room;
  }

  async submitVote(input: SubmitVoteInput): Promise<Room> {
    const room = await this.roomQueryService.getRoomOrThrow(input.roomCode);
    const voter = room.players.find((item) => item.sessionId === input.playerSessionId);

    if (!voter) {
      throw new RoomError("PLAYER_NOT_FOUND", "Player is not part of this room.");
    }

    if (room.round.phase !== "voting") {
      throw new RoomError("INVALID_PHASE", "Voting is not open right now.");
    }

    if (!room.round.activePlayerIds.includes(voter.id)) {
      throw new RoomError("BAD_REQUEST", "You are not active in this round anymore.");
    }

    if (input.targetPlayerId === voter.id) {
      throw new RoomError("BAD_REQUEST", "You cannot vote for yourself.");
    }

    if (input.targetPlayerId && !room.round.activePlayerIds.includes(input.targetPlayerId)) {
      throw new RoomError("PLAYER_NOT_FOUND", "Vote target is not active in the round.");
    }

    if (room.round.votes.some((vote) => vote.voterId === voter.id)) {
      throw new RoomError("BAD_REQUEST", "You have already voted in this round.");
    }

    room.round = submitVote(room.round, voter.id, input.targetPlayerId ?? null);

    if (room.round.votes.length >= room.round.activePlayerIds.length) {
      const finalized = finalizeRound(room);
      await this.store.saveRoom(finalized);
      return finalized;
    }

    await this.store.saveRoom(room);
    return room;
  }

  async continueRound(input: ContinueRoundInput): Promise<Room> {
    const room = await this.roomQueryService.getRoomOrThrow(input.roomCode);
    const actor = room.players.find((player) => player.sessionId === input.playerSessionId);

    if (!actor?.isHost) {
      throw new RoomError("NOT_HOST", "Only the host can continue to the next round.");
    }

    if (room.round.phase !== "round-resolution") {
      throw new RoomError("INVALID_PHASE", "This round is not waiting for continuation.");
    }

    const updated = continueRound(room);
    await this.store.saveRoom(updated);
    return updated;
  }

  private async generateRoomCode(): Promise<string> {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    while (true) {
      const code = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
      const existing = await this.store.getRoom(code);

      if (!existing) {
        return code;
      }
    }
  }

  private reassignHost(room: Room) {
    if (room.players.some((player) => player.isHost)) {
      return;
    }

    const nextHost = [...room.players]
      .filter((player) => player.isConnected)
      .sort((left, right) => left.joinedAt - right.joinedAt)[0] ??
      [...room.players].sort((left, right) => left.joinedAt - right.joinedAt)[0];
    if (nextHost) {
      nextHost.isHost = true;
    }
  }

  private removePlayerFromCurrentRound(room: Room, playerId: string) {
    if (room.round.phase === "lobby" || room.round.phase === "results") {
      return;
    }

    if (!room.round.activePlayerIds.includes(playerId)) {
      return;
    }

    const previousActivePlayerIds = [...room.round.activePlayerIds];
    const nextActivePlayerIds = previousActivePlayerIds.filter((id) => id !== playerId);
    const currentTurnIndex = previousActivePlayerIds.findIndex((id) => id === room.round.currentTurnPlayerId);

    room.round.activePlayerIds = nextActivePlayerIds;
    room.round.votes = room.round.votes.filter(
      (vote) => vote.voterId !== playerId && vote.targetPlayerId !== playerId
    );

    if (room.round.currentTurnPlayerId === playerId) {
      const nextTurnCandidate = nextActivePlayerIds[currentTurnIndex] ?? null;
      room.round.currentTurnPlayerId = nextTurnCandidate;
    }

    if (nextActivePlayerIds.length < MIN_PLAYERS) {
      room.round = {
        ...createEmptyRound(),
        gameNumber: room.round.gameNumber,
        roundNumber: room.round.roundNumber
      };
      return;
    }

    if (room.round.phase === "clue-entry" && room.round.currentTurnPlayerId === null) {
      room.round.phase = "voting";
    }

    if (
      (room.round.phase === "voting" || room.round.phase === "round-resolution") &&
      room.round.votes.length >= nextActivePlayerIds.length
    ) {
      const updated = finalizeRound(room);
      room.round = updated.round;
      room.scoreboard = updated.scoreboard;
    }
  }
}
