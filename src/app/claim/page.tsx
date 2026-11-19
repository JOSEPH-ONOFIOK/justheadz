import type { Metadata } from "next";
import { ClaimPage } from "@/components/claim/Claim";
import { PageShell } from "@/components/motion/PageShell";

export const metadata: Metadata = {
  title: "Holder Claim",
  description: "Hold a Phase 1 or Phase 2 community NFT? Claim your JustHeadz mint spot with a free signature. Vault holders claim through delegate.xyz.",
  alternates: { canonical: "/claim" },
};

export default function Page() {
  return (
    <PageShell>
      <ClaimPage />
    </PageShell>
  );
}
