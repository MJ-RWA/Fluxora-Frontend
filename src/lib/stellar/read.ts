import {
  Contract, Networks, TransactionBuilder, rpc as SorobanRpc, scValToNative, xdr,
} from "@stellar/stellar-sdk";
import { createConfig } from "../config";

export interface OnChainStream {
  sender: string; recipient: string; token: string;
  deposited: bigint; withdrawn: bigint; startTime: bigint; endTime: bigint;
  cliffTime: bigint; status: string;
}

function toBigInt(value: unknown, field: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  throw new Error("Invalid " + field + " returned by the Soroban contract.");
}
function readAddress(value: unknown, field: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object" && "toString" in value) {
    const result = String(value);
    if (result && result !== "[object Object]") return result;
  }
  throw new Error("Invalid " + field + " address returned by the Soroban contract.");
}
function readStatus(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const [variant] = Object.keys(value);
    if (variant) return variant;
  }
  throw new Error("Invalid stream status returned by the Soroban contract.");
}
function decodeStream(value: unknown): OnChainStream {
  if (!value || typeof value !== "object") throw new Error("The Soroban contract returned an invalid stream.");
  const stream = value as Record<string, unknown>;
  return {
    sender: readAddress(stream.sender, "sender"),
    recipient: readAddress(stream.recipient, "recipient"),
    token: readAddress(stream.token, "token"),
    deposited: toBigInt(stream.deposited, "deposited amount"),
    withdrawn: toBigInt(stream.withdrawn, "withdrawn amount"),
    startTime: toBigInt(stream.start_time, "start time"),
    endTime: toBigInt(stream.end_time, "end time"),
    cliffTime: toBigInt(stream.cliff_time, "cliff time"),
    status: readStatus(stream.status),
  };
}

/** Simulates the contract getter without wallet authorization or transaction submission. */
export async function getOnChainStream(
  streamId: string, sourceAddress: string, signal?: AbortSignal,
): Promise<OnChainStream> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  if (!/^\d+$/.test(streamId)) throw new Error("This stream does not have a numeric on-chain ID.");
  const config = createConfig(import.meta.env);
  if (!config.rpcUrl || !config.streamContractId) throw new Error("Soroban RPC or stream contract is not configured.");
  const server = new SorobanRpc.Server(config.rpcUrl);
  const passphrase = config.network === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;
  const account = await server.getAccount(sourceAddress);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const operation = new Contract(config.streamContractId).call(
    "get_stream", xdr.ScVal.scvU64(xdr.Uint64.fromString(streamId)),
  );
  const transaction = new TransactionBuilder(account, { fee: "100", networkPassphrase: passphrase })
    .addOperation(operation).setTimeout(30).build();
  const simulation = await server.simulateTransaction(transaction);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  if (!SorobanRpc.Api.isSimulationSuccess(simulation)) {
    throw new Error(simulation.error || "Soroban stream lookup failed.");
  }
  const encoded = simulation.results?.[0]?.xdr;
  if (!encoded) throw new Error("Soroban returned no stream data.");
  return decodeStream(scValToNative(xdr.ScVal.fromXDR(encoded, "base64")));
}
