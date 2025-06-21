"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const logging_1 = __importDefault(require("../../config/logging"));
class QueueManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.queues = new Map();
        this.processing = new Map();
        this.options = new Map();
    }
    static getInstance() {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }
    createQueue(name, options = {}) {
        if (!this.queues.has(name)) {
            this.queues.set(name, []);
            this.processing.set(name, false);
            this.options.set(name, {
                maxRetries: options.maxRetries || 3,
                retryDelay: options.retryDelay || 1000
            });
        }
    }
    async addToQueue(queueName, data) {
        if (!this.queues.has(queueName)) {
            this.createQueue(queueName);
        }
        const id = Math.random().toString(36).substr(2, 9);
        const item = { id, data, retries: 0 };
        const queue = this.queues.get(queueName);
        queue.push(item);
        this.processQueue(queueName);
        return id;
    }
    async processQueue(queueName) {
        if (this.processing.get(queueName)) {
            return;
        }
        this.processing.set(queueName, true);
        const queue = this.queues.get(queueName);
        const options = this.options.get(queueName);
        while (queue.length > 0) {
            const item = queue[0];
            try {
                await this.emit(queueName, item.data);
                queue.shift(); // Remove processed item
            }
            catch (error) {
                logging_1.default.error(`Error processing queue item: ${error}`);
                if (item.retries < options.maxRetries) {
                    item.retries++;
                    await new Promise(resolve => setTimeout(resolve, options.retryDelay));
                }
                else {
                    queue.shift(); // Remove failed item
                    this.emit('error', { queue: queueName, item, error });
                }
            }
        }
        this.processing.set(queueName, false);
    }
    getQueueLength(queueName) {
        return this.queues.get(queueName)?.length || 0;
    }
    clearQueue(queueName) {
        this.queues.set(queueName, []);
    }
}
exports.default = QueueManager.getInstance();
