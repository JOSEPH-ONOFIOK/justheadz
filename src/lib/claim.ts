// Holder claim: holders of partner communities claim a JustHeadz mint spot.
// Shared by the API and the UI.
//
// Phase 1: the OG communities. Phase 2: the communities. Both are free mints.
// Someone holding both gets Phase 1. 3,000 spots in total.
//
// Two ways to give a wallet:
//   connect + sign  proves they own it. Beats a typed claim on the same wallet.
//   type it         no wallet connection. Can be taken over by the owner signing.
// Vaults (optional, per phase): with delegation on, a vault that delegated to the wallet on
// delegate.xyz counts too, and never has to connect.

import { X_HANDLE } from "./site";

export type Chain = "ethereum" | "robinhood";
export const CHAIN_NAMES: Record<Chain, string> = { ethereum: "Ethereum", robinhood: "Robinhood Chain" };

// contracts: [] = not checked yet (add the address to switch it on)
export type Community = { name: string; chain: Chain; contracts: string[]; logo: string };
export type PhaseStatus = "live" | "soon" | "closed";
// delegation: also check vaults that delegated to the wallet on delegate.xyz
export type Phase = { n: 1 | 2; name: string; status: PhaseStatus; delegation: boolean; blurb: string; communities: Community[] };

const eth = (name: string, logo: string, ...contracts: string[]): Community => ({ name, chain: "ethereum", contracts, logo: `/communities/${logo}` });
const rh = (name: string, logo: string, ...contracts: string[]): Community => ({ name, chain: "robinhood", contracts, logo: `/communities/${logo}` });

export const PHASES: Phase[] = [
  {
    n: 1,
    name: "Phase 1",
    status: "live",
    delegation: true,
    blurb: "The OG communities. Free mint, first in line.",
    communities: [
      // CryptoPunks, plus punks wrapped as ERC-721
      eth("CryptoPunks", "cryptopunks.jpg", "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB", "0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6"),
      eth("Pudgy Penguins", "pudgy-penguins.jpg", "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8"),
      eth("CyberKongz", "cyberkongz.jpg", "0x57a204AA1042f6E66DD7730813f4024114d74f37"),
      eth("Milady", "milady.jpg", "0x5Af0D9827E0c53E4799BB226655A1de152A425a5"),
      eth("Bored Ape Yacht Club", "bayc.jpg", "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"),
      eth("Mutant Ape Yacht Club", "mayc.jpg", "0x60E4d786628Fea6478F785A6d7e704777c86a7c6"),
      eth("Lil Pudgys", "lil-pudgys.jpg", "0x524cAB2ec69124574082676e6F654a18df49A048"),
      eth("Doodles", "doodles.jpg", "0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e"),
      eth("VeeFriends", "veefriends.jpg", "0xa3AEe8BcE55BEeA1951EF834b99f3Ac60d1ABeeB"),
      eth("Cool Cats", "cool-cats.jpg", "0x1A92f7381B9F03921564a437210bB9396471050C"),
      eth("Meebits", "meebits.jpg", "0x7Bd29408f11D2bFC23c34f18275bBf23bB716Bc7"),
      eth("DeadFellaz", "deadfellaz.jpg", "0x2acAb3DEa77832C09420663b0E1cB386031bA17B"),
      eth("Azuki", "azuki.jpg", "0xED5AF388653567Af2F388E6224dC7C4b3241C544"),
      eth("Moonbirds", "moonbirds.jpg", "0x23581767a106ae21c074b2276D25e5C3e136a68b"),
      eth("Sappy Seals", "sappy-seals.jpg", "0x364C828eE171616a39897688A831c2499aD972ec"),
      eth("CloneX", "clonex.jpg", "0x49cF6f5d44E70224e2E23fDcdd2C053F30aDA28B"),
      eth("World of Women", "world-of-women.jpg", "0xe785E82358879F061BC3dcAC6f0444462D4b5330"),
      // Max Pain and Frens is split across three XCOPY contracts: drawing, ranked auctions, open edition burns
      eth(
        "Max Pain and Frens",
        "max-pain.jpg",
        "0x42df42a471e1db2d4e4a1545b2f4b951f2da06e4",
        "0x18a62e93ff3ab180e0c7abd4812595bf2be3405f",
        "0x3696cd00618a08c8793208385ae526677c889d4a",
      ),
    ],
  },
  {
    n: 2,
    name: "Phase 2",
    status: "live",
    delegation: true,
    blurb: "The communities. Free mint, right after Phase 1.",
    communities: [
      eth("Funkari", "funkari.jpg", "0x1fafd33d882e1c275c61066019a23c1999b5006e"),
      eth("Original Blokyz", "blokyz.jpg", "0x86ffb7988913e85a5a07d459a5165ab1273cfe62"),
      eth("Argonauts", "argonauts.jpg", "0x387c41b0b2f1128de44db1bcf8baad085f26392c"),
      rh("CCFF00", "ccff00.svg", "0x505a22ffed8d37ebe580ffd98d2cdb0021189146"),
      rh("Rekt Tradooor", "rekt-tradooor.jpg", "0x7b3ecfa33657de415ff269dc97dfa82954cee706"),
      rh("The Mutual Fun", "the-mutual-fun.jpg", "0x1215D567dc4E0F2999DcC262D78d1586ff97154F"), // the Seats
      rh("Suited Ape Society", "suited-ape-society.jpg", "0xe638f58c87258ece6c0eddc46f70327663635c69"),
      rh("Vaultlings", "vaultlings.jpg", "0x23708e501cbeaa92f45183197c673fdabf993484"),
      rh("WIF Outlaws", "wif-outlaws.jpg", "0x12a4c7659a4b7c4a2870b5167c4f8b014c7fa690"),
      rh("Yield Field Deeds", "yield-field-deeds.jpg", "0x231142e88f523b0a4f46d2d79faab2ce1828e43a"),
      rh("Clay Stonkz", "clay-stonks.jpg", "0xde0acefc89d4cf5f4ce45a4fb8a51aa355091b44"),
      rh("TMO Initiates", "tmo.jpg", "0x0d58589536f442da1c192c89232448c23d8b41bb"),
      rh("Vamps", "vamps.jpg", "0x93a3ecadfe057b695fe3a98bbd4fd3e4557ca55d"),
      rh("Companions by Wfit", "companions.jpg", "0x9224ab1dac093a8062119457c94a6c439e595a4c"),
      rh("Cash Grab RH", "cash-grab.jpg", "0x66de4a428a3b890abee81968bcfdb385fe80d22d"),
      rh("The Goat Ranch Club", "goat-ranch-club.jpg", "0x95a85681e28988b4ef503369470b4da7681c4bc8"),
      eth("Freedz", "freedz.jpg", "0x993873f58f0ce4728bbd68dd5fabcb75ef48e7c4"),
      eth("Normies", "normies.jpg", "0x9eb6e2025b64f340691e424b7fe7022ffde12438"),
      rh("Souls.club", "soul-club.jpg", "0xd6889961584a42dc5d8196bd82a4c6d0f2b684c5"), // Digital Humans
      rh("Internet Monkes", "internet-monkes.jpg", "0x315c62f3a56dc2f581cc09096a5b438f3171cacb"),
      rh("pyopyopyo", "pyopyopyo.jpg", "0x08dc7cb3f4ccc8eea782e2924d151e2130f22b28"), // pyopyopyopyo
      // opensea.io/collection/fudsofficial. Not OG FUDS (0x71557B3a4D6F12094D09c101422d8e5bBaB4cAb5)
      rh("FUDS", "fuds.jpg", "0x5df9b71b85aabd771278eeebc7bcb60b090c723a"),
      rh("Goat Street", "goat-street.jpg", "0xc21159f412c294ca2c38f2a9ecaaccf9d93ec929"), // by Cashmere
      rh("AGNTS", "agnts.jpg", "0x57efd86cf3ab1812cb47f0fd3c3d5bf0efb1f2d5"), // AGNTS by tut, opensea.io/collection/agntstut
    ],
  },
];

export const ALL_COMMUNITIES = PHASES.flatMap((p) => p.communities.map((c) => ({ ...c, phase: p.n, delegation: p.delegation })));

// Spots in total, across both phases
export const CLAIM_CAP = 3000; // shown on the page: the cap itself is enforced in Code.gs (TOTAL_CAP)
export const phaseOf = (community: string) => ALL_COMMUNITIES.find((c) => c.name === community)?.phase;

// The claim post people like, repost and reply under. Empty until it's up:
// until then the reply step takes any post of theirs that tags us.
export const CLAIM_POST = "";
export const CLAIM_POST_ID = /\/status(?:es)?\/(\d+)/.exec(CLAIM_POST)?.[1] ?? "";

export const claimReplyText = (phase: number, community: string) =>
  `Locked my ${X_HANDLE} Phase ${phase} spot as a ${community} holder 👁️👁️\n\nHeads only. Check yours 👇`;

// What the wallet signs to prove it's theirs. Free: no transaction, no gas.
export const signMessage = (wallet: string, handle: string, ts: number) =>
  `JustHeadz holder claim\n\nI own this wallet and want to claim with it.\n\nWallet: ${wallet.toLowerCase()}\nX: @${handle}\nTime: ${ts}\n\nThis is free. It is not a transaction and moves nothing.`;

export type Claim = {
  wallet?: string; // the connected, signed wallet: the one that mints
  via?: string; // the vault that holds the NFT, when it isn't the wallet itself
  community?: string;
  phase?: 1 | 2;
  followed?: boolean;
  liked?: boolean;
  reposted?: boolean;
  replyLink?: string;
  claimedAt?: number;
  signed?: boolean; // proved with a signature, rather than typed
  lostTo?: string; // a typed claim the wallet's owner took over by signing
};

// In order: wallet, follow, like and repost, reply
export const claimStepsDone = (c?: Claim) => !!(c?.community && c.followed && c.liked && c.reposted && c.replyLink);

export type ClaimStats = { claimed: number; cap: number; byPhase: Record<number, number>; byCommunity: Record<string, number> };
