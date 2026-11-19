// Server only: which claim communities a wallet holds, read live from each chain,
// including vaults that delegated to it on delegate.xyz.

import { createPublicClient, http, getAddress, zeroHash, type Address } from "viem";
import { mainnet } from "viem/chains";
import { ALL_COMMUNITIES, CHAIN_NAMES, signMessage, type Chain } from "./claim";

const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;
// delegate.xyz v2 registry: same address on Ethereum and Robinhood Chain
const REGISTRY = "0x00000000000000447e69651d841bD8D104Bed493" as const;

const clients = {
  ethereum: createPublicClient({ chain: mainnet, transport: http(process.env.ETHEREUM_RPC_URL || "https://ethereum-rpc.publicnode.com", { timeout: 10_000, retryCount: 1 }) }),
  robinhood: createPublicClient({ transport: http(process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com", { timeout: 10_000, retryCount: 1 }) }),
};

const ERC721 = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "address" }] },
] as const;

const REGISTRY_ABI = [
  {
    type: "function",
    name: "getIncomingDelegations",
    stateMutability: "view",
    inputs: [{ name: "to", type: "address" }],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "type_", type: "uint8" }, // 1 all, 2 contract, 3 ERC-721 token
          { name: "to", type: "address" },
          { name: "from", type: "address" },
          { name: "rights", type: "bytes32" },
          { name: "contract_", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "amount", type: "uint256" },
        ],
      },
    ],
  },
] as const;

export type Found = { community: string; phase: 1 | 2; via?: string };

// Burned NFTs sit here: never let them count
const BURN = new Set(["0x0000000000000000000000000000000000000000", "0x000000000000000000000000000000000000dead", "0xdead000000000000000042069420694206942069"]);
export const isBurn = (a: string) => BURN.has(a.toLowerCase());

type Check = { community: string; phase: 1 | 2; contract: Address; owner: Address; tokenId?: bigint };

// Vaults that delegated to this wallet on one chain: whole wallet, one contract, or one token.
// Only full delegations (no specific rights) count.
async function delegationsTo(chain: Chain, wallet: Address) {
  const list = await clients[chain].readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName: "getIncomingDelegations", args: [wallet] });
  return list.filter((d) => d.rights === zeroHash && d.from.toLowerCase() !== wallet.toLowerCase() && d.type_ >= 1 && d.type_ <= 3);
}

async function checkChain(chain: Chain, wallet: Address): Promise<Found[]> {
  const communities = ALL_COMMUNITIES.filter((c) => c.chain === chain && c.contracts.length);
  const checks: Check[] = [];
  const add = (owner: Address, only?: { contract: string; tokenId?: bigint }) => {
    if (isBurn(owner)) return;
    for (const c of communities)
      for (const raw of c.contracts) {
        const contract = getAddress(raw);
        if (only && only.contract.toLowerCase() !== contract.toLowerCase()) continue;
        checks.push({ community: c.name, phase: c.phase, contract, owner, tokenId: only?.tokenId });
      }
  };

  add(wallet);
  for (const d of await delegationsTo(chain, wallet)) {
    if (d.type_ === 1) add(d.from);
    else if (d.type_ === 2) add(d.from, { contract: d.contract_ });
    else add(d.from, { contract: d.contract_, tokenId: d.tokenId });
  }

  const results = await clients[chain].multicall({
    multicallAddress: MULTICALL3,
    allowFailure: true,
    contracts: checks.map((k) =>
      k.tokenId === undefined
        ? { address: k.contract, abi: ERC721, functionName: "balanceOf" as const, args: [k.owner] as const }
        : { address: k.contract, abi: ERC721, functionName: "ownerOf" as const, args: [k.tokenId] as const },
    ),
  });

  const found: Found[] = [];
  results.forEach((r, i) => {
    if (r.status !== "success") return;
    const k = checks[i];
    const holds = k.tokenId === undefined ? (r.result as bigint) > BigInt(0) : (r.result as string).toLowerCase() === k.owner.toLowerCase();
    if (holds) found.push({ community: k.community, phase: k.phase, via: k.owner.toLowerCase() === wallet.toLowerCase() ? undefined : k.owner.toLowerCase() });
  });
  return found;
}

// found: every community held, best first (Phase 1, then the wallet itself before a vault).
// down: chains we couldn't read.
export async function findHoldings(wallet: string) {
  const w = getAddress(wallet);
  const chains: Chain[] = ["ethereum", "robinhood"];
  const settled = await Promise.allSettled(chains.map((c) => checkChain(c, w)));
  const found: Found[] = [];
  const down: string[] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") found.push(...s.value);
    else {
      console.error(`holdings on ${chains[i]} failed`, s.reason);
      down.push(CHAIN_NAMES[chains[i]]);
    }
  });
  found.sort((a, b) => a.phase - b.phase || Number(!!a.via) - Number(!!b.via));
  return { found, down };
}

// The wallet signed our message for this X account in the last 10 minutes.
// Through the chain client, so smart wallets (Safe, Coinbase) verify as well as normal ones.
export async function checkSignature(wallet: string, handle: string, ts: number, signature: string) {
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 10 * 60_000) return false;
  const message = signMessage(wallet, handle, ts);
  const args = { address: getAddress(wallet), message, signature: signature as `0x${string}` };
  if (await clients.ethereum.verifyMessage(args).catch(() => false)) return true;
  try {
    return await clients.robinhood.verifyMessage(args);
  } catch {
    return false;
  }
}
