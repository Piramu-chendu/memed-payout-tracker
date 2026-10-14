
import dotenv from "dotenv";

const result = dotenv.config({
  path: ".env.test",
  override: true,
  quiet: true,
});

if (result.error) {
  throw new Error("Unable to load the backend .env.test file");
}

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI is missing from .env.test");
}

let databaseName: string;

try {
  const parsedUri = new URL(mongoUri);
  databaseName = parsedUri.pathname.replace(/^\/|\/$/g, "");
} catch {
  throw new Error("MONGODB_URI in .env.test is invalid");
}

if (databaseName !== "memed_payout_tracker_test") {
  throw new Error(
    "Tests blocked: MONGODB_URI must target memed_payout_tracker_test"
  );
}
