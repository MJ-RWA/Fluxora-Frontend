import type { StreamRecord } from "../../data/streamRecords";
import type { OnChainStream } from "./read";
export interface StreamMismatch { field: string; displayed: string; onChain: string; }

function toStroops(amount: number): bigint | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  const match = String(amount).match(/^(\d+)(?:\.(\d{1,7}))?$/);
  if (!match) return null;
  return BigInt(match[1]) * 10_000_000n + BigInt((match[2] ?? "").padEnd(7, "0") || "0");
}
function dateToSeconds(value: string): bigint | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? BigInt(Math.floor(timestamp / 1000)) : null;
}
function normalizedStatus(status: string): string {
  const value = status.trim().toLowerCase();
  return value === "depleted" || value === "matured" ? "completed" : value;
}
function addMismatch(mismatches: StreamMismatch[], field: string, displayed: unknown, onChain: unknown) {
  if (String(displayed).toLowerCase() !== String(onChain).toLowerCase()) {
    mismatches.push({ field, displayed: String(displayed), onChain: String(onChain) });
  }
}
export function compareStreamWithOnChain(displayed: StreamRecord, onChain: OnChainStream): StreamMismatch[] {
  const mismatches: StreamMismatch[] = [];
  addMismatch(mismatches, "Sender", displayed.treasuryAddress, onChain.sender);
  addMismatch(mismatches, "Recipient", displayed.recipientAddress, onChain.recipient);
  const deposit = toStroops(displayed.depositAmount);
  if (deposit === null || deposit !== onChain.deposited) {
    mismatches.push({ field: "Deposit", displayed: displayed.depositAmount + " " + displayed.asset, onChain: onChain.deposited.toString() });
  }
  const streamed = toStroops(displayed.streamedAmount);
  if (streamed === null || streamed !== onChain.vested) {
    mismatches.push({ field: "Streamed", displayed: displayed.streamedAmount + " " + displayed.asset, onChain: onChain.vested.toString() });
  }
  const withdrawable = toStroops(displayed.withdrawableAmount);
  if (withdrawable === null || withdrawable !== onChain.withdrawable) {
    mismatches.push({ field: "Withdrawable", displayed: displayed.withdrawableAmount + " " + displayed.asset, onChain: onChain.withdrawable.toString() });
  }
  const remaining = toStroops(displayed.remainingAmount);
  const onChainRemaining = onChain.deposited - onChain.vested;
  if (remaining === null || remaining !== onChainRemaining) {
    mismatches.push({ field: "Remaining", displayed: displayed.remainingAmount + " " + displayed.asset, onChain: onChainRemaining.toString() });
  }
  const start = dateToSeconds(displayed.startDate);
  if (start === null || start !== onChain.startTime) {
    mismatches.push({ field: "Start time", displayed: displayed.startDate, onChain: onChain.startTime.toString() });
  }
  const end = dateToSeconds(displayed.endDate);
  if (end === null || end !== onChain.endTime) {
    mismatches.push({ field: "End time", displayed: displayed.endDate, onChain: onChain.endTime.toString() });
  }
  addMismatch(mismatches, "Status", normalizedStatus(displayed.status), normalizedStatus(onChain.status));
  return mismatches;
}
export function getNumericStreamId(id: string): string | null {
  const match = id.match(/^(?:STR-)?(\d+)$/i);
  if (!match) return null;
  try { return BigInt(match[1]).toString(); } catch { return null; }
}
