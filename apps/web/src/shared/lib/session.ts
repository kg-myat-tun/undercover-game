const PREFIX = "undercover-session";

export function getStoredSession(roomCode: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(`${PREFIX}:${roomCode.toUpperCase()}`);
}

export function storeSession(roomCode: string, playerSessionId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`${PREFIX}:${roomCode.toUpperCase()}`, playerSessionId);
}

export function clearStoredSession(roomCode: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(`${PREFIX}:${roomCode.toUpperCase()}`);
}
