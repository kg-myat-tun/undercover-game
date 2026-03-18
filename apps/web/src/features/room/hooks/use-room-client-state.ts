"use client"

import type { PublicRoom, Role, ServerErrorPayload } from "@undercover/shared"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { serverUrl } from "../../../shared/lib/config"
import { t, translateError } from "../../../shared/lib/i18n"
import {
  type AppLocale,
  getPreferredLocale,
  storePreferredLocale,
} from "../../../shared/lib/locale"
import { clearStoredSession, getStoredSession } from "../../../shared/lib/session"
import { getSocket } from "../../../shared/lib/socket"

export type RoleState = {
  role: Role
  word: string
} | null

export function useRoomClientState(roomCode: string) {
  const router = useRouter()
  const [locale, setLocale] = useState<AppLocale>("en")
  const [room, setRoom] = useState<PublicRoom | null>(null)
  const [selfPlayerId, setSelfPlayerId] = useState<string | null>(null)
  const [roleState, setRoleState] = useState<RoleState>(null)
  const [secretVisible, setSecretVisible] = useState(false)
  const [clue, setClue] = useState("")
  const [selectedVote, setSelectedVote] = useState<string | "skip">("skip")
  const [error, setError] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(true)
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null)
  const [showVerdictReveal, setShowVerdictReveal] = useState(false)
  const [wordPacks, setWordPacks] = useState<
    Array<{
      id: string
      name: string
      category: string
      pairCount: number
      availableLocales: string[]
    }>
  >([])
  const previousPhaseRef = useRef<string | null>(null)
  const socket = getSocket()

  useEffect(() => {
    setLocale(getPreferredLocale())
  }, [])

  useEffect(() => {
    storePreferredLocale(locale)
  }, [locale])

  useEffect(() => {
    const playerSessionId = getStoredSession(roomCode)
    socket.connect()

    const onSnapshot = (payload: { room: PublicRoom; selfPlayerId: string }) => {
      setRoom(payload.room)
      setSelfPlayerId(payload.selfPlayerId)
      setLocale(payload.room.locale)
      setReconnecting(false)
      setError(null)
    }

    const onRole = (payload: { role: Role; word: string; playerId: string }) => {
      setRoleState({ role: payload.role, word: payload.word })
      setSecretVisible(true)
    }

    const onError = (payload: Pick<ServerErrorPayload, "code" | "message">) => {
      setError(translateError(locale, payload))
      setReconnecting(false)
    }

    socket.on("room:snapshot", onSnapshot)
    socket.on("room:role", onRole)
    socket.on("room:error", onError)

    if (playerSessionId) {
      socket.emit("room:reconnect", { roomCode, playerSessionId })
    } else {
      setReconnecting(false)
      setError(t(locale, "noLocalSession"))
    }

    return () => {
      socket.off("room:snapshot", onSnapshot)
      socket.off("room:role", onRole)
      socket.off("room:error", onError)
    }
  }, [locale, roomCode, socket])

  useEffect(() => {
    const abortController = new AbortController()

    fetch(`${serverUrl}/word-packs`, { signal: abortController.signal })
      .then((response) => response.json())
      .then((packs) => {
        if (Array.isArray(packs)) {
          setWordPacks(packs)
        }
      })
      .catch(() => {
        // Keep the selector empty if metadata fails to load.
      })

    return () => {
      abortController.abort()
    }
  }, [])

  useEffect(() => {
    if (!room) {
      return
    }

    const previousPhase = previousPhaseRef.current
    previousPhaseRef.current = room.round.phase

    if (
      previousPhase !== "voting" ||
      (room.round.phase !== "results" && room.round.phase !== "round-resolution")
    ) {
      return
    }

    setShowVerdictReveal(true)
    const timeoutId = window.setTimeout(() => {
      setShowVerdictReveal(false)
    }, 2400)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [room])

  const self = useMemo(
    () => room?.players.find((player) => player.id === selfPlayerId) ?? null,
    [room, selfPlayerId],
  )

  const activePlayers = useMemo(() => {
    if (!room) {
      return []
    }

    const active = new Set(room.round.activePlayerIds)
    return room.players.filter((player) => active.has(player.id))
  }, [room])

  const votesByVoterId = useMemo(
    () => new Map(room?.round.votes.map((vote) => [vote.voterId, vote]) ?? []),
    [room],
  )

  const voteTallies = useMemo(() => {
    if (!room) {
      return []
    }

    const counts = new Map<string, number>()

    for (const vote of room.round.votes) {
      const key = vote.targetPlayerId ?? "skip"
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        count,
        label:
          key === "skip"
            ? t(locale, "skip")
            : (room.players.find((player) => player.id === key)?.nickname ??
              t(locale, "unknownPlayer")),
      }))
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count
        }

        return left.label.localeCompare(right.label)
      })
  }, [room, locale])

  const visibleWordPacks = useMemo(
    () => wordPacks.filter((pack) => pack.availableLocales.includes(locale)),
    [locale, wordPacks],
  )

  const leaveRoom = () => {
    const sessionId = getStoredSession(roomCode)
    if (sessionId) {
      socket.emit("room:leave", { roomCode, playerSessionId: sessionId })
    }
    clearStoredSession(roomCode)
    router.push("/")
  }

  const kickPlayer = (targetPlayerId: string) => {
    const sessionId = getStoredSession(roomCode)
    if (!sessionId) {
      return
    }

    socket.emit("room:kick", {
      roomCode,
      playerSessionId: sessionId,
      targetPlayerId,
    })
  }

  const startRound = () => {
    const sessionId = getStoredSession(roomCode)
    if (!sessionId) {
      return
    }

    setRoleState(null)
    setSecretVisible(false)
    socket.emit("round:start", { roomCode, playerSessionId: sessionId })
  }

  const continueResolvedRound = () => {
    const sessionId = getStoredSession(roomCode)
    if (!sessionId) {
      return
    }

    socket.emit("round:continue", { roomCode, playerSessionId: sessionId })
  }

  const updateWordPack = (wordPackId: string) => {
    const sessionId = getStoredSession(roomCode)
    if (!sessionId) {
      return
    }

    socket.emit("room:update-word-pack", {
      roomCode,
      playerSessionId: sessionId,
      wordPackId,
    })
  }

  const updateLocale = (nextLocale: AppLocale) => {
    const sessionId = getStoredSession(roomCode)
    if (!sessionId) {
      return
    }

    socket.emit("room:update-locale", {
      roomCode,
      playerSessionId: sessionId,
      locale: nextLocale,
    })
  }

  const submitClue = () => {
    const sessionId = getStoredSession(roomCode)
    if (!sessionId || !clue.trim()) {
      return
    }

    socket.emit("round:clue", { roomCode, playerSessionId: sessionId, clue })
    setClue("")
  }

  const submitVote = () => {
    const sessionId = getStoredSession(roomCode)
    if (!sessionId) {
      return
    }

    socket.emit("round:vote", {
      roomCode,
      playerSessionId: sessionId,
      targetPlayerId: selectedVote === "skip" ? null : selectedVote,
    })
  }

  const shareInvite = async () => {
    const inviteUrl =
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}/?room=${encodeURIComponent(roomCode)}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${t(locale, "join")} ${t(locale, "room")}`,
          text: `${t(locale, "join")} ${t(locale, "room")} ${roomCode}.`,
          url: inviteUrl,
        })
        setInviteFeedback(t(locale, "inviteLinkShared"))
        return
      }

      await navigator.clipboard.writeText(inviteUrl)
      setInviteFeedback(t(locale, "inviteLinkCopied"))
    } catch {
      setInviteFeedback(t(locale, "inviteLinkFailed"))
    }
  }

  return {
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
  }
}

export type RoomClientState = ReturnType<typeof useRoomClientState>
