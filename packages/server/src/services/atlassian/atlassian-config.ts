import { writeFile, readFile, access, constants, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_PATH = join(__dirname, "../../../data/atlassian-config.enc");
const LEGACY_CONFIG_PATH = join(__dirname, "../../../data/atlassian-config.json");

const CIPHER = "aes-256-gcm";
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = "sha256";
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;

export interface AtlassianConfig {
  domain: string;
  email: string;
  apiToken: string;
}

let configCache: AtlassianConfig | null = null;
let masterKey: Buffer | null = null;
let keySalt: Buffer | null = null;

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_HASH);
}

export async function setMasterPassword(password: string): Promise<boolean> {
  try {
    await access(CONFIG_PATH, constants.R_OK);
    const raw = await readFile(CONFIG_PATH);
    keySalt = raw.subarray(0, SALT_LENGTH);
    masterKey = deriveKey(password, keySalt);

    const iv = raw.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = raw.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const ciphertext = raw.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(CIPHER, masterKey, iv);
    decipher.setAuthTag(authTag);
    const decrypted = decipher.update(ciphertext) + decipher.final("utf-8");
    const parsed = JSON.parse(decrypted);

    configCache = {
      domain: parsed.domain,
      email: parsed.email,
      apiToken: parsed.apiToken,
    };
    return true;
  } catch {
    // No file yet or wrong password — set the key for future encryption
    keySalt = crypto.randomBytes(SALT_LENGTH);
    masterKey = deriveKey(password, keySalt);
    configCache = null;
    return false;
  }
}

export async function loadConfig(): Promise<AtlassianConfig | null> {
  if (configCache) return configCache;

  if (masterKey && keySalt) {
    try {
      await access(CONFIG_PATH, constants.R_OK);
      const raw = await readFile(CONFIG_PATH);
      const iv = raw.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const authTag = raw.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
      const ciphertext = raw.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

      const decipher = crypto.createDecipheriv(CIPHER, masterKey, iv);
      decipher.setAuthTag(authTag);
      const decrypted = decipher.update(ciphertext) + decipher.final("utf-8");
      const parsed = JSON.parse(decrypted);
      configCache = {
        domain: parsed.domain,
        email: parsed.email,
        apiToken: parsed.apiToken,
      };
      return configCache;
    } catch {
      return null;
    }
  }

  // No password set — try legacy plain JSON
  try {
    await access(LEGACY_CONFIG_PATH, constants.R_OK);
    const raw = await readFile(LEGACY_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    configCache = {
      domain: parsed.domain,
      email: parsed.email,
      apiToken: parsed.apiToken,
    };
    return configCache;
  } catch {
    return null;
  }
}

export async function saveConfig(config: AtlassianConfig): Promise<void> {
  configCache = config;
  const json = JSON.stringify(config);

  if (masterKey && keySalt) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(CIPHER, masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(json, "utf-8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    await writeFile(CONFIG_PATH, Buffer.concat([keySalt, iv, authTag, encrypted]));
  } else {
    await writeFile(LEGACY_CONFIG_PATH, json, "utf-8");
  }
}

export function isUnlocked(): boolean {
  return masterKey !== null;
}

async function encryptedConfigExists(): Promise<boolean> {
  try {
    await access(CONFIG_PATH, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function clearConfig(): Promise<void> {
  configCache = null;
  masterKey = null;
  keySalt = null;
  try { await unlink(CONFIG_PATH); } catch { /* ignore */ }
  try { await unlink(LEGACY_CONFIG_PATH); } catch { /* ignore */ }
}

export async function getStatus(): Promise<{
  configured: boolean;
  unlocked: boolean;
  hasPassword: boolean;
  domain?: string;
  email?: string;
}> {
  const config = masterKey
    ? configCache ?? (await loadConfig())
    : await loadConfig();

  const hasEncFile = await encryptedConfigExists();

  return {
    configured: !!config,
    unlocked: isUnlocked(),
    hasPassword: hasEncFile || masterKey !== null || keySalt !== null,
    domain: config?.domain,
    email: config?.email ? `${config.email.slice(0, 3)}...` : undefined,
  };
}
