"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
async function sendEmail(data) {
    // Имитация отправки email
    console.log('Sending email:', data);
    await new Promise(resolve => setTimeout(resolve, 1000));
}
