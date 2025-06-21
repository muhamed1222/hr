import { EventEmitter } from 'events';
import logger from '../../config/logging';

interface QueueOptions {
  maxRetries?: number;
  retryDelay?: number;
}

interface QueueItem {
  id: string;
  data: any;
  retries: number;
}

class QueueManager extends EventEmitter {
  private static instance: QueueManager;
  private queues: Map<string, QueueItem[]>;
  private processing: Map<string, boolean>;
  private options: Map<string, QueueOptions>;

  private constructor() {
    super();
    this.queues = new Map();
    this.processing = new Map();
    this.options = new Map();
  }

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  public createQueue(name: string, options: QueueOptions = {}): void {
    if (!this.queues.has(name)) {
      this.queues.set(name, []);
      this.processing.set(name, false);
      this.options.set(name, {
        maxRetries: options.maxRetries || 3,
        retryDelay: options.retryDelay || 1000
      });
    }
  }

  public async addToQueue(queueName: string, data: any): Promise<string> {
    if (!this.queues.has(queueName)) {
      this.createQueue(queueName);
    }

    const id = Math.random().toString(36).substr(2, 9);
    const item: QueueItem = { id, data, retries: 0 };
    
    const queue = this.queues.get(queueName)!;
    queue.push(item);

    this.processQueue(queueName);
    return id;
  }

  private async processQueue(queueName: string): Promise<void> {
    if (this.processing.get(queueName)) {
      return;
    }

    this.processing.set(queueName, true);
    const queue = this.queues.get(queueName)!;
    const options = this.options.get(queueName)!;

    while (queue.length > 0) {
      const item = queue[0];
      try {
        await this.emit(queueName, item.data);
        queue.shift(); // Remove processed item
      } catch (error) {
        logger.error(`Error processing queue item: ${error}`);
        if (item.retries < options.maxRetries!) {
          item.retries++;
          await new Promise(resolve => setTimeout(resolve, options.retryDelay!));
        } else {
          queue.shift(); // Remove failed item
          this.emit('error', { queue: queueName, item, error });
        }
      }
    }

    this.processing.set(queueName, false);
  }

  public getQueueLength(queueName: string): number {
    return this.queues.get(queueName)?.length || 0;
  }

  public clearQueue(queueName: string): void {
    this.queues.set(queueName, []);
  }
}

export default QueueManager.getInstance(); 