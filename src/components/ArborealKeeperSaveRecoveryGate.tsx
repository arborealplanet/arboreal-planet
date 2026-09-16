"use client";

// Canonical save-recovery entry point. The legacy recovery implementation is
// intentionally reused until the backing GTP save key/API migration is complete.
export { ChondroSaveRecoveryGate as ArborealKeeperSaveRecoveryGate } from "@/components/ChondroSaveRecoveryGate";
