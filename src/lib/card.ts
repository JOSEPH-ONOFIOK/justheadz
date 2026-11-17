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
