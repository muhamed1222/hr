"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SessionManager {
    constructor() {
        this.prefix = 'session:';
        this.defaultTTL = 24 * 60 * 60; // 24 hours
        this.sessions = new Map();
    }
    static getInstance() {
        if (!SessionManager.instance) {
            SessionManager.instance = new SessionManager();
        }
        return SessionManager.instance;
    }
    getKey(sessionId) {
        return `${this.prefix}${sessionId}`;
    }
    async createSession(sessionId, data, ttl = this.defaultTTL) {
        const expiresAt = Date.now() + ttl * 1000;
        this.sessions.set(this.getKey(sessionId), { ...data, expiresAt });
        // Установка таймера для автоматического удаления
        setTimeout(() => {
            this.sessions.delete(this.getKey(sessionId));
        }, ttl * 1000);
    }
    async getSession(sessionId) {
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
    async updateSession(sessionId, data) {
        const key = this.getKey(sessionId);
        const existingSession = this.sessions.get(key);
        if (!existingSession) {
            throw new Error('Session not found');
        }
        this.sessions.set(key, { ...existingSession, ...data });
    }
    async deleteSession(sessionId) {
        return this.sessions.delete(this.getKey(sessionId));
    }
    async getAllSessions() {
        const now = Date.now();
        const activeSessions = [];
        for (const [key, session] of this.sessions.entries()) {
            if (session.expiresAt > now) {
                activeSessions.push(session);
            }
            else {
                this.sessions.delete(key);
            }
        }
        return activeSessions;
    }
}
exports.default = SessionManager.getInstance();
