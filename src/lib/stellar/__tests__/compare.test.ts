import { describe, expect, it } from "vitest";
import type { StreamRecord } from "../../data/streamRecords";
import type { OnChainStream } from "./read";
import { compareStreamWithOnChain, getNumericStreamId } from "./compare";
const displayed = {
  id: "STR-7", name: "Test stream", recipientName: "Recipient",
  recipientAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  treasuryName: "Treasury", treasuryAddress: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWHF",
  asset: "USDC", status: "Active", monthlyRate: 1, depositAmount: 1.0000001,
  streamedAmount: 0, withdrawableAmount: 0, remainingAmount: 1.0000001,
  progress: 0, startDate: "2026-01-01T00:00:00Z", endDate: "2026-02-01T00:00:00Z",
  summary: "", health: "Healthy", healthNote: "", auditNote: "", tags: [], timeline: [],
} satisfies StreamRecord;
const onChain = {
  sender: displayed.treasuryAddress, recipient: displayed.recipientAddress,
  token: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
  deposited: 10_000_001n, withdrawn: 0n, startTime: 1_767_225_600n,
  endTime: 1_769_904_000n, cliffTime: 1_767_225_600n, status: "Active",
} satisfies OnChainStream;
describe("compareStreamWithOnChain", () => {
  it("compares amounts in bigint stroops", () => { expect(compareStreamWithOnChain(displayed, onChain)).toEqual([]); });
  it("reports differing fields", () => {
    const result = compareStreamWithOnChain(displayed, { ...onChain, deposited: 10_000_000n, recipient: "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC", status: "Paused" });
    expect(result.map((item) => item.field)).toEqual(["Recipient", "Deposit", "Status"]);
  });
  it("flags amounts with more than seven decimal places instead of rounding", () => {
    expect(compareStreamWithOnChain({ ...displayed, depositAmount: 1.00000001 }, onChain).map((item) => item.field)).toContain("Deposit");
  });
  it("maps depleted contract streams to completed", () => {
    expect(compareStreamWithOnChain(displayed, { ...onChain, status: "Depleted" })).toEqual([]);
  });
});
describe("getNumericStreamId", () => {
  it("accepts numeric and STR-prefixed IDs", () => {
    expect(getNumericStreamId("42")).toBe("42");
    expect(getNumericStreamId("STR-007")).toBe("7");
  });
  it("rejects non-numeric identifiers", () => { expect(getNumericStreamId("stream-abc")).toBeNull(); });
});
