import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const STATE_FILE = path.join(os.tmpdir(), "agy-code-review-stop-hook.json");
const MAX_STATE_ENTRIES = 50;

/**
 * Compute a deterministic fingerprint of all staged, unstaged, and untracked
 * changes in the workspace so we only re-trigger review when changes are new.
 */
function getWorkingTreeFingerprint(workspaceDir) {
  const statusOutput = execFileSync("git", ["status", "--porcelain"], {
    cwd: workspaceDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

  if (!statusOutput) {
    return null;
  }

  const hash = crypto.createHash("sha256");
  hash.update(statusOutput);
  hash.update("\0");

  for (const args of [
    ["diff", "--cached"],
    ["diff"],
  ]) {
    try {
      const diff = execFileSync("git", args, {
        cwd: workspaceDir,
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      });
      hash.update(diff);
    } catch {
      // Ignore diff errors on binary/large files; status still contributes.
    }
    hash.update("\0");
  }

  // Include untracked files so edits to new files update the fingerprint.
  for (const line of statusOutput.split(/\r?\n/)) {
    if (!line.startsWith("?? ")) {
      continue;
    }
    const relPath = line.slice(3).trim().replace(/^"(.*)"$/, "$1");
    const fullPath = path.join(workspaceDir, relPath);
    hash.update(relPath);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        hash.update(fs.readFileSync(fullPath));
      } else {
        hash.update(String(stat.mtimeMs));
      }
    } catch {
      // Ignore unreadable/missing paths.
    }
    hash.update("\0");
  }

  return hash.digest("hex");
}

function readState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeState(state) {
  try {
    const entries = Object.entries(state);
    const trimmed =
      entries.length > MAX_STATE_ENTRIES
        ? Object.fromEntries(entries.slice(-MAX_STATE_ENTRIES))
        : state;
    fs.writeFileSync(STATE_FILE, JSON.stringify(trimmed), "utf8");
  } catch {
    // Non-fatal if temp state cannot be persisted.
  }
}

/**
 * Stop hook that triggers a code review using the `code-review` skill
 * whenever a task completes normally with unreviewed uncommitted changes.
 */
function main() {
  let payload = {};
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    if (raw) {
      payload = JSON.parse(raw);
    }
  } catch {
    process.stdout.write("{}\n");
    return;
  }

  if (payload.terminationReason !== "NO_TOOL_CALL") {
    process.stdout.write("{}\n");
    return;
  }

  const workspaceDir =
    typeof payload.cwd === "string" && payload.cwd.length > 0
      ? payload.cwd
      : path.resolve(process.cwd(), "..");

  let fingerprint = null;
  try {
    fingerprint = getWorkingTreeFingerprint(workspaceDir);
  } catch {
    process.stdout.write("{}\n");
    return;
  }

  if (!fingerprint) {
    process.stdout.write("{}\n");
    return;
  }

  const stateKey =
    typeof payload.conversationId === "string" && payload.conversationId.length > 0
      ? payload.conversationId
      : workspaceDir;

  const state = readState();
  const isContinuation =
    payload.continuationActive === true ||
    (typeof payload.executionNum === "number" && payload.executionNum > 0);

  // If this is already a Stop-hook continuation, record the current tree as
  // reviewed/handled and allow clean completion without looping.
  if (isContinuation) {
    state[stateKey] = { fingerprint, updatedAt: Date.now() };
    writeState(state);
    process.stdout.write("{}\n");
    return;
  }

  // If these exact uncommitted changes were already reviewed in this
  // conversation, allow clean completion.
  if (state[stateKey]?.fingerprint === fingerprint) {
    process.stdout.write("{}\n");
    return;
  }

  state[stateKey] = { fingerprint, updatedAt: Date.now() };
  writeState(state);

  const reason = [
    "Uncommitted changes were detected upon task completion.",
    "Run the `code-review` skill (using model `claude-sonnet-5-5-medium` / Claude Sonnet 5.5) to review the current uncommitted changes.",
    "After `code-review` reports its findings, review each finding and either:",
    "1. Address the finding and re-run `code-review` on the revised changes, or",
    "2. Write a clear justification for why that finding does not need to be addressed.",
  ].join("\n");

  process.stdout.write(
    JSON.stringify({
      decision: "continue",
      reason,
    }) + "\n"
  );
}

main();
