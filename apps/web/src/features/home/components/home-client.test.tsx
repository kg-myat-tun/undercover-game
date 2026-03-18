// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomeClient } from "../home-client";
import {
  changeValue,
  click,
  createContainer,
  flushPromises,
  pressKey,
  renderInto,
  runInAct,
} from "../../../shared/test/test-helpers";
import { getStoredSession } from "../../../shared/lib/session";

const push = vi.fn();
let searchRoomCode: string | null = null;

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
  useSearchParams: () => ({
    get: (key: string) => (key === "room" ? searchRoomCode : null),
  }),
}));

vi.mock("../../../shared/lib/socket", () => ({
  getSocket: () => mockSocket,
}));

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  push.mockReset();
  searchRoomCode = null;
  mockSocket.handlers.clear();
  mockSocket.emitted.length = 0;
  mockSocket.connect.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: async () => [
        { id: "classic", name: "Classic", category: "General", pairCount: 100, availableLocales: ["en", "my"] },
        { id: "hard-mode", name: "Hard Mode", category: "Advanced", pairCount: 100, availableLocales: ["en"] },
      ],
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HomeClient", () => {
  it("creates a room with the selected word pack", async () => {
    const view = createContainer();

    await renderInto(view.root, <HomeClient />);
    await flushPromises();

    const inputs = view.container.querySelectorAll("input");
    const createNameInput = inputs[0] as HTMLInputElement;
    const selects = view.container.querySelectorAll("select");
    const packSelect = selects[1] as HTMLSelectElement;
    const createButton = [...view.container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Create room"),
    ) as HTMLButtonElement;

    await changeValue(createNameInput, "Jese");
    await changeValue(packSelect, "hard-mode");
    await click(createButton);

    const createCall = mockSocket.emitted.find((call) => call.event === "room:create");
    expect(createCall?.args[0]).toEqual({
      nickname: "Jese",
      wordPackId: "hard-mode",
      locale: "en",
    });

    view.cleanup();
  });

  it("joins the invited room when Enter is pressed", async () => {
    searchRoomCode = "4bcq";
    const view = createContainer();

    await renderInto(view.root, <HomeClient />);
    await flushPromises();

    const inputs = view.container.querySelectorAll("input");
    const joinNameInput = inputs[1] as HTMLInputElement;
    const joinCodeInput = inputs[2] as HTMLInputElement;

    expect(joinCodeInput.value).toBe("4BCQ");

    await changeValue(joinNameInput, "Alex");
    await pressKey(joinCodeInput, "Enter");

    const joinCall = mockSocket.emitted.find((call) => call.event === "room:join");
    expect(joinCall?.args[0]).toEqual({
      roomCode: "4BCQ",
      nickname: "Alex",
    });

    view.cleanup();
  });

  it("stores the session and navigates after successful room creation", async () => {
    const view = createContainer();

    await renderInto(view.root, <HomeClient />);
    await flushPromises();

    const createNameInput = view.container.querySelectorAll("input")[0] as HTMLInputElement;
    await changeValue(createNameInput, "Host");

    const createButton = [...view.container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Create room"),
    ) as HTMLButtonElement;
    await click(createButton);

    const createCall = mockSocket.emitted.find((call) => call.event === "room:create")!;
    const ack = createCall.args[1] as (result: {
      roomCode: string;
      playerSessionId: string;
    }) => void;

    await runInAct(() =>
      ack({
        roomCode: "ABCD",
        playerSessionId: "session-123",
      }),
    );

    expect(getStoredSession("ABCD")).toBe("session-123");
    expect(push).toHaveBeenCalledWith("/room/ABCD");

    view.cleanup();
  });
});
