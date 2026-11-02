import { execFileSync, spawn } from "node:child_process";
import { constants, cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const workspace = mkdtempSync(join(tmpdir(), "vegasunfiltered-e2e-"));
const publicOnly = process.argv.includes("--public");
const cli = join(root, "node_modules/.bin");
const env = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR", "TEMP", "SystemRoot", "CI"].flatMap((key) =>
    process.env[key] ? [[key, process.env[key]]] : []),
);
Object.assign(env, {
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  CRON_SECRET: randomBytes(32).toString("hex"),
  E2E_RUN_ID: randomBytes(8).toString("hex"),
  E2E_PASSWORD: randomBytes(24).toString("hex"),
  E2E_PUBLIC_ONLY: publicOnly ? "1" : "0",
  E2E_APP_DIR: workspace,
});

function command(binary, args, options = {}) {
  return execFileSync(join(cli, binary), args, {
    cwd: root, env, stdio: "inherit", ...options,
  });
}

function playwright(args) {
  return new Promise((resolveExit, reject) => {
    const child = spawn(join(cli, "playwright"), args, { cwd: root, env, stdio: "inherit" });
    const forwardSignal = () => child.kill("SIGINT");
    process.once("SIGINT", forwardSignal);
    child.once("error", reject);
    child.once("exit", (code) => {
      process.removeListener("SIGINT", forwardSignal);
      resolveExit(code ?? 1);
    });
  });
}

let stackStarted = false;
try {
  // Next.js only sees this copy, which deliberately contains no environment files.
  for (const name of ["src", "public", "package.json", "next.config.ts", "tsconfig.json", "next-env.d.ts"]) {
    cpSync(join(root, name), join(workspace, name), { recursive: true });
  }
  if (publicOnly) {
    const reviewRoute = join(workspace, "src/app/(site)/e2e-review-fixture");
    mkdirSync(join(reviewRoute, "empty"), { recursive: true });
    mkdirSync(join(reviewRoute, "editor"), { recursive: true });
    cpSync(join(root, "tests/e2e/fixtures/review-page.tsx"), join(reviewRoute, "fixture.tsx"));
    writeFileSync(join(reviewRoute, "page.tsx"), 'export { default } from "./fixture";\n');
    writeFileSync(join(reviewRoute, "empty/page.tsx"), 'export { EmptyReviewTestPage as default } from "../fixture";\n');
    writeFileSync(join(reviewRoute, "editor/page.tsx"), 'export { ReviewEditorTestPage as default } from "../fixture";\n');
  }
  cpSync(join(root, "node_modules"), join(workspace, "node_modules"), {
    recursive: true, mode: constants.COPYFILE_FICLONE,
  });
  if (!publicOnly) {
    try {
      execFileSync("docker", ["info"], { env, stdio: "ignore" });
    } catch {
      throw new Error("Docker is not running. Start Docker Desktop, then rerun npm run test:e2e. No hosted database or personal environment files will be used.");
    }
    mkdirSync(join(workspace, "supabase"), { recursive: true });
    cpSync(join(root, "tests/e2e/supabase/config.toml"), join(workspace, "supabase/config.toml"));
    cpSync(join(root, "supabase/migrations"), join(workspace, "supabase/migrations"), { recursive: true });
    stackStarted = true;
    command("supabase", ["start", "--workdir", workspace, "--exclude", "realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor"]);
    const status = JSON.parse(command("supabase", ["status", "--workdir", workspace, "--output", "json"], { stdio: ["ignore", "pipe", "inherit"], encoding: "utf8" }));
    if (new URL(status.API_URL).hostname !== "127.0.0.1" || new URL(status.API_URL).port !== "55421") {
      throw new Error("Refusing to run destructive E2E tests against an unexpected Supabase endpoint.");
    }
    Object.assign(env, {
      NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    });
  }
  writeFileSync(join(workspace, "e2e-marker"), env.E2E_RUN_ID);
  execFileSync(process.execPath, [join(workspace, "node_modules/next/dist/bin/next"), "build"], {
    cwd: workspace, env, stdio: "inherit",
  });
  process.exitCode = await playwright(["test", ...(process.argv.includes("--ui") ? ["--ui"] : [])]);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (stackStarted) {
    try {
      command("supabase", ["stop", "--no-backup", "--workdir", workspace]);
    } catch {
      console.error("Could not stop the dedicated vegasunfiltered-e2e Supabase stack. Stop it before the next run.");
      process.exitCode = 1;
    }
  }
  rmSync(workspace, { recursive: true, force: true });
}
