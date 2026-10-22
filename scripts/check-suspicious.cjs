#!/usr/bin/env node
// Blocks the patterns used in the Oct 2026 forged-commit attack on this repo:
// code hidden after long runs of whitespace, VS Code tasks that auto-run on
// folder open, npm scripts that run a node file before the real command,
// install lifecycle hooks, and scripts disguised as fonts/images.
//
// Usage: check-suspicious.cjs --staged   (pre-commit: staged files only)
//        check-suspicious.cjs            (CI: every tracked file)
const { execFileSync } = require("child_process");
const fs = require("fs");

const staged = process.argv.includes("--staged");
const args = staged
  ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]
  : ["ls-files", "-z"];
const files = execFileSync("git", args, { encoding: "utf8" }).split("\0").filter(Boolean);

const SKIP = /(^|\/)(package-lock\.json|.*\.tsbuildinfo)$/;
const DISGUISED = /\.(otf|ttf|woff2?|eot|png|jpe?g|gif|ico|webp|svg)$/i;
const CODE_IN_TEXT = /\b(require\s*\(|eval\s*\(|child_process|new Function|process\.env|module\.exports)/;
const LIFECYCLE = ["preinstall", "install", "postinstall", "prepublish", "prestart", "predev", "prebuild"];

const problems = [];
const flag = (file, msg) => problems.push(`${file}: ${msg}`);

for (const file of files) {
  if (SKIP.test(file) || !fs.existsSync(file)) continue;
  const buf = fs.readFileSync(file);
  const isText = !buf.includes(0);
  const text = isText ? buf.toString("utf8") : "";

  if (DISGUISED.test(file)) {
    if (isText && !file.endsWith(".svg") && CODE_IN_TEXT.test(text)) flag(file, "binary asset contains JavaScript");
    if (file.endsWith(".svg") && /<script|\son[a-z]+\s*=/i.test(text)) flag(file, "SVG contains script or event handler");
    continue;
  }
  if (!isText) continue;

  text.split("\n").forEach((line, i) => {
    if (/[ \t]{80,}\S/.test(line)) flag(file, `line ${i + 1}: code hidden after a long run of whitespace`);
  });

  if (/(^|\/)\.vscode\/tasks\.json$/.test(file) && /folderOpen/.test(text)) {
    flag(file, "VS Code task runs automatically on folder open");
  }

  if (/(^|\/)package\.json$/.test(file)) {
    const scripts = JSON.parse(text).scripts || {};
    for (const [name, cmd] of Object.entries(scripts)) {
      if (LIFECYCLE.includes(name)) flag(file, `lifecycle script "${name}": ${cmd}`);
      if (/\bnode\s+\S+\s*&&/.test(cmd)) flag(file, `script "${name}" runs a node file first: ${cmd}`);
    }
  }
}

if (problems.length) {
  console.error("Suspicious content found:\n  " + problems.join("\n  "));
  console.error("\nIf this is intentional, review it carefully with a teammate before bypassing.");
  process.exit(1);
}
console.log(`check-suspicious: ${files.length} file(s) clean`);
