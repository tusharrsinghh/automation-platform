const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const migrationsDir = path.resolve(__dirname, "../../database/migrations");

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query(`
    SELECT filename
    FROM schema_migrations
    ORDER BY id;
  `);

  return new Set(result.rows.map((row) => row.filename));
}

async function runMigrations() {
  try {
    await ensureMigrationTable();

    const appliedMigrations = await getAppliedMigrations();

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        console.log(`✓ Already applied: ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      console.log(`→ Applying: ${file}`);

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        await client.query(sql);

        await client.query(
          `
          INSERT INTO schema_migrations (filename)
          VALUES ($1);
          `,
          [file]
        );

        await client.query("COMMIT");

        console.log(`✓ Applied: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");

        console.error(`✗ Failed: ${file}`);
        throw error;
      } finally {
        client.release();
      }
    }

    console.log("\nMigration complete.");
  } catch (error) {
    console.error("\nMigration failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigrations();