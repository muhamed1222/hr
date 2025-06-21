import logger from '../../config/logging';

interface SessionData {
  userId: string;
  expiresAt: number;
  [key: string]: any;
}

class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, SessionData>;
  private readonly prefix: string = 'session:';
  private readonly defaultTTL: number = 24 * 60 * 60; // 24 hours

  private constructor() {
    this.sessions = new Map();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private getKey(sessionId: string): string {
    return `${this.prefix}${sessionId}`;
  }

  public async createSession(sessionId: string, data: SessionData, ttl: number = this.defaultTTL): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000;
    this.sessions.set(this.getKey(sessionId), { ...data, expiresAt });

    // Установка таймера для автоматического удаления
    setTimeout(() => {
      this.sessions.delete(this.getKey(sessionId));
    }, ttl * 1000);
  }

  public async getSession(sessionId: string): Promise<SessionData | null> {
    const key = this.getKey(sessionId);
    const session = this.sessions.get(key);

    if (!session) {
      return null;
    }

    if (session.expiresAt < Date.now()) {
      this.sessions.delete(key);
      return null;
    }

    return session;
  }

  public async updateSession(sessionId: string, data: Partial<SessionData>): Promise<void> {
    const key = this.getKey(sessionId);
    const existingSession = this.sessions.get(key);

    if (!existingSession) {
      throw new Error('Session not found');
    }

    this.sessions.set(key, { ...existingSession, ...data });
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(this.getKey(sessionId));
  }

  public async getAllSessions(): Promise<SessionData[]> {
    const now = Date.now();
    const activeSessions: SessionData[] = [];

    for (const [key, session] of this.sessions.entries()) {
      if (session.expiresAt > now) {
        activeSessions.push(session);
      } else {
        this.sessions.delete(key);
      }
    }

    return activeSessions;
  }
}

export default SessionManager.getInstance(); 