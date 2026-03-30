import fs from "node:fs/promises";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";
import { ensureDemoUser, ensureLocalSupabaseRunning } from "../local-supabase.mjs";

const execFile = promisify(execFileCallback);

const rootDir = process.cwd();
const planPath = path.join(rootDir, "scripts/demo/demo-plan.json");
const plan = JSON.parse(await fs.readFile(planPath, "utf8"));

const BASE_URL = process.env.DEMO_BASE_URL ?? plan.baseUrl;
const RAW_DIR = path.join(rootDir, "output/demo/raw");
const STILLS_DIR = path.join(rootDir, "output/demo/stills");
const MANIFEST_DIR = path.join(rootDir, "output/demo/manifests");
const SESSION_DIR = path.join(rootDir, "output/demo/session");
const TEMP_VIDEO_DIR = path.join(RAW_DIR, "_tmp");
const SESSION_FILE = path.join(SESSION_DIR, "local-demo-auth.json");
const STATE_FILE = path.join(MANIFEST_DIR, "local-demo-state.json");
const CLIP_MANIFEST_FILE = path.join(MANIFEST_DIR, "clip-manifest.json");
const AUTH_SEQUENCE_FILE = path.join(RAW_DIR, "_auth-sequence.webm");

const DEMO_BUTTON = /Continue as Demo Coordinator/i;
const ACCEPTED_TEXT = /Accepted by Nephrology Intake/i;
const INPUT_REQUIRED_TEXT = /input required/i;
const BLOCKED_TEXT = /Blocked .* Manual Follow-up Required/i;
const DEMO_EMAIL = "demo@consultpassport.dev";
const DEMO_PASSWORD = "demo-passport-2025";

const ELEANOR = plan.seededPatients.eleanor;
const MARCUS = plan.seededPatients.marcus;

function logStep(message) {
  const timestamp = new Date().toISOString();
  console.log(`[capture-demo] ${timestamp} ${message}`);
}

await Promise.all([
  fs.mkdir(RAW_DIR, { recursive: true }),
  fs.mkdir(STILLS_DIR, { recursive: true }),
  fs.mkdir(MANIFEST_DIR, { recursive: true }),
  fs.mkdir(SESSION_DIR, { recursive: true }),
  fs.mkdir(TEMP_VIDEO_DIR, { recursive: true }),
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRunId(url) {
  const match = url.match(/\/app\/runs\/([^/?#]+)/);
  if (!match) {
    throw new Error(`Could not extract run id from URL: ${url}`);
  }
  return match[1];
}

async function waitForVisible(locator, timeout = 30000) {
  await locator.waitFor({ state: "visible", timeout });
}

async function assertSeededWorkspace(page) {
  await waitForVisible(page.getByRole("heading", { name: /Referral Acceptance Workspace/i }));
  await waitForVisible(page.getByTestId(`patient-link-${ELEANOR.id}`));
  await waitForVisible(page.getByTestId(`patient-link-${MARCUS.id}`));
}

async function openWorkspace(page) {
  if (/\/app$/.test(page.url())) {
    await assertSeededWorkspace(page);
    return;
  }

  const homeLink = page.getByRole("link", { name: "Consult Passport" });
  if (await homeLink.count()) {
    await humanClick(page, homeLink);
  } else {
    await page.goto(`${BASE_URL}/app`, { waitUntil: "domcontentloaded" });
  }

  await page.waitForURL(/\/app$/, { timeout: 30000 });
  await assertSeededWorkspace(page);
}

async function moveMouseToLocator(page, locator, { offsetX = 0.5, offsetY = 0.5, steps = 24 } = {}) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Unable to get bounding box for locator");
  }
  const x = box.x + box.width * offsetX;
  const y = box.y + box.height * offsetY;
  await page.mouse.move(x, y, { steps });
  return { x, y };
}

async function humanClick(page, locator, options = {}) {
  await moveMouseToLocator(page, locator, options);
  await sleep(180);
  await locator.click();
}

async function humanWheel(page, deltaY, repetitions = 1, pauseMs = 450) {
  for (let index = 0; index < repetitions; index += 1) {
    await page.mouse.wheel(0, deltaY);
    await sleep(pauseMs);
  }
}

async function addCursorOverlay(context) {
  await context.addInitScript(() => {
    if (window.__codexDemoCursorInstalled) {
      return;
    }

    window.__codexDemoCursorInstalled = true;

    const install = () => {
      if (document.getElementById("__codex-demo-cursor")) {
        return;
      }

      const cursor = document.createElement("div");
      cursor.id = "__codex-demo-cursor";
      cursor.style.position = "fixed";
      cursor.style.top = "0";
      cursor.style.left = "0";
      cursor.style.width = "14px";
      cursor.style.height = "14px";
      cursor.style.borderRadius = "9999px";
      cursor.style.background = "rgba(12, 92, 255, 0.95)";
      cursor.style.border = "2px solid rgba(255,255,255,0.95)";
      cursor.style.boxShadow = "0 8px 20px rgba(12,92,255,0.32)";
      cursor.style.pointerEvents = "none";
      cursor.style.zIndex = "2147483647";
      cursor.style.transform = "translate(-999px, -999px)";
      cursor.style.transition = "transform 45ms linear";

      const halo = document.createElement("div");
      halo.id = "__codex-demo-cursor-halo";
      halo.style.position = "fixed";
      halo.style.top = "0";
      halo.style.left = "0";
      halo.style.width = "42px";
      halo.style.height = "42px";
      halo.style.borderRadius = "9999px";
      halo.style.border = "2px solid rgba(12, 92, 255, 0.22)";
      halo.style.background = "rgba(12, 92, 255, 0.07)";
      halo.style.pointerEvents = "none";
      halo.style.zIndex = "2147483646";
      halo.style.transform = "translate(-999px, -999px)";
      halo.style.transition = "transform 45ms linear, opacity 180ms ease";

      const updatePosition = (event) => {
        const cursorX = event.clientX - 7;
        const cursorY = event.clientY - 7;
        const haloX = event.clientX - 21;
        const haloY = event.clientY - 21;
        cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        halo.style.transform = `translate(${haloX}px, ${haloY}px)`;
      };

      const pulse = () => {
        halo.animate(
          [
            { transform: halo.style.transform, opacity: 1 },
            { transform: `${halo.style.transform} scale(1.18)`, opacity: 0.45 },
            { transform: halo.style.transform, opacity: 1 }
          ],
          { duration: 320, easing: "ease-out" }
        );
      };

      window.addEventListener("mousemove", updatePosition, true);
      window.addEventListener("mousedown", pulse, true);
      document.documentElement.append(cursor, halo);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", install, { once: true });
    } else {
      install();
    }
  });
}

async function loginAsDemo(page) {
  logStep("Ensuring local demo user exists");
  const env = ensureLocalSupabaseRunning();
  await ensureDemoUser(env);
  logStep("Opening auth page");
  await page.goto(`${BASE_URL}/auth`, { waitUntil: "networkidle" });
  await waitForVisible(page.getByLabel("Email"));
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  logStep("Logging in as demo coordinator");
  await humanClick(page, page.getByRole("button", { name: /^Sign In$/i }));
  await page.waitForURL(/\/app$/, { timeout: 30000 });
  await assertSeededWorkspace(page);
  logStep("Seeded workspace is visible");
}

async function createInputRequiredRun(page, patient) {
  logStep(`Creating input-required run for ${patient.name}`);
  await openWorkspace(page);
  const patientCard = page.getByTestId(`patient-card-${patient.id}`);
  await waitForVisible(patientCard);
  await humanClick(
    page,
    patientCard.getByRole("button", { name: /Start Consult Passport/i })
  );
  await page.waitForURL(/\/app\/referrals\/new\?patient=/, { timeout: 30000 });
  await waitForVisible(page.getByTestId("build-submit"));
  await sleep(600);
  await humanClick(page, page.getByTestId("build-submit"));
  await page.waitForURL(/\/app\/runs\//, { timeout: 30000 });
  await waitForVisible(page.getByTestId("repair-run"));
  await sleep(900);
  const runId = extractRunId(page.url());
  logStep(`Created input-required run ${runId} for ${patient.name}`);
  return runId;
}

async function repairRun(page, expectedState) {
  logStep(`Repairing run to ${expectedState}`);
  await waitForVisible(page.getByTestId("repair-run"));
  await humanClick(page, page.getByTestId("repair-run"));

  if (expectedState === "accepted") {
    await waitForVisible(page.getByText(ACCEPTED_TEXT).first(), 30000);
  } else {
    await waitForVisible(page.getByText(BLOCKED_TEXT).first(), 30000);
  }

  await sleep(1200);
  const runId = extractRunId(page.url());
  logStep(`Repair completed for run ${runId} with state ${expectedState}`);
  return runId;
}

async function createRecordingContext() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: plan.viewport,
    recordVideo: {
      dir: TEMP_VIDEO_DIR,
      size: plan.viewport
    }
  });

  await addCursorOverlay(context);
  return { browser, context };
}

async function buildDemoStateFromPage(page, context) {
  logStep("Building local demo state");
  await context.storageState({ path: SESSION_FILE });

  const preservedInputRequiredRunId = await createInputRequiredRun(page, ELEANOR);
  await createInputRequiredRun(page, ELEANOR);
  const acceptedRunId = await repairRun(page, "accepted");

  const blockedRunBaseId = await createInputRequiredRun(page, MARCUS);

  const state = {
    baseUrl: BASE_URL,
    createdAt: new Date().toISOString(),
    runIds: {
      eleanorInputRequired: preservedInputRequiredRunId,
      eleanorAccepted: acceptedRunId,
      marcusInputRequired: blockedRunBaseId
    }
  };

  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  logStep(`Saved demo state to ${STATE_FILE}`);
  return state;
}

async function recordClip(name, action) {
  logStep(`Recording clip ${name}`);
  const { browser, context } = await createRecordingContext();
  const page = await context.newPage();
  const video = page.video();
  const screenshotPath = path.join(STILLS_DIR, `${name}.png`);
  const targetVideo = path.join(RAW_DIR, `${name}.webm`);

  try {
    await action(page);
    await sleep(900);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    await page.close();
    await context.close();

    if (!video) {
      throw new Error(`No recorded video found for ${name}`);
    }

    await video.saveAs(targetVideo);
    logStep(`Finished clip ${name}`);
    return {
      clip: name,
      path: targetVideo,
      screenshot: screenshotPath
    };
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close();
  }
}

function getElapsedSeconds(startedAt) {
  return Number(((Date.now() - startedAt) / 1000).toFixed(3));
}

async function captureSegmentOnPage(page, name, action, startedAt) {
  logStep(`Capturing segment ${name} on shared auth page`);
  const screenshotPath = path.join(STILLS_DIR, `${name}.png`);
  const startSeconds = getElapsedSeconds(startedAt);

  await action(page);
  await sleep(900);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const endSeconds = getElapsedSeconds(startedAt);
  logStep(`Captured segment ${name} (${startSeconds}s to ${endSeconds}s)`);

  return {
    clip: name,
    screenshot: screenshotPath,
    startSeconds,
    endSeconds
  };
}

async function renderSegmentClips(sourceVideo, segments) {
  const rendered = [];

  for (const segment of segments) {
    const targetVideo = path.join(RAW_DIR, `${segment.clip}.mp4`);
    const durationSeconds = Math.max(segment.endSeconds - segment.startSeconds, 0.5);

    await execFile("ffmpeg", [
      "-y",
      "-i",
      sourceVideo,
      "-ss",
      segment.startSeconds.toFixed(3),
      "-t",
      durationSeconds.toFixed(3),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-an",
      targetVideo
    ]);

    rendered.push({
      clip: segment.clip,
      screenshot: segment.screenshot,
      path: targetVideo,
      startSeconds: segment.startSeconds,
      endSeconds: segment.endSeconds
    });
    logStep(`Rendered split clip ${segment.clip} to ${targetVideo}`);
  }

  return rendered;
}

async function main() {
  logStep("Capture pipeline started");
  const clips = [];

  clips.push(await recordClip("s2-problem-and-product", async (page) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await waitForVisible(page.getByRole("heading", { name: /Build referrals the intake desk/i }));
    await sleep(900);
    await humanClick(page, page.getByRole("button", { name: /Get Started/i }));
    await page.waitForURL(/\/auth$/, { timeout: 30000 });
    await waitForVisible(page.getByRole("button", { name: DEMO_BUTTON }));
    await sleep(300);
    await humanClick(page, page.getByRole("button", { name: DEMO_BUTTON }));
    await page.waitForURL(/\/app$/, { timeout: 30000 });
    await assertSeededWorkspace(page);
    await sleep(1300);
  }));

  const { browser: authBrowser, context: authContext } = await createRecordingContext();
  let state;
  let authPage;
  let authVideo;
  let capturedSegments = [];
  let liveEleanorInputRequiredRunId;
  let liveEleanorAcceptedRunId;

  try {
    authPage = await authContext.newPage();
    authVideo = authPage.video();
    const authSequenceStartedAt = Date.now();

    await loginAsDemo(authPage);
    state = await buildDemoStateFromPage(authPage, authContext);

    capturedSegments.push(await captureSegmentOnPage(authPage, "s3-patient-context", async (page) => {
      await openWorkspace(page);
      await humanClick(page, page.getByTestId(`patient-link-${ELEANOR.id}`));
      await waitForVisible(page.getByRole("heading", { name: ELEANOR.name }));
      await sleep(800);
      await humanWheel(page, 360, 4, 520);
      await humanWheel(page, -240, 1, 520);
    }, authSequenceStartedAt));

    capturedSegments.push(await captureSegmentOnPage(authPage, "s4-initial-submission", async (page) => {
      await openWorkspace(page);
      const eleanorCard = page.getByTestId(`patient-card-${ELEANOR.id}`);
      await humanClick(
        page,
        eleanorCard.getByRole("button", { name: /Start Consult Passport/i })
      );
      await page.waitForURL(/\/app\/referrals\/new\?patient=/, { timeout: 30000 });
      await waitForVisible(page.getByTestId("build-submit"));
      await sleep(900);
      await humanClick(page, page.getByTestId("build-submit"));
      await page.waitForURL(/\/app\/runs\//, { timeout: 30000 });
      await waitForVisible(page.getByTestId("repair-run"));
      liveEleanorInputRequiredRunId = extractRunId(page.url());
      await sleep(1600);
    }, authSequenceStartedAt));

    capturedSegments.push(await captureSegmentOnPage(authPage, "s5-repair-to-accepted", async (page) => {
      if (!liveEleanorInputRequiredRunId) {
        throw new Error("Missing live Eleanor input-required run id");
      }
      if (!page.url().includes(`/app/runs/${liveEleanorInputRequiredRunId}`)) {
        await page.goto(`${BASE_URL}/app/runs/${liveEleanorInputRequiredRunId}`, { waitUntil: "networkidle" });
      }
      await waitForVisible(page.getByTestId("repair-run"));
      await sleep(900);
      await humanClick(page, page.getByTestId("repair-run"));
      await waitForVisible(page.getByText(ACCEPTED_TEXT).first(), 30000);
      liveEleanorAcceptedRunId = extractRunId(page.url());
      await sleep(1600);
      await humanWheel(page, 420, 3, 480);
      await humanWheel(page, -220, 1, 420);
    }, authSequenceStartedAt));

    capturedSegments.push(await captureSegmentOnPage(authPage, "s6-audit-trail", async (page) => {
      const acceptedRunId = liveEleanorAcceptedRunId ?? state.runIds.eleanorAccepted;
      if (!page.url().includes(`/app/runs/${acceptedRunId}`)) {
        await page.goto(`${BASE_URL}/app/runs/${acceptedRunId}`, { waitUntil: "networkidle" });
      }
      await waitForVisible(page.getByText(ACCEPTED_TEXT).first());
      await sleep(900);
      await humanWheel(page, 400, 4, 560);
      await humanWheel(page, 300, 2, 560);
    }, authSequenceStartedAt));

    capturedSegments.push(await captureSegmentOnPage(authPage, "s1-hook-rewind", async (page) => {
      await waitForVisible(page.getByText(ACCEPTED_TEXT).first());
      await sleep(1200);
      await humanWheel(page, 420, 2, 520);
      await sleep(850);
      await openWorkspace(page);
      const eleanorCard = page.getByTestId(`patient-card-${ELEANOR.id}`);
      await humanClick(
        page,
        eleanorCard.getByRole("button", { name: /Start Consult Passport/i })
      );
      await page.waitForURL(/\/app\/referrals\/new\?patient=/, { timeout: 30000 });
      await waitForVisible(page.getByTestId("build-submit"));
      await sleep(900);
      await humanClick(page, page.getByTestId("build-submit"));
      await page.waitForURL(/\/app\/runs\//, { timeout: 30000 });
      await waitForVisible(page.getByTestId("repair-run"));
      await sleep(1600);
    }, authSequenceStartedAt));

    capturedSegments.push(await captureSegmentOnPage(authPage, "s7-blocked-proof", async (page) => {
      await openWorkspace(page);
      const marcusCard = page.getByTestId(`patient-card-${MARCUS.id}`);
      await humanClick(
        page,
        marcusCard.getByRole("button", { name: /Start Consult Passport/i })
      );
      await page.waitForURL(/\/app\/referrals\/new\?patient=/, { timeout: 30000 });
      await waitForVisible(page.getByTestId("build-submit"));
      await sleep(900);
      await humanClick(page, page.getByTestId("build-submit"));
      await page.waitForURL(/\/app\/runs\//, { timeout: 30000 });
      await waitForVisible(page.getByTestId("repair-run"));
      await sleep(900);
      await humanClick(page, page.getByTestId("repair-run"));
      await waitForVisible(page.getByText(BLOCKED_TEXT).first(), 30000);
      await sleep(1600);
    }, authSequenceStartedAt));

    capturedSegments.push(await captureSegmentOnPage(authPage, "s8-close", async (page) => {
      await openWorkspace(page);
      await assertSeededWorkspace(page);
      await sleep(1800);
    }, authSequenceStartedAt));

    await authPage.close();

    if (!authVideo) {
      throw new Error("No recorded auth sequence found");
    }

    await authVideo.saveAs(AUTH_SEQUENCE_FILE);
    clips.push(...await renderSegmentClips(AUTH_SEQUENCE_FILE, capturedSegments));
  } finally {
    await authPage?.close().catch(() => {});
    await authContext.close().catch(() => {});
    await authBrowser.close();
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    state,
    clips
  };

  await fs.writeFile(CLIP_MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`Saved clip manifest to ${CLIP_MANIFEST_FILE}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
