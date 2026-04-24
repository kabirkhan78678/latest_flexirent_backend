import db from "../config/db.js";

/* ===============================
   CONVERSATION LOGIC
================================ */

export async function findConversation(sId, sType, rId, rType) {
    const rows = await db.query(`
        SELECT * FROM conversations
        WHERE 
        (participant_one_id=? AND participant_one_type=? 
         AND participant_two_id=? AND participant_two_type=?)
        OR
        (participant_one_id=? AND participant_one_type=? 
         AND participant_two_id=? AND participant_two_type=?)
    `, [sId, sType, rId, rType, rId, rType, sId, sType]);

    return rows[0];
}

export async function createConversation(sId, sType, rId, rType) {
    const result = await db.query(`
        INSERT INTO conversations
        (participant_one_id, participant_one_type, participant_two_id, participant_two_type)
        VALUES (?, ?, ?, ?)
    `, [sId, sType, rId, rType]);

    return { id: result.insertId };
}

export async function saveMessage(convId, sId, sType, message) {
    const result = await db.query(`
        INSERT INTO messages
        (conversation_id, sender_id, sender_type, message, is_read)
        VALUES (?, ?, ?, ?, 0)
    `, [convId, sId, sType, message]);

    return result;
}

export async function markMessagesAsRead(conversation_id, userId, userType) {

    await db.query(`
        UPDATE messages
        SET is_read = 1
        WHERE conversation_id = ?
        AND is_read = 0
        AND NOT (sender_id = ? AND sender_type = ?)
    `, [conversation_id, userId, userType]);
}

export async function getUnreadCounts(userId, userType) {
    const rows = await db.query(`
        SELECT 
            c.id as conversation_id,
            COUNT(m.id) as unread_count
        FROM conversations c
        JOIN messages m ON m.conversation_id = c.id
        WHERE 
            m.is_read = 0
            AND NOT (m.sender_id = ? AND m.sender_type = ?)
            AND (
                (c.participant_one_id = ? AND c.participant_one_type = ?)
                OR
                (c.participant_two_id = ? AND c.participant_two_type = ?)
            )
        GROUP BY c.id
    `, [userId, userType, userId, userType, userId, userType]);

    return rows;
}

export async function updateLastMessage(convId, message) {
    await db.query(`
        UPDATE conversations
        SET last_message=?, last_message_at=NOW()
        WHERE id=?
    `, [message, convId]);
}

/* ===============================
   ROLE BASED CHAT LIST
================================ */

// 🟢 User / UserBusiness → Hosts
export async function getUserHosts(userId) {

    const rows = await db.query(`
        SELECT DISTINCT 
            h.host_id AS id,
            CASE 
                WHEN h.user_type = 2 THEN 'hostBusiness'
                ELSE 'host'
            END AS type,
            COALESCE(h.business_name, h.first_name) AS name,
            h.profile_image,
            c.last_message,
            c.last_message_at
        FROM booking_master b
        JOIN host_master h ON h.host_id = b.host_id
        LEFT JOIN conversations c 
            ON (
                (c.participant_one_id = b.user_id AND c.participant_one_type = 'user'
                AND c.participant_two_id = h.host_id)
                OR
                (c.participant_two_id = b.user_id AND c.participant_two_type = 'user'
                AND c.participant_one_id = h.host_id)
            )
        WHERE b.user_id = ?
        AND b.booking_status = 1
        ORDER BY c.last_message_at DESC
    `, [userId]);

    return rows;
}

// 🔵 Host / HostBusiness → Users
export async function getHostUsers(hostId) {

    const rows = await db.query(`
        SELECT DISTINCT 
            u.id,
            CASE 
                WHEN u.user_type = 2 THEN 'userBusiness'
                ELSE 'user'
            END AS type,
            COALESCE(u.business_name, u.first_name) AS name,
            u.profile_image
        FROM booking_master b
        JOIN users u ON u.id = b.user_id
        WHERE b.host_id = ?
        AND b.booking_status = 1
    `, [hostId]);

    return rows;
}

// 🔴 Admin → Hosts
export async function getAllHosts() {

    const rows = await db.query(`
        SELECT 
            host_id AS id,
            CASE 
                WHEN user_type = 2 THEN 'hostBusiness'
                ELSE 'host'
            END AS type,
            COALESCE(business_name, first_name) AS name,
            profile_image
        FROM host_master
        WHERE is_active = 1
    `);

    return rows;
}

// 🔹 Get conversation between two users
export async function getConversationByParticipants(sId, sType, rId, rType) {

    const rows = await db.query(`
        SELECT * FROM conversations
        WHERE 
        (participant_one_id=? AND participant_one_type=? 
         AND participant_two_id=? AND participant_two_type=?)
        OR
        (participant_one_id=? AND participant_one_type=? 
         AND participant_two_id=? AND participant_two_type=?)
    `, [sId, sType, rId, rType, rId, rType, sId, sType]);

    return rows[0];
}


// 🔹 Get messages by conversation id
export async function getMessagesByConversation(conversation_id) {

    const rows = await db.query(`
        SELECT 
            id,
            conversation_id,
            sender_id,
            sender_type,
            message,
            created_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
    `, [conversation_id]);

    return rows;
}


// 🔴 Get All Active Admins
export async function getAllAdmins() {

    const rows = await db.query(`
        SELECT 
            admin_id AS id,
            CASE 
                WHEN user_type = 1 THEN 'admin'
                WHEN user_type = 2 THEN 'subadmin'
            END AS type,
            full_name AS name,
            profile_image
        FROM admin_master
        WHERE is_active = 1
    `);

    return rows;
}


// 🔹 Get existing conversations for user
export async function getUserConversations(userId, userType) {

    const rows = await db.query(`
        SELECT 
            c.id as conversation_id,

            CASE
                WHEN c.participant_one_id = ?
                THEN c.participant_two_id
                ELSE c.participant_one_id
            END as id,

            CASE
                WHEN c.participant_one_id = ?
                THEN c.participant_two_type
                ELSE c.participant_one_type
            END as type,

            CASE
                WHEN c.participant_one_id = ?
                THEN 
                    CASE 
                        WHEN c.participant_two_type = 'host' OR c.participant_two_type = 'hostBusiness'
                        THEN COALESCE(h2.business_name, h2.first_name)

                        WHEN c.participant_two_type = 'user' OR c.participant_two_type = 'userBusiness'
                        THEN COALESCE(u2.business_name, u2.first_name)

                        WHEN c.participant_two_type = 'admin' OR c.participant_two_type = 'subadmin'
                        THEN a2.full_name
                    END
                ELSE
                    CASE 
                        WHEN c.participant_one_type = 'host' OR c.participant_one_type = 'hostBusiness'
                        THEN COALESCE(h1.business_name, h1.first_name)

                        WHEN c.participant_one_type = 'user' OR c.participant_one_type = 'userBusiness'
                        THEN COALESCE(u1.business_name, u1.first_name)

                        WHEN c.participant_one_type = 'admin' OR c.participant_one_type = 'subadmin'
                        THEN a1.full_name
                    END
            END as name,

            CASE
                WHEN c.participant_one_id = ?
                THEN COALESCE(h2.profile_image, u2.profile_image, a2.profile_image)
                ELSE COALESCE(h1.profile_image, u1.profile_image, a1.profile_image)
            END as profile_image,

            c.last_message,
            c.last_message_at

        FROM conversations c

        LEFT JOIN host_master h1 ON h1.host_id = c.participant_one_id
        LEFT JOIN host_master h2 ON h2.host_id = c.participant_two_id

        LEFT JOIN users u1 ON u1.id = c.participant_one_id
        LEFT JOIN users u2 ON u2.id = c.participant_two_id

        LEFT JOIN admin_master a1 ON a1.admin_id = c.participant_one_id
        LEFT JOIN admin_master a2 ON a2.admin_id = c.participant_two_id

        WHERE 
        (c.participant_one_id = ? AND c.participant_one_type = ?)
        OR
        (c.participant_two_id = ? AND c.participant_two_type = ?)

        ORDER BY c.last_message_at DESC
    `, [
        userId,
        userId,
        userId,
        userId,
        userId, userType,
        userId, userType
    ]);

    return rows;
}


// 🟣 UserBusiness → Added Users
export async function getAddedUsers(businessUserId) {

    const rows = await db.query(`
        SELECT 
            u.id,
            'user' AS type,
            COALESCE(u.first_name, u.business_name) AS name,
            u.profile_image
        FROM users u
        WHERE u.added_by = ?
        AND u.delete_flag = 0
    `, [businessUserId]);

    return rows;
}