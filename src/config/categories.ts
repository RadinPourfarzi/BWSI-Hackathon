import {
  AudioLines,
  ImageIcon,
  MailWarning,
  type LucideIcon,
} from "lucide-react";

export const categoryIds = ["image", "email", "voice"] as const;

export type CategoryId = (typeof categoryIds)[number];

export type CategoryConfiguration = {
  id: CategoryId;
  name: string;
  shortName: string;
  description: string;
  optionA: string;
  optionB: string;
  rendererKey: CategoryId;
  icon: LucideIcon;
  accent: string;
};

export const categoryConfig: Record<CategoryId, CategoryConfiguration> = {
  image: {
    id: "image",
    name: "Image detection",
    shortName: "Images",
    description:
      "Inspect texture, geometry, reflections, and repeated details.",
    optionA: "AI",
    optionB: "Real",
    rendererKey: "image",
    icon: ImageIcon,
    accent: "#4f8cff",
  },
  email: {
    id: "email",
    name: "Email defense",
    shortName: "Emails",
    description:
      "Spot urgency, identity mismatch, odd requests, and unsafe links.",
    optionA: "Scam",
    optionB: "Legitimate",
    rendererKey: "email",
    icon: MailWarning,
    accent: "#ff4fa3",
  },
  voice: {
    id: "voice",
    name: "Voice detection",
    shortName: "Voice",
    description:
      "Listen for cadence, breath, transitions, and synthetic artifacts.",
    optionA: "AI",
    optionB: "Real",
    rendererKey: "voice",
    icon: AudioLines,
    accent: "#35d39a",
  },
};
