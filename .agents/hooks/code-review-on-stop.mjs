import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Stop hook that triggers a code review using the `code-review` skill
 * whenever a task completes normally with uncommitted changes in the workspace.
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

  // Only trigger on normal completion and avoid looping after a continuation.
  if (
    payload.terminationReason !== "NO_TOOL_CALL" ||
    payload.continuationActive === true
  ) {
    process.stdout.write("{}\n");
    return;
  }

  const workspaceDir =
    typeof payload.cwd === "string" && payload.cwd.length > 0
      ? payload.cwd
      : path.resolve(process.cwd(), "..");

  let statusOutput = "";
  try {
    statusOutput = execFileSync("git", ["status", "--porcelain"], {
      cwd: workspaceDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    process.stdout.write("{}\n");
    return;
  }

  if (!statusOutput) {
    process.stdout.write("{}\n");
    return;
  }

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
