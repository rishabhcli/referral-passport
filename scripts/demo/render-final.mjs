import fs from "node:fs/promises";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const rootDir = process.cwd();
const planPath = path.join(rootDir, "scripts/demo/demo-plan.json");
const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
const manifestPath = path.join(rootDir, "output/demo/manifests/clip-manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

const AUDIO_DIR = path.join(rootDir, "output/demo/audio");
const PROCESSED_DIR = path.join(rootDir, "output/demo/processed");
const FINAL_DIR = path.join(rootDir, "output/demo/final");
const SUBTITLE_PATH = path.join(rootDir, "output/demo/subtitles/referral-passport-demo.srt");
const FINAL_VIDEO = path.join(FINAL_DIR, "referral-passport-demo-1080p.mp4");
const CONCAT_FILE = path.join(PROCESSED_DIR, "sections.txt");
const EDIT_PLAN_FILE = path.join(rootDir, "output/demo/manifests/edit-plan.json");

await Promise.all([
  fs.mkdir(PROCESSED_DIR, { recursive: true }),
  fs.mkdir(FINAL_DIR, { recursive: true })
]);

function clipPathFor(name) {
  const clip = manifest.clips.find((entry) => entry.clip === name);
  if (!clip) {
    throw new Error(`Missing clip ${name} in clip manifest`);
  }
  return clip.path;
}

async function ffprobeDuration(filePath) {
  const { stdout } = await execFile("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath
  ]);

  const duration = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duration)) {
    throw new Error(`Could not determine duration for ${filePath}`);
  }
  return duration;
}

async function renderSection(section) {
  const audioPath = path.join(AUDIO_DIR, `${section.id}.wav`);
  const clipPath = clipPathFor(section.clip);
  const targetPath = path.join(PROCESSED_DIR, `${section.id}.mp4`);

  const audioDuration = await ffprobeDuration(audioPath);
  const padDuration = Math.max(audioDuration + 0.35, 1.0);

  await execFile("ffmpeg", [
    "-y",
    "-i",
    clipPath,
    "-i",
    audioPath,
    "-filter_complex",
    [
      `[0:v]scale=${plan.finalVideo.width}:${plan.finalVideo.height}:force_original_aspect_ratio=increase,` +
        `crop=${plan.finalVideo.width}:${plan.finalVideo.height},` +
        `fps=${plan.finalVideo.fps},` +
        `format=yuv420p,` +
        `tpad=stop_mode=clone:stop_duration=${padDuration.toFixed(2)}[v]`,
      `[1:a]aresample=48000,volume=1.25[a]`
    ].join(";"),
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    targetPath
  ]);

  const finalDuration = await ffprobeDuration(targetPath);
  return {
    id: section.id,
    sourceClip: clipPath,
    sourceAudio: audioPath,
    renderedSection: targetPath,
    durationSeconds: Number(finalDuration.toFixed(3))
  };
}

const renderedSections = [];
for (const section of plan.segments) {
  renderedSections.push(await renderSection(section));
}

await fs.writeFile(
  CONCAT_FILE,
  renderedSections.map((entry) => `file '${entry.renderedSection.replace(/'/g, "'\\''")}'`).join("\n") + "\n"
);

const concatOutput = path.join(PROCESSED_DIR, "referral-passport-demo-concat.mp4");
await execFile("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  CONCAT_FILE,
  "-c",
  "copy",
  concatOutput
]);

let finalSource = concatOutput;
try {
  await fs.access(SUBTITLE_PATH);
  await execFile("ffmpeg", [
    "-y",
    "-i",
    concatOutput,
    "-vf",
    `subtitles=${SUBTITLE_PATH}`,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "19",
    "-c:a",
    "copy",
    FINAL_VIDEO
  ]);
  finalSource = FINAL_VIDEO;
} catch {
  await fs.copyFile(concatOutput, FINAL_VIDEO);
  finalSource = FINAL_VIDEO;
}

const totalDuration = await ffprobeDuration(finalSource);
const editPlan = {
  generatedAt: new Date().toISOString(),
  finalVideo: FINAL_VIDEO,
  totalDurationSeconds: Number(totalDuration.toFixed(3)),
  sections: renderedSections
};

await fs.writeFile(EDIT_PLAN_FILE, JSON.stringify(editPlan, null, 2));
console.log(`Rendered final video to ${FINAL_VIDEO}`);
