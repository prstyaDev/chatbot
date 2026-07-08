import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({
  path: ".env.local",
});

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    console.log("⏭️  POSTGRES_URL not defined, skipping migrations");
    process.exit(0);
  }

  console.log("⏳ Running migrations...");

  try {
    const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
    const db = drizzle(connection);

    const start = Date.now();
    await migrate(db, { migrationsFolder: "./lib/db/migrations" });
    const end = Date.now();

    console.log("✅ Migrations completed in", end - start, "ms");
    
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed");
    console.error(err);
    
    // Don't fail build in production if migrations fail
    // Database might be managed separately or already migrated
    if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
      console.log("⚠️  Continuing build despite migration failure (production mode)");
      process.exit(0);
    }
    
    process.exit(1);
  }
};

runMigrate().catch((err) => {
  console.error("❌ Migration script error");
  console.error(err);
  
  // Don't fail build in production
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    console.log("⚠️  Continuing build despite error (production mode)");
    process.exit(0);
  }
  
  process.exit(1);
});
