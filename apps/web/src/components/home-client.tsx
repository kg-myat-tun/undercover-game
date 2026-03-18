"use client";

import type { ServerErrorPayload } from "@undercover/shared";
import clsx from "clsx";
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Card } from "./card";
import { serverUrl } from "../lib/config";
import { formatPackLabel, t, translateError } from "../lib/i18n";
import { getPreferredLocale, storePreferredLocale, type AppLocale } from "../lib/locale";
import { getSocket } from "../lib/socket";
import { storeSession } from "../lib/session";

function isEnterKey(event: { key: string }) {
  return event.key === "Enter";
}

export function HomeClient() {
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
  const isMyanmar = locale === "my";
  const heroLabelClass = clsx(
    "text-sm text-[#f4d9bb]/85",
    isMyanmar ? "tracking-[0.05em]" : "uppercase tracking-[0.35em]",
  );
  const sectionLabelClass = clsx(
    "text-xs font-semibold text-ink/55",
    isMyanmar ? "tracking-[0.04em]" : "uppercase tracking-[0.3em]",
  );
  const statLabelClass = clsx(
    "text-sm text-[#f0cfaa]",
    isMyanmar ? "tracking-[0.04em]" : "uppercase tracking-wide",
  );

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
      <div className={clsx("grid gap-6 lg:grid-cols-[1.25fr_1fr]", isMyanmar && "lang-my")}>
        <Card className="flex flex-col justify-between gap-8 overflow-hidden border-[#26333a] bg-[#1f2a30] text-[#fff7ec]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={heroLabelClass}>{t(locale, "realtimePartyGame")}</p>
              <label className="flex min-h-[3rem] items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-[#fff7ec]">
                <span>{t(locale, "language")}</span>
                <select
                  value={locale}
                  onChange={(event) => setLocale(event.target.value === "my" ? "my" : "en")}
                  className="bg-transparent outline-none"
                >
                  <option className="text-black" value="en">{t(locale, "english")}</option>
                  <option className="text-black" value="my">{t(locale, "myanmar")}</option>
                </select>
              </label>
            </div>
            <h1
              className={clsx(
                "text-[#fff7ec]",
                isMyanmar
                  ? "text-[1.85rem] font-semibold leading-[1.35] md:text-[2.2rem]"
                  : "font-display text-5xl leading-none md:text-7xl",
              )}
            >
              {t(locale, "title")}
            </h1>
            <p
              className={clsx(
                "max-w-xl text-[#f7ebda]/90",
                isMyanmar ? "text-[0.98rem] leading-8" : "text-lg leading-8",
              )}
            >
              {t(locale, "homeSubtitle")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className={statLabelClass}>{t(locale, "players")}</p>
              <p className="mt-2 text-3xl font-semibold text-white">3-8</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className={statLabelClass}>{t(locale, "rounds")}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{t(locale, "endless")}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className={statLabelClass}>{t(locale, "join")}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{t(locale, "code")}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="space-y-4 bg-white/92">
            <div>
              <p className={sectionLabelClass}>{t(locale, "hostRoom")}</p>
              <h2 className={clsx("mt-2 font-semibold", isMyanmar ? "text-[2rem] leading-[1.2]" : "text-3xl")}>
                {t(locale, "startSuspicion")}
              </h2>
            </div>
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              onKeyDown={(event) => {
                if (isEnterKey(event) && createName.trim().length >= 2 && !isPending) {
                  createRoom();
                }
              }}
              placeholder={t(locale, "yourNickname")}
              className={clsx(
                "w-full rounded-2xl border border-black/10 bg-white px-4 text-ink outline-none transition focus:border-accent",
                isMyanmar ? "py-4 text-lg" : "py-3",
              )}
            />
            <select
              value={selectedWordPackId}
              onChange={(event) => setSelectedWordPackId(event.target.value)}
              className={clsx(
                "w-full rounded-2xl border border-black/10 bg-white px-4 text-ink outline-none transition focus:border-accent",
                isMyanmar ? "py-4 text-lg" : "py-3",
              )}
            >
              {visibleWordPacks.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {formatPackLabel(locale, pack)}
                </option>
              ))}
            </select>
            <button
              onClick={createRoom}
              disabled={isPending || createName.trim().length < 2}
              className={clsx(
                "rounded-2xl bg-accent px-4 font-semibold text-white transition hover:bg-[#d65f43]",
                isMyanmar ? "py-4 text-lg" : "py-3",
              )}
            >
              {t(locale, "createRoom")}
            </button>
          </Card>

          <Card className="space-y-4 bg-white/92">
            <div>
              <p className={sectionLabelClass}>{t(locale, "joinRoomTitle")}</p>
              <h2 className={clsx("mt-2 font-semibold", isMyanmar ? "text-[2rem] leading-[1.2]" : "text-3xl")}>
                {t(locale, "blendQuickly")}
              </h2>
            </div>
            {joinCode ? (
              <div className={clsx("rounded-2xl border border-mint/35 bg-mint/15 px-4 text-ink/80", isMyanmar ? "py-4 text-base leading-8" : "py-3 text-sm")}>
                {t(locale, "invitationReady", { roomCode: joinCode })}
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
              placeholder={t(locale, "yourNickname")}
              className={clsx(
                "w-full rounded-2xl border border-black/10 bg-white px-4 text-ink outline-none transition focus:border-accent",
                isMyanmar ? "py-4 text-lg" : "py-3",
              )}
            />
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (isEnterKey(event) && joinName.trim().length >= 2 && joinCode.trim().length >= 4 && !isPending) {
                  joinRoom();
                }
              }}
              placeholder={t(locale, "roomCode")}
              className={clsx(
                "w-full rounded-2xl border border-black/10 bg-white px-4 text-ink outline-none transition focus:border-accent",
                isMyanmar ? "py-4 text-lg" : "py-3 uppercase",
              )}
            />
            <button
              onClick={joinRoom}
              disabled={isPending || joinName.trim().length < 2 || joinCode.trim().length < 4}
              className={clsx(
                "rounded-2xl bg-mint px-4 font-semibold text-ink transition hover:bg-[#5a9f78]",
                isMyanmar ? "py-4 text-lg" : "py-3",
              )}
            >
              {t(locale, "joinRoom")}
            </button>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
          </Card>
        </div>
      </div>
    </main>
  );
}
