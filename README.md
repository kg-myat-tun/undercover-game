# Undercover

Realtime Undercover party game built as a TypeScript monorepo.

## Workspaces

- `apps/web`: Next.js client
- `apps/server`: NestJS + Socket.IO realtime backend
- `packages/shared`: shared schemas, game engine, and socket contracts

## Docs

- `docs/GAME_RULES.md`: player-facing rules and standard gameplay behavior
- `docs/GAME_ENGINE_LOGIC.md`: current runtime game engine logic and invariants
- `docs/STANDARD_GAME_ENGINE_ARCHITECTURE.md`: target engine architecture and SOLID guidance

## Getting Started

1. Install dependencies:

```bash
bun install
```

2. Create local env files for each app:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.local.example apps/web/.env.local
```

3. Start Redis locally or point `REDIS_URL` at your Redis instance.

4. Run the apps in separate terminals:

```bash
bun run dev:server
bun run dev:web
```

Or run the workspace dev pipeline with Turbo:

```bash
bun run dev
```

## Environment

### Server

- env file: `apps/server/.env`
- `PORT` default `4000`
- `CLIENT_ORIGIN` default `http://localhost:3000`
- `REDIS_URL` example `redis://localhost:6379`; falls back to in-memory storage if omitted

### Web

- env file: `apps/web/.env.local`
- `NEXT_PUBLIC_SERVER_URL` default `http://localhost:4000`
- `NEXT_PUBLIC_SOCKET_URL` default `http://localhost:4000`

## Test

```bash
bun run test
```

## Tooling

- `bun run build`: build the monorepo through Turborepo
- `bun run lint`: run package-level Biome checks through Turborepo
- `bun run format`: format the repo with Biome
- `bun run format:check`: verify formatting without writing changes
