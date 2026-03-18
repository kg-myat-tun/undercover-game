"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Card } from "./card";
import { serverUrl } from "../lib/config";
import { getSocket } from "../lib/socket";
import { storeSession } from "../lib/session";

function isEnterKey(event: { key: string }) {
  return event.key === "Enter";
}

export function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [wordPacks, setWordPacks] = useState<
    Array<{ id: string; name: string; category: string; pairCount: number }>
  >([]);
  const [selectedWordPackId, setSelectedWordPackId] = useState("classic");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const invitedRoomCode = searchParams.get("room");
    if (invitedRoomCode) {
      setJoinCode(invitedRoomCode.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    const abortController = new AbortController();

    fetch(`${serverUrl}/word-packs`, { signal: abortController.signal })
      .then((response) => response.json())
      .then((packs) => {
        if (!Array.isArray(packs)) {
          return;
        }

        setWordPacks(packs);
        if (packs[0]?.id && !packs.some((pack) => pack.id === selectedWordPackId)) {
          setSelectedWordPackId(packs[0].id);
        }
      })
      .catch(() => {
        // Keep the default pack if metadata is unavailable.
      });

    return () => {
      abortController.abort();
    };
  }, [selectedWordPackId]);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    const onError = (payload: { message: string }) => setError(payload.message);

    socket.on("room:error", onError);
    return () => {
      socket.off("room:error", onError);
    };
  }, []);

  const createRoom = () => {
    setError(null);
    const socket = getSocket();
    socket.emit(
      "room:create",
      { nickname: createName, wordPackId: selectedWordPackId },
      (result) => {
      if (!result.roomCode) {
        return;
      }

      storeSession(result.roomCode, result.playerSessionId);
      startTransition(() => {
        router.push(`/room/${result.roomCode}`);
      });
      },
    );
  };

  const joinRoom = () => {
    setError(null);
    const roomCode = joinCode.toUpperCase();
    const socket = getSocket();
    socket.emit("room:join", { roomCode, nickname: joinName }, (result) => {
      if (!result.roomCode) {
        return;
      }

      storeSession(result.roomCode, result.playerSessionId);
      startTransition(() => {
        router.push(`/room/${result.roomCode}`);
      });
    });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12">
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card className="flex flex-col justify-between gap-8 overflow-hidden border-[#26333a] bg-[#1f2a30] text-[#fff7ec]">
          <div className="space-y-5">
            <p className="text-sm uppercase tracking-[0.35em] text-[#f4d9bb]/85">Realtime Party Game</p>
            <h1 className="font-display text-5xl leading-none text-[#fff7ec] md:text-7xl">Undercover</h1>
            <p className="max-w-xl text-lg leading-8 text-[#f7ebda]/90">
              Create a room, hand out secret words, trade clues, and vote out the player who sounds
              just a little bit off.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm uppercase tracking-wide text-[#f0cfaa]">Players</p>
              <p className="mt-2 text-3xl font-semibold text-white">3-8</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm uppercase tracking-wide text-[#f0cfaa]">Rounds</p>
              <p className="mt-2 text-3xl font-semibold text-white">Endless</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm uppercase tracking-wide text-[#f0cfaa]">Join</p>
              <p className="mt-2 text-3xl font-semibold text-white">Code</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="space-y-4 bg-white/92">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink/55">Host a room</p>
              <h2 className="mt-2 text-3xl font-semibold">Start the suspicion</h2>
            </div>
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              onKeyDown={(event) => {
                if (isEnterKey(event) && createName.trim().length >= 2 && !isPending) {
                  createRoom();
                }
              }}
              placeholder="Your nickname"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-ink outline-none transition focus:border-accent"
            />
            <select
              value={selectedWordPackId}
              onChange={(event) => setSelectedWordPackId(event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-ink outline-none transition focus:border-accent"
            >
              {wordPacks.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.name} • {pack.category} • {pack.pairCount} pairs
                </option>
              ))}
            </select>
            <button
              onClick={createRoom}
              disabled={isPending || createName.trim().length < 2}
              className="rounded-2xl bg-accent px-4 py-3 font-semibold text-white transition hover:bg-[#d65f43]"
            >
              Create room
            </button>
          </Card>

          <Card className="space-y-4 bg-white/92">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink/55">Join a room</p>
              <h2 className="mt-2 text-3xl font-semibold">Blend in quickly</h2>
            </div>
            {joinCode ? (
              <div className="rounded-2xl border border-mint/35 bg-mint/15 px-4 py-3 text-sm text-ink/80">
                Invitation ready for room <span className="font-semibold">{joinCode}</span>. Add your nickname
                and join.
              </div>
            ) : null}
            <input
              value={joinName}
              onChange={(event) => setJoinName(event.target.value)}
              onKeyDown={(event) => {
                if (isEnterKey(event) && joinName.trim().length >= 2 && joinCode.trim().length >= 4 && !isPending) {
                  joinRoom();
                }
              }}
              placeholder="Your nickname"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-ink outline-none transition focus:border-accent"
            />
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (isEnterKey(event) && joinName.trim().length >= 2 && joinCode.trim().length >= 4 && !isPending) {
                  joinRoom();
                }
              }}
              placeholder="Room code"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 uppercase text-ink outline-none transition focus:border-accent"
            />
            <button
              onClick={joinRoom}
              disabled={isPending || joinName.trim().length < 2 || joinCode.trim().length < 4}
              className="rounded-2xl bg-mint px-4 py-3 font-semibold text-ink transition hover:bg-[#5a9f78]"
            >
              Join room
            </button>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
          </Card>
        </div>
      </div>
    </main>
  );
}
