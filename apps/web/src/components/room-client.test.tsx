// @vitest-environment jsdom

import React from "react";
import type { PublicRoom } from "@undercover/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RoomClient } from "./room-client";
import {
  changeValue,
  click,
  createContainer,
  flushPromises,
  renderInto,
  runInAct,
} from "./test-helpers";
import { storeSession } from "../lib/session";

const push = vi.fn();

type EmitCall = {
  event: string;
  args: unknown[];
};

function createMockSocket() {
  return {
    handlers: new Map<string, Set<(payload: unknown) => void>>(),
    emitted: [] as EmitCall[],
    connect: vi.fn(),
    on(event: string, handler: (payload: unknown) => void) {
      const set = this.handlers.get(event) ?? new Set();
      set.add(handler);
      this.handlers.set(event, set);
      return this;
    },
    off(event: string, handler: (payload: unknown) => void) {
      this.handlers.get(event)?.delete(handler);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      this.emitted.push({ event, args });
      return this;
    },
    trigger(event: string, payload: unknown) {
      for (const handler of this.handlers.get(event) ?? []) {
        handler(payload);
      }
    },
  };
}

const mockSocket = createMockSocket();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : "/"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../lib/socket", () => ({
  getSocket: () => mockSocket,
}));

function makeRoom(overrides: Partial<PublicRoom> = {}): PublicRoom {
  return {
    id: "room-id",
    code: "ABCD",
    wordPackId: "classic",
    locale: "en",
    createdAt: 1,
    players: [
      {
        id: "p1",
        nickname: "Host",
        isHost: true,
        isConnected: true,
        joinedAt: 1,
        eliminatedAt: null,
      },
      {
        id: "p2",
        nickname: "Alex",
        isHost: false,
        isConnected: true,
        joinedAt: 2,
        eliminatedAt: null,
      },
      {
        id: "p3",
        nickname: "Blair",
        isHost: false,
        isConnected: true,
        joinedAt: 3,
        eliminatedAt: null,
      },
    ],
    round: {
      gameNumber: 1,
      roundNumber: 1,
      phase: "lobby",
      currentTurnPlayerId: null,
      activePlayerIds: [],
      clues: [],
      votes: [],
      eliminatedPlayerId: null,
      revealedUndercoverPlayerId: null,
      outcome: null,
    },
    scoreboard: {
      p1: 0,
      p2: 0,
      p3: 0,
    },
    ...overrides,
  };
}

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  push.mockReset();
  mockSocket.handlers.clear();
  mockSocket.emitted.length = 0;
  mockSocket.connect.mockClear();
  vi.useRealTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: async () => [
        { id: "classic", name: "Classic", category: "General", pairCount: 100 },
        { id: "hard-mode", name: "Hard Mode", category: "Advanced", pairCount: 100 },
      ],
    }),
  );
  storeSession("ABCD", "session-host");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("RoomClient", () => {
  it("shows voting progress and the player's submitted vote state", async () => {
    const view = createContainer();

    await renderInto(view.root, <RoomClient roomCode="ABCD" />);
    await flushPromises();

    await runInAct(() => mockSocket.trigger("room:snapshot", {
      room: makeRoom({
        round: {
          gameNumber: 1,
          roundNumber: 1,
          phase: "voting",
          currentTurnPlayerId: null,
          activePlayerIds: ["p1", "p2", "p3"],
          clues: [],
          votes: [{ voterId: "p1", targetPlayerId: null, submittedAt: 1 }],
          eliminatedPlayerId: null,
          revealedUndercoverPlayerId: null,
          outcome: null,
        },
      }),
      selfPlayerId: "p1",
    }));
    await flushPromises();

    expect(view.container.textContent).toContain("Vote progress");
    expect(view.container.textContent).toContain("1/3 locked in");
    expect(view.container.textContent).toContain("You already voted: Skipped");
    expect(view.container.textContent).toContain("Host • You");
    expect(view.container.textContent).toContain("Vote submitted");

    view.cleanup();
  });

  it("shows the verdict reveal overlay and hides it after the balanced timing", async () => {
    vi.useFakeTimers();
    const view = createContainer();

    await renderInto(view.root, <RoomClient roomCode="ABCD" />);
    await flushPromises();

    await runInAct(() => mockSocket.trigger("room:snapshot", {
      room: makeRoom({
        round: {
          gameNumber: 1,
          roundNumber: 1,
          phase: "voting",
          currentTurnPlayerId: null,
          activePlayerIds: ["p1", "p2", "p3"],
          clues: [],
          votes: [],
          eliminatedPlayerId: null,
          revealedUndercoverPlayerId: null,
          outcome: null,
        },
      }),
      selfPlayerId: "p1",
    }));
    await flushPromises();

    await runInAct(() => mockSocket.trigger("room:snapshot", {
      room: makeRoom({
        round: {
          gameNumber: 1,
          roundNumber: 1,
          phase: "results",
          currentTurnPlayerId: null,
          activePlayerIds: ["p1", "p2", "p3"],
          clues: [],
          votes: [
            { voterId: "p1", targetPlayerId: "p2", submittedAt: 1 },
            { voterId: "p2", targetPlayerId: "p2", submittedAt: 2 },
            { voterId: "p3", targetPlayerId: "p2", submittedAt: 3 },
          ],
          eliminatedPlayerId: "p2",
          revealedUndercoverPlayerId: "p3",
          outcome: {
            winner: "undercover",
            eliminatedPlayerId: "p2",
            reason: "undercover-survived",
          },
        },
      }),
      selfPlayerId: "p1",
    }));
    await flushPromises();

    expect(view.container.textContent).toContain("Alex was eliminated");
    expect(view.container.textContent).toContain("Votes cast by: Host, Alex, Blair");

    await runInAct(() => {
      vi.advanceTimersByTime(2400);
    });
    await flushPromises();

    expect(view.container.textContent).not.toContain("Voting Complete");
    expect(view.container.textContent).toContain("Undercover");
    expect(view.container.textContent).toContain("Blair");

    view.cleanup();
  });

  it("lets the host restart the game from results", async () => {
    const view = createContainer();

    await renderInto(view.root, <RoomClient roomCode="ABCD" />);
    await flushPromises();

    await runInAct(() => mockSocket.trigger("room:snapshot", {
      room: makeRoom({
        round: {
          gameNumber: 2,
          roundNumber: 1,
          phase: "results",
          currentTurnPlayerId: null,
          activePlayerIds: ["p1", "p2", "p3"],
          clues: [],
          votes: [],
          eliminatedPlayerId: "p2",
          revealedUndercoverPlayerId: "p3",
          outcome: {
            winner: "undercover",
            eliminatedPlayerId: "p2",
            reason: "undercover-survived",
          },
        },
      }),
      selfPlayerId: "p1",
    }));
    await flushPromises();

    const restartButton = [...view.container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Restart game"),
    ) as HTMLButtonElement;
    await click(restartButton);

    expect(mockSocket.emitted.some((call) => call.event === "round:start")).toBe(true);
    const startCall = mockSocket.emitted.find((call) => call.event === "round:start")!;
    expect(startCall.args[0]).toEqual({
      roomCode: "ABCD",
      playerSessionId: "session-host",
    });

    view.cleanup();
  });

  it("lets the host change the word pack in the lobby", async () => {
    const view = createContainer();

    await renderInto(view.root, <RoomClient roomCode="ABCD" />);
    await flushPromises();

    await runInAct(() => mockSocket.trigger("room:snapshot", {
      room: makeRoom(),
      selfPlayerId: "p1",
    }));
    await flushPromises();

    const selects = view.container.querySelectorAll("select");
    const select = selects[1] as HTMLSelectElement;
    await changeValue(select, "hard-mode");

    const updateCall = mockSocket.emitted.find(
      (call) => call.event === "room:update-word-pack",
    );
    expect(updateCall?.args[0]).toEqual({
      roomCode: "ABCD",
      playerSessionId: "session-host",
      wordPackId: "hard-mode",
    });

    view.cleanup();
  });

  it("lets the host change the room language in the lobby", async () => {
    const view = createContainer();

    await renderInto(view.root, <RoomClient roomCode="ABCD" />);
    await flushPromises();

    await runInAct(() => mockSocket.trigger("room:snapshot", {
      room: makeRoom(),
      selfPlayerId: "p1",
    }));
    await flushPromises();

    const selects = view.container.querySelectorAll("select");
    const localeSelect = selects[0] as HTMLSelectElement;
    await changeValue(localeSelect, "my");

    const updateCall = mockSocket.emitted.find(
      (call) => call.event === "room:update-locale",
    );
    expect(updateCall?.args[0]).toEqual({
      roomCode: "ABCD",
      playerSessionId: "session-host",
      locale: "my",
    });

    view.cleanup();
  });
});
