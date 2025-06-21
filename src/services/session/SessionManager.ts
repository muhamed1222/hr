import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface Session {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  data?: Record<string, any>;
}

export class SessionManager {
  private readonly redis: Redis;
  private readonly prefix: string = 'session:';
  private readonly defaultTTL: number = 24 * 60 * 60; // 24 hours in seconds

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  private getKey(sessionId: string): string {
    return `${this.prefix}${sessionId}`;
  }

  async create(userId: string, ttl: number = this.defaultTTL): Promise<Session> {
    const now = Math.floor(Date.now() / 1000);
    const session: Session = {
      id: uuidv4(),
      userId,
      createdAt: now,
      expiresAt: now + ttl,
    };

    await this.redis.set(
      this.getKey(session.id),
      JSON.stringify(session),
      'EX',
      ttl
    );

    return session;
  }

  async get(sessionId: string): Promise<Session | null> {
    const data = await this.redis.get(this.getKey(sessionId));
    if (!data) return null;

    const session = JSON.parse(data) as Session;
    const now = Math.floor(Date.now() / 1000);

    if (session.expiresAt < now) {
      await this.delete(sessionId);
      return null;
    }

    return session;
  }

  async update(sessionId: string, data: Partial<Session>): Promise<Session | null> {
    const session = await this.get(sessionId);
    if (!session) return null;

    const updatedSession = { ...session, ...data };
    const ttl = Math.max(0, updatedSession.expiresAt - Math.floor(Date.now() / 1000));

    await this.redis.set(
      this.getKey(sessionId),
      JSON.stringify(updatedSession),
      'EX',
      ttl
    );

    return updatedSession;
  }

  async delete(sessionId: string): Promise<boolean> {
    const result = await this.redis.del(this.getKey(sessionId));
    return result === 1;
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    const keys = await this.redis.keys(`${this.prefix}*`);
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const session = JSON.parse(data) as Session;
        if (session.userId === userId) {
          await this.redis.del(key);
        }
      }
    }
  }
} 