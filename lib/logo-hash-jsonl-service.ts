/**
 * Logo Hash JSONL Service
 * Loads logo hashes from a JSONL file and provides fast in-memory lookup for similarity checks.
 */
import fs from 'fs';
import path from 'path';

export interface LogoHashEntry {
  serialNumber: string;
  logoHash: string;
}

let logoHashes: LogoHashEntry[] = [];
let hashMap: Record<string, string> = {};
let initialized = false;

export function initializeLogoHashesFromJSONL(): void {
  if (initialized) return;
  const filePath = path.join(process.cwd(), 'logo-hashes-2026-02-16.jsonl');
  if (!fs.existsSync(filePath)) {
    console.warn('Logo hash JSONL file not found:', filePath);
    return;
  }
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  logoHashes = lines.map(line => {
    const obj = JSON.parse(line);
    return { serialNumber: obj.serial_number, logoHash: obj.logo_hash };
  });
  hashMap = Object.fromEntries(logoHashes.map(e => [e.serialNumber, e.logoHash]));
  initialized = true;
  console.log(`Loaded ${logoHashes.length} logo hashes from JSONL.`);
}

export function getLogoHashBySerial(serialNumber: string): string | undefined {
  if (!initialized) initializeLogoHashesFromJSONL();
  return hashMap[serialNumber];
}

export function getAllLogoHashes(): LogoHashEntry[] {
  if (!initialized) initializeLogoHashesFromJSONL();
  return logoHashes;
}
