import type { Metadata } from "next";
import { Apply } from "@/components/apply/Apply";
import { PageShell } from "@/components/motion/PageShell";

export const metadata: Metadata = { title: "Whitelist", description: "The JustHeadz whitelist application. Six steps, in order, and the eyes check every one.", alternates: { canonical: "/whitelist" } };

export default function WhitelistPage() {
  return (
    <PageShell>
      <Apply />
    </PageShell>
  );
}
