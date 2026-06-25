// Redis configuration or fallbacks for performance scaling.
// In this preview sandbox environment, we fall back to a high-speed in-memory store.

class MockRedis {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      setTimeout(() => {
        this.store.delete(key);
      }, duration * 1000);
    }
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }
}

export const redis = new MockRedis();
console.log('Redis Cache module initialized (falling back to Memory store safely).');
