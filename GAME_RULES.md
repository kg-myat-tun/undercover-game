# Undercover Game Rules

This document describes the current rules for the web version in this repository.

## Overview

Undercover is a social deduction game.

- Most players are `Civilians`
- One player is the `Undercover`
- Civilians all receive the same secret word
- The Undercover receives a similar but different word

Players take turns giving clues, then everyone votes on who seems suspicious.

## Players

- Minimum: `3`
- Maximum: `8`
- One player is the host
- The host creates the room, can remove players, and can start the next game

## Word Packs

- Each room uses one selected word pack
- The host chooses the pack when creating the room
- The host can change the pack only between games:
  - in `lobby`
  - in `results`

## Roles

At the start of each game:

- the server randomly chooses `1` Undercover
- all other players are Civilians
- turn order is randomized

## Game Flow

Each game follows these phases:

1. `Lobby`
2. `Clue Entry`
3. `Voting`
4. `Round Resolution`
5. `Results` if the game ends

If the game does not end after a vote, the room enters `Round Resolution` first, then continues into the next clue round.

## Clue Phase

- Each active player gives exactly one clue on their turn
- Clues are submitted in server-assigned turn order
- After the last active player submits a clue, voting opens

## Voting Phase

- Every active player submits one vote
- A player may vote for another player
- A player may also `skip`
- Votes are hidden until the vote is resolved

## Vote Resolution

When all active players have voted:

- the server counts votes for each player
- the server also counts `skip` votes

Resolution rules:

- If `skip` has at least as many votes as the top player, no one is eliminated
- If player votes are tied for the top spot, no one is eliminated
- Otherwise, the highest-voted player is eliminated

## Win Conditions

### Civilians win

Civilians win when the eliminated player is the Undercover.

### Undercover wins

The Undercover wins if the Undercover is still alive and only `2` players remain active after elimination.

## Skip Outcome

If a vote resolves to `skip`:

- no one is eliminated
- the same game continues
- the room shows the round resolution
- the host continues to the next clue round
- the round number increases when that next clue round begins

## Round Resolution

After voting resolves and the game is not over:

- the room shows whether someone was eliminated
- the room shows whether the vote skipped or tied
- votes from that round remain visible during the resolution step
- the host continues to the next clue round

## Results

When a game ends:

- the winner is shown
- the eliminated player is shown
- the Undercover is revealed to everyone
- vote details are revealed
- the host can start a new game

## Game vs Round

This app tracks both `gameNumber` and `roundNumber`.

### New game

A new game starts:

- from the lobby
- or after a completed result when the host starts again

When a new game starts:

- `gameNumber` increases by `1`
- `roundNumber` resets to `1`

### Same game, next round

If the vote does not end the game:

- the same `gameNumber` continues
- `roundNumber` increases by `1`

Example:

- `Game 1 / Round 1`
- vote skips or eliminates a civilian while the Undercover survives and more than 2 players remain
- next state becomes `Game 1 / Round 2`

If the game ends and the host starts again:

- next state becomes `Game 2 / Round 1`

## Scoreboard

- Points are awarded only when a game ends
- Civilian players get a point if Civilians win
- The Undercover gets a point if the Undercover wins

## Reconnect

- Players reconnect using their saved session on the same device
- If the host leaves, host control is reassigned by the server
- If a player disconnects, leaves, or is removed during a game, the server repairs the active round so the room does not get stuck

## Current Scope

This MVP currently supports:

- Civilians
- Undercover
- clue rounds
- skip voting
- repeated games in the same room
- host-selected word packs

This MVP does not currently include:

- Mr. White
- custom word packs
- accounts
- chat or voice
