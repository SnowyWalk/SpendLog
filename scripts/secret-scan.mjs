import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const excludedDirs = new Set([
  ".git",
  ".next",
  ".omx",
  "node_modules",
  "coverage",
  "dist",
]);
const excludedFiles = new Set([".env", ".env.local"]);
const includedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".prisma",
  ".css",
]);

const patterns = [
  { name: "CODEF secret assignment", regex: /CODEF_[A-Z0-9_]*(SECRET|TOKEN|KEY)\s*=\s*['"](?!<)[^'"]{8,}['"]/i },
  { name: "connectedId literal", regex: /connectedId\s*[:=]\s*['"](?!<|sample-)[^'"]{12,}['"]/i },
  { name: "private key", regex: /-----BEGIN (RSA )?PRIVATE KEY-----/ },
  { name: "raw password assignment", regex: /\b(PASSWORD|PASSWD)\s*=\s*['"](?!<)[^'"]{8,}['"]/i },
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute);

    if (entry.isDirectory()) {
      if (!excludedDirs.has(entry.name)) {
        files.push(...await walk(absolute));
      }
      continue;
    }

    if (
      entry.isFile() &&
      !excludedFiles.has(entry.name) &&
      includedExtensions.has(path.extname(entry.name))
    ) {
      files.push(relative);
    }
  }

  return files;
}

const findings = [];
for (const file of await walk(root)) {
  const content = await readFile(path.join(root, file), "utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        findings.push(`${file}:${index + 1} ${pattern.name}`);
      }
    }
  });
}

if (findings.length > 0) {
  console.error("Potential secret leaks found:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Secret scan passed: no obvious committed secret literals found.");
