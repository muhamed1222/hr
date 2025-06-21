import Queue from 'bull';
import { Redis } from 'ioredis';
import { logger } from '../../config/logging';

export interface QueueConfig {
  redis: Redis;
  name: string;
  options?: Queue.QueueOptions;
}

export class QueueManager {
  private queues: Map<string, Queue.Queue> = new Map();

  createQueue(config: QueueConfig): Queue.Queue {
    const { name, redis, options } = config;

    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, {
      redis: {
        port: redis.options.port,
        host: redis.options.host,
        password: redis.options.password,
      },
      ...options,
    });

    // Handle queue events
    queue.on('error', (error) => {
      logger.error(`Queue ${name} error:`, error);
    });

    queue.on('failed', (job, error) => {
      logger.error(`Job ${job.id} in queue ${name} failed:`, error);
    });

    queue.on('completed', (job) => {
      logger.info(`Job ${job.id} in queue ${name} completed`);
    });

    this.queues.set(name, queue);
    return queue;
  }

  async addJob<T = any>(
    queueName: string,
    data: T,
    options?: Queue.JobOptions
  ): Promise<Queue.Job<T>> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.add(data, options);
  }

  async processQueue<T = any, R = any>(
    queueName: string,
    processor: (job: Queue.Job<T>) => Promise<R>
  ): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    queue.process(async (job) => {
      try {
        return await processor(job);
      } catch (error) {
        logger.error(`Error processing job ${job.id} in queue ${queueName}:`, error);
        throw error;
      }
    });
  }

  async getQueue(name: string): Promise<Queue.Queue | undefined> {
    return this.queues.get(name);
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map((queue) =>
      queue.close()
    );
    await Promise.all(closePromises);
    this.queues.clear();
  }
} 