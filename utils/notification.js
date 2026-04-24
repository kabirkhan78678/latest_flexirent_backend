import db from "../config/db.js";
// import admin from "firebase-admin";

export const pushAndStoreNotification = async ({
  sender_id,
  sender_type,
  receiver_id,
  receiver_type,
  title,
  message,
  reference_id,
  reference_type,
  notification_type,
  fcm_token
}) => {
  try {
    const insertQuery = `
      INSERT INTO notifications
      (
        sender_id,
        sender_type,
        receiver_id,
        receiver_type,
        title,
        message,
        reference_id,
        reference_type,
        notification_type
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(insertQuery, [
      sender_id,
      sender_type,
      receiver_id,
      receiver_type,
      title,
      message,
      reference_id,
      reference_type,
      notification_type
    ]);

    // Firebase push optional
    // if (fcm_token) { ... }

  } catch (error) {
    console.log("Notification Error:", error);
  }
};