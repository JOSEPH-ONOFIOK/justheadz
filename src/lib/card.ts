"use client";

// Draws the applicant card people attach to their final post, and downloads it as a PNG.
const W = 1200;
const H = 675;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = src;
  });

export async function downloadCard(handle: string) {
  const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-bowlby").trim() || "Impact";
  await document.fonts.load(`80px ${fam}`).catch(() => {});
  const banner = await loadImage("/art/banner.webp");

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  // paper
  g.fillStyle = "#f8d8a7";
  g.fillRect(0, 0, W, H);

  // speed lines from the eyes
  g.save();
  g.translate(W * 0.55, H * 0.38);
  g.fillStyle = "rgba(173,53,87,0.14)";
  for (let a = 0; a < 360; a += 9) {
    g.rotate((9 * Math.PI) / 180);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(1400, -40);
    g.lineTo(1400, 40);
    g.fill();
  }
  g.restore();

  // the peek, cropped to the slash
  g.drawImage(banner, 400, 200, 2000, 660, 20, 40, 1160, 383);

  // wine band with the handle
  g.save();
  g.translate(0, 470);
  g.rotate(-0.03);
  g.fillStyle = "#120c0a";
  g.fillRect(-20, 6, W + 40, 120);
  g.fillStyle = "#ad3557";
  g.fillRect(-20, 0, W + 40, 112);
  g.fillStyle = "#fff3df";
  g.font = `76px ${fam}`;
  g.setTransform(g.getTransform().multiply(new DOMMatrix([1, 0, -0.16, 1, 0, 0])));
  g.fillText(`@${handle}`.toUpperCase(), 70, 86);
  g.restore();

  g.fillStyle = "#120c0a";
  g.font = `40px ${fam}`;
  g.fillText("WHITELIST APPLICANT", 70, 640);
  g.font = "bold 26px system-ui, sans-serif";
  g.textAlign = "right";
  g.fillText("JUSTHEADZ · NEW EVOLUTION", W - 60, 634);

  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"));
  if (!blob) return false;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `justheadz-${handle}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}

// The card people attach when they share an evolution stage
export async function downloadEvoCard(o: { handle: string; img: string; stage: number; name: string; points: number; site: string }) {
  const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-bowlby").trim() || "Impact";
  await document.fonts.load(`80px ${fam}`).catch(() => {});
  const head = await loadImage(o.img);

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const evolved = o.stage >= 5;

  g.fillStyle = evolved ? "#120c0a" : "#f8d8a7";
  g.fillRect(0, 0, W, H);

  // burst behind the head, denser each stage
  const cx = 330;
  const cy = 340;
  g.save();
  g.translate(cx, cy);
  g.fillStyle = evolved ? "rgba(113,70,197,0.55)" : `rgba(173,53,87,${0.08 + o.stage * 0.05})`;
  const step = 14 - o.stage * 1.6;
  for (let a = 0; a < 360; a += step) {
    g.rotate((step * Math.PI) / 180);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(900, -26);
    g.lineTo(900, 26);
    g.fill();
  }
  g.restore();

  // head in a ring
  const r = 210;
  g.save();
  g.beginPath();
  g.arc(cx, cy, r + 18, 0, Math.PI * 2);
  g.fillStyle = evolved ? "#7146c5" : o.stage >= 3 ? "#ad3557" : "#120c0a";
  g.fill();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();
  if (o.stage === 1) g.filter = "grayscale(1) brightness(0.8)";
  g.drawImage(head, cx - r, cy - r, r * 2, r * 2);
  g.restore();

  const ink = evolved ? "#fff3df" : "#120c0a";
  g.fillStyle = ink;
  g.font = `34px ${fam}`;
  g.fillText(`STAGE ${o.stage} OF 5`, 620, 170);
  g.fillStyle = evolved ? "#c9a6ff" : "#ad3557";
  g.font = `110px ${fam}`;
  g.fillText(o.name.toUpperCase(), 610, 285);

  g.fillStyle = ink;
  g.font = `54px ${fam}`;
  const tag = `@${o.handle}`.toUpperCase();
  g.fillText(tag.length > 16 ? `${tag.slice(0, 15)}…` : tag, 620, 380);
  g.font = "bold 34px system-ui, sans-serif";
  g.fillText(`${o.points} evo points`, 622, 440);

  // stage pips
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.rect(622 + i * 74, 480, 60, 18);
    g.fillStyle = i < o.stage ? (evolved ? "#7146c5" : "#ad3557") : "transparent";
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = ink;
    g.stroke();
  }

  g.font = `30px ${fam}`;
  g.fillText("JUSTHEADZ · NEW EVOLUTION", 620, 600);
  g.font = "bold 26px system-ui, sans-serif";
  g.globalAlpha = 0.7;
  g.fillText(o.site, 622, 640);
  g.globalAlpha = 1;

  const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"));
  if (!blob) return false;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `justheadz-${o.handle}-stage-${o.stage}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}
