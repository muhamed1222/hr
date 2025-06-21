import logger from '../../config/logging';
import { sendEmail } from '../email/emailService';

interface EmailJob {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

class EmailQueue {
  private static instance: EmailQueue;
  private queue: EmailJob[] = [];
  private processing: boolean = false;
  private maxRetries: number = 3;
  private retryDelay: number = 5000;

  private constructor() {
    this.startProcessing();
  }

  public static getInstance(): EmailQueue {
    if (!EmailQueue.instance) {
      EmailQueue.instance = new EmailQueue();
    }
    return EmailQueue.instance;
  }

  private async startProcessing(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    while (this.queue.length > 0) {
      const job = this.queue[0];
      try {
        await this.processEmail(job);
        this.queue.shift();
      } catch (error) {
        logger.error('Email queue error:', error);
        // Перемещаем неудачную задачу в конец очереди
        this.queue.shift();
        this.queue.push(job);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
    this.processing = false;
  }

  private async processEmail(job: EmailJob): Promise<void> {
    try {
      await sendEmail(job);
      logger.info(`Email sent successfully to ${job.to}`);
    } catch (error) {
      logger.error(`Failed to send email to ${job.to}:`, error);
      throw error;
    }
  }

  public async addToQueue(emailData: EmailJob): Promise<void> {
    this.queue.push(emailData);
    this.startProcessing();
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}

export default EmailQueue.getInstance(); 