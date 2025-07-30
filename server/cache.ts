// High-performance in-memory cache with TTL
class FastCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly TTL = 300000; // 5 minutes

  set(key: string, data: any, ttl = this.TTL): void {
    this.cache.set(key, { data, expires: Date.now() + ttl });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared - dynamic pricing updated');
  }

  // Auto-cleanup expired entries every 5 minutes
  startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expires) {
          this.cache.delete(key);
        }
      }
    }, 300000);
  }
}

export const cache = new FastCache();
cache.startCleanup();