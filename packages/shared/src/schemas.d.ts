import { z } from "zod";
export declare const roomCodeSchema: z.ZodString;
export declare const nicknameSchema: z.ZodString;
export declare const playerSessionIdSchema: z.ZodString;
export declare const playerIdSchema: z.ZodString;
export declare const roomIdSchema: z.ZodString;
export declare const createRoomInputSchema: z.ZodObject<{
    nickname: z.ZodString;
    wordPackId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nickname: string;
    wordPackId?: string | undefined;
}, {
    nickname: string;
    wordPackId?: string | undefined;
}>;
export declare const joinRoomInputSchema: z.ZodObject<{
    roomCode: z.ZodString;
    nickname: z.ZodString;
    playerSessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nickname: string;
    roomCode: string;
    playerSessionId?: string | undefined;
}, {
    nickname: string;
    roomCode: string;
    playerSessionId?: string | undefined;
}>;
export declare const reconnectRoomInputSchema: z.ZodObject<{
    roomCode: z.ZodString;
    playerSessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomCode: string;
    playerSessionId: string;
}, {
    roomCode: string;
    playerSessionId: string;
}>;
export declare const leaveRoomInputSchema: z.ZodObject<{
    roomCode: z.ZodString;
    playerSessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomCode: string;
    playerSessionId: string;
}, {
    roomCode: string;
    playerSessionId: string;
}>;
export declare const kickPlayerInputSchema: z.ZodObject<{
    roomCode: z.ZodString;
    playerSessionId: z.ZodString;
    targetPlayerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomCode: string;
    playerSessionId: string;
    targetPlayerId: string;
}, {
    roomCode: string;
    playerSessionId: string;
    targetPlayerId: string;
}>;
export declare const startRoundInputSchema: z.ZodObject<{
    roomCode: z.ZodString;
    playerSessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomCode: string;
    playerSessionId: string;
}, {
    roomCode: string;
    playerSessionId: string;
}>;
export declare const submitClueInputSchema: z.ZodObject<{
    roomCode: z.ZodString;
    playerSessionId: z.ZodString;
    clue: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomCode: string;
    playerSessionId: string;
    clue: string;
}, {
    roomCode: string;
    playerSessionId: string;
    clue: string;
}>;
export declare const submitVoteInputSchema: z.ZodObject<{
    roomCode: z.ZodString;
    playerSessionId: z.ZodString;
    targetPlayerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomCode: string;
    playerSessionId: string;
    targetPlayerId: string;
}, {
    roomCode: string;
    playerSessionId: string;
    targetPlayerId: string;
}>;
export declare const roomQuerySchema: z.ZodObject<{
    roomCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roomCode: string;
}, {
    roomCode: string;
}>;
export declare const playerSchema: z.ZodObject<{
    id: z.ZodString;
    sessionId: z.ZodString;
    nickname: z.ZodString;
    isHost: z.ZodBoolean;
    isConnected: z.ZodBoolean;
    joinedAt: z.ZodNumber;
    eliminatedAt: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    nickname: string;
    id: string;
    sessionId: string;
    isHost: boolean;
    isConnected: boolean;
    joinedAt: number;
    eliminatedAt: number | null;
}, {
    nickname: string;
    id: string;
    sessionId: string;
    isHost: boolean;
    isConnected: boolean;
    joinedAt: number;
    eliminatedAt: number | null;
}>;
export declare const publicPlayerSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    sessionId: z.ZodString;
    nickname: z.ZodString;
    isHost: z.ZodBoolean;
    isConnected: z.ZodBoolean;
    joinedAt: z.ZodNumber;
    eliminatedAt: z.ZodNullable<z.ZodNumber>;
}, "sessionId">, "strip", z.ZodTypeAny, {
    nickname: string;
    id: string;
    isHost: boolean;
    isConnected: boolean;
    joinedAt: number;
    eliminatedAt: number | null;
}, {
    nickname: string;
    id: string;
    isHost: boolean;
    isConnected: boolean;
    joinedAt: number;
    eliminatedAt: number | null;
}>;
export declare const clueSchema: z.ZodObject<{
    playerId: z.ZodString;
    clue: z.ZodString;
    submittedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    clue: string;
    playerId: string;
    submittedAt: number;
}, {
    clue: string;
    playerId: string;
    submittedAt: number;
}>;
export declare const voteSchema: z.ZodObject<{
    voterId: z.ZodString;
    targetPlayerId: z.ZodString;
    submittedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    targetPlayerId: string;
    submittedAt: number;
    voterId: string;
}, {
    targetPlayerId: string;
    submittedAt: number;
    voterId: string;
}>;
export declare const roundOutcomeSchema: z.ZodObject<{
    winner: z.ZodEnum<["civilians", "undercover"]>;
    eliminatedPlayerId: z.ZodNullable<z.ZodString>;
    reason: z.ZodEnum<["undercover-found", "undercover-survived", "tie-break"]>;
}, "strip", z.ZodTypeAny, {
    winner: "civilians" | "undercover";
    eliminatedPlayerId: string | null;
    reason: "undercover-found" | "undercover-survived" | "tie-break";
}, {
    winner: "civilians" | "undercover";
    eliminatedPlayerId: string | null;
    reason: "undercover-found" | "undercover-survived" | "tie-break";
}>;
export declare const roundPhaseSchema: z.ZodEnum<["lobby", "role-reveal", "clue-entry", "voting", "results"]>;
export declare const roundStateSchema: z.ZodObject<{
    roundNumber: z.ZodNumber;
    phase: z.ZodEnum<["lobby", "role-reveal", "clue-entry", "voting", "results"]>;
    currentTurnPlayerId: z.ZodNullable<z.ZodString>;
    activePlayerIds: z.ZodArray<z.ZodString, "many">;
    clues: z.ZodArray<z.ZodObject<{
        playerId: z.ZodString;
        clue: z.ZodString;
        submittedAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        clue: string;
        playerId: string;
        submittedAt: number;
    }, {
        clue: string;
        playerId: string;
        submittedAt: number;
    }>, "many">;
    votes: z.ZodArray<z.ZodObject<{
        voterId: z.ZodString;
        targetPlayerId: z.ZodString;
        submittedAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        targetPlayerId: string;
        submittedAt: number;
        voterId: string;
    }, {
        targetPlayerId: string;
        submittedAt: number;
        voterId: string;
    }>, "many">;
    eliminatedPlayerId: z.ZodNullable<z.ZodString>;
    undercoverPlayerId: z.ZodNullable<z.ZodString>;
    civilianWord: z.ZodNullable<z.ZodString>;
    undercoverWord: z.ZodNullable<z.ZodString>;
    outcome: z.ZodNullable<z.ZodObject<{
        winner: z.ZodEnum<["civilians", "undercover"]>;
        eliminatedPlayerId: z.ZodNullable<z.ZodString>;
        reason: z.ZodEnum<["undercover-found", "undercover-survived", "tie-break"]>;
    }, "strip", z.ZodTypeAny, {
        winner: "civilians" | "undercover";
        eliminatedPlayerId: string | null;
        reason: "undercover-found" | "undercover-survived" | "tie-break";
    }, {
        winner: "civilians" | "undercover";
        eliminatedPlayerId: string | null;
        reason: "undercover-found" | "undercover-survived" | "tie-break";
    }>>;
}, "strip", z.ZodTypeAny, {
    eliminatedPlayerId: string | null;
    roundNumber: number;
    phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
    currentTurnPlayerId: string | null;
    activePlayerIds: string[];
    clues: {
        clue: string;
        playerId: string;
        submittedAt: number;
    }[];
    votes: {
        targetPlayerId: string;
        submittedAt: number;
        voterId: string;
    }[];
    undercoverPlayerId: string | null;
    civilianWord: string | null;
    undercoverWord: string | null;
    outcome: {
        winner: "civilians" | "undercover";
        eliminatedPlayerId: string | null;
        reason: "undercover-found" | "undercover-survived" | "tie-break";
    } | null;
}, {
    eliminatedPlayerId: string | null;
    roundNumber: number;
    phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
    currentTurnPlayerId: string | null;
    activePlayerIds: string[];
    clues: {
        clue: string;
        playerId: string;
        submittedAt: number;
    }[];
    votes: {
        targetPlayerId: string;
        submittedAt: number;
        voterId: string;
    }[];
    undercoverPlayerId: string | null;
    civilianWord: string | null;
    undercoverWord: string | null;
    outcome: {
        winner: "civilians" | "undercover";
        eliminatedPlayerId: string | null;
        reason: "undercover-found" | "undercover-survived" | "tie-break";
    } | null;
}>;
export declare const scoreBoardSchema: z.ZodRecord<z.ZodString, z.ZodNumber>;
export declare const roomSchema: z.ZodObject<{
    id: z.ZodString;
    code: z.ZodString;
    wordPackId: z.ZodString;
    createdAt: z.ZodNumber;
    players: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        sessionId: z.ZodString;
        nickname: z.ZodString;
        isHost: z.ZodBoolean;
        isConnected: z.ZodBoolean;
        joinedAt: z.ZodNumber;
        eliminatedAt: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        nickname: string;
        id: string;
        sessionId: string;
        isHost: boolean;
        isConnected: boolean;
        joinedAt: number;
        eliminatedAt: number | null;
    }, {
        nickname: string;
        id: string;
        sessionId: string;
        isHost: boolean;
        isConnected: boolean;
        joinedAt: number;
        eliminatedAt: number | null;
    }>, "many">;
    round: z.ZodObject<{
        roundNumber: z.ZodNumber;
        phase: z.ZodEnum<["lobby", "role-reveal", "clue-entry", "voting", "results"]>;
        currentTurnPlayerId: z.ZodNullable<z.ZodString>;
        activePlayerIds: z.ZodArray<z.ZodString, "many">;
        clues: z.ZodArray<z.ZodObject<{
            playerId: z.ZodString;
            clue: z.ZodString;
            submittedAt: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            clue: string;
            playerId: string;
            submittedAt: number;
        }, {
            clue: string;
            playerId: string;
            submittedAt: number;
        }>, "many">;
        votes: z.ZodArray<z.ZodObject<{
            voterId: z.ZodString;
            targetPlayerId: z.ZodString;
            submittedAt: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }, {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }>, "many">;
        eliminatedPlayerId: z.ZodNullable<z.ZodString>;
        undercoverPlayerId: z.ZodNullable<z.ZodString>;
        civilianWord: z.ZodNullable<z.ZodString>;
        undercoverWord: z.ZodNullable<z.ZodString>;
        outcome: z.ZodNullable<z.ZodObject<{
            winner: z.ZodEnum<["civilians", "undercover"]>;
            eliminatedPlayerId: z.ZodNullable<z.ZodString>;
            reason: z.ZodEnum<["undercover-found", "undercover-survived", "tie-break"]>;
        }, "strip", z.ZodTypeAny, {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        }, {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        }>>;
    }, "strip", z.ZodTypeAny, {
        eliminatedPlayerId: string | null;
        roundNumber: number;
        phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
        currentTurnPlayerId: string | null;
        activePlayerIds: string[];
        clues: {
            clue: string;
            playerId: string;
            submittedAt: number;
        }[];
        votes: {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }[];
        undercoverPlayerId: string | null;
        civilianWord: string | null;
        undercoverWord: string | null;
        outcome: {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        } | null;
    }, {
        eliminatedPlayerId: string | null;
        roundNumber: number;
        phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
        currentTurnPlayerId: string | null;
        activePlayerIds: string[];
        clues: {
            clue: string;
            playerId: string;
            submittedAt: number;
        }[];
        votes: {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }[];
        undercoverPlayerId: string | null;
        civilianWord: string | null;
        undercoverWord: string | null;
        outcome: {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        } | null;
    }>;
    scoreboard: z.ZodRecord<z.ZodString, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    wordPackId: string;
    code: string;
    id: string;
    createdAt: number;
    players: {
        nickname: string;
        id: string;
        sessionId: string;
        isHost: boolean;
        isConnected: boolean;
        joinedAt: number;
        eliminatedAt: number | null;
    }[];
    round: {
        eliminatedPlayerId: string | null;
        roundNumber: number;
        phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
        currentTurnPlayerId: string | null;
        activePlayerIds: string[];
        clues: {
            clue: string;
            playerId: string;
            submittedAt: number;
        }[];
        votes: {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }[];
        undercoverPlayerId: string | null;
        civilianWord: string | null;
        undercoverWord: string | null;
        outcome: {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        } | null;
    };
    scoreboard: Record<string, number>;
}, {
    wordPackId: string;
    code: string;
    id: string;
    createdAt: number;
    players: {
        nickname: string;
        id: string;
        sessionId: string;
        isHost: boolean;
        isConnected: boolean;
        joinedAt: number;
        eliminatedAt: number | null;
    }[];
    round: {
        eliminatedPlayerId: string | null;
        roundNumber: number;
        phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
        currentTurnPlayerId: string | null;
        activePlayerIds: string[];
        clues: {
            clue: string;
            playerId: string;
            submittedAt: number;
        }[];
        votes: {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }[];
        undercoverPlayerId: string | null;
        civilianWord: string | null;
        undercoverWord: string | null;
        outcome: {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        } | null;
    };
    scoreboard: Record<string, number>;
}>;
export declare const publicRoundStateSchema: z.ZodObject<Omit<{
    roundNumber: z.ZodNumber;
    phase: z.ZodEnum<["lobby", "role-reveal", "clue-entry", "voting", "results"]>;
    currentTurnPlayerId: z.ZodNullable<z.ZodString>;
    activePlayerIds: z.ZodArray<z.ZodString, "many">;
    clues: z.ZodArray<z.ZodObject<{
        playerId: z.ZodString;
        clue: z.ZodString;
        submittedAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        clue: string;
        playerId: string;
        submittedAt: number;
    }, {
        clue: string;
        playerId: string;
        submittedAt: number;
    }>, "many">;
    votes: z.ZodArray<z.ZodObject<{
        voterId: z.ZodString;
        targetPlayerId: z.ZodString;
        submittedAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        targetPlayerId: string;
        submittedAt: number;
        voterId: string;
    }, {
        targetPlayerId: string;
        submittedAt: number;
        voterId: string;
    }>, "many">;
    eliminatedPlayerId: z.ZodNullable<z.ZodString>;
    undercoverPlayerId: z.ZodNullable<z.ZodString>;
    civilianWord: z.ZodNullable<z.ZodString>;
    undercoverWord: z.ZodNullable<z.ZodString>;
    outcome: z.ZodNullable<z.ZodObject<{
        winner: z.ZodEnum<["civilians", "undercover"]>;
        eliminatedPlayerId: z.ZodNullable<z.ZodString>;
        reason: z.ZodEnum<["undercover-found", "undercover-survived", "tie-break"]>;
    }, "strip", z.ZodTypeAny, {
        winner: "civilians" | "undercover";
        eliminatedPlayerId: string | null;
        reason: "undercover-found" | "undercover-survived" | "tie-break";
    }, {
        winner: "civilians" | "undercover";
        eliminatedPlayerId: string | null;
        reason: "undercover-found" | "undercover-survived" | "tie-break";
    }>>;
}, "undercoverPlayerId" | "civilianWord" | "undercoverWord">, "strip", z.ZodTypeAny, {
    eliminatedPlayerId: string | null;
    roundNumber: number;
    phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
    currentTurnPlayerId: string | null;
    activePlayerIds: string[];
    clues: {
        clue: string;
        playerId: string;
        submittedAt: number;
    }[];
    votes: {
        targetPlayerId: string;
        submittedAt: number;
        voterId: string;
    }[];
    outcome: {
        winner: "civilians" | "undercover";
        eliminatedPlayerId: string | null;
        reason: "undercover-found" | "undercover-survived" | "tie-break";
    } | null;
}, {
    eliminatedPlayerId: string | null;
    roundNumber: number;
    phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
    currentTurnPlayerId: string | null;
    activePlayerIds: string[];
    clues: {
        clue: string;
        playerId: string;
        submittedAt: number;
    }[];
    votes: {
        targetPlayerId: string;
        submittedAt: number;
        voterId: string;
    }[];
    outcome: {
        winner: "civilians" | "undercover";
        eliminatedPlayerId: string | null;
        reason: "undercover-found" | "undercover-survived" | "tie-break";
    } | null;
}>;
export declare const publicRoomSchema: z.ZodObject<{
    id: z.ZodString;
    code: z.ZodString;
    wordPackId: z.ZodString;
    createdAt: z.ZodNumber;
    scoreboard: z.ZodRecord<z.ZodString, z.ZodNumber>;
} & {
    players: z.ZodArray<z.ZodObject<Omit<{
        id: z.ZodString;
        sessionId: z.ZodString;
        nickname: z.ZodString;
        isHost: z.ZodBoolean;
        isConnected: z.ZodBoolean;
        joinedAt: z.ZodNumber;
        eliminatedAt: z.ZodNullable<z.ZodNumber>;
    }, "sessionId">, "strip", z.ZodTypeAny, {
        nickname: string;
        id: string;
        isHost: boolean;
        isConnected: boolean;
        joinedAt: number;
        eliminatedAt: number | null;
    }, {
        nickname: string;
        id: string;
        isHost: boolean;
        isConnected: boolean;
        joinedAt: number;
        eliminatedAt: number | null;
    }>, "many">;
    round: z.ZodObject<Omit<{
        roundNumber: z.ZodNumber;
        phase: z.ZodEnum<["lobby", "role-reveal", "clue-entry", "voting", "results"]>;
        currentTurnPlayerId: z.ZodNullable<z.ZodString>;
        activePlayerIds: z.ZodArray<z.ZodString, "many">;
        clues: z.ZodArray<z.ZodObject<{
            playerId: z.ZodString;
            clue: z.ZodString;
            submittedAt: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            clue: string;
            playerId: string;
            submittedAt: number;
        }, {
            clue: string;
            playerId: string;
            submittedAt: number;
        }>, "many">;
        votes: z.ZodArray<z.ZodObject<{
            voterId: z.ZodString;
            targetPlayerId: z.ZodString;
            submittedAt: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }, {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }>, "many">;
        eliminatedPlayerId: z.ZodNullable<z.ZodString>;
        undercoverPlayerId: z.ZodNullable<z.ZodString>;
        civilianWord: z.ZodNullable<z.ZodString>;
        undercoverWord: z.ZodNullable<z.ZodString>;
        outcome: z.ZodNullable<z.ZodObject<{
            winner: z.ZodEnum<["civilians", "undercover"]>;
            eliminatedPlayerId: z.ZodNullable<z.ZodString>;
            reason: z.ZodEnum<["undercover-found", "undercover-survived", "tie-break"]>;
        }, "strip", z.ZodTypeAny, {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        }, {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        }>>;
    }, "undercoverPlayerId" | "civilianWord" | "undercoverWord">, "strip", z.ZodTypeAny, {
        eliminatedPlayerId: string | null;
        roundNumber: number;
        phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
        currentTurnPlayerId: string | null;
        activePlayerIds: string[];
        clues: {
            clue: string;
            playerId: string;
            submittedAt: number;
        }[];
        votes: {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }[];
        outcome: {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        } | null;
    }, {
        eliminatedPlayerId: string | null;
        roundNumber: number;
        phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
        currentTurnPlayerId: string | null;
        activePlayerIds: string[];
        clues: {
            clue: string;
            playerId: string;
            submittedAt: number;
        }[];
        votes: {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }[];
        outcome: {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        } | null;
    }>;
}, "strip", z.ZodTypeAny, {
    wordPackId: string;
    code: string;
    id: string;
    createdAt: number;
    players: {
        nickname: string;
        id: string;
        isHost: boolean;
        isConnected: boolean;
        joinedAt: number;
        eliminatedAt: number | null;
    }[];
    round: {
        eliminatedPlayerId: string | null;
        roundNumber: number;
        phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
        currentTurnPlayerId: string | null;
        activePlayerIds: string[];
        clues: {
            clue: string;
            playerId: string;
            submittedAt: number;
        }[];
        votes: {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }[];
        outcome: {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        } | null;
    };
    scoreboard: Record<string, number>;
}, {
    wordPackId: string;
    code: string;
    id: string;
    createdAt: number;
    players: {
        nickname: string;
        id: string;
        isHost: boolean;
        isConnected: boolean;
        joinedAt: number;
        eliminatedAt: number | null;
    }[];
    round: {
        eliminatedPlayerId: string | null;
        roundNumber: number;
        phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
        currentTurnPlayerId: string | null;
        activePlayerIds: string[];
        clues: {
            clue: string;
            playerId: string;
            submittedAt: number;
        }[];
        votes: {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }[];
        outcome: {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        } | null;
    };
    scoreboard: Record<string, number>;
}>;
export declare const roomSummarySchema: z.ZodObject<Omit<{
    id: z.ZodString;
    code: z.ZodString;
    wordPackId: z.ZodString;
    createdAt: z.ZodNumber;
    scoreboard: z.ZodRecord<z.ZodString, z.ZodNumber>;
} & {
    players: z.ZodArray<z.ZodObject<Omit<{
        id: z.ZodString;
        sessionId: z.ZodString;
        nickname: z.ZodString;
        isHost: z.ZodBoolean;
        isConnected: z.ZodBoolean;
        joinedAt: z.ZodNumber;
        eliminatedAt: z.ZodNullable<z.ZodNumber>;
    }, "sessionId">, "strip", z.ZodTypeAny, {
        nickname: string;
        id: string;
        isHost: boolean;
        isConnected: boolean;
        joinedAt: number;
        eliminatedAt: number | null;
    }, {
        nickname: string;
        id: string;
        isHost: boolean;
        isConnected: boolean;
        joinedAt: number;
        eliminatedAt: number | null;
    }>, "many">;
    round: z.ZodObject<Omit<{
        roundNumber: z.ZodNumber;
        phase: z.ZodEnum<["lobby", "role-reveal", "clue-entry", "voting", "results"]>;
        currentTurnPlayerId: z.ZodNullable<z.ZodString>;
        activePlayerIds: z.ZodArray<z.ZodString, "many">;
        clues: z.ZodArray<z.ZodObject<{
            playerId: z.ZodString;
            clue: z.ZodString;
            submittedAt: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            clue: string;
            playerId: string;
            submittedAt: number;
        }, {
            clue: string;
            playerId: string;
            submittedAt: number;
        }>, "many">;
        votes: z.ZodArray<z.ZodObject<{
            voterId: z.ZodString;
            targetPlayerId: z.ZodString;
            submittedAt: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }, {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }>, "many">;
        eliminatedPlayerId: z.ZodNullable<z.ZodString>;
        undercoverPlayerId: z.ZodNullable<z.ZodString>;
        civilianWord: z.ZodNullable<z.ZodString>;
        undercoverWord: z.ZodNullable<z.ZodString>;
        outcome: z.ZodNullable<z.ZodObject<{
            winner: z.ZodEnum<["civilians", "undercover"]>;
            eliminatedPlayerId: z.ZodNullable<z.ZodString>;
            reason: z.ZodEnum<["undercover-found", "undercover-survived", "tie-break"]>;
        }, "strip", z.ZodTypeAny, {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        }, {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        }>>;
    }, "undercoverPlayerId" | "civilianWord" | "undercoverWord">, "strip", z.ZodTypeAny, {
        eliminatedPlayerId: string | null;
        roundNumber: number;
        phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
        currentTurnPlayerId: string | null;
        activePlayerIds: string[];
        clues: {
            clue: string;
            playerId: string;
            submittedAt: number;
        }[];
        votes: {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }[];
        outcome: {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        } | null;
    }, {
        eliminatedPlayerId: string | null;
        roundNumber: number;
        phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
        currentTurnPlayerId: string | null;
        activePlayerIds: string[];
        clues: {
            clue: string;
            playerId: string;
            submittedAt: number;
        }[];
        votes: {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }[];
        outcome: {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        } | null;
    }>;
}, "id">, "strip", z.ZodTypeAny, {
    wordPackId: string;
    code: string;
    createdAt: number;
    players: {
        nickname: string;
        id: string;
        isHost: boolean;
        isConnected: boolean;
        joinedAt: number;
        eliminatedAt: number | null;
    }[];
    round: {
        eliminatedPlayerId: string | null;
        roundNumber: number;
        phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
        currentTurnPlayerId: string | null;
        activePlayerIds: string[];
        clues: {
            clue: string;
            playerId: string;
            submittedAt: number;
        }[];
        votes: {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }[];
        outcome: {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        } | null;
    };
    scoreboard: Record<string, number>;
}, {
    wordPackId: string;
    code: string;
    createdAt: number;
    players: {
        nickname: string;
        id: string;
        isHost: boolean;
        isConnected: boolean;
        joinedAt: number;
        eliminatedAt: number | null;
    }[];
    round: {
        eliminatedPlayerId: string | null;
        roundNumber: number;
        phase: "lobby" | "role-reveal" | "clue-entry" | "voting" | "results";
        currentTurnPlayerId: string | null;
        activePlayerIds: string[];
        clues: {
            clue: string;
            playerId: string;
            submittedAt: number;
        }[];
        votes: {
            targetPlayerId: string;
            submittedAt: number;
            voterId: string;
        }[];
        outcome: {
            winner: "civilians" | "undercover";
            eliminatedPlayerId: string | null;
            reason: "undercover-found" | "undercover-survived" | "tie-break";
        } | null;
    };
    scoreboard: Record<string, number>;
}>;
export type CreateRoomInput = z.infer<typeof createRoomInputSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomInputSchema>;
export type ReconnectRoomInput = z.infer<typeof reconnectRoomInputSchema>;
export type LeaveRoomInput = z.infer<typeof leaveRoomInputSchema>;
export type KickPlayerInput = z.infer<typeof kickPlayerInputSchema>;
export type StartRoundInput = z.infer<typeof startRoundInputSchema>;
export type SubmitClueInput = z.infer<typeof submitClueInputSchema>;
export type SubmitVoteInput = z.infer<typeof submitVoteInputSchema>;
export type Player = z.infer<typeof playerSchema>;
export type PublicPlayer = z.infer<typeof publicPlayerSchema>;
export type ClueSubmission = z.infer<typeof clueSchema>;
export type Vote = z.infer<typeof voteSchema>;
export type RoundOutcome = z.infer<typeof roundOutcomeSchema>;
export type RoundPhase = z.infer<typeof roundPhaseSchema>;
export type RoundState = z.infer<typeof roundStateSchema>;
export type Room = z.infer<typeof roomSchema>;
export type PublicRoundState = z.infer<typeof publicRoundStateSchema>;
export type PublicRoom = z.infer<typeof publicRoomSchema>;
