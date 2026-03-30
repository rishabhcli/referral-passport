# Referral Passport Demo Package

## 1. Product understanding

### Product purpose
Consult Passport is a nephrology referral acceptance workspace. It turns patient chart context into a structured referral passport, submits that packet to intake rules, flags missing requirements, and supports a repair path when the missing evidence can be retrieved from the chart.

### Who it is for
- Referral coordinators
- Specialist intake teams
- Clinical operations reviewers
- Hackathon judges evaluating whether the product shows a real operational workflow

### Problem it solves
Incomplete referral packets create slow manual follow-up. The result is usually hidden rejection logic, repeated chart digging, and no reliable audit trail showing what was missing, what was repaired, or why the final outcome changed.

### Strongest implemented flows verified in the app
- Demo login into the workspace
- Seeded workspace with Eleanor Vance and Marcus Hale
- Patient context page with evidence, medications, conditions, and referral note
- New referral submission
- `input_required` state when the nephrology packet is missing a recent UACR
- One-click repair path that attaches the missing UACR and resubmits
- Accepted terminal state with updated evidence and visible trace
- Blocked terminal state when the required UACR is not available

### Differentiators visible on screen
- Requirement checklist
- Evidence table with newly added evidence highlighted
- Intake decision card
- Submission trace
- Activity timeline
- Deterministic run states and explicit accepted or blocked outcomes

### Weak or risky areas
- Local Docker and Supabase startup remains the most brittle setup dependency
- Older `input_required` runs were less reliable to revisit later by direct URL than live runs already active in the same session
- First-run latency is noticeable without a warm-up pass
- The developer-oriented debugging detail is real, but it is not the strongest mainline demo material

## 2. Best demo strategy

### Demo angle
From incomplete referral to accepted packet in one repair step.

### Positioning
The product is not pitched as generic AI summarization. The demo frames it as a referral acceptance engine with visible requirements, real chart-backed repair, and an auditable state machine.

### Primary story
Use Eleanor Vance as the main journey:
1. Show the accepted result first.
2. Rewind to the initial missing-lab state.
3. Show that the app can repair the packet by retrieving the missing UACR.
4. Land on the accepted state with visible proof of what changed.

### Secondary proof
Use Marcus Hale to show the blocked path when the required chart evidence does not exist.

## 3. Five-minute storyboard with timestamps

| Time | Segment | Purpose | Visual |
| --- | --- | --- | --- |
| 0:00-0:37 | Hook and rewind | Show payoff immediately | Accepted Eleanor run, then rewind into fresh `input_required` state |
| 0:37-1:07 | Problem and product | Explain the real operational pain | Landing page, demo login, workspace |
| 1:07-1:43 | Patient context | Ground the product in chart data | Eleanor patient page and evidence |
| 1:43-2:17 | Initial submission | Show strict intake requirements | New referral page to `input_required` |
| 2:17-2:57 | Repair to accepted | Show the wow moment | Fetch Missing Evidence, new UACR, accepted decision |
| 2:57-3:38 | Audit trail | Show why the workflow is trustworthy | Trace, evidence table, intake decision, timeline |
| 3:38-4:09 | Blocked proof | Show honest limits of automation | Marcus run ending in blocked |
| 4:09-4:45 | Close | Reinforce inspectability and product maturity | Workspace summary and final hold |

## 4. Shot-by-shot walkthrough

### Shot A
- Segment: `s1-hook-rewind`
- Visual goal: accepted state first, then rewind into a fresh Eleanor `input_required` run
- Live actions: accepted page hold, scroll, return to workspace, create new Eleanor run to `input_required`

### Shot B
- Segment: `s2-problem-and-product`
- Visual goal: landing page to workspace
- Live actions: landing page, Get Started, demo login, workspace arrival

### Shot C
- Segment: `s3-patient-context`
- Visual goal: patient context and existing evidence
- Live actions: open Eleanor patient page, scroll evidence and chart context

### Shot D
- Segment: `s4-initial-submission`
- Visual goal: show referral submission becoming `input_required`
- Live actions: start consult passport, build and submit, land on repairable missing-lab state

### Shot E
- Segment: `s5-repair-to-accepted`
- Visual goal: real repair and acceptance
- Live actions: click Fetch Missing Evidence, wait for accepted state, scroll evidence and checklist

### Shot F
- Segment: `s6-audit-trail`
- Visual goal: explainable system behavior
- Live actions: hold on accepted run, scroll trace and timeline

### Shot G
- Segment: `s7-blocked-proof`
- Visual goal: honest blocked state
- Live actions: create fresh Marcus run, submit, attempt repair, land on blocked

### Shot H
- Segment: `s8-close`
- Visual goal: final workspace summary
- Live actions: return to workspace and hold on the seeded operational view

## 5. Narration script

The actual narration source is stored in:

- `scripts/demo/demo-plan.json`
- `output/demo/manifests/narration-metadata.json`

The final rendered voice is Kokoro `af_sarah` at speed `1.0`, with deliberate tail holds added to each segment to hit the five-minute target while letting important product states breathe onscreen.

## 6. Tooling and capture plan

### Runtime
- Local Vite app on `http://127.0.0.1:8080`
- Local Supabase via Docker

### Browser capture
- Playwright-based deterministic capture
- Shared authenticated live take for the app segments
- Separate public clip for landing and login
- Master authenticated recording split into per-segment clips with FFmpeg

### Narration
- Kokoro ONNX
- Voice auditions generated in required order:
  - `af_sarah`
  - `af_nicole`
  - `af_bella`
- Final selected voice:
  - `af_sarah`

### Subtitles
- Whisper CLI, local model
- SRT generated from the combined narration master

### Final render
- FFmpeg-based section render and concat
- Subtitle burn-in when SRT exists

## 7. Editing plan

- Output target: `1920x1080`, `30fps`, H.264 MP4
- Keep live motion whenever a real state change is happening
- Let accepted, blocked, checklist, and trace views hold long enough to read
- Use the padded audio tails to give key frames breathing room instead of forcing robotic faster narration
- Burn subtitles into the final MP4 and keep the `.srt` sidecar

## 8. Risk log

- Local Supabase startup still depends on Docker being healthy
- Direct navigation back into older `input_required` pages was less reliable than staying on live in-session runs
- Subtitle generation can take longer on CPU if Whisper has to download a model cache
- Final pacing depends on the audio tails and subtitle timings matching the rendered sections cleanly

## 9. Execution steps actually used

1. Verified the local Vite app on `127.0.0.1:8080`.
2. Confirmed seeded patients and the Eleanor `input_required` path manually.
3. Patched `scripts/local-supabase.mjs` to handle quoted Supabase CLI env values.
4. Built `scripts/demo/capture-demo.mjs` to create deterministic footage.
5. Switched authenticated capture to a single shared live take, then split it into raw segment clips with FFmpeg.
6. Downloaded Kokoro ONNX model assets into `tmp/demo-tts/models/`.
7. Built `scripts/demo/generate-narration.py` to generate auditions, per-segment WAVs, and a narration master.
8. Selected Kokoro `af_sarah` and generated the final narration set.
9. Ran Whisper locally to generate the subtitle file.
10. Rendered the final video with per-segment footage, narration WAVs, and burned subtitles.

## 10. Final output summary

### Planning artifacts
- `output/demo/docs/demo-deliverables.md`
- `scripts/demo/demo-plan.json`

### Execution artifacts
- `scripts/demo/capture-demo.mjs`
- `scripts/demo/generate-narration.py`
- `scripts/demo/render-final.mjs`
- `output/demo/manifests/clip-manifest.json`
- `output/demo/manifests/local-demo-state.json`
- `output/demo/manifests/narration-metadata.json`
- `output/demo/manifests/edit-plan.json`
- `output/demo/raw/`
- `output/demo/audio/`
- `output/demo/subtitles/referral-passport-demo.srt`
- `output/demo/final/referral-passport-demo-1080p.mp4`
