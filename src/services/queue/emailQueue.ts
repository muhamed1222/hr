import { QueueManager, QueueConfig } from './QueueManager';
import { Redis } from 'ioredis';
import { logger } from '../../config/logging';
import Queue from 'bull';

interface EmailJob {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: string;
  }>;
}

export class EmailQueue {
  private queueManager: QueueManager;
  private readonly QUEUE_NAME = 'email';

  constructor(redis: Redis) {
    this.queueManager = new QueueManager();
    
    const config: QueueConfig = {
      redis,
      name: this.QUEUE_NAME,
      options: {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      },
    };

    const queue = this.queueManager.createQueue(config);
    this.setupProcessor(queue);
  }

  private setupProcessor(queue: Queue.Queue<EmailJob>): void {
    this.queueManager.processQueue<EmailJob>(this.QUEUE_NAME, async (job) => {
      const { to, subject, body, attachments } = job.data;
      
      try {
        logger.info(`Sending email to ${to}`);
        // Здесь будет реальная отправка email
        await this.mockSendEmail(job.data);
        logger.info(`Email sent successfully to ${to}`);
      } catch (error) {
        logger.error(`Failed to send email to ${to}:`, error);
        throw error;
      }
    });
  }

  private async mockSendEmail(data: EmailJob): Promise<void> {
    // Имитация отправки email
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async addToQueue(emailData: EmailJob): Promise<void> {
    await this.queueManager.addJob(this.QUEUE_NAME, emailData, {
      priority: 1,
      attempts: 3,
      removeOnComplete: true,
    });
  }

  async close(): Promise<void> {
    await this.queueManager.closeAll();
  }
} 