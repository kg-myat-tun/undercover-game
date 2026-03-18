# Standard Game Engine Architecture

This document defines the target architecture for the Undercover game system and audits the current codebase against that target.

The goal is to keep the system predictable for gameplay, easy to extend, and aligned with SOLID principles across shared domain logic, server orchestration, persistence, transport, and UI.

## Goals

- Keep game rules deterministic and testable.
- Separate domain rules from transport and storage concerns.
- Make features such as timers, reconnection policies, spectators, custom packs, and new roles additive instead of invasive.
- Keep online game flow resilient when players disconnect, leave, or are removed.
- Make each module easy to reason about in isolation.

## Architectural Layers

### 1. Domain Layer

Location:
- `packages/shared/src/game.ts`
- `packages/shared/src/schemas.ts`
- `packages/shared/src/words.ts`

Responsibilities:
- Define game state and legal transitions.
- Define roles, phases, vote resolution, scoring, and reveal rules.
- Define input and output schemas shared across server and client.
- Remain framework-independent.

Rules:
- No NestJS, Socket.IO, Redis, or browser APIs.
- Pure functions should be preferred for round transitions.
- Side effects should be limited to timestamps and random sources, ideally injected.

### 2. Application Layer

Location:
- `apps/server/src/game/`

Responsibilities:
- Load and persist rooms.
- Validate actor permissions.
- Call domain functions to change state.
- Enforce use-case policies such as create room, join room, submit clue, continue round, and reconnect.

Rules:
- No direct knowledge of HTTP or WebSocket protocols.
- Depend on abstractions such as `RoomStore`, not concrete persistence.
- Keep use-case methods cohesive and focused.

### 3. Infrastructure Layer

Location:
- `apps/server/src/redis/`

Responsibilities:
- Implement persistence and storage concerns.
- Translate storage details to and from the domain/application model.

Rules:
- Implement interfaces from the application layer.
- Be replaceable without changing use-case logic.

### 4. Interface Layer

Location:
- `apps/server/src/socket/`
- `apps/server/src/*.controller.ts`
- `apps/web/src/components/`
- `apps/web/src/lib/`

Responsibilities:
- Map transport payloads to application use cases.
- Render current state and send user intents back to the server.
- Keep presentation concerns separate from game-rule decisions.

Rules:
- No rule resolution in controllers or React components.
- Adapters should translate, not decide.

## Target Engine Modules

The standard engine should evolve toward these modules:

### State Model

- `Room`
- `RoundState`
- `Player`
- `RoundOutcome`
- `VoteResolutionReason`

### Domain Policies

- `RoundFactory`
  - starts games
  - assigns roles
  - selects word pairs
- `CluePolicy`
  - validates turn order
  - advances clue flow
- `VotePolicy`
  - validates voting
  - resolves skip, tie, and elimination
- `OutcomePolicy`
  - decides civilian or undercover win
- `RoundContinuationPolicy`
  - moves the game from resolution to next clue round
- `PlayerLifecyclePolicy`
  - handles disconnect, leave, kick, and elimination effects on active rounds
- `ScorePolicy`
  - awards points on completed games

These can begin as grouped pure functions before being split into separate files or classes if the codebase grows.

## SOLID Rules For This System

### S: Single Responsibility Principle

Each module should have one main reason to change.

Examples:
- vote resolution changes should stay in domain vote logic
- Redis TTL changes should stay in persistence
- socket emission changes should stay in gateway adapters
- UI layout changes should stay in React components

### O: Open/Closed Principle

The system should be open to adding:
- new roles
- new phases
- timers
- spectators
- alternative storage
- custom packs

without repeatedly modifying the same central switchboard.

### L: Liskov Substitution Principle

Infrastructure implementations must be interchangeable.

Examples:
- `InMemoryRoomStore` and `RedisRoomStore` must behave the same from the application's perspective.

### I: Interface Segregation Principle

Interfaces should stay focused.

Examples:
- room persistence should expose only room persistence methods
- the client should not depend on hidden server-only state

### D: Dependency Inversion Principle

High-level game orchestration should depend on abstractions.

Examples:
- `RoomService` should depend on `RoomStore`
- transport layers should depend on application services, not storage implementations

## Re-Analysis Of The Current System

This assessment reflects the code after the recent round-resolution and self-vote updates.

### Strong Alignment

1. Domain rules mostly live in the shared package.
   - Round creation, clue submission, vote resolution, scoring, and public-room shaping are centralized in `packages/shared/src/game.ts`.

2. Persistence already uses an interface boundary.
   - `RoomStore` is a solid abstraction.
   - `InMemoryRoomStore` and `RedisRoomStore` are clean substitutes.

3. Game flow is more standard than before.
   - The system now has a proper `round-resolution` phase.
   - Skip and tie no longer silently jump back into clues.
   - Self-votes are blocked.
   - Round repair on player removal is handled on the server.

4. Dependency inversion improved on the server.
   - `RoomService` now depends directly on the `RoomStore` abstraction via the `ROOM_STORE` provider token.

### Partial Alignment

1. `RoomService` still carries multiple responsibilities.
   - It performs permission checks, session lookup, player lifecycle handling, round orchestration, and persistence coordination.
   - This is workable for the current size, but it is the main SRP pressure point on the server.

2. `packages/shared/src/game.ts` is becoming a domain god-file.
   - It currently handles round creation, clue transitions, vote resolution, outcome logic, continuation logic, score updates, and public projection.
   - This is the main OCP and SRP pressure point in the shared package.

3. `apps/web/src/components/room-client.tsx` is a monolithic UI orchestrator.
   - It manages socket subscriptions, derived selectors, user actions, phase rendering, and part of the UX state for secret visibility and overlays.
   - This is the main SRP pressure point in the web app.

### Gaps Against The Target Architecture

#### Gap 1: Domain behavior is not yet split by policy

Current location:
- `packages/shared/src/game.ts`

Issue:
- multiple domain policies are bundled together

Risk:
- adding timers, Mr. White, moderator tools, or custom elimination rules will increase switch complexity

Recommended next split:
- `round-factory.ts`
- `vote-policy.ts`
- `outcome-policy.ts`
- `player-lifecycle-policy.ts`
- `public-room-projection.ts`

#### Gap 2: Application service is still too broad

Current location:
- `apps/server/src/game/room.service.ts`

Issue:
- one service handles nearly all use cases and several internal policies

Risk:
- changes to host permissions, reconnect rules, or active-round repair all compete in the same class

Recommended next split:
- `room-command.service.ts`
- `room-query.service.ts`
- `room-access.policy.ts`
- `player-session.policy.ts`

#### Gap 3: Interface adapters still contain too much coordination detail

Current locations:
- `apps/server/src/socket/room.gateway.ts`
- `apps/server/src/room.controller.ts`

Issue:
- the gateway still knows about role emission details and room broadcast behavior
- the controller reads word-pack data directly from shared code instead of through an application-facing catalog abstraction

Risk:
- transport adapters become harder to change independently

Recommended next split:
- `room-broadcast.service.ts`
- `word-pack-catalog.service.ts`

#### Gap 4: Web room screen is not componentized enough

Current location:
- `apps/web/src/components/room-client.tsx`

Issue:
- one component handles transport wiring, selectors, action dispatching, and presentation

Risk:
- feature work becomes slower and more regression-prone

Recommended next split:
- `use-room-session.ts`
- `use-room-actions.ts`
- `secret-panel.tsx`
- `clue-panel.tsx`
- `vote-panel.tsx`
- `resolution-panel.tsx`
- `results-panel.tsx`
- `player-list-panel.tsx`

## SOLID Assessment By Principle

### Single Responsibility

Status: Partial

Good:
- storage implementations are focused
- schema definitions are centralized
- gateway and controller are mostly adapter-oriented

Needs work:
- `RoomService`
- `room-client.tsx`
- `packages/shared/src/game.ts`

### Open/Closed

Status: Partial

Good:
- storage can already be extended
- shared schemas and phases make additions explicit

Needs work:
- domain policies need file-level separation before more roles and timers are added
- UI phase rendering should be broken into smaller components before more game modes are introduced

### Liskov Substitution

Status: Strong

Good:
- in-memory and Redis stores share the same contract and behavior expectations

Watch:
- future stores must preserve room-code normalization, serialization stability, and null semantics

### Interface Segregation

Status: Mostly good

Good:
- `RoomStore` is compact
- public room shape hides secret information correctly

Needs work:
- the web component still consumes a large composite room object and derives many concerns from it locally

### Dependency Inversion

Status: Improved, not complete

Good:
- `RoomService` now depends on the `RoomStore` abstraction instead of the factory itself

Needs work:
- word-pack access should also move behind a small application-facing abstraction
- socket broadcast behavior should be separated from core use-case orchestration

## Standard For Future Changes

Any new gameplay feature should answer these questions before implementation:

1. Is this a domain rule, an application use case, an infrastructure concern, or a UI concern?
2. Can it be added by extending a focused module rather than editing a god-file?
3. Does the high-level module depend on an abstraction instead of a concrete implementation?
4. Can the rule be covered with deterministic tests without transport or storage?
5. If a player disconnects mid-flow, does the room still remain valid?

## Recommended Refactor Order

### Priority 1

- Split `packages/shared/src/game.ts` into policy-oriented domain files.
- Extract room queries from `RoomService`.
- Extract player-session and player-lifecycle policies from `RoomService`.

### Priority 2

- Introduce `WordPackCatalogService` on the server.
- Introduce `RoomBroadcastService` for socket fan-out and role delivery.
- Split `room-client.tsx` into hooks plus phase panels.

### Priority 3

- Introduce seeded randomness support for reproducible tests.
- Add timer policies as optional engine extensions.
- Add role extensions such as Mr. White without changing existing vote and outcome logic contracts.

## Conclusion

The current system is now closer to a standard game-engine architecture than before, especially in domain centralization, persistence substitution, and round flow correctness.

It is not yet fully SOLID across the entire system. The main remaining hotspots are:
- `packages/shared/src/game.ts`
- `apps/server/src/game/room.service.ts`
- `apps/web/src/components/room-client.tsx`

Those files should be treated as the next refactor frontier.
