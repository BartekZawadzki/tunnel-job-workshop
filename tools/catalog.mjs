// Builds catalog.json from packs/<id>/ and checks every pack against the workshop rules.
//   node tools/catalog.mjs          write catalog.json (fails on any problem)
//   node tools/catalog.mjs --check  only check (pull requests)
// The game checks every pack again with its own rules when it installs it; this is the door, not the authority.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// --root <dir>: check another checkout (the auto-merge workflow checks a pull request with the main branch's tool)
const rootArg = process.argv.indexOf("--root");
const ROOT = rootArg > 0 ? path.resolve(process.argv[rootArg + 1]) : path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const PACKS = path.join(ROOT, "packs");
const ALLOWED = new Set([".json", ".png", ".tjmap", ".lua", ".md", ".txt"]);
const MAX_PACK = 20 * 1024 * 1024, MAX_FILE = 8 * 1024 * 1024;
const ID = /^[a-z0-9][a-z0-9_-]{1,39}$/;
const check = process.argv.includes("--check");
const problems = [];
const entries = [];

function readJson(file) {
  // pack.json may carry // comment lines (the game reads them); strip whole-line comments only
  const text = fs.readFileSync(file, "utf8").split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");
  return JSON.parse(text);
}

function walk(dir, base = dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.lstatSync(full);
    if (st.isSymbolicLink()) { problems.push(`${path.relative(ROOT, full)}: links are not allowed`); continue; }
    if (st.isDirectory()) out.push(...walk(full, base));
    else out.push({ full, rel: path.relative(base, full).split(path.sep).join("/"), size: st.size });
  }
  return out;
}

for (const id of fs.existsSync(PACKS) ? fs.readdirSync(PACKS).sort() : []) {
  const dir = path.join(PACKS, id);
  if (!fs.statSync(dir).isDirectory()) continue;
  const tag = `packs/${id}`;
  const file = path.join(dir, "pack.json");
  if (!fs.existsSync(file)) { problems.push(`${tag}: no pack.json`); continue; }
  let pack;
  try { pack = readJson(file); } catch (e) { problems.push(`${tag}/pack.json: ${e.message}`); continue; }
  if (pack.id !== id) problems.push(`${tag}: the folder must be named after the pack id (${pack.id})`);
  if (!ID.test(pack.id || "") || pack.id === "official") problems.push(`${tag}: bad pack id '${pack.id}'`);
  if (!pack.name) problems.push(`${tag}: a name is required`);
  if (!["community", "ai"].includes(pack.category || "community")) problems.push(`${tag}: category must be community or ai`);
  const files = walk(dir);
  let total = 0, scripts = false;
  for (const f of files) {
    const ext = path.extname(f.rel).toLowerCase();
    if (!ALLOWED.has(ext)) problems.push(`${tag}/${f.rel}: file type ${ext || "(none)"} is not allowed`);
    if (f.size > MAX_FILE) problems.push(`${tag}/${f.rel}: larger than ${MAX_FILE / 1048576} MB`);
    if (ext === ".lua") scripts = true;
    total += f.size;
  }
  if (total > MAX_PACK) problems.push(`${tag}: larger than ${MAX_PACK / 1048576} MB`);
  let evidence;
  if ((pack.category || "community") === "ai") {
    const ev = path.join(dir, "evidence.json");
    if (!fs.existsSync(ev)) problems.push(`${tag}: an AI pack needs evidence.json (its scenarios and results)`);
    else {
      try {
        const e = readJson(ev);
        const sc = Array.isArray(e.scenarios) ? e.scenarios : [];
        if (sc.length === 0) problems.push(`${tag}/evidence.json: no scenarios`);
        evidence = { passed: sc.filter(s => s.pass === true).length, total: sc.length, model: e.model || "", tokens: e.tokens || 0 };
      } catch (err) { problems.push(`${tag}/evidence.json: ${err.message}`); }
    }
  }
  entries.push({
    id: pack.id, name: pack.name, version: pack.version || "1.0.0", author: pack.author || "", description: pack.description || "",
    category: pack.category || "community", scripts, size: total,
    files: files.map(f => ({ path: f.rel, size: f.size, sha256: crypto.createHash("sha256").update(fs.readFileSync(f.full)).digest("hex") })),
    ...(evidence ? { evidence } : {}),
  });
}

for (const p of problems) console.log("PROBLEM " + p);
if (problems.length > 0) { console.log(`CATALOG fail packs=${entries.length} problems=${problems.length}`); process.exit(1); }
// packs a person reviews before they merge: any with scripts, and every AI pack (README)
const review = entries.filter(e => e.scripts || e.category === "ai").map(e => e.id);
if (process.argv.includes("--needs-review")) { console.log(review.length ? "REVIEW " + review.join(" ") : "REVIEW none"); process.exit(0); }
if (!check) fs.writeFileSync(path.join(ROOT, "catalog.json"), JSON.stringify({ format: 1, packs: entries }, null, 2) + "\n");
console.log(`CATALOG ok packs=${entries.length}${check ? " (check only)" : ""}`);
