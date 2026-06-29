import "server-only";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "budget_session";

const encoder = new TextEncoder();

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return secret;
}

function sign(payload: string) {
  return base64Url(createHmac("sha256", getSessionSecret()).update(payload).digest());
}

export function createSessionValue(now = Date.now()) {
  const payload = {
    sub: "admin",
    iat: now,
    exp: now + 1000 * 60 * 60 * 24 * 14,
  };
  const encoded = base64Url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionValue(value?: string) {
  if (!value) {
    return false;
  }

  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expected = sign(payload);
  const expectedBytes = encoder.encode(expected);
  const actualBytes = encoder.encode(signature);

  if (
    expectedBytes.byteLength !== actualBytes.byteLength ||
    !timingSafeEqual(expectedBytes, actualBytes)
  ) {
    return false;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as { exp?: number };
    return typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function hashPasswordForEnv(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyAdminPassword(password: string) {
  const configured = process.env.ADMIN_PASSWORD_HASH;
  if (!configured) {
    return false;
  }

  let actual: string;
  if (configured.startsWith("scrypt:")) {
    const [, salt, expectedHash] = configured.split(":");
    if (!salt || !expectedHash) {
      return false;
    }
    actual = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  } else if (configured.startsWith("sha256:")) {
    actual = `sha256:${createHash("sha256").update(password).digest("hex")}`;
  } else {
    return false;
  }

  const expectedBytes = encoder.encode(configured);
  const actualBytes = encoder.encode(actual);

  return (
    expectedBytes.byteLength === actualBytes.byteLength &&
    timingSafeEqual(expectedBytes, actualBytes)
  );
}
