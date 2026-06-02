import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(__dirname, '../../data/cache');
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const cacheService = {
  get<T>(key: string): T | null {
    try {
      const filePath = path.join(CACHE_DIR, `${key}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(fileContent);
      if (parsed.expiry && Date.now() > parsed.expiry) {
        // Expired, delete it
        try {
          fs.unlinkSync(filePath);
        } catch (_) {}
        return null;
      }
      return parsed.data as T;
    } catch (error) {
      console.error(`Cache read error for key ${key}:`, error);
      return null;
    }
  },

  set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): void {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      const filePath = path.join(CACHE_DIR, `${key}.json`);
      const payload = {
        expiry: Date.now() + ttlMs,
        data
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (error) {
      console.error(`Cache write error for key ${key}:`, error);
    }
  },

  clear(): void {
    try {
      if (fs.existsSync(CACHE_DIR)) {
        fs.rmSync(CACHE_DIR, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
};
