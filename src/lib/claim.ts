// Holder claim: holders of partner communities claim a JustHeadz mint spot.
// Shared by the API and the UI.
//
// Phase 1: the blue chips. Phase 2: the communities from the Mochi claim.
// Someone holding both gets Phase 1. Vaults count through delegate.xyz:
// a vault that delegated to the connected wallet is checked too, and never has to connect.

import { X_HANDLE } from "./site";

export type Chain = "ethereum" | "robinhood";
export const CHAIN_NAMES: Record<Chain, string> = { ethereum: "Ethereum", robinhood: "Robinhood Chain" };

// contracts: [] = not checked yet (add the address to switch it on)
export type Community = { name: string; chain: Chain; contracts: string[]; logo: string };
export type PhaseStatus = "live" | "soon" | "closed";
export type Phase = { n: 1 | 2; name: string; status: PhaseStatus; blurb: string; communities: Community[] };

const eth = (name: string, logo: string, ...contracts: string[]): Community => ({ name, chain: "ethereum", contracts, logo: `/communities/${logo}` });
const rh = (name: string, logo: string, ...contracts: string[]): Community => ({ name, chain: "robinhood", contracts, logo: `/communities/${logo}` });

export const PHASES: Phase[] = [
  {
    n: 1,
    name: "Phase 1",
    status: "live",
    blurb: "The old heads. 2021 and 2022 blue chips mint first.",
    communities: [
      // CryptoPunks, plus punks wrapped as ERC-721
      eth("CryptoPunks", "cryptopunks.jpg", "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB", "0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6"),
      eth("Pudgy Penguins", "pudgy-penguins.jpg", "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8"),
      eth("CyberKongz", "cyberkongz.jpg", "0x57a204AA1042f6E66DD7730813f4024114d74f37"),
      eth("Milady", "milady.jpg", "0x5Af0D9827E0c53E4799BB226655A1de152A425a5"),
      eth("BAYC", "bayc.jpg", "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"),
      eth("MAYC", "mayc.jpg", "0x60E4d786628Fea6478F785A6d7e704777c86a7c6"),
      eth("Lil Pudgys", "lil-pudgys.jpg", "0x524cAB2ec69124574082676e6F654a18df49A048"),
      eth("Doodles", "doodles.jpg", "0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e"),
      eth("VeeFriends", "veefriends.jpg", "0xa3AEe8BcE55BEeA1951EF834b99f3Ac60d1ABeeB"),
      eth("Cool Cats", "cool-cats.jpg", "0x1A92f7381B9F03921564a437210bB9396471050C"),
      eth("Meebits", "meebits.jpg", "0x7Bd29408f11D2bFC23c34f18275bBf23bB716Bc7"),
      eth("CrypToadz", "cryptoadz.jpg", "0x1CB1A5e65610AEFF2551A50f76a87a7d3fB649C6"),
      eth("DeadFellaz", "deadfellaz.jpg", "0x2acAb3DEa77832C09420663b0E1cB386031bA17B"),
      eth("Azuki", "azuki.jpg", "0xED5AF388653567Af2F388E6224dC7C4b3241C544"),
      eth("Moonbirds", "moonbirds.jpg", "0x23581767a106ae21c074b2276D25e5C3e136a68b"),
      eth("Sappy Seals", "sappy-seals.jpg", "0x364C828eE171616a39897688A831c2499aD972ec"),
      eth("CloneX", "clonex.jpg", "0x49cF6f5d44E70224e2E23fDcdd2C053F30aDA28B"),
      eth("World of Women", "world-of-women.jpg", "0xe785E82358879F061BC3dcAC6f0444462D4b5330"),
      // Grifters live on XCOPY's shared Async Blueprints contract (0xc143bbfcdbdbed6d454803804752a064a622c1f3)
      // with other drops, so a plain balance check would let those in too. Off until it's checked by token.
      eth("Grifters", "grifters.jpg"),
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
    blurb: "The frens. Robinhood Chain and Ethereum communities mint next.",
    communities: [
      eth("Funkari", "funkari.jpg", "0x1fafd33d882e1c275c61066019a23c1999b5006e"),
      eth("Normies", "normies.jpg", "0x9eb6e2025b64f340691e424b7fe7022ffde12438"),
      rh("WIF Outlaws", "wif-outlaws.jpg", "0x12a4c7659a4b7c4a2870b5167c4f8b014c7fa690"),
      rh("Clay StonKz", "clay-stonks.jpg", "0xde0acefc89d4cf5f4ce45a4fb8a51aa355091b44"),
      rh("CCFF00", "ccff00.svg", "0x505a22ffed8d37ebe580ffd98d2cdb0021189146"),
      rh("Soul Club", "soul-club.jpg", "0xd6889961584a42dc5d8196bd82a4c6d0f2b684c5"),
      eth("Argonauts", "argonauts.jpg", "0x387c41b0b2f1128de44db1bcf8baad085f26392c"),
      rh("Vaultlings", "vaultlings.jpg", "0x23708e501cbeaa92f45183197c673fdabf993484"),
      rh("CannaCats", "cannacat.jpg", "0x53716c211179a342e37734f4fb46b276c975359a"),
      rh("Rekt TRADOOR", "rekt-tradooor.jpg", "0x7b3ecfa33657de415ff269dc97dfa82954cee706"),
      rh("Goat Ranch Club", "goat-ranch-club.jpg", "0x95a85681e28988b4ef503369470b4da7681c4bc8"),
      eth("Blokyz", "blokyz.jpg", "0x86ffb7988913e85a5a07d459a5165ab1273cfe62"),
      rh("TMO", "tmo.jpg", "0x0d58589536f442da1c192c89232448c23d8b41bb"),
      eth("Freedz", "freedz.jpg", "0x993873f58f0ce4728bbd68dd5fabcb75ef48e7c4"),
      rh("Cash Grab", "cash-grab.jpg", "0x66de4a428a3b890abee81968bcfdb385fe80d22d"),
      rh("Joystick Junkies", "joystick-junkies.jpg", "0x9294e3b8268369977f46ca263370da8ca2e7a351"),
      eth("Chimpers", "chimpers.jpg", "0x307af7d28afee82092aa95d35644898311ca5360"),
    ],
  },
];

export const ALL_COMMUNITIES = PHASES.flatMap((p) => p.communities.map((c) => ({ ...c, phase: p.n })));
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
};

// In order: wallet, follow, like and repost, reply
export const claimStepsDone = (c?: Claim) => !!(c?.community && c.followed && c.liked && c.reposted && c.replyLink);

export type ClaimStats = { claimed: number; byPhase: Record<number, number>; byCommunity: Record<string, number> };
