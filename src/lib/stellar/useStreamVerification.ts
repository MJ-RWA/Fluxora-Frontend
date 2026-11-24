import { useEffect, useState } from "react";
import type { StreamRecord } from "../../data/streamRecords";
import { compareStreamWithOnChain, getNumericStreamId, type StreamMismatch } from "./compare";
import { getOnChainStream } from "./read";
export type StreamVerificationStatus = "verifying" | "verified" | "mismatch" | "unavailable";
export interface StreamVerification { status: StreamVerificationStatus; mismatches: StreamMismatch[]; message: string; }

export function useStreamVerification(stream: StreamRecord | null | undefined): StreamVerification {
  const [verification, setVerification] = useState<StreamVerification>({
    status: "verifying", mismatches: [], message: "Checking the stream against Soroban…",
  });
  useEffect(() => {
    if (!stream) return;
    const controller = new AbortController();
    const numericId = getNumericStreamId(stream.id);
    if (!numericId) {
      setVerification({ status: "unavailable", mismatches: [], message: "This stream has no numeric on-chain ID, so it could not be verified." });
      return () => controller.abort();
    }
    setVerification({ status: "verifying", mismatches: [], message: "Checking the stream against Soroban…" });
    let timeoutId: ReturnType<typeof setTimeout>;
    const lookup = getOnChainStream(numericId, stream.treasuryAddress, controller.signal);
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Soroban verification timed out.")), 12_000);
    });
    Promise.race([lookup, timeout])
      .then((onChain) => {
        if (controller.signal.aborted) return;
        const mismatches = compareStreamWithOnChain(stream, onChain);
        setVerification(mismatches.length === 0
          ? { status: "verified", mismatches: [], message: "Verified on-chain. Displayed stream details match the contract." }
          : { status: "mismatch", mismatches, message: "The displayed stream differs from the contract. Review the fields below before taking action." });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setVerification({ status: "unavailable", mismatches: [], message: error instanceof Error ? "Could not verify on-chain: " + error.message : "Could not verify this stream on-chain." });
      });
    return () => controller.abort();
  }, [stream]);
  return verification;
}
