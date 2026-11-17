// The heads in the "new evolution" collage (collage.webp is 1500 x 1500).
// x, y, r are in collage pixels and place each head's hotspot.
// Names, moods and lines are placeholders until the team names them.
export type Head = {
  id: string;
  name: string;
  mood: Mood;
  line: string;
  x: number;
  y: number;
  r: number;
  img: string;
  pitch: number; // poke sound
};

export const MOODS = ["Sad", "Sleepy", "Mad", "Screaming", "Shook", "Snarling", "Dead inside", "Smug", "Unbothered"] as const;
export type Mood = (typeof MOODS)[number];

export const PILE: Head[] = [
  { id: "sad", name: "The Weeper", mood: "Sad", line: "It's not a phase. It's a lifestyle.", x: 735, y: 395, r: 175, img: "/art/heads/sad.webp", pitch: 220 },
  { id: "tusk", name: "Old Tusk", mood: "Sleepy", line: "Wake me up when it's mint day.", x: 425, y: 610, r: 150, img: "/art/heads/tusk.webp", pitch: 140 },
  { id: "mad", name: "Redcap", mood: "Mad", line: "Say that again. To my face.", x: 600, y: 825, r: 160, img: "/art/heads/mad.webp", pitch: 110 },
  { id: "scream", name: "The Howl", mood: "Screaming", line: "AAAAAAAAAAAAAAAAAAAAAA", x: 875, y: 725, r: 170, img: "/art/heads/scream.webp", pitch: 520 },
  { id: "shook", name: "Peeper", mood: "Shook", line: "Did you see that? Tell me you saw that.", x: 1085, y: 635, r: 125, img: "/art/heads/shook.webp", pitch: 660 },
  { id: "snarl", name: "Locks", mood: "Snarling", line: "Grrr. That's the whole sentence.", x: 440, y: 1060, r: 145, img: "/art/heads/snarl.webp", pitch: 90 },
  { id: "void", name: "Blank", mood: "Dead inside", line: "…", x: 745, y: 1135, r: 150, img: "/art/heads/void.webp", pitch: 60 },
  { id: "smug", name: "Blindside", mood: "Smug", line: "Don't need to look. I already know.", x: 1000, y: 1080, r: 140, img: "/art/heads/smug.webp", pitch: 330 },
];

export const PFPS: Head[] = [
  { id: "sailor", name: "Deckhand", mood: "Unbothered", line: "Eyes on the arms. Eyes on you.", x: 0, y: 0, r: 0, img: "/art/pfp-sailor.webp", pitch: 260 },
  { id: "captain", name: "The Captain", mood: "Smug", line: "Smoke break. Permanent.", x: 0, y: 0, r: 0, img: "/art/pfp-captain.webp", pitch: 180 },
];

export const ALL_HEADS = [...PFPS, ...PILE];
