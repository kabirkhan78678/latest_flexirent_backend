import bcrypt from 'bcrypt';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import base64url from 'base64url';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';
import { Message } from './Messages.js';
import { sendEmail } from './emailService.js';
import { StatusCode } from './constant.js';
import { handleSuccess } from './responseHandler.js';

const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

dotenv.config();

const BASE_URL = process.env.BASE_URL
const WEBSITE_URL = process.env.WEBSITE_URL;

export const capitalizeFirstLetterOfWords = (str) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const randomStringAsBase64Url = (size) => {
    return base64url(crypto.randomBytes(size));
};

export const generateToken = (user) => {
    return jwt.sign({ data: { id: user.id ? user.id : user.host_id } }, process.env.AUTH_SECRETKEY,{ expiresIn: '7d' });
};

export const generateHostToken = (user) => {
    return jwt.sign({ data: { host_id:  user.host_id } }, process.env.AUTH_SECRETKEY,{ expiresIn: '7d' });
};

export const generateAdminToken = (admin) => {
    return jwt.sign({ data: { admin_id : admin.admin_id } }, process.env.AUTH_SECRETKEY,{ expiresIn: '7d' });
};

export const hashPassword = async (password) => {
    try {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    } catch (error) {
        throw new Error("Password hashing failed");
    };
};

export const comparePassword = async (password, hashedPassword) => {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        console.error("Error comparing passwords:", error);
        throw new Error("Password comparison failed");
    };
};

export const generateRandomString = async (length) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    };
    return result;
};

export const sendVerificationEmail = async (act_token, email, res,type) => {
    const context = {
        href_url: `${BASE_URL}${type == 1 ? "user" : "host"}/verifyUser/${act_token}`,
        image_logo: `${BASE_URL}/logo.png`,
        msg: `Please click below link to activate your account.`,
    };
    const projectRoot = path.resolve();
    const emailTemplatePath = path.join(projectRoot, "view", "signupemail.handlebars");
    const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
    const template = handlebars.compile(templateSource);
    const emailHtml = template(context);
    let emailOptions = {
        to: email,
        subject: Message.accountActivate,
        html: emailHtml,
    };
    await sendEmail(emailOptions);
    if (res) {
        return handleSuccess(res, StatusCode.status200, `${Message.accountVerifiedCodeSent}`);
    };
};

export const sendSubadminCredentialsEmail = async (act_token, email, password, res) => {
  const context = {
    href_url: `${BASE_URL}admin/verifySubadmin/${act_token}`, // adjust the route if different
    image_logo: `${BASE_URL}/logo.png`,
    msg: `Please click the button below to activate your sub-admin account.`,
    credentials_text: `Your temporary login password is: <strong>${password}</strong>`,
    button_text: `Verify`,
  };

  const projectRoot = path.resolve();
  const emailTemplatePath = path.join(projectRoot, "view", "subadminCredentialsEmail.handlebars");
  const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
  const template = handlebars.compile(templateSource);
  const emailHtml = template(context);

  const emailOptions = {
    to: email,
    subject: "Sub-Admin Account Credentials & Activation",
    html: emailHtml,
  };

  await sendEmail(emailOptions);

  if (res) {
    return handleSuccess(res, StatusCode.status200, `Sub-admin verification email sent successfully.`);
  }
};

export const sendUserCredentialEmail = async ( email, password, res) => {
  const context = {
    href_url: `${WEBSITE_URL}`, // adjust the route if different
    image_logo: `${BASE_URL}/logo.png`,
    msg: `Your Guest Account is Created Successfully. Below is your Login Credentials Please click the button below to login your account.`,
    email : `${email}`,
    password: `${password}`,
    button_text: `Login`,
  };

  const projectRoot = path.resolve();
  const emailTemplatePath = path.join(projectRoot, "view", "sendCredentials.handlebars");
  const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
  const template = handlebars.compile(templateSource);
  const emailHtml = template(context);

  const emailOptions = {
    to: email,
    subject: "Guest Account Credentials",
    html: emailHtml,
  };

  await sendEmail(emailOptions);

  if (res) {
    return handleSuccess(res, StatusCode.status200, `Guest Account Created successfully.`);
  }
};

export const sendHostCredentialEmail = async ( email, password, res) => {
  const context = {
    href_url: `${WEBSITE_URL}`, // adjust the route if different
    image_logo: `${BASE_URL}/logo.png`,
    msg: `Your Host Account is Created Successfully. Below is your Login Credentials Please click the button below to login your account.`,
    email : `${email}`,
    password: `${password}`,
    button_text: `Login`,
  };

  const projectRoot = path.resolve();
  const emailTemplatePath = path.join(projectRoot, "view", "sendCredentials.handlebars");
  const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
  const template = handlebars.compile(templateSource);
  const emailHtml = template(context);

  const emailOptions = {
    to: email,
    subject: "Host Account Credentials",
    html: emailHtml,
  };

  await sendEmail(emailOptions);

  if (res) {
    return handleSuccess(res, StatusCode.status200, `Host Account Created successfully.`);
  }
};

export const sendUserBusinessCredentialEmail = async ( email, password, res) => {
  const context = {
    href_url: `${WEBSITE_URL}`, // adjust the route if different
    image_logo: `${BASE_URL}/logo.png`,
    msg: `Your Business Account is Created Successfully. Below is your Login Credentials Please click the button below to login your account.`,
    email : `${email}`,
    password: `${password}`,
    button_text: `Login`,
  };

  const projectRoot = path.resolve();
  const emailTemplatePath = path.join(projectRoot, "view", "sendCredentials.handlebars");
  const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
  const template = handlebars.compile(templateSource);
  const emailHtml = template(context);

  const emailOptions = {
    to: email,
    subject: "Business Account Credentials",
    html: emailHtml,
  };

  await sendEmail(emailOptions);

  if (res) {
    return handleSuccess(res, StatusCode.status200, `Business Account Created successfully.`);
  }
};

export const sendSubUserCredentialsEmail = async (email, password,res) => {
   const context = {
    href_url: `${WEBSITE_URL}`, // adjust the route if different
    image_logo: `${BASE_URL}/logo.png`,
    msg: `Your Guset account has been created. You can log in using the credentials below:`,
    email : `${email}`,
    password: `${password}`,
    button_text: `Login`,
  };

  const projectRoot = path.resolve();
  const emailTemplatePath = path.join(projectRoot, "view", "sendCredentials.handlebars");
  const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
  const template = handlebars.compile(templateSource);
  const emailHtml = template(context);

  const emailOptions = {
    to: email,
    subject: "Guest Account Credentials",
    html: emailHtml,
  };

  await sendEmail(emailOptions);

  if (res) {
    return handleSuccess(res, StatusCode.status200, `Guest account created successfully.`);
  }
};

export const sendBookingRequestEmail = async (name, email, res = null, reservation_id, property, check_in, check_out, guest, price) => {
  try {
    const context = {
      name: name || "Host",
      msg: "I would like to request a booking for the following property:",
      reservation_id: reservation_id || "N/A",
      Property: property || "N/A",
      Check_In: check_in || "N/A",
      Check_Out: check_out || "N/A",
      Guests: guest || "N/A",
      total_price: price ? `€${price}` : "€0",
    };

    const projectRoot = path.resolve();
    const emailTemplatePath = path.join(projectRoot, "view", "bookingRequest.handlebars");
    const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
    const template = handlebars.compile(templateSource);
    const emailHtml = template(context);

    const emailOptions = {
      to: email,
      subject: "Booking Request Received",
      html: emailHtml,
    };

    await sendEmail(emailOptions);

    // if (res) {
    //   // return handleSuccess(res, StatusCode.status200, Message.bookingRequestReceived);
    // }
  } catch (error) {
    console.error("Error sending booking request email:", error);
    if (res) {
      return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
    }
  }
};

       const formatDate = (dateString) => {
      if (!dateString) return "N/A";
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

export const sendPaymentVerificationEmail = async (name, email, res = null, reservation_id, property, check_in, check_out, guest, price) => {
  try {
    const context = {
      name: name || "Guest",
      msg: "The Property Owner has accept your booking. Please Complete Your Payment:",
      reservation_id: reservation_id || "N/A",
      Property: property || "N/A",
      Check_In: formatDate(check_in),
      Check_Out: formatDate(check_out),
      Guests: guest || "N/A",
      total_price: price ? `€${price}` : "€0",
    };

    const projectRoot = path.resolve();
    const emailTemplatePath = path.join(projectRoot, "view", "paymentRequest.handlebars");
    const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
    const template = handlebars.compile(templateSource);
    const emailHtml = template(context);

    const emailOptions = {
      to: email,
      subject: "Booking Accept by Property Owner",
      html: emailHtml,
    };

    await sendEmail(emailOptions);

    if (res) {
      return handleSuccess(res, StatusCode.status200, Message.bookingAccepted);
    }
  } catch (error) {
    console.error("Error sending booking request email:", error);
    if (res) {
      return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
    }
  }
};

export const sendBookingConfirmedEmail = async (name, email, res = null, reservation_id, property, check_in, check_out, guest, price) => {
  try {
    const context = {
      name: name || "Guest",
      msg: "Your booking has been successfully confirmed. Below are your reservation details:",
      reservation_id: reservation_id || "N/A",
      Property: property || "N/A",
      Check_In: formatDate(check_in),
      Check_Out: formatDate(check_out),
      Guests: guest || "N/A",
      total_price: price ? `€${price}` : "€0",
    };

    const projectRoot = path.resolve();
    const emailTemplatePath = path.join(projectRoot, "view", "bookingRequest.handlebars");
    const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
    const template = handlebars.compile(templateSource);
    const emailHtml = template(context);

    const emailOptions = {
      to: email,
      subject: "Booking Confirmed!",
      html: emailHtml,
    };

    await sendEmail(emailOptions);

    if (res) {
      return handleSuccess(res, StatusCode.status200, Message.bookingConfirmed);
    }
  } catch (error) {
    console.error("Error sending booking request email:", error);
    if (res) {
      return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
    }
  }
};

export const sendBookingConfirmedHostEmail = async (name, email, res = null, reservation_id, property, check_in, check_out, guest, price,booked_person_name) => {
  try {
    const context = {
      name: name || "Host",
      msg: "A new booking has been successfully confirmed. Please find the reservation details below:",
      reservation_id: reservation_id || "N/A",
      Property: property || "N/A",
      Check_In: formatDate(check_in),
      Check_Out: formatDate(check_out),
      Guests: guest || "N/A",
      total_price: price ? `€${price}` : "€0",
      booked_person_name : booked_person_name || "Guest"
    };

    const projectRoot = path.resolve();
    const emailTemplatePath = path.join(projectRoot, "view", "bookingRequest.handlebars");
    const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
    const template = handlebars.compile(templateSource);
    const emailHtml = template(context);

    const emailOptions = {
      to: email,
      subject: "Booking Confirmed!",
      html: emailHtml,
    };

    await sendEmail(emailOptions);

    if (res) {
      return handleSuccess(res, StatusCode.status200, Message.bookingConfirmed);
    }
  } catch (error) {
    console.error("Error sending booking request email:", error);
    if (res) {
      return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
    }
  }
};



export const sendBookingCancelledEmail = async (name, email, res = null, reservation_id, property, check_in, check_out, guest ,cancellation_reason) => {
  try {

    const context = {
      name: name || "Guest",
      msg: "We regret to inform you that your booking has been cancelled.",
      reservation_id: reservation_id || "N/A",
      Property: property || "N/A",
      Check_In: formatDate(check_in),
      Check_Out: formatDate(check_out),
      Guests: guest || "N/A",
      cancellation_reason : cancellation_reason || "N/A",
      href_url : `${WEBSITE_URL}`,
    };

    const projectRoot = path.resolve();
    const emailTemplatePath = path.join(projectRoot, "view", "bookingCancelled.handlebars");
    const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
    const template = handlebars.compile(templateSource);
    const emailHtml = template(context);

    const emailOptions = {
      to: email,
      subject: Message.bookingCancelledByHost || "Your Booking Has Been Cancelled",
      html: emailHtml,
    };

    await sendEmail(emailOptions);

    if (res) {
      return handleSuccess(res, StatusCode.status200, "Booking cancellation email sent.");
    }
  } catch (err) {
    console.error("Error sending cancellation email:", err);
    if (res) {
      return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
    }
  }
};


export const sendForgotPasswordEmail = async () => {
    const projectRoot = path.resolve();
    const emailTemplatePath = path.join(projectRoot, "view", "signupemail.handlebars");
    const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
    const template = handlebars.compile(templateSource);
    const emailHtml = template(context);
};

export const sendForgotPasswordEmailUser = async (act_token, email, res,type) => {
    const context = {
        href_url: `${BASE_URL}${type == 1 ? "user" : "host"}/reset-password/${act_token}`,
        image_logo: `${BASE_URL}/logo.png`,
        msg: `Please click below link to Reset Your Passsword.`,
    };
    console.log(BASE_URL);
    const projectRoot = path.resolve();
    const emailTemplatePath = path.join(projectRoot, "view", "forget_template.handlebars");
    const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
    const template = handlebars.compile(templateSource);
    const emailHtml = template(context);
    let emailOptions = {
        to: email,
        subject: Message.sendForgotPasswordEmailSetn,
        html: emailHtml,
    };
    await sendEmail(emailOptions);
    if (res) {
        return handleSuccess(res, StatusCode.status200, `${Message.forgotPasswordEmailSent}`);
    };
};

export const sendForgotPasswordEmailAdmin = async (act_token, email, res,type) => {
    const context = {
        href_url: `${BASE_URL}admin/reset-password/${act_token}`,
        image_logo: `${BASE_URL}/logo.png`,
        msg: `Please click below link to Reset Your Passsword.`,
    };
    console.log(BASE_URL);
    const projectRoot = path.resolve();
    const emailTemplatePath = path.join(projectRoot, "view", "forget_template.handlebars");
    const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
    const template = handlebars.compile(templateSource);
    const emailHtml = template(context);
    let emailOptions = {
        to: email,
        subject: Message.sendForgotPasswordEmailSetn,
        html: emailHtml,
    };
    await sendEmail(emailOptions);
    if (res) {
        return handleSuccess(res, StatusCode.status200, `${Message.forgotPasswordEmailSent}`);
    };
};

export function decodeId(encodedId) {
  return Buffer.from(encodedId, 'base64').toString('utf8');
}

export function encodeId(id) {
  return Buffer.from(String(id)).toString('base64');
}

export function generateStrongPassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';

  // Ensure at least one from each required group
  const requiredChars = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  const allChars = uppercase + lowercase + numbers + special;

  // Fill the rest of the password length
  for (let i = requiredChars.length; i < length; i++) {
    requiredChars.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle the array to prevent predictable patterns
  for (let i = requiredChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [requiredChars[i], requiredChars[j]] = [requiredChars[j], requiredChars[i]];
  }

  return requiredChars.join('');
}

export const    generateTransactionId = () => {
  const prefix = 'TX'; // Transaction prefix
  const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += digits[Math.floor(Math.random() * digits.length)];
  }
  return `${prefix}${id}`;
}


export const sendContactUsSupportEmail = async (data, res) => {
  const context = {
    href_url: `${BASE_URL}`,
    image_logo: `${BASE_URL}/logo.png`,
   name: data.name,
  contact_id: data.contact_id,
  message: data.message,
  created_at: formatDate(data.created_at),
  reply: data.reply, // or null
  reply_datetime: formatDate(data.reply_datetime),
  };

  const projectRoot = path.resolve();
  const emailTemplatePath = path.join(projectRoot, "view", "supportEmailSent.handlebars");
  const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
  const template = handlebars.compile(templateSource);
  const emailHtml = template(context);

  const emailOptions = {
    to: data.email,
    subject: "Support Email",
    html: emailHtml,
  };

  await sendEmail(emailOptions);

  if (res) {
    return handleSuccess(res, StatusCode.status200, `Support Email sent successfully.`);
  }
};

export const sendSupportEmail = async (data,email, res) => {
  const context = {
    href_url: `${BASE_URL}`,
    image_logo: `${BASE_URL}/logo.png`,
   name: data.name,
  message: data.message,
  email : data.email,
  };

  const projectRoot = path.resolve();
  const emailTemplatePath = path.join(projectRoot, "view", "supportEmail.handlebars");
  const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
  const template = handlebars.compile(templateSource);
  const emailHtml = template(context);

  const emailOptions = {
    to: email,
    subject: "Support Email",
    html: emailHtml,
  };

  await sendEmail(emailOptions);

  if (res) {
    return handleSuccess(res, StatusCode.status200, `Message sent successfully.`);
  }
};


export const sendSubHostCredentialsEmail = async (act_token, email, password, res) => {
  const context = {
    href_url: `${BASE_URL}host/verifySubhost/${act_token}`, // adjust the route if different
    image_logo: `${BASE_URL}/logo.png`,
    msg: `Please click the button below to activate your sub-host account.`,
    credentials_text: `Your temporary login password is: <strong>${password}</strong>`,
    button_text: `Verify`,
  };

  const projectRoot = path.resolve();
  const emailTemplatePath = path.join(projectRoot, "view", "subadminCredentialsEmail.handlebars");
  const templateSource = await fs.readFile(emailTemplatePath, "utf-8");
  const template = handlebars.compile(templateSource);
  const emailHtml = template(context);

  const emailOptions = {
    to: email,
    subject: "Sub-Host Account Credentials & Activation",
    html: emailHtml,
  };

  await sendEmail(emailOptions);

  if (res) {
    return handleSuccess(res, StatusCode.status200, `Sub-Host verification email sent successfully.`);
  }
};