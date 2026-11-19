"use client";

// Browser wallets, no library: every installed wallet announces itself (EIP-6963),
// with window.ethereum as the fallback for wallets that don't.

import { toHex } from "viem";

export type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
export type WalletOption = { id: string; name: string; icon?: string; provider: Eip1193 };

type Announce = CustomEvent<{ info: { uuid: string; name: string; icon: string; rdns: string }; provider: Eip1193 }>;

export function discoverWallets(onChange: (list: WalletOption[]) => void) {
  const found = new Map<string, WalletOption>();
  const emit = () => {
    const list = [...found.values()];
    const injected = (window as unknown as { ethereum?: Eip1193 }).ethereum;
    if (!list.length && injected) list.push({ id: "injected", name: "Browser wallet", provider: injected });
    onChange(list);
  };
  const on = (e: Event) => {
    const { info, provider } = (e as Announce).detail;
    found.set(info.rdns || info.uuid, { id: info.rdns || info.uuid, name: info.name, icon: info.icon, provider });
    emit();
  };
  window.addEventListener("eip6963:announceProvider", on);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  // Give extensions a moment to answer, then fall back to window.ethereum
  const t = setTimeout(emit, 400);
  return () => {
    clearTimeout(t);
    window.removeEventListener("eip6963:announceProvider", on);
  };
}

// The signed message carries the time, so a signature only works for a few minutes
export async function connectAndSign(p: Eip1193, makeMessage: (wallet: string, ts: number) => string) {
  const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
  const wallet = accounts?.[0];
  if (!wallet) throw new Error("No account was shared.");
  const ts = Date.now();
  const message = makeMessage(wallet, ts);
  const signature = (await p.request({ method: "personal_sign", params: [toHex(message), wallet] })) as string;
  return { wallet, signature, ts };
}

// Wallet errors into plain words
export function walletError(e: unknown) {
  const err = e as { code?: number; message?: string };
  if (err?.code === 4001) return "You cancelled in your wallet. Try again when you're ready.";
  if (err?.code === -32002) return "Your wallet already has a request open. Check the wallet window.";
  return err?.message?.slice(0, 160) || "Your wallet didn't respond. Try again.";
}
