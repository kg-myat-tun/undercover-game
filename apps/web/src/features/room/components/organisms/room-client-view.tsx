"use client"

import clsx from "clsx"
import Link from "next/link"
import React from "react"

import { formatPackLabel, t } from "../../../../shared/lib/i18n"
import { Card } from "../../../../shared/ui/atoms/card"
import type { RoomClientState } from "../../hooks/use-room-client-state"
import { PlayerStatusRow } from "../molecules/player-status-row"
import { VoteOptionRow } from "../molecules/vote-option-row"

export function RoomClientView({
  roomCode,
  locale,
  room,
  self,
  roleState,
  secretVisible,
  setSecretVisible,
  clue,
  setClue,
  selectedVote,
  setSelectedVote,
  error,
  reconnecting,
  inviteFeedback,
  showVerdictReveal,
  activePlayers,
  votesByVoterId,
  voteTallies,
  visibleWordPacks,
  leaveRoom,
  kickPlayer,
  startRound,
  continueResolvedRound,
  updateWordPack,
  updateLocale,
  submitClue,
  submitVote,
  shareInvite,
}: RoomClientState) {
  if (reconnecting) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
        <Card className="w-full bg-white/92 p-4 text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-ink/50">
            {t(locale, "room")} {roomCode}
          </p>
          <h1 className="mt-4 text-3xl font-semibold">{t(locale, "reconnecting")}</h1>
        </Card>
      </main>
    )
  }

  if (!room || !self) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
        <Card className="w-full bg-white/92 p-4 text-center">
          <p className="text-sm uppercase tracking-[0.28em] text-ink/50">
            {t(locale, "room")} {roomCode}
          </p>
          <h1 className="mt-4 text-3xl font-semibold">{t(locale, "sessionNotActive")}</h1>
          <p className="mt-3 text-ink/65">{error ?? t(locale, "roomCouldNotBeRestored")}</p>
          <Link
            className="mt-6 inline-flex rounded-2xl bg-ink px-4 py-3 font-semibold text-paper"
            href="/"
          >
            {t(locale, "backHome")}
          </Link>
        </Card>
      </main>
    )
  }

  const isMyanmar = locale === "my"
  const sectionLabelClass = clsx(
    "text-xs font-semibold text-ink/50",
    isMyanmar ? "tracking-[0.04em]" : "uppercase tracking-[0.28em]",
  )
  const compactLabelClass = clsx(
    "text-xs text-ink/45",
    isMyanmar ? "tracking-[0.03em]" : "uppercase tracking-[0.28em]",
  )
  const isMyTurn = room.round.currentTurnPlayerId === self.id
  const isSelfActive = room.round.phase === "lobby" || room.round.activePlayerIds.includes(self.id)
  const myVote = votesByVoterId.get(self.id)
  const votersSubmittedCount = room.round.votes.length
  const votersRemainingCount = Math.max(room.round.activePlayerIds.length - votersSubmittedCount, 0)
  const myVoteLabel =
    myVote?.targetPlayerId === null
      ? t(locale, "skipped")
      : (room.players.find((player) => player.id === myVote?.targetPlayerId)?.nickname ?? null)
  const visibleGameNumber =
    typeof room.round.gameNumber === "number" && Number.isFinite(room.round.gameNumber)
      ? Math.max(room.round.gameNumber, 1)
      : 1
  const visibleRoundNumber =
    typeof room.round.roundNumber === "number" && Number.isFinite(room.round.roundNumber)
      ? Math.max(room.round.roundNumber, 1)
      : 1
  const revealedUndercoverName =
    room.players.find((player) => player.id === room.round.revealedUndercoverPlayerId)?.nickname ??
    null
  const eliminatedPlayerName =
    room.players.find((player) => player.id === room.round.eliminatedPlayerId)?.nickname ??
    t(locale, "unknownPlayer")
  const eliminatedByNames = room.round.votes
    .filter((vote) => vote.targetPlayerId === room.round.eliminatedPlayerId)
    .map(
      (vote) =>
        room.players.find((player) => player.id === vote.voterId)?.nickname ??
        t(locale, "unknownPlayer"),
    )
    .join(", ")
  const skippedByNames = room.round.votes
    .filter((vote) => vote.targetPlayerId === null)
    .map(
      (vote) =>
        room.players.find((player) => player.id === vote.voterId)?.nickname ??
        t(locale, "unknownPlayer"),
    )
    .join(", ")
  const resolutionMessage =
    room.round.resolutionReason === "tie"
      ? t(locale, "tieVoteNoElimination")
      : room.round.eliminatedPlayerId
        ? t(locale, "playerWasEliminated", { player: eliminatedPlayerName })
        : t(locale, "noOneEliminated")

  return (
    <main
      className={clsx(
        "mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-6",
        isMyanmar && "lang-my",
      )}
    >
      {showVerdictReveal && room.round.phase === "results" ? (
        <div className="verdict-overlay">
          <div
            className={`verdict-bar ${room.round.eliminatedPlayerId ? "eliminated" : "skipped"}`}
          >
            <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
              <p className="verdict-title text-xs font-semibold text-white/55">
                {t(locale, "votingComplete")}
              </p>
              <div className="mt-4 h-px w-24 bg-white/20" />
              <div className="mt-6 flex flex-col items-center gap-4">
                <p
                  className={clsx(
                    "text-sm font-semibold text-white/48",
                    isMyanmar ? "tracking-[0.05em]" : "uppercase tracking-[0.34em]",
                  )}
                >
                  {room.round.eliminatedPlayerId
                    ? t(locale, "elimination")
                    : t(locale, "noElimination")}
                </p>
                <h2
                  className={clsx(
                    "verdict-wordmark font-semibold",
                    isMyanmar ? "text-3xl leading-[1.25] md:text-5xl" : "text-4xl md:text-6xl",
                  )}
                >
                  {room.round.eliminatedPlayerId
                    ? t(locale, "playerWasEliminated", { player: eliminatedPlayerName })
                    : t(locale, "noOneEliminated")}
                </h2>
                <p
                  className={clsx(
                    "max-w-3xl text-white/78",
                    isMyanmar ? "text-lg leading-9 md:text-xl" : "text-base md:text-xl",
                  )}
                >
                  {room.round.eliminatedPlayerId
                    ? t(locale, "votesCastBy", {
                        players: eliminatedByNames || t(locale, "noVotesRecorded"),
                      })
                    : t(locale, "skipVotesCastBy", {
                        players: skippedByNames || t(locale, "noSkipVotesRecorded"),
                      })}
                </p>
              </div>
              <div
                className={clsx(
                  "mt-6 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-white/72",
                  isMyanmar ? "tracking-[0.05em]" : "uppercase tracking-[0.24em]",
                )}
              >
                {room.round.eliminatedPlayerId
                  ? t(locale, "decisionLockedIn")
                  : t(locale, "roundSkipped")}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div
            className={clsx(
              "flex flex-wrap items-center gap-2 text-xs text-ink/50",
              isMyanmar ? "tracking-[0.04em]" : "uppercase tracking-[0.28em]",
            )}
          >
            <p>
              {t(locale, "room")} {room.code}
            </p>
            <span className="h-1 w-1 rounded-full bg-ink/25" />
            <p>
              {t(locale, "game")} {visibleGameNumber}
            </p>
            <span className="h-1 w-1 rounded-full bg-ink/25" />
            <p>
              {t(locale, "round")} {visibleRoundNumber}
            </p>
          </div>
          <h1
            className={clsx(
              "mt-2 text-ink",
              isMyanmar
                ? "text-[1.45rem] font-semibold leading-[1.4] md:text-[1.75rem]"
                : "font-display text-4xl leading-none md:text-5xl",
            )}
          >
            {t(locale, "stayConvincing")}
          </h1>
          <p
            className={clsx(
              "mt-2 max-w-2xl text-ink/70",
              isMyanmar ? "text-[0.98rem] leading-8" : "text-base md:text-lg",
            )}
          >
            {t(locale, "roomSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2 xl:max-w-[48%] xl:justify-end">
          <label className="flex min-h-[3.25rem] items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-3 py-2.5 text-sm font-medium text-ink/80">
            <span>{t(locale, "language")}</span>
            <select
              value={room.locale}
              onChange={(event) => updateLocale(event.target.value === "my" ? "my" : "en")}
              disabled={
                !self.isHost || (room.round.phase !== "lobby" && room.round.phase !== "results")
              }
              className="bg-transparent outline-none disabled:opacity-60"
            >
              <option value="en">{t(locale, "english")}</option>
              <option value="my">{t(locale, "myanmar")}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={shareInvite}
            className="min-h-[3.25rem] rounded-xl border border-black/10 bg-white/75 px-4 py-2.5 text-sm font-semibold md:text-base"
          >
            {t(locale, "invitePlayers")}
          </button>
          <button
            type="button"
            onClick={leaveRoom}
            className="min-h-[3.25rem] rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold md:text-base"
          >
            {t(locale, "leaveRoom")}
          </button>
          {self.isHost ? (
            <button
              type="button"
              onClick={startRound}
              disabled={
                room.players.length < 3 ||
                (room.round.phase !== "lobby" && room.round.phase !== "results")
              }
              className="min-h-[3.25rem] rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white md:text-base"
            >
              {room.round.phase === "results"
                ? t(locale, "startNextRound")
                : t(locale, "startRound")}
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
                <p className={sectionLabelClass}>{t(locale, "yourSecret")}</p>
                <h2
                  className={clsx(
                    "mt-1 font-semibold",
                    isMyanmar ? "text-[2rem] leading-[1.2]" : "text-2xl md:text-3xl",
                  )}
                >
                  {roleState
                    ? secretVisible
                      ? roleState.word
                      : t(locale, "hidden")
                    : room.round.phase === "lobby"
                      ? t(locale, "waitingForRoundStart")
                      : t(locale, "hidden")}
                </h2>
                <p className="mt-1 text-sm text-ink/65 md:text-base">
                  {roleState
                    ? `${t(locale, "role")}: ${roleState.role === "undercover" ? t(locale, "undercover") : t(locale, "civilian")}`
                    : t(locale, "roleHint")}
                </p>
                {roleState ? (
                  <button
                    type="button"
                    onClick={() => setSecretVisible((current) => !current)}
                    className="mt-3 rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-ink"
                  >
                    {secretVisible ? t(locale, "hideSecret") : t(locale, "showSecret")}
                  </button>
                ) : null}
              </div>
              <div className="rounded-2xl bg-sand/35 px-4 py-3">
                <p className={compactLabelClass}>{t(locale, "game")}</p>
                <p className="mt-1 text-lg font-semibold">{visibleGameNumber}</p>
              </div>
              <div className="rounded-2xl bg-sand/35 px-4 py-3">
                <p className={compactLabelClass}>{t(locale, "round")}</p>
                <p className="mt-1 text-lg font-semibold">{visibleRoundNumber}</p>
              </div>
              <div className="rounded-2xl bg-sand/35 px-4 py-3">
                <p className={compactLabelClass}>{t(locale, "phase")}</p>
                <p className="mt-1 text-lg font-semibold capitalize">
                  {room.round.phase === "lobby"
                    ? t(locale, "phaseLobby")
                    : room.round.phase === "clue-entry"
                      ? t(locale, "phaseClueEntry")
                      : room.round.phase === "voting"
                        ? t(locale, "phaseVoting")
                        : room.round.phase === "round-resolution"
                          ? t(locale, "phaseRoundResolution")
                          : t(locale, "phaseResults")}
                </p>
              </div>
            </div>
          </Card>

          {room.round.phase === "lobby" ? (
            <Card className="bg-white/92 p-4">
              <p className={sectionLabelClass}>{t(locale, "lobby")}</p>
              <h2
                className={clsx(
                  "mt-2 font-semibold",
                  isMyanmar ? "text-[2rem] leading-[1.2]" : "text-2xl",
                )}
              >
                {t(locale, "gatherSuspects")}
              </h2>
              <p className={clsx("mt-2 text-ink/68", isMyanmar ? "text-lg leading-8" : "")}>
                {t(locale, "lobbyHint")}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <p className={compactLabelClass}>{t(locale, "wordPack")}</p>
                  <select
                    value={room.wordPackId}
                    onChange={(event) => updateWordPack(event.target.value)}
                    disabled={!self.isHost}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-ink outline-none transition focus:border-accent disabled:bg-black/[0.03]"
                  >
                    {visibleWordPacks.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {formatPackLabel(locale, pack)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-xl bg-black/[0.03] px-4 py-3 text-sm text-ink/68">
                  {self.isHost ? t(locale, "hostCanChangePack") : t(locale, "waitingForHostPack")}
                </div>
              </div>
            </Card>
          ) : null}

          {room.round.phase === "clue-entry" ? (
            <Card className="space-y-3 bg-white/92 p-4">
              <div>
                <p className={sectionLabelClass}>{t(locale, "clues")}</p>
                <h2
                  className={clsx(
                    "mt-1 font-semibold",
                    isMyanmar ? "text-[2rem] leading-[1.2]" : "text-2xl",
                  )}
                >
                  {isMyTurn ? t(locale, "yourTurnToSpeak") : t(locale, "anotherPlayerIsUp")}
                </h2>
                <p
                  className={clsx(
                    "mt-2 text-ink/68",
                    isMyanmar ? "text-lg leading-8" : "text-sm md:text-base",
                  )}
                >
                  {isMyTurn ? t(locale, "clueTurnHint") : t(locale, "waitTurnHint")}
                </p>
              </div>

              <div className="space-y-2">
                {room.round.clues.map((entry) => {
                  const player = room.players.find((item) => item.id === entry.playerId)
                  return (
                    <div key={entry.playerId} className="rounded-xl bg-black/[0.03] px-3 py-2.5">
                      <p className="text-sm text-ink/50">{player?.nickname}</p>
                      <p className="text-base font-medium">{entry.clue}</p>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
                <input
                  value={clue}
                  onChange={(event) => setClue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && isMyTurn && clue.trim().length >= 1) {
                      submitClue()
                    }
                  }}
                  disabled={!isMyTurn}
                  placeholder={isMyTurn ? t(locale, "enterYourClue") : t(locale, "waitForYourTurn")}
                  className={clsx(
                    "w-full rounded-xl border border-black/10 bg-white px-4 outline-none transition focus:border-accent",
                    isMyanmar ? "py-4 text-lg" : "py-3",
                  )}
                />
                <button
                  type="button"
                  onClick={submitClue}
                  disabled={!isMyTurn || clue.trim().length < 1}
                  className={clsx(
                    "rounded-xl bg-ink px-4 font-semibold text-paper md:min-w-[10.5rem]",
                    isMyanmar ? "py-4 text-lg leading-7" : "py-3",
                  )}
                >
                  {t(locale, "submitClue")}
                </button>
              </div>
            </Card>
          ) : null}

          {room.round.phase === "voting" ? (
            <Card className="space-y-3 bg-white/92 p-4">
              <div>
                <p className={sectionLabelClass}>{t(locale, "voting")}</p>
                <h2
                  className={clsx(
                    "mt-1 font-semibold",
                    isMyanmar ? "text-[2rem] leading-[1.2]" : "text-2xl",
                  )}
                >
                  {t(locale, "whoSoundedOff")}
                </h2>
                <p
                  className={clsx(
                    "mt-2 text-ink/68",
                    isMyanmar ? "text-lg leading-8" : "text-sm md:text-base",
                  )}
                >
                  {t(locale, "votingHint")}
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-black/8 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={compactLabelClass}>{t(locale, "voteProgress")}</p>
                      <p className="mt-1 text-xl font-semibold">
                        {t(locale, "lockedIn", {
                          submitted: votersSubmittedCount,
                          total: room.round.activePlayerIds.length,
                        })}
                      </p>
                    </div>
                    <div className="rounded-xl bg-black/[0.04] px-3 py-2 text-right">
                      <p className={compactLabelClass}>{t(locale, "remaining")}</p>
                      <p className="mt-1 text-lg font-semibold">{votersRemainingCount}</p>
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
                      {t(locale, "youAlreadyVoted", { choice: myVoteLabel ?? t(locale, "skip") })}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-ink/70">{t(locale, "votePrivate")}</p>
                  )}
                </div>

                <div className="rounded-2xl border border-black/8 bg-black/[0.025] px-4 py-3">
                  <p className={compactLabelClass}>{t(locale, "roomStatus")}</p>
                  <div className="mt-2 space-y-2">
                    {activePlayers.map((player) => {
                      const vote = votesByVoterId.get(player.id)
                      return (
                        <div
                          key={player.id}
                          className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5"
                        >
                          <div>
                            <p className="font-medium text-ink">
                              {player.nickname}{" "}
                              {player.id === self.id ? `• ${t(locale, "you")}` : ""}
                            </p>
                            <p className="text-sm text-ink/50">
                              {vote ? t(locale, "voteSubmitted") : t(locale, "choosingNow")}
                            </p>
                          </div>
                          <span
                            className={clsx(
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              vote ? "bg-mint/20 text-ink" : "bg-sand/35 text-ink/65",
                              isMyanmar ? "tracking-[0.05em]" : "uppercase tracking-[0.2em]",
                            )}
                          >
                            {vote ? t(locale, "done") : t(locale, "waiting")}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <VoteOptionRow
                  checked={selectedVote === "skip"}
                  disabled={!isSelfActive || Boolean(myVote)}
                  label={t(locale, "skipThisVote")}
                  onChange={() => setSelectedVote("skip")}
                />
                {activePlayers
                  .filter((player) => player.id !== self.id)
                  .map((player) => (
                    <VoteOptionRow
                      key={player.id}
                      checked={selectedVote === player.id}
                      disabled={!isSelfActive || Boolean(myVote)}
                      label={player.nickname}
                      hint={votesByVoterId.has(player.id) ? t(locale, "alreadyVoted") : null}
                      onChange={() => setSelectedVote(player.id)}
                    />
                  ))}
              </div>

              <button
                type="button"
                onClick={submitVote}
                disabled={!isSelfActive || Boolean(myVote)}
                className={clsx(
                  "rounded-xl bg-accent px-4 font-semibold text-white",
                  isMyanmar ? "py-4 text-lg leading-7" : "py-3",
                )}
              >
                {myVote
                  ? t(locale, "voteSubmittedCompact", { choice: myVoteLabel ?? t(locale, "skip") })
                  : t(locale, "submitVote")}
              </button>
            </Card>
          ) : null}

          {room.round.phase === "round-resolution" ? (
            <Card className="space-y-3 bg-white/92 p-4">
              <div className="result-stage rounded-[22px] px-4 py-4 text-paper">
                <p
                  className={clsx(
                    "text-xs font-semibold text-paper/60",
                    isMyanmar ? "tracking-[0.05em]" : "uppercase tracking-[0.28em]",
                  )}
                >
                  {t(locale, "roundResult")}
                </p>
                <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2
                      className={clsx(
                        "font-semibold text-paper",
                        isMyanmar ? "text-[2rem] leading-[1.2]" : "text-2xl",
                      )}
                    >
                      {t(locale, "round")} {visibleRoundNumber}
                    </h2>
                    <p
                      className={clsx(
                        "mt-2 font-semibold text-white",
                        isMyanmar
                          ? "text-[1.7rem] leading-[1.35] md:text-[1.9rem]"
                          : "text-3xl md:text-4xl",
                      )}
                    >
                      {resolutionMessage}
                    </p>
                  </div>
                  <div
                    className={clsx(
                      "rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-paper/78",
                      isMyanmar ? "tracking-[0.05em]" : "uppercase tracking-[0.24em]",
                    )}
                  >
                    {t(locale, "game")} {visibleGameNumber}
                  </div>
                </div>

                <p
                  className={clsx(
                    "mt-4 text-paper/72",
                    isMyanmar ? "text-sm leading-7" : "text-sm",
                  )}
                >
                  {room.round.resolutionReason === "tie"
                    ? t(locale, "tieVoteNoElimination")
                    : room.round.eliminatedPlayerId
                      ? t(locale, "votesCastBy", {
                          players: eliminatedByNames || t(locale, "noVotesRecorded"),
                        })
                      : t(locale, "skipVotesCastBy", {
                          players: skippedByNames || t(locale, "noSkipVotesRecorded"),
                        })}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-accent/8 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {self.isHost ? t(locale, "continueRound") : t(locale, "waitingForHostContinue")}
                  </p>
                  <p className="text-sm text-ink/62">{t(locale, "hostContinuesRound")}</p>
                </div>
                {self.isHost ? (
                  <button
                    type="button"
                    onClick={continueResolvedRound}
                    className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-white"
                  >
                    {t(locale, "continueRound")}
                  </button>
                ) : null}
              </div>
            </Card>
          ) : null}

          {room.round.phase === "results" ? (
            <Card className="space-y-3 bg-white/92 p-4">
              <div className="result-stage rounded-[22px] px-4 py-4 text-paper">
                <p
                  className={clsx(
                    "text-xs font-semibold text-paper/60",
                    isMyanmar ? "tracking-[0.05em]" : "uppercase tracking-[0.28em]",
                  )}
                >
                  {t(locale, "roundResult")}
                </p>
                <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2
                      className={clsx(
                        "font-semibold text-paper",
                        isMyanmar ? "text-[2rem] leading-[1.2]" : "text-2xl",
                      )}
                    >
                      {t(locale, "round")} {visibleRoundNumber}
                    </h2>
                    <p
                      className={clsx(
                        "mt-2 font-semibold text-white",
                        isMyanmar
                          ? "text-[1.7rem] leading-[1.35] md:text-[1.9rem]"
                          : "text-3xl md:text-4xl",
                      )}
                    >
                      {room.round.outcome?.winner === "civilians"
                        ? t(locale, "civiliansWin")
                        : t(locale, "undercoverWins")}
                    </p>
                  </div>
                  <div
                    className={clsx(
                      "rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-paper/78",
                      isMyanmar ? "tracking-[0.05em]" : "uppercase tracking-[0.24em]",
                    )}
                  >
                    {t(locale, "game")} {visibleGameNumber}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3">
                    <p
                      className={clsx(
                        "text-xs font-semibold text-paper/55",
                        isMyanmar ? "tracking-[0.05em]" : "uppercase tracking-[0.24em]",
                      )}
                    >
                      {t(locale, "undercover")}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {revealedUndercoverName ?? t(locale, "hidden")}
                    </p>
                    <p className="mt-1 text-sm text-paper/66">{t(locale, "identityReveal")}</p>
                  </div>
                  <div className="eliminated-reveal relative overflow-hidden rounded-2xl border border-accent/30 bg-[#301f1c] px-4 py-3">
                    <p
                      className={clsx(
                        "text-xs font-semibold text-[#f5b8ab]",
                        isMyanmar ? "tracking-[0.05em]" : "uppercase tracking-[0.24em]",
                      )}
                    >
                      {t(locale, "eliminated")}
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-white">{eliminatedPlayerName}</p>
                    <p className="mt-1 text-sm text-[#f5d8d1]">{t(locale, "votedOutReveal")}</p>
                  </div>
                </div>

                <p
                  className={clsx(
                    "mt-4 text-paper/72",
                    isMyanmar ? "text-sm leading-7" : "text-sm",
                  )}
                >
                  {room.round.outcome?.winner === "civilians"
                    ? t(locale, "civiliansWin")
                    : t(locale, "undercoverWins")}
                  {room.round.outcome?.reason === "vote-skipped"
                    ? ` ${t(locale, "skipResultReason")}`
                    : revealedUndercoverName
                      ? ` ${t(locale, "revealResultReason", { undercover: revealedUndercoverName })}`
                      : ` ${t(locale, "revealResultFallback")}`}
                </p>
              </div>

              {self.isHost ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-accent/8 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {t(locale, "readyForAnotherMatch")}
                    </p>
                    <p className="text-sm text-ink/62">{t(locale, "restartHint")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={startRound}
                    disabled={room.players.length < 3}
                    className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-white"
                  >
                    {t(locale, "restartGame")}
                  </button>
                </div>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-black/8 bg-black/[0.025] px-4 py-3">
                  <p className={compactLabelClass}>{t(locale, "voteTally")}</p>
                  <div className="mt-2 grid gap-2">
                    {voteTallies.map((entry) => (
                      <div key={entry.key} className="rounded-xl bg-white px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-ink">{entry.label}</p>
                          <span className="rounded-full bg-accent/12 px-3 py-1 text-sm font-semibold text-ink">
                            {t(locale, "voteCount", {
                              count: entry.count,
                              suffix: locale === "en" && entry.count !== 1 ? "s" : "",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/8 bg-white px-4 py-3">
                  <p className={compactLabelClass}>{t(locale, "whoVotedForWhom")}</p>
                  <div className="mt-2 space-y-2">
                    {room.round.votes.map((vote) => {
                      const voter = room.players.find((player) => player.id === vote.voterId)
                      const target =
                        vote.targetPlayerId === null
                          ? t(locale, "skip")
                          : (room.players.find((player) => player.id === vote.targetPlayerId)
                              ?.nickname ?? t(locale, "unknownPlayer"))

                      return (
                        <div
                          key={vote.voterId}
                          className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2.5"
                        >
                          <div>
                            <p className="font-medium text-ink">
                              {voter?.nickname ?? t(locale, "unknownPlayer")}
                            </p>
                            <p className="text-sm text-ink/48">{t(locale, "finalVoteSubmitted")}</p>
                          </div>
                          <span className="rounded-full bg-sand/35 px-3 py-1 text-sm font-semibold text-ink">
                            {target}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {room.players.map((player) => (
                  <div key={player.id} className="rounded-xl bg-black/[0.03] px-3 py-2.5">
                    <p className="text-sm text-ink/45">{player.nickname}</p>
                    <p className="text-xl font-semibold">{room.scoreboard[player.id] ?? 0}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="grid gap-4">
          <Card className="bg-white/92 p-4">
            <p className={sectionLabelClass}>{t(locale, "players")}</p>
            <div className="mt-3 grid gap-2">
              {room.players.map((player) => (
                <PlayerStatusRow
                  key={player.id}
                  isConnected={player.isConnected}
                  isCurrentTurn={player.id === room.round.currentTurnPlayerId}
                  isEliminated={
                    player.id === room.round.eliminatedPlayerId || Boolean(player.eliminatedAt)
                  }
                  isActive={
                    room.round.phase !== "lobby" && room.round.activePlayerIds.includes(player.id)
                  }
                  isHost={player.isHost}
                  isSelf={player.id === self.id}
                  locale={locale}
                  nickname={player.nickname}
                  canKick={self.isHost && player.id !== self.id && room.round.phase === "lobby"}
                  onKick={() => kickPlayer(player.id)}
                />
              ))}
            </div>
          </Card>

          <Card className="bg-white/92 p-4">
            <p className={sectionLabelClass}>{t(locale, "roundNotes")}</p>
            <ul
              className={clsx(
                "mt-3 space-y-2 text-ink/68",
                isMyanmar ? "text-lg leading-9" : "text-sm md:text-base",
              )}
            >
              <li>{t(locale, "note1")}</li>
              <li>{t(locale, "note2")}</li>
              <li>{t(locale, "note3")}</li>
            </ul>
          </Card>
        </div>
      </div>
    </main>
  )
}
