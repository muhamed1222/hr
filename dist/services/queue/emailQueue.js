"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = __importDefault(require("../../config/logging"));
const emailService_1 = require("../email/emailService");
class EmailQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.maxRetries = 3;
        this.retryDelay = 5000;
        this.startProcessing();
    }
    static getInstance() {
        if (!EmailQueue.instance) {
            EmailQueue.instance = new EmailQueue();
        }
        return EmailQueue.instance;
    }
    async startProcessing() {
        if (this.processing) {
            return;
        }
        this.processing = true;
        while (this.queue.length > 0) {
            const job = this.queue[0];
            try {
                await this.processEmail(job);
                this.queue.shift();
            }
            catch (error) {
                logging_1.default.error('Email queue error:', error);
                // Перемещаем неудачную задачу в конец очереди
                this.queue.shift();
                this.queue.push(job);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
        this.processing = false;
    }
    async processEmail(job) {
        try {
            await (0, emailService_1.sendEmail)(job);
            logging_1.default.info(`Email sent successfully to ${job.to}`);
        }
        catch (error) {
            logging_1.default.error(`Failed to send email to ${job.to}:`, error);
            throw error;
        }
    }
    async addToQueue(emailData) {
        this.queue.push(emailData);
        this.startProcessing();
    }
    getQueueLength() {
        return this.queue.length;
    }
}
exports.default = EmailQueue.getInstance();
