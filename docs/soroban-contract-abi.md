# Soroban Contract ABI Reference

This document describes the expected Application Binary Interface (ABI) for the Soroban stream contract invoked by the Fluxora frontend. Since Soroban invocations rely on precise `ScVal` ordering and typing, this reference ensures that all transaction builder flows (in `src/lib/stellar/tx.ts`) construct arguments correctly.

## Common Types and Scaling

To ensure precision and standard representations on-chain, specific scaling rules apply to numeric and time-based arguments:
- **Amounts**: Scaled to 7 decimal places. For example, `1 USDC` must be encoded as `10000000`.
- **Timestamps**: Represented in **Unix epoch seconds**.
- **Encoder Helpers**: The `tx.ts` module uses specific encoder helpers for `ScVal` conversion.
  - `encodeAddress`: Used for Stellar addresses (`ScValType.scvAddress`).
  - `encodeU64`: Used for amounts, stream IDs, and timestamps (`ScValType.scvU64`).

*Security Note: Always double-check unit and scaling assumptions before passing arguments to prevent accidental mis-scaled transfers.*

## Contract Functions

### `create_stream`

Creates a new token stream.

| Argument Order | Name        | ScVal Type | Encoder Helper  | Description / Units                                   |
| -------------- | ----------- | ---------- | --------------- | ----------------------------------------------------- |
| 1              | `sender`    | `Address`  | `encodeAddress` | The Stellar address funding the stream.               |
| 2              | `recipient` | `Address`  | `encodeAddress` | The Stellar address receiving the stream.             |
| 3              | `amount`    | `u64`      | `encodeU64`     | Total deposit amount, scaled to 7 decimals.           |
| 4              | `start_time`| `u64`      | `encodeU64`     | Start time as a Unix timestamp (seconds).             |
| 5              | `end_time`  | `u64`      | `encodeU64`     | End time as a Unix timestamp (seconds).               |

---

### `withdraw`

Withdraws accrued funds from an active stream.

| Argument Order | Name        | ScVal Type | Encoder Helper  | Description / Units                                   |
| -------------- | ----------- | ---------- | --------------- | ----------------------------------------------------- |
| 1              | `recipient` | `Address`  | `encodeAddress` | The Stellar address withdrawing funds.                |
| 2              | `stream_id` | `u64`      | `encodeU64`     | The numerical ID of the stream.                       |
| 3              | `amount`    | `u64`      | `encodeU64`     | Amount to withdraw, scaled to 7 decimals.             |

---

### `pause_stream`

Pauses an active stream, halting further accrual.

| Argument Order | Name        | ScVal Type | Encoder Helper  | Description / Units                                   |
| -------------- | ----------- | ---------- | --------------- | ----------------------------------------------------- |
| 1              | `sender`    | `Address`  | `encodeAddress` | The Stellar address of the stream owner.              |
| 2              | `stream_id` | `u64`      | `encodeU64`     | The numerical ID of the stream.                       |

---

### `cancel_stream`

Cancels an active or paused stream, returning unaccrued funds to the sender.

| Argument Order | Name        | ScVal Type | Encoder Helper  | Description / Units                                   |
| -------------- | ----------- | ---------- | --------------- | ----------------------------------------------------- |
| 1              | `sender`    | `Address`  | `encodeAddress` | The Stellar address of the stream owner.              |
| 2              | `stream_id` | `u64`      | `encodeU64`     | The numerical ID of the stream.                       |


---

### get_stream (read-only)

Reads the complete stream record by its numeric contract stream ID. The frontend
uses Soroban RPC simulateTransaction with this getter; it does not request
wallet authorization, sign, or submit a transaction.

| Argument | ScVal type | Description |
| --- | --- | --- |
| stream_id | u64 | Numeric stream identifier |

The returned Stream includes sender, recipient, token, deposited and withdrawn
(i128 stroops), start_time, end_time and cliff_time (u64 Unix seconds), and
status. The detail page compares the sender, recipient, deposited amount,
schedule and status with the API record. The API asset ticker is not a token
contract address and is not compared directly.
