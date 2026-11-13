// Prints one ADMIN_USERS entry: node scripts/hash-team-password.mjs <email> <password>
// Keep the scrypt parameters in sync with src/core/team-users.ts.
import { randomBytes, scryptSync } from "node:crypto";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Usage: node scripts/hash-team-password.mjs <email> <password>");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Use a password of at least 10 characters.");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
console.log(`${email.trim().toLowerCase()}=scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`);
