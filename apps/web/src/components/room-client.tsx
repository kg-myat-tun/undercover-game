"use client";

import type { PublicRoom, Role } from "@undercover/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Card } from "./card";
import { serverUrl } from "../lib/config";
import { clearStoredSession, getStoredSession } from "../lib/session";
import { getSocket } from "../lib/socket";

type RoleState = {
  role: Role;
  word: string;
} | null;

type RoomClientProps = {
  roomCode: string;
};

export function RoomClient({ roomCode }: RoomClientProps) {
  const router = useRouter();
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [selfPlayerId, setSelfPlayerId] = useState<string | null>(null);
  const [roleState, setRoleState] = useState<RoleState>(null);
  const [clue, setClue] = useState("");
  const [selectedVote, setSelectedVote] = useState<string | "skip">("skip");
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(true);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [showVerdictReveal, setShowVerdictReveal] = useState(false);
  const [wordPacks, setWordPacks] = useState<
    Array<{ id: string; name: string; category: string; pairCount: number }>
  >([]);
  const previousPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const playerSessionId = getStoredSession(roomCode);
    socket.connect();

    const onSnapshot = (payload: {
      room: PublicRoom;
      selfPlayerId: string;
    }) => {
      setRoom(payload.room);
      setSelfPlayerId(payload.selfPlayerId);
      setReconnecting(false);
      setError(null);
    };

    const onRole = (payload: {
      role: Role;
      word: string;
      playerId: string;
    }) => {
      setRoleState({ role: payload.role, word: payload.word });
    };

    const onError = (payload: { message: string }) => {
      setError(payload.message);
      setReconnecting(false);
    };

    socket.on("room:snapshot", onSnapshot);
    socket.on("room:role", onRole);
    socket.on("room:error", onError);

    if (playerSessionId) {
      socket.emit("room:reconnect", { roomCode, playerSessionId });
    } else {
      setReconnecting(false);
      setError(
        "No local session found for this room. Join from the home screen to enter.",
      );
    }

    return () => {
      socket.off("room:snapshot", onSnapshot);
      socket.off("room:role", onRole);
      socket.off("room:error", onError);
    };
  }, [roomCode]);

  useEffect(() => {
    const abortController = new AbortController();

    fetch(`${serverUrl}/word-packs`, { signal: abortController.signal })
      .then((response) => response.json())
      .then((packs) => {
        if (Array.isArray(packs)) {
          setWordPacks(packs);
        }
      })
      .catch(() => {
        // Keep the selector empty if metadata fails to load.
      });

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    if (!room) {
      return;
    }

    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = room.round.phase;

    if (previousPhase !== "voting" || room.round.phase !== "results") {
      return;
    }

    setShowVerdictReveal(true);
    const timeoutId = window.setTimeout(() => {
      setShowVerdictReveal(false);
    }, 2400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [room]);

  const self = useMemo(
    () => room?.players.find((player) => player.id === selfPlayerId) ?? null,
    [room, selfPlayerId],
  );

  const activePlayers = useMemo(() => {
    if (!room) {
      return [];
    }

    const active = new Set(room.round.activePlayerIds);
    return room.players.filter((player) => active.has(player.id));
  }, [room]);

  const votesByVoterId = useMemo(() => {
    return new Map(room?.round.votes.map((vote) => [vote.voterId, vote]) ?? []);
  }, [room]);

  const voteTallies = useMemo(() => {
    if (!room) {
      return [];
    }

    const counts = new Map<string, number>();

    for (const vote of room.round.votes) {
      const key = vote.targetPlayerId ?? "skip";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        count,
        label:
          key === "skip"
            ? "Skip"
            : (room.players.find((player) => player.id === key)?.nickname ??
              "Unknown player"),
      }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return left.label.localeCompare(right.label);
      });
  }, [room]);

  if (reconnecting) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
        <Card className="w-full bg-white/92 p-4 text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-ink/50">
            Room {roomCode}
          </p>
          <h1 className="mt-4 text-3xl font-semibold">Reconnecting…</h1>
        </Card>
      </main>
    );
  }

  if (!room || !self) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
        <Card className="w-full bg-white/92 p-4 text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-ink/50">
            Room {roomCode}
          </p>
          <h1 className="mt-4 text-3xl font-semibold">Session not active</h1>
          <p className="mt-3 text-ink/65">
            {error ?? "This room could not be restored."}
          </p>
          <Link
            className="mt-6 inline-flex rounded-2xl bg-ink px-4 py-3 font-semibold text-paper"
            href="/"
          >
            Back home
          </Link>
        </Card>
      </main>
    );
  }

  const socket = getSocket();
  const isMyTurn = room.round.currentTurnPlayerId === self.id;
  const myVote = votesByVoterId.get(self.id);
  const votersSubmittedCount = room.round.votes.length;
  const votersRemainingCount = Math.max(
    room.round.activePlayerIds.length - votersSubmittedCount,
    0,
  );
  const myVoteLabel =
    myVote?.targetPlayerId === null
      ? "Skipped"
      : (room.players.find((player) => player.id === myVote?.targetPlayerId)
          ?.nickname ?? null);
  const visibleGameNumber =
    typeof room.round.gameNumber === "number" &&
    Number.isFinite(room.round.gameNumber)
      ? Math.max(room.round.gameNumber, 1)
      : 1;
  const visibleRoundNumber =
    typeof room.round.roundNumber === "number" &&
    Number.isFinite(room.round.roundNumber)
      ? Math.max(room.round.roundNumber, 1)
      : 1;
  const revealedUndercoverName =
    room.players.find(
      (player) => player.id === room.round.revealedUndercoverPlayerId,
    )?.nickname ?? null;
  const eliminatedPlayerName =
    room.players.find((player) => player.id === room.round.eliminatedPlayerId)
      ?.nickname ?? "None";
  const eliminatedByNames = room.round.votes
    .filter((vote) => vote.targetPlayerId === room.round.eliminatedPlayerId)
    .map(
      (vote) =>
        room.players.find((player) => player.id === vote.voterId)?.nickname ??
        "Unknown",
    )
    .join(", ");
  const skippedByNames = room.round.votes
    .filter((vote) => vote.targetPlayerId === null)
    .map(
      (vote) =>
        room.players.find((player) => player.id === vote.voterId)?.nickname ??
        "Unknown",
    )
    .join(", ");

  const leaveRoom = () => {
    const sessionId = getStoredSession(roomCode);
    if (sessionId) {
      socket.emit("room:leave", { roomCode, playerSessionId: sessionId });
    }
    clearStoredSession(roomCode);
    router.push("/");
  };

  const kickPlayer = (targetPlayerId: string) => {
    const sessionId = getStoredSession(roomCode);
    if (!sessionId) {
      return;
    }

    socket.emit("room:kick", {
      roomCode,
      playerSessionId: sessionId,
      targetPlayerId,
    });
  };

  const startRound = () => {
    const sessionId = getStoredSession(roomCode);
    if (!sessionId) {
      return;
    }

    setRoleState(null);
    socket.emit("round:start", { roomCode, playerSessionId: sessionId });
  };

  const updateWordPack = (wordPackId: string) => {
    const sessionId = getStoredSession(roomCode);
    if (!sessionId) {
      return;
    }

    socket.emit("room:update-word-pack", {
      roomCode,
      playerSessionId: sessionId,
      wordPackId,
    });
  };

  const submitClue = () => {
    const sessionId = getStoredSession(roomCode);
    if (!sessionId || !clue.trim()) {
      return;
    }

    socket.emit("round:clue", { roomCode, playerSessionId: sessionId, clue });
    setClue("");
  };

  const submitVote = () => {
    const sessionId = getStoredSession(roomCode);
    if (!sessionId) {
      return;
    }

    socket.emit("round:vote", {
      roomCode,
      playerSessionId: sessionId,
      targetPlayerId: selectedVote === "skip" ? null : selectedVote,
    });
  };

  const shareInvite = async () => {
    const inviteUrl =
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}/?room=${encodeURIComponent(room.code)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my Undercover room",
          text: `Join room ${room.code} in Undercover.`,
          url: inviteUrl,
        });
        setInviteFeedback("Invite link shared.");
        return;
      }

      await navigator.clipboard.writeText(inviteUrl);
      setInviteFeedback("Invite link copied.");
    } catch {
      setInviteFeedback("Could not share the invite link.");
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6">
      {showVerdictReveal && room.round.phase === "results" ? (
        <div className="verdict-overlay">
          <div
            className={`verdict-bar ${room.round.eliminatedPlayerId ? "eliminated" : "skipped"}`}
          >
            <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
              <p className="verdict-title text-xs font-semibold text-white/55">
                Voting Complete
              </p>
              <div className="mt-4 h-px w-24 bg-white/20" />
              <div className="mt-6 flex flex-col items-center gap-4">
                <p className="text-sm font-semibold uppercase tracking-[0.34em] text-white/48">
                  {room.round.eliminatedPlayerId
                    ? "Elimination"
                    : "No elimination"}
                </p>
                <h2 className="verdict-wordmark text-4xl font-semibold md:text-6xl">
                  {room.round.eliminatedPlayerId
                    ? `${eliminatedPlayerName} was eliminated`
                    : "No one was eliminated"}
                </h2>
                <p className="max-w-3xl text-base text-white/78 md:text-xl">
                  {room.round.eliminatedPlayerId
                    ? `Votes cast by: ${eliminatedByNames || "No votes recorded"}`
                    : `Skip votes cast by: ${skippedByNames || "No skip votes recorded"}`}
                </p>
              </div>
              <div className="mt-6 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-white/72">
                {room.round.eliminatedPlayerId
                  ? "Decision locked in"
                  : "Round skipped"}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.28em] text-ink/50">
            <p>Room {room.code}</p>
            <span className="h-1 w-1 rounded-full bg-ink/25" />
            <p>Game {visibleGameNumber}</p>
            <span className="h-1 w-1 rounded-full bg-ink/25" />
            <p>Round {visibleRoundNumber}</p>
          </div>
          <h1 className="mt-2 font-display text-4xl leading-none md:text-5xl">
            Stay convincing
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink/70 md:text-lg">
            Each clue narrows the room. Sound natural, but not too natural.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={shareInvite}
            className="rounded-xl border border-black/10 bg-white/75 px-3 py-2.5 font-semibold"
          >
            Invite players
          </button>
          <button
            onClick={leaveRoom}
            className="rounded-xl border border-black/10 px-3 py-2.5 font-semibold"
          >
            Leave room
          </button>
          {self.isHost ? (
            <button
              onClick={startRound}
              disabled={
                room.players.length < 3 ||
                (room.round.phase !== "lobby" && room.round.phase !== "results")
              }
              className="rounded-xl bg-accent px-3 py-2.5 font-semibold text-white"
            >
              {room.round.phase === "results"
                ? "Start next round"
                : "Start round"}
            </button>
          ) : null}
        </div>
      </header>

      {error ? (
        <Card className="border border-accent/30 bg-accent/10 p-4">
          <p className="font-semibold text-accent">{error}</p>
        </Card>
      ) : null}

      {inviteFeedback ? (
        <Card className="border border-mint/35 bg-mint/15 p-4">
          <p className="font-semibold text-ink">{inviteFeedback}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <Card className="bg-white/92 p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/50">
                  Your secret
                </p>
                <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
                  {roleState
                    ? roleState.word
                    : room.round.phase === "lobby"
                      ? "Waiting for round start"
                      : "Hidden"}
                </h2>
                <p className="mt-1 text-sm text-ink/65 md:text-base">
                  {roleState
                    ? `Role: ${roleState.role === "undercover" ? "Undercover" : "Civilian"}`
                    : "Your role appears here after the host starts the round."}
                </p>
              </div>
              <div className="rounded-2xl bg-sand/35 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.28em] text-ink/45">
                  Game
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {visibleGameNumber}
                </p>
              </div>
              <div className="rounded-2xl bg-sand/35 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.28em] text-ink/45">
                  Round
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {visibleRoundNumber}
                </p>
              </div>
              <div className="rounded-2xl bg-sand/35 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.28em] text-ink/45">
                  Phase
                </p>
                <p className="mt-1 text-lg font-semibold capitalize">
                  {room.round.phase.replace("-", " ")}
                </p>
              </div>
            </div>
          </Card>

          {room.round.phase === "lobby" ? (
            <Card className="bg-white/92 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/50">
                Lobby
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Gather your suspects
              </h2>
              <p className="mt-2 text-ink/68">
                The host can start once at least three players have joined.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink/45">
                    Word pack
                  </p>
                  <select
                    value={room.wordPackId}
                    onChange={(event) => updateWordPack(event.target.value)}
                    disabled={!self.isHost}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-ink outline-none transition focus:border-accent disabled:bg-black/[0.03]"
                  >
                    {wordPacks.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {pack.name} • {pack.category} • {pack.pairCount} pairs
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-xl bg-black/[0.03] px-4 py-3 text-sm text-ink/68">
                  {self.isHost
                    ? "Host can change pack before starting."
                    : "Waiting for host to choose the pack."}
                </div>
              </div>
            </Card>
          ) : null}

          {room.round.phase === "clue-entry" ? (
            <Card className="space-y-3 bg-white/92 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/50">
                  Clues
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {isMyTurn ? "Your turn to speak" : "Another player is up"}
                </h2>
                <p className="mt-2 text-sm text-ink/68 md:text-base">
                  {isMyTurn
                    ? "Give one clue that fits your word without making it too obvious."
                    : "Watch the clue list and wait for your turn."}
                </p>
              </div>

              <div className="space-y-2">
                {room.round.clues.map((entry) => {
                  const player = room.players.find(
                    (item) => item.id === entry.playerId,
                  );
                  return (
                    <div
                      key={entry.playerId}
                      className="rounded-xl bg-black/[0.03] px-3 py-2.5"
                    >
                      <p className="text-sm text-ink/50">{player?.nickname}</p>
                      <p className="text-base font-medium">{entry.clue}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={clue}
                  onChange={(event) => setClue(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      isMyTurn &&
                      clue.trim().length >= 1
                    ) {
                      submitClue();
                    }
                  }}
                  disabled={!isMyTurn}
                  placeholder={
                    isMyTurn ? "Enter your clue" : "Wait for your turn"
                  }
                  className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-accent"
                />
                <button
                  onClick={submitClue}
                  disabled={!isMyTurn || clue.trim().length < 1}
                  className="rounded-xl bg-ink px-4 py-3 font-semibold text-paper"
                >
                  Submit clue
                </button>
              </div>
            </Card>
          ) : null}

          {room.round.phase === "voting" ? (
            <Card className="space-y-3 bg-white/92 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/50">
                  Voting
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  Who sounded off?
                </h2>
                <p className="mt-2 text-sm text-ink/68 md:text-base">
                  Choose one active player or skip. If skip gets the most votes,
                  the room goes to another clue round.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-black/8 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/45">
                        Vote progress
                      </p>
                      <p className="mt-1 text-xl font-semibold">
                        {votersSubmittedCount}/
                        {room.round.activePlayerIds.length} locked in
                      </p>
                    </div>
                    <div className="rounded-xl bg-black/[0.04] px-3 py-2 text-right">
                      <p className="text-xs uppercase tracking-[0.28em] text-ink/45">
                        Remaining
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {votersRemainingCount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/[0.06]">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{
                        width: `${(votersSubmittedCount / Math.max(room.round.activePlayerIds.length, 1)) * 100}%`,
                      }}
                    />
                  </div>

                  {myVote ? (
                    <p className="mt-3 text-sm text-ink/70">
                      You already voted:{" "}
                      <span className="font-semibold text-ink">
                        {myVoteLabel}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-ink/70">
                      Your vote is private until the round resolves.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-black/8 bg-black/[0.025] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/45">
                    Room status
                  </p>
                  <div className="mt-2 space-y-2">
                    {activePlayers.map((player) => {
                      const vote = votesByVoterId.get(player.id);
                      return (
                        <div
                          key={player.id}
                          className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5"
                        >
                          <div>
                            <p className="font-medium text-ink">
                              {player.nickname}{" "}
                              {player.id === self.id ? "• You" : ""}
                            </p>
                            <p className="text-sm text-ink/50">
                              {vote ? "Vote submitted" : "Choosing now"}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                              vote
                                ? "bg-mint/20 text-ink"
                                : "bg-sand/35 text-ink/65"
                            }`}
                          >
                            {vote ? "Done" : "Waiting"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <label
                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-2.5 transition ${
                    selectedVote === "skip"
                      ? "border-accent bg-accent/10"
                      : "border-black/10 bg-white"
                  }`}
                >
                  <span className="font-medium">Skip this vote</span>
                  <input
                    type="radio"
                    name="vote"
                    checked={selectedVote === "skip"}
                    disabled={Boolean(myVote)}
                    onChange={() => setSelectedVote("skip")}
                  />
                </label>
                {activePlayers.map((player) => (
                  <label
                    key={player.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-2.5 transition ${
                      selectedVote === player.id
                        ? "border-accent bg-accent/10"
                        : "border-black/10 bg-white"
                    }`}
                  >
                    <div>
                      <span className="font-medium">{player.nickname}</span>
                      {votesByVoterId.has(player.id) ? (
                        <p className="mt-1 text-sm text-ink/45">
                          Already voted
                        </p>
                      ) : null}
                    </div>
                    <input
                      type="radio"
                      name="vote"
                      checked={selectedVote === player.id}
                      disabled={Boolean(myVote)}
                      onChange={() => setSelectedVote(player.id)}
                    />
                  </label>
                ))}
              </div>

              <button
                onClick={submitVote}
                disabled={Boolean(myVote)}
                className="rounded-xl bg-accent px-4 py-3 font-semibold text-white"
              >
                {myVote ? `Vote submitted • ${myVoteLabel}` : "Submit vote"}
              </button>
            </Card>
          ) : null}

          {room.round.phase === "results" ? (
            <Card className="space-y-3 bg-white/92 p-4">
              <div className="result-stage rounded-[22px] px-4 py-4 text-paper">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-paper/60">
                  Round Result
                </p>
                <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-paper">
                      Round {visibleRoundNumber}
                    </h2>
                    <p className="mt-2 text-3xl font-semibold text-white md:text-4xl">
                      {room.round.outcome?.winner === "civilians"
                        ? "Civilians win"
                        : "Undercover wins"}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-paper/78">
                    Game {visibleGameNumber}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-paper/55">
                      Undercover
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {revealedUndercoverName ?? "Hidden"}
                    </p>
                    <p className="mt-1 text-sm text-paper/66">
                      Identity revealed after the game ends.
                    </p>
                  </div>
                  <div className="eliminated-reveal relative overflow-hidden rounded-2xl border border-accent/30 bg-[#301f1c] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f5b8ab]">
                      Eliminated
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-white">
                      {eliminatedPlayerName}
                    </p>
                    <p className="mt-1 text-sm text-[#f5d8d1]">
                      Voted out in the deciding reveal.
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-paper/72">
                  {room.round.outcome?.winner === "civilians"
                    ? "Civilians win"
                    : "Undercover wins"}
                  {room.round.outcome?.reason === "vote-skipped"
                    ? " The room chose to skip, so nobody was eliminated and another clue round started."
                    : revealedUndercoverName
                      ? ` ${revealedUndercoverName} was the Undercover. Votes are now revealed for the completed round.`
                      : " Votes are now revealed for the completed round."}
                </p>
              </div>

              {self.isHost ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-accent/8 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Ready for another match?
                    </p>
                    <p className="text-sm text-ink/62">
                      Start a fresh round with the same room.
                    </p>
                  </div>
                  <button
                    onClick={startRound}
                    disabled={room.players.length < 3}
                    className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-white"
                  >
                    Restart game
                  </button>
                </div>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-black/8 bg-black/[0.025] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/45">
                    Vote tally
                  </p>
                  <div className="mt-2 grid gap-2">
                    {voteTallies.map((entry) => (
                      <div
                        key={entry.key}
                        className="rounded-xl bg-white px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-ink">{entry.label}</p>
                          <span className="rounded-full bg-accent/12 px-3 py-1 text-sm font-semibold text-ink">
                            {entry.count} vote{entry.count === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/8 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/45">
                    Who voted for whom
                  </p>
                  <div className="mt-2 space-y-2">
                    {room.round.votes.map((vote) => {
                      const voter = room.players.find(
                        (player) => player.id === vote.voterId,
                      );
                      const target =
                        vote.targetPlayerId === null
                          ? "Skip"
                          : (room.players.find(
                              (player) => player.id === vote.targetPlayerId,
                            )?.nickname ?? "Unknown player");

                      return (
                        <div
                          key={vote.voterId}
                          className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2.5"
                        >
                          <div>
                            <p className="font-medium text-ink">
                              {voter?.nickname ?? "Unknown player"}
                            </p>
                            <p className="text-sm text-ink/48">
                              Final vote submitted
                            </p>
                          </div>
                          <span className="rounded-full bg-sand/35 px-3 py-1 text-sm font-semibold text-ink">
                            {target}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {room.players.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-xl bg-black/[0.03] px-3 py-2.5"
                  >
                    <p className="text-sm text-ink/45">{player.nickname}</p>
                    <p className="text-xl font-semibold">
                      {room.scoreboard[player.id] ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="grid gap-4">
          <Card className="bg-white/92 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/50">
              Players
            </p>
            <div className="mt-3 grid gap-2">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2.5"
                >
                  <div>
                    <p className="font-medium">{player.nickname}</p>
                    <p className="text-sm text-ink/45">
                      {player.isHost ? "Host" : "Player"}{" "}
                      {player.id === room.round.currentTurnPlayerId
                        ? "• Current turn"
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {self.isHost &&
                    player.id !== self.id &&
                    room.round.phase === "lobby" ? (
                      <button
                        onClick={() => kickPlayer(player.id)}
                        className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold"
                      >
                        Remove
                      </button>
                    ) : null}
                    <span
                      className={`h-3 w-3 rounded-full ${player.isConnected ? "bg-mint" : "bg-accent"}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white/92 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink/50">
              Round notes
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink/68 md:text-base">
              <li>Everyone hears all clues before voting opens.</li>
              <li>
                The server decides turn order, vote results, and win conditions.
              </li>
              <li>Reconnect uses your saved room session on this device.</li>
            </ul>
          </Card>
        </div>
      </div>
    </main>
  );
}
