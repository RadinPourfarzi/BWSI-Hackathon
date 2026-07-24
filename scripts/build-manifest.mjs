import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, "..");
const generatedAt = "2026-07-24T16:00:00.000Z";
const accessDate = "2026-07-24";

const labels = {
  image: { optionA: "AI", optionB: "Real" },
  email: { optionA: "Scam", optionB: "Legitimate" },
  voice: { optionA: "AI", optionB: "Real" },
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assetHash(relativePath) {
  return sha256(readFileSync(join(projectRoot, "public", relativePath)));
}

function challengeId(group, index) {
  return `00000000-0000-4000-8000-${group}${String(index).padStart(9, "0")}`;
}

const generatedImageSource = {
  sourceDataset: "Project-generated AI image starter set",
  originalSourceUrl: "https://openai.com/index/image-generation-api/",
  license: "CC0-1.0 project data release",
  attribution:
    "Generated for Signal or Synthetic; released with the starter data.",
};

const realImageSource = {
  sourceDataset: "scikit-image sample data v0.25.2",
  originalSourceUrl:
    "https://github.com/scikit-image/scikit-image/tree/v0.25.2/skimage/data",
  license: "Public domain or CC0-1.0 per source image",
  attribution: "scikit-image contributors and the credited original source.",
};

const generatedImages = [
  {
    file: "breakfast.webp",
    alt: "A sunlit breakfast table with pancakes, berries, tea, and cutlery.",
    tier: "hard",
    signals: [
      "utensil geometry",
      "repeated berry shapes",
      "reflection continuity",
    ],
    explanation:
      "The fork geometry, repeated berry forms, and inconsistent reflections reveal a generated scene.",
    prompt: "Breakfast table",
  },
  {
    file: "diner.webp",
    alt: "A retro diner glowing beside a desert road at blue hour.",
    tier: "medium",
    signals: ["blank signage", "over-regular symmetry", "reflection mismatch"],
    explanation:
      "The unusually blank signs, near-perfect symmetry, and mismatched reflections are generation clues.",
    prompt: "Retro-futurist roadside diner",
  },
  {
    file: "greenhouse.webp",
    alt: "A glass greenhouse filled with tropical plants after rain.",
    tier: "hard",
    signals: ["leaf continuity", "roof beam joins", "pot handle shapes"],
    explanation:
      "Several leaves merge unnaturally, roof beams terminate inconsistently, and pot handles deform.",
    prompt: "Rainy botanical greenhouse",
  },
  {
    file: "market.webp",
    alt: "An overhead view of produce baskets at a farmers market.",
    tier: "medium",
    signals: ["repeated produce", "basket weave", "floating label cards"],
    explanation:
      "Repeated fruit patterns and inconsistent basket weaving are common synthetic-image artifacts.",
    prompt: "Farmers market produce stall",
  },
  {
    file: "owl.webp",
    alt: "A small owl perched on a mossy branch in a misty forest.",
    tier: "hard",
    signals: ["talon contact", "feather symmetry", "twig continuity"],
    explanation:
      "The talons do not grip the branch consistently, and feather patterns repeat too neatly.",
    prompt: "Woodland owl portrait",
  },
  {
    file: "station.webp",
    alt: "A snow-covered mountain railway station with several tracks.",
    tier: "easy",
    signals: [
      "impossible rail junctions",
      "support repetition",
      "track termination",
    ],
    explanation:
      "The rails split and reconnect impossibly, making this generated scene easier to identify.",
    prompt: "Snowy mountain railway station",
  },
  {
    file: "workspace.webp",
    alt: "A warm home workspace with a keyboard, headphones, clock, and plant.",
    tier: "medium",
    signals: ["keyboard layout", "cable continuity", "clock markings"],
    explanation:
      "Key spacing changes across the keyboard, cables disconnect, and the clock markings drift.",
    prompt: "Cozy technology workspace",
  },
];

const realImages = [
  {
    file: "astronaut.webp",
    sourceFile: "astronaut.png",
    alt: "NASA astronaut Eileen Collins in a space suit.",
    tier: "medium",
    signals: [
      "natural fabric folds",
      "consistent insignia geometry",
      "camera grain",
    ],
    explanation:
      "Consistent suit hardware, natural fabric folds, and coherent camera detail support a real photograph.",
    attribution: "NASA photograph of Eileen Collins; public domain.",
  },
  {
    file: "cat.webp",
    sourceFile: "chelsea.png",
    alt: "Chelsea the cat looking toward the camera.",
    tier: "hard",
    signals: ["whisker continuity", "fur texture", "eye reflections"],
    explanation:
      "Whiskers, fur direction, and eye reflections remain physically consistent across the frame.",
    attribution: "Photograph by Stefan van der Walt; CC0-1.0.",
  },
  {
    file: "coffee.webp",
    sourceFile: "coffee.png",
    alt: "A coffee cup on a wooden table beside a pastry.",
    tier: "medium",
    signals: ["elliptical rim", "wood grain", "natural crumbs"],
    explanation:
      "The cup rim, shadows, wood grain, and irregular crumbs all remain spatially coherent.",
    attribution: "Photograph by Rachel Michetti; CC0-1.0.",
  },
  {
    file: "deep-field.webp",
    sourceFile: "hubble_deep_field.jpg",
    alt: "The Hubble eXtreme Deep Field showing distant galaxies.",
    tier: "hard",
    signals: ["sensor noise", "varied galaxy profiles", "optical point spread"],
    explanation:
      "The varied galaxy shapes and telescope imaging characteristics match a real scientific observation.",
    attribution: "NASA/ESA Hubble eXtreme Deep Field; public domain.",
  },
  {
    file: "moon.webp",
    sourceFile: "moon.png",
    alt: "A detailed monochrome photograph of the Moon surface.",
    tier: "hard",
    signals: ["crater overlap", "illumination direction", "surface noise"],
    explanation:
      "Crater overlap and illumination remain geologically and optically consistent.",
    attribution:
      "NASA Moon imagery distributed with scikit-image; public domain.",
  },
  {
    file: "retina.webp",
    sourceFile: "retina.jpg",
    alt: "A clinical photograph of a healthy human retina.",
    tier: "hard",
    signals: [
      "vessel branching",
      "illumination falloff",
      "anatomical structure",
    ],
    explanation:
      "Natural vessel branching and clinically consistent anatomy support a real capture.",
    attribution: "Mikael Häggström clinical image; CC0-1.0.",
  },
  {
    file: "rocket.webp",
    sourceFile: "rocket.jpg",
    alt: "A SpaceX Falcon 9 rocket launching with a bright exhaust plume.",
    tier: "medium",
    signals: ["plume physics", "structure edges", "atmospheric haze"],
    explanation:
      "The exhaust, haze, and vehicle structure remain consistent with a real launch photograph.",
    attribution: "SpaceX launch photograph; public domain.",
  },
];

const imageChallenges = [
  ...generatedImages.map((item, index) => ({
    id: challengeId("101", index + 1),
    category: "image",
    contentType: "image",
    payload: {
      kind: "image",
      src: `/datasets/images/ai/${item.file}`,
      alt: item.alt,
      width: 768,
      height: 768,
    },
    correctChoice: "option_a",
    labels: labels.image,
    difficulty: { tier: item.tier, signals: item.signals },
    explanation: item.explanation,
    ...generatedImageSource,
    contentHash: assetHash(`datasets/images/ai/${item.file}`),
    active: true,
    metadata: {
      starter: true,
      generator: "OpenAI image generation",
      promptSummary: item.prompt,
    },
  })),
  ...realImages.map((item, index) => ({
    id: challengeId("102", index + 1),
    category: "image",
    contentType: "image",
    payload: {
      kind: "image",
      src: `/datasets/images/real/${item.file}`,
      alt: item.alt,
      width: 768,
      height: 768,
    },
    correctChoice: "option_b",
    labels: labels.image,
    difficulty: { tier: item.tier, signals: item.signals },
    explanation: item.explanation,
    ...realImageSource,
    attribution: item.attribution,
    contentHash: assetHash(`datasets/images/real/${item.file}`),
    active: true,
    metadata: {
      starter: true,
      sourceFile: item.sourceFile,
      sourceCommit: "v0.25.2",
    },
  })),
];

const scamEmails = [
  {
    sourceId: "spam-1/00001",
    sourceFile: "00001.7848dde101aa985090474a91ec93fcf0.json",
    senderName: "Life Quote Savings",
    senderAddress: "offers@quote-mail.example",
    subject: "Life Insurance — Why Pay More?",
    body: "Save up to 70% on life insurance. Complete our short form today to receive an immediate quote and protect your family.",
    tier: "medium",
    signals: [
      "unsolicited financial offer",
      "large savings claim",
      "unknown sender",
    ],
    explanation:
      "An unsolicited financial offer uses a large savings promise and pushes the reader to submit information.",
  },
  {
    sourceId: "spam-1/00006",
    sourceFile: "00006.5ab5620d3d7c6c0db76234556a16f6c1.json",
    senderName: "Private Program",
    senderAddress: "founders@cash-circle.example",
    subject: "RE: Your Bank Account Information",
    body: "You have been privately invited to a gifting program. Join the founders now and receive thousands in cash as early as today.",
    tier: "easy",
    signals: ["money promise", "false exclusivity", "bank-themed subject"],
    explanation:
      "The sender borrows a bank-related subject, promises rapid cash, and uses false exclusivity.",
  },
  {
    sourceId: "spam-1/00007",
    sourceFile: "00007.d8521faf753ff9ee989122f6816f87d7.json",
    senderName: "Home Careers Team",
    senderAddress: "recruiting@remote-fortune.example",
    subject: "Fortune 500 Company Hiring At-Home Reps",
    body: "A fast-growing company needs home representatives immediately. No experience is required, and high weekly earnings are available.",
    tier: "medium",
    signals: ["unnamed employer", "vague role", "unrealistic earnings"],
    explanation:
      "The employer and job are vague while the message emphasizes urgency and unusually easy earnings.",
  },
  {
    sourceId: "spam-1/00009",
    sourceFile: "00009.027bf6e0b0c4ab34db3ce0ea4bf2edab.json",
    senderName: "Account Growth Desk",
    senderAddress: "alerts@fast-cash.example",
    subject: "Important Information Concerning Your Bank Account",
    body: "Stop losing money. This expert system can generate thousands in cash flow today. Secure your position before enrollment closes.",
    tier: "easy",
    signals: ["account alarm", "guaranteed profit", "artificial deadline"],
    explanation:
      "A frightening account subject masks a guaranteed-profit pitch and an artificial deadline.",
  },
  {
    sourceId: "spam-1/00010",
    sourceFile: "00010.445affef4c70feec58f9198cfbc22997.json",
    senderName: "Direct Reach",
    senderAddress: "sales@bulk-reach.example",
    subject: "Multiply Your Customer Base!",
    body: "Promote your business to one million email addresses for one low price. Send the attached order form to begin immediately.",
    tier: "medium",
    signals: [
      "unsolicited bulk service",
      "attachment request",
      "implausible scale",
    ],
    explanation:
      "The message advertises abusive bulk email, makes an implausible reach claim, and asks for an order form.",
  },
  {
    sourceId: "spam-1/00011",
    sourceFile: "00011.61816b9ad167657773a427d890d0468e.json",
    senderName: "Mobile Accessory Depot",
    senderAddress: "deals@phone-clearance.example",
    subject: "Cell Phone Belt Clips for $1.95",
    body: "Wholesale phone accessories start under two dollars. Inventory is moving quickly, so order chargers, cases, and antennas now.",
    tier: "hard",
    signals: [
      "unexpected sales email",
      "pressure language",
      "unverified storefront",
    ],
    explanation:
      "This is an unsolicited sales message from an unverified storefront that uses low prices and pressure.",
  },
];

const legitimateEmails = [
  {
    sourceId: "easy-ham-1/00001",
    sourceFile: "00001.7c53336b37003a9286aba55d2945844c.json",
    senderName: "Developer Mailing List",
    senderAddress: "developers@list.example",
    subject: "Re: New Sequences Window",
    body: "I can reproduce the error every time. The command works when run manually, so I am checking the profile settings and debug log.",
    tier: "medium",
    signals: ["specific context", "no credential request", "technical detail"],
    explanation:
      "The reply contains specific shared context and technical detail without requesting money, credentials, or a link visit.",
  },
  {
    sourceId: "easy-ham-1/00002",
    sourceFile: "00002.9c4069e25e1ef370c078db7ee85ff9ac.json",
    senderName: "Community News List",
    senderAddress: "discussion@community-list.example",
    subject: "RE: Alexander Monument Proposal",
    body: "A member shared an article about a proposed limestone monument near Salonika. The group is discussing the site and materials.",
    tier: "hard",
    signals: ["ongoing thread", "informational tone", "no action pressure"],
    explanation:
      "This is a contextual discussion post with an informational tone and no risky request.",
  },
  {
    sourceId: "easy-ham-1/00004",
    sourceFile: "00004.864220c5b6930b209cc287c361c99af1.json",
    senderName: "Technology Newsletter",
    senderAddress: "editor@tech-news.example",
    subject: "Klez: The Virus That Will Not Die",
    body: "The latest issue summarizes how the Klez computer virus continues to spread and lists defensive steps for system administrators.",
    tier: "hard",
    signals: [
      "descriptive subject",
      "educational content",
      "known newsletter format",
    ],
    explanation:
      "Although the topic sounds alarming, the message is a descriptive newsletter summary rather than a demand.",
  },
  {
    sourceId: "easy-ham-1/00005",
    sourceFile: "00005.bf27cdeaf0b8c4647ecd61b1d09da613.json",
    senderName: "Cooking Discussion List",
    senderAddress: "members@food-list.example",
    subject: "Re: Nothing Like Mama Used to Make",
    body: "I wanted to join the discussion about carbonara. I usually combine egg and cheese with the hot pasta rather than adding cream.",
    tier: "easy",
    signals: [
      "ordinary conversation",
      "thread continuity",
      "no external request",
    ],
    explanation:
      "The message continues a normal recipe discussion and asks for no sensitive action.",
  },
  {
    sourceId: "easy-ham-1/00010",
    sourceFile: "00010.145d22c053c1a0c410242e46c01635b3.json",
    senderName: "Spam Filter Users",
    senderAddress: "users@filter-project.example",
    subject: "Web Configurator Script",
    body: "Has anyone built a web interface for changing user filter preferences? I searched the project mirrors but have not found one.",
    tier: "medium",
    signals: [
      "clear technical question",
      "project context",
      "no unknown attachment",
    ],
    explanation:
      "This is a focused technical question posted to a relevant project list.",
  },
  {
    sourceId: "easy-ham-1/00013",
    sourceFile: "00013.81c34741dbed59c6dde50777e27e7ea3.json",
    senderName: "Linux Users Group",
    senderAddress: "members@linux-group.example",
    subject: "Re: Problems with RAID 1 on Server",
    body: "The server may be passing the wrong root device to the kernel during boot. Check the disk layout before changing the mirror.",
    tier: "hard",
    signals: ["technical continuity", "measured language", "no secret request"],
    explanation:
      "The message gives measured, context-specific troubleshooting advice without requesting access or credentials.",
  },
];

const emailSource = {
  sourceDataset: "stdlib-js SpamAssassin public mail corpus",
  license: "PDDL-1.0 database; CC0-1.0 contents",
  attribution:
    "SpamAssassin public corpus, redistributed by stdlib-js; identifying data removed and text safely condensed.",
};

function emailChallenge(item, index, scam) {
  const group = scam ? "201" : "202";
  const payload = {
    kind: "email",
    senderName: item.senderName,
    senderAddress: item.senderAddress,
    subject: item.subject,
    body: item.body,
    receivedAt: "Today",
  };

  return {
    id: challengeId(group, index + 1),
    category: "email",
    contentType: "email",
    payload,
    correctChoice: scam ? "option_a" : "option_b",
    labels: labels.email,
    difficulty: { tier: item.tier, signals: item.signals },
    explanation: item.explanation,
    ...emailSource,
    originalSourceUrl: `https://github.com/stdlib-js/datasets-spam-assassin/blob/de215192f2eb3eb158b810d7e1ad2a56f5bec5ec/data/${item.sourceId.split("/")[0]}/${item.sourceFile}`,
    contentHash: sha256(JSON.stringify(payload)),
    active: true,
    metadata: {
      starter: true,
      sourceId: item.sourceId,
      sanitized: true,
      condensation: "PII, live links, markup, and unsafe content removed",
    },
  };
}

const emailChallenges = [
  ...scamEmails.map((item, index) => emailChallenge(item, index, true)),
  ...legitimateEmails.map((item, index) => emailChallenge(item, index, false)),
];

const syntheticVoices = [
  {
    file: "synthetic-01.ogg",
    transcript: "The weather station recorded a calm clear morning.",
    durationSeconds: 3.0415,
    voice: "slt",
    tier: "easy",
    signals: ["uniform cadence", "limited breath noise", "flat transitions"],
  },
  {
    file: "synthetic-02.ogg",
    transcript: "Please place the blue notebook beside the lamp.",
    durationSeconds: 2.691875,
    voice: "kal",
    tier: "medium",
    signals: ["vocoder texture", "mechanical rhythm", "phoneme joins"],
  },
  {
    file: "synthetic-03.ogg",
    transcript: "Our train reaches the final station before sunset.",
    durationSeconds: 3.5815,
    voice: "awb",
    tier: "medium",
    signals: ["uniform volume", "abrupt consonants", "limited room tone"],
  },
  {
    file: "synthetic-04.ogg",
    transcript: "Fresh bread cools on the kitchen counter.",
    durationSeconds: 2.8265,
    voice: "rms",
    tier: "easy",
    signals: ["synthetic resonance", "even pacing", "missing breath"],
  },
  {
    file: "synthetic-05.ogg",
    transcript: "A small telescope pointed toward the moon.",
    durationSeconds: 2.504375,
    voice: "kal16",
    tier: "hard",
    signals: ["compressed timbre", "phoneme boundary", "pitch regularity"],
  },
  {
    file: "synthetic-06.ogg",
    transcript: "The museum opens its doors at nine each morning.",
    durationSeconds: 3.23025,
    voice: "slt",
    tier: "hard",
    signals: ["time-stretched cadence", "steady pitch", "clean silence"],
  },
];

const realVoices = [
  {
    file: "human-01.ogg",
    sourceFile: "spk1_snt1.wav",
    transcript: "The child almost hurt the small dog.",
    durationSeconds: 2.8765,
    tier: "medium",
  },
  {
    file: "human-02.ogg",
    sourceFile: "spk1_snt2.wav",
    transcript: "Drop the two when you add the figures.",
    durationSeconds: 3.1565,
    tier: "hard",
  },
  {
    file: "human-03.ogg",
    sourceFile: "spk1_snt5.wav",
    transcript: "Sunday is the best part of the week.",
    durationSeconds: 2.6065,
    tier: "medium",
  },
  {
    file: "human-04.ogg",
    sourceFile: "spk2_snt1.wav",
    transcript: "The child almost hurt the small dog.",
    durationSeconds: 2.0165,
    tier: "hard",
  },
  {
    file: "human-05.ogg",
    sourceFile: "spk2_snt2.wav",
    transcript: "Drop the two when you add the figures.",
    durationSeconds: 1.7665,
    tier: "hard",
  },
  {
    file: "human-06.ogg",
    sourceFile: "spk2_snt5.wav",
    transcript: "Ken pairs lack full flavor.",
    durationSeconds: 1.9865,
    tier: "medium",
  },
];

const syntheticVoiceSource = {
  sourceDataset: "Project-generated Flite synthetic speech starter set",
  originalSourceUrl: "https://github.com/festvox/flite",
  license: "BSD-style Flite license; CC0-1.0 project phrases and outputs",
  attribution:
    "Generated locally with Flite voices from original project phrases.",
};

const realVoiceSource = {
  sourceDataset: "SpeechBrain ASR test samples",
  originalSourceUrl:
    "https://github.com/speechbrain/speechbrain/tree/e5cb1f65b940634215650aa1171e0440d0808123/tests/samples/ASR",
  license: "Apache-2.0",
  attribution:
    "SpeechBrain test audio, converted to mono Opus for the starter set.",
};

const voiceChallenges = [
  ...syntheticVoices.map((item, index) => ({
    id: challengeId("301", index + 1),
    category: "voice",
    contentType: "audio",
    payload: {
      kind: "audio",
      src: `/datasets/audio/ai/${item.file}`,
      transcript: item.transcript,
      durationSeconds: item.durationSeconds,
    },
    correctChoice: "option_a",
    labels: labels.voice,
    difficulty: { tier: item.tier, signals: item.signals },
    explanation:
      "The clip has unusually regular timing, limited breath detail, and synthetic transitions between phonemes.",
    ...syntheticVoiceSource,
    contentHash: assetHash(`datasets/audio/ai/${item.file}`),
    active: true,
    metadata: { starter: true, generator: "Flite 2.2", voice: item.voice },
  })),
  ...realVoices.map((item, index) => ({
    id: challengeId("302", index + 1),
    category: "voice",
    contentType: "audio",
    payload: {
      kind: "audio",
      src: `/datasets/audio/real/${item.file}`,
      transcript: item.transcript,
      durationSeconds: item.durationSeconds,
    },
    correctChoice: "option_b",
    labels: labels.voice,
    difficulty: {
      tier: item.tier,
      signals: [
        "natural timing variation",
        "human articulation",
        "recording texture",
      ],
    },
    explanation:
      "Small timing changes, natural articulation, and room or microphone texture support a human recording.",
    ...realVoiceSource,
    contentHash: assetHash(`datasets/audio/real/${item.file}`),
    active: true,
    metadata: {
      starter: true,
      sourceFile: item.sourceFile,
      sourceCommit: "e5cb1f65b940634215650aa1171e0440d0808123",
    },
  })),
];

const manifest = {
  version: "1.0.0",
  generatedAt,
  sources: [
    {
      id: "project-ai-images",
      name: "Project-generated AI image starter set",
      url: generatedImageSource.originalSourceUrl,
      license: generatedImageSource.license,
      accessDate,
      bundled: true,
      notes:
        "Seven project-specific generated images are included; DiffusionDB is the documented expansion source.",
    },
    {
      id: "scikit-image",
      name: "scikit-image sample data v0.25.2",
      url: realImageSource.originalSourceUrl,
      license: realImageSource.license,
      accessDate,
      bundled: true,
      notes:
        "Seven public-domain or CC0 reference photographs with per-item attribution.",
    },
    {
      id: "spamassassin",
      name: "stdlib-js SpamAssassin public mail corpus",
      url: "https://github.com/stdlib-js/datasets-spam-assassin",
      license: emailSource.license,
      accessDate,
      bundled: true,
      notes:
        "Twelve samples are safely condensed; addresses, live links, HTML, and identifying details are removed.",
    },
    {
      id: "flite",
      name: "Flite synthetic speech",
      url: syntheticVoiceSource.originalSourceUrl,
      license: syntheticVoiceSource.license,
      accessDate,
      bundled: true,
      notes: "Six reproducibly generated synthetic speech clips.",
    },
    {
      id: "speechbrain",
      name: "SpeechBrain ASR test samples",
      url: realVoiceSource.originalSourceUrl,
      license: realVoiceSource.license,
      accessDate,
      bundled: true,
      notes: "Six short human speech clips converted to lightweight Opus.",
    },
    {
      id: "diffusiondb",
      name: "DiffusionDB",
      url: "https://huggingface.co/datasets/poloclub/diffusiondb",
      license: "CC0-1.0",
      accessDate,
      bundled: false,
      notes:
        "Optional expansion source for generated images; archives are not committed.",
    },
    {
      id: "wavefake",
      name: "WaveFake",
      url: "https://zenodo.org/records/5642694",
      license: "CC-BY-SA-4.0",
      accessDate,
      bundled: false,
      notes: "Optional expansion source for benchmark synthetic speech.",
    },
    {
      id: "ljspeech",
      name: "LJSpeech 1.1",
      url: "https://keithito.com/LJ-Speech-Dataset/",
      license: "Public domain",
      accessDate,
      bundled: false,
      notes: "Optional expansion source for human reference speech.",
    },
  ],
  challenges: [...imageChallenges, ...emailChallenges, ...voiceChallenges],
};

const outputPath = join(projectRoot, "data", "dataset-manifest.json");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(
  `Wrote ${manifest.challenges.length} validated-source records to ${outputPath}`,
);
