import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDirectory, "..");
const execute = process.argv.includes("--execute");
const force = process.argv.includes("--force");

const scikitBase =
  "https://raw.githubusercontent.com/scikit-image/scikit-image/v0.25.2/skimage/data";
const speechBrainCommit = "e5cb1f65b940634215650aa1171e0440d0808123";
const speechBrainBase = `https://raw.githubusercontent.com/speechbrain/speechbrain/${speechBrainCommit}/tests/samples/ASR`;

const realImages = [
  ["astronaut.png", "astronaut.webp"],
  ["chelsea.png", "cat.webp"],
  ["coffee.png", "coffee.webp"],
  ["hubble_deep_field.jpg", "deep-field.webp"],
  ["moon.png", "moon.webp"],
  ["retina.jpg", "retina.webp"],
  ["rocket.jpg", "rocket.webp"],
];

const realAudio = [
  ["spk1_snt1.wav", "human-01.ogg"],
  ["spk1_snt2.wav", "human-02.ogg"],
  ["spk1_snt5.wav", "human-03.ogg"],
  ["spk2_snt1.wav", "human-04.ogg"],
  ["spk2_snt2.wav", "human-05.ogg"],
  ["spk2_snt5.wav", "human-06.ogg"],
];

const syntheticAudio = [
  [
    "synthetic-01.ogg",
    "The weather station recorded a calm clear morning",
    "slt",
    null,
  ],
  [
    "synthetic-02.ogg",
    "Please place the blue notebook beside the lamp",
    "kal",
    null,
  ],
  [
    "synthetic-03.ogg",
    "Our train reaches the final station before sunset",
    "awb",
    null,
  ],
  ["synthetic-04.ogg", "Fresh bread cools on the kitchen counter", "rms", null],
  [
    "synthetic-05.ogg",
    "A small telescope pointed toward the moon",
    "kal16",
    null,
  ],
  [
    "synthetic-06.ogg",
    "The museum opens its doors at nine each morning",
    "slt",
    "atempo=0.92",
  ],
];

function run(command, argumentsList) {
  console.log(`$ ${command} ${argumentsList.join(" ")}`);
  if (!execute) return;

  const result = spawnSync(command, argumentsList, {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${String(result.status)}`);
  }
}

async function download(url, destination) {
  console.log(`GET ${url} -> ${destination}`);
  if (!execute) return;
  if (existsSync(destination) && !force) return;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${url}`);
  }

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

async function main() {
  console.log(
    execute
      ? "Preparing starter media."
      : "Dry run only. Add --execute to download and preprocess.",
  );

  if (execute) {
    run("ffmpeg", ["-version"]);
  }

  const sourceDirectory = join(projectRoot, ".dataset-cache");
  const imageOutputDirectory = join(
    projectRoot,
    "public",
    "datasets",
    "images",
    "real",
  );
  const realAudioOutputDirectory = join(
    projectRoot,
    "public",
    "datasets",
    "audio",
    "real",
  );
  const syntheticAudioOutputDirectory = join(
    projectRoot,
    "public",
    "datasets",
    "audio",
    "ai",
  );

  for (const [sourceName, outputName] of realImages) {
    const sourcePath = join(sourceDirectory, "images", sourceName);
    const outputPath = join(imageOutputDirectory, outputName);
    await download(`${scikitBase}/${sourceName}`, sourcePath);

    if (!existsSync(outputPath) || force) {
      run("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        force ? "-y" : "-n",
        "-i",
        sourcePath,
        "-vf",
        "scale=768:768:force_original_aspect_ratio=increase,crop=768:768",
        "-c:v",
        "libwebp",
        "-q:v",
        "80",
        outputPath,
      ]);
    }
  }

  for (const [sourceName, outputName] of realAudio) {
    const sourcePath = join(sourceDirectory, "audio", sourceName);
    const outputPath = join(realAudioOutputDirectory, outputName);
    await download(`${speechBrainBase}/${sourceName}`, sourcePath);

    if (!existsSync(outputPath) || force) {
      run("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        force ? "-y" : "-n",
        "-i",
        sourcePath,
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "libopus",
        "-b:a",
        "32k",
        outputPath,
      ]);
    }
  }

  for (const [outputName, text, voice, audioFilter] of syntheticAudio) {
    const outputPath = join(syntheticAudioOutputDirectory, outputName);
    if (existsSync(outputPath) && !force) continue;

    const argumentsList = [
      "-hide_banner",
      "-loglevel",
      "error",
      force ? "-y" : "-n",
      "-f",
      "lavfi",
      "-i",
      `flite=text='${text}':voice=${voice}`,
    ];

    if (audioFilter) {
      argumentsList.push("-filter:a", audioFilter);
    }

    argumentsList.push(
      "-ar",
      "16000",
      "-ac",
      "1",
      "-c:a",
      "libopus",
      "-b:a",
      "32k",
      outputPath,
    );
    run("ffmpeg", argumentsList);
  }

  console.log(
    "Media preparation complete. Run npm run data:manifest and npm run data:validate next.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
