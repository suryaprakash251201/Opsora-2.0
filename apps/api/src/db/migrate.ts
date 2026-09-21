import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { getDb } from "./client.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// drizzle/ lives at repo root: <repo>/drizzle
const candidates = [
  path.resolve(here, "../../../../drizzle"),
  path.resolve(process.cwd(), "drizzle"),
  path.resolve(process.cwd(), "../../drizzle"),
];

function findDrizzleDir(): string {
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(`drizzle/ directory not found (tried ${candidates.join(", ")})`);
}

function resolveDbFile(): string {
  const raw = process.env.DATABASE_URL ?? "file:./data/opsora.db";
  const file = raw.startsWith("file:") ? raw.slice(5) : raw;
  return path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
}

export function applyMigrations(): void {
  const file = resolveDbFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  try {
    sqlite.exec(
      `CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL
      )`,
    );
    const dir = findDrizzleDir();
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const applied = new Set(
      (sqlite.prepare("SELECT name FROM __drizzle_migrations").all() as { name: string }[]).map(
        (r) => r.name,
      ),
    );
    for (const f of files) {
      if (applied.has(f)) continue;
      const sql = fs.readFileSync(path.join(dir, f), "utf8");
      sqlite.exec("BEGIN");
      try {
        sqlite.exec(sql);
        sqlite
          .prepare("INSERT INTO __drizzle_migrations (name, applied_at) VALUES (?, ?)")
          .run(f, new Date().toISOString());
        sqlite.exec("COMMIT");
        console.log(`[db] applied migration ${f}`);
      } catch (err) {
        try {
          sqlite.exec("ROLLBACK");
        } catch {
          /* already rolled back */
        }
        throw err;
      }
    }
  } finally {
    sqlite.close();
  }
}

const invokedAsMain =
  (process.argv[1] ?? "").endsWith("migrate.ts") || (process.argv[1] ?? "").endsWith("migrate.js");

if (invokedAsMain || process.env.OPSORA_RUN_MIGRATIONS === "1") {
  // Ensure the database file exists, then migrate.
  getDb();
  applyMigrations();
  console.log("[db] migrations complete");
  process.exit(0);
}
