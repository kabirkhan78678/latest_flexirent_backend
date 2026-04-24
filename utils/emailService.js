import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { Message } from './Messages.js';

dotenv.config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    },
});

// Optional: SMTP connection test
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Connection Error:", error);
  } else {
    console.log("✅ SMTP Server Ready");
  }
});

export const sendEmail = async (emailOptions) => {
    const mailOptions = {
        from: EMAIL_USER,
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
    };
    try {
        await transporter.sendMail(mailOptions);
        // console.log(`Email sent to: ${emailOptions.to}`);
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error(Message.errorToSendingEmail);
    };
};