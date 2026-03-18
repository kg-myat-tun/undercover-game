"use client";

import type { ServerErrorPayload } from "@undercover/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { serverUrl } from "../../../shared/lib/config";
import { translateError } from "../../../shared/lib/i18n";
import { getPreferredLocale, storePreferredLocale, type AppLocale } from "../../../shared/lib/locale";
import { storeSession } from "../../../shared/lib/session";
import { getSocket } from "../../../shared/lib/socket";

export function useHomeClientState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<AppLocale>("en");
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [wordPacks, setWordPacks] = useState<
    Array<{ id: string; name: string; category: string; pairCount: number; availableLocales: string[] }>
  >([]);
  const [selectedWordPackId, setSelectedWordPackId] = useState("classic");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLocale(getPreferredLocale());
  }, []);

  useEffect(() => {
    storePreferredLocale(locale);
  }, [locale]);

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
      })
      .catch(() => {
        // Keep the default pack if metadata is unavailable.
      });

    return () => {
      abortController.abort();
    };
  }, [selectedWordPackId]);

  const visibleWordPacks = wordPacks.filter((pack) => pack.availableLocales.includes(locale));

  useEffect(() => {
    if (!visibleWordPacks.length) {
      return;
    }

    if (!visibleWordPacks.some((pack) => pack.id === selectedWordPackId)) {
      setSelectedWordPackId(visibleWordPacks[0].id);
    }
  }, [selectedWordPackId, visibleWordPacks]);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    const onError = (payload: Pick<ServerErrorPayload, "code" | "message">) =>
      setError(translateError(locale, payload));

    socket.on("room:error", onError);
    return () => {
      socket.off("room:error", onError);
    };
  }, [locale]);

  const createRoom = () => {
    setError(null);
    const socket = getSocket();
    socket.emit(
      "room:create",
      { nickname: createName, wordPackId: selectedWordPackId, locale },
      (result) => {
        if (!result.roomCode) {
          return;
        }

        storeSession(result.roomCode, result.playerSessionId);
        startTransition(() => {
          router.push(`/room/${result.roomCode}`);
        });
      }
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

  return {
    locale,
    setLocale,
    createName,
    setCreateName,
    joinName,
    setJoinName,
    joinCode,
    setJoinCode,
    selectedWordPackId,
    setSelectedWordPackId,
    visibleWordPacks,
    error,
    isPending,
    createRoom,
    joinRoom
  };
}

export type HomeClientState = ReturnType<typeof useHomeClientState>;
