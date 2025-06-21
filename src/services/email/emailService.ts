interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(data: EmailData): Promise<void> {
  // Имитация отправки email
  console.log('Sending email:', data);
  await new Promise(resolve => setTimeout(resolve, 1000));
} 