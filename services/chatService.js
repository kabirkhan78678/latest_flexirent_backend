import {
    findConversation,
    createConversation,
    saveMessage,
    updateLastMessage,
    getUserHosts,
    getHostUsers,
    getAllHosts,
    getConversationByParticipants,
    getMessagesByConversation,
    getAllAdmins,
    getUnreadCounts,
    markMessagesAsRead,
    getUserConversations,
    getAddedUsers
} from "../models/chatModel.js";


function normalizeType(type) {

    const map = {
        "host-business": "hostBusiness",
        "user-business": "userBusiness",
        "sub-admin": "subadmin"
    };

    return map[type] || type;
}


/* ===============================
   TYPE FORMATTER
================================ */

function formatUserType(type) {

    const map = {
        subadmin: "sub-admin",
        userBusiness: "user-business",
        hostBusiness: "host-business"
    };

    return map[type] || type;
}

/* ===============================
   PERMISSION MATRIX
================================ */

function isChatAllowed(senderType, receiverType) {

    const rules = {

        user: ["host", "hostBusiness", "userBusiness"],

        userBusiness: ["user", "host", "hostBusiness"],

        host: ["user", "userBusiness", "admin", "subadmin"],

        hostBusiness: ["user", "userBusiness", "admin", "subadmin"],

        admin: ["host", "hostBusiness"],

        subadmin: ["host", "hostBusiness"]
    };

    return rules[senderType]?.includes(receiverType);
}

/* ===============================
   SEND MESSAGE
================================ */

export async function sendMessageService({ sender, receiver_id, receiver_type, message }) {

    // 🔹 normalize receiver type
    receiver_type = normalizeType(receiver_type);

    if (!message) return null;

    if (!isChatAllowed(sender.type, receiver_type)) {
        throw new Error("Chat not allowed between these roles");
    }

    let conversation = await findConversation(
        sender.id,
        sender.type,
        receiver_id,
        receiver_type
    );

    if (!conversation) {
        conversation = await createConversation(
            sender.id,
            sender.type,
            receiver_id,
            receiver_type
        );
    }

    const messageData = await saveMessage(
        conversation.id,
        sender.id,
        sender.type,
        message
    );

    await updateLastMessage(conversation.id, message);

    return {
        id: messageData.insertId,
        conversation_id: conversation.id,
        sender_id: sender.id,
        sender_type: formatUserType(sender.type),
        receiver_id,
        receiver_type: formatUserType(receiver_type),
        message,
        created_at: new Date()
    };
}

/* ===============================
   ROLE BASED CHAT LIST
================================ */

export async function getChatListByRole(user) {

    const { id, type } = user;
    let list = [];

    const BASE_URL = process.env.BASE_URL;

    // USER
    if (type === "user") {
        list = await getUserConversations(id, type);
    }

    // USER BUSINESS
    if (type === "userBusiness") {
        const hosts = await getUserHosts(id);
        const addedUsers = await getAddedUsers(id);
        list = [...hosts, ...addedUsers];
    }

    // HOST
    if (type === "host" || type === "hostBusiness") {
        const users = await getHostUsers(id);
        const admins = await getAllAdmins();
        list = [...users, ...admins];
    }

    // ADMIN / SUBADMIN — handle separately and return early
    if (type === "admin" || type === "subadmin") {

        const hosts = await getAllHosts(); // now returns conversation_id, last_message, last_message_at (if any)

        const unreadRows = await getUnreadCounts(id, type);
        const unreadMap = new Map();
        unreadRows.forEach(row => unreadMap.set(row.conversation_id, row.unread_count));

        const mapped = hosts.map(item => {
            return {
                ...item,
                type: formatUserType(item.type),
                profile_image: item.profile_image ? `${BASE_URL}/profile/${item.profile_image}` : null,
                // use conversation data returned in item
                last_message: item.last_message || null,
                last_message_at: item.last_message_at || null,
                unread: item.conversation_id ? (unreadMap.get(item.conversation_id) || 0) : 0
            };
        });

        // remove self if any (defensive)
        const filtered = mapped.filter(it => !(String(it.id) === String(id) && normalizeType(it.type) === normalizeType(type)));

        // sort by latest message (nulls go to bottom)
        filtered.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));

        return filtered;
    }

    // FOR OTHER ROLES: use existing generic merge logic
    // 🔹 Get conversations (for non-admin roles)
    const conversations = await getUserConversations(id, type);

    // 🔹 Get unread counts
    const unreadRows = await getUnreadCounts(id, type);
    const unreadMap = new Map();
    unreadRows.forEach(row => unreadMap.set(row.conversation_id, row.unread_count));

    // 🔹 Merge conversation + unread with list
    list = list.map(item => {

        const conv = conversations.find(
            c => String(c.id) === String(item.id) && c.type === normalizeType(item.type)
        );

        return {
            ...item,
            type: formatUserType(item.type),

            profile_image: item.profile_image
                ? `${BASE_URL}/profile/${item.profile_image}`
                : null,

            last_message: conv?.last_message || null,
            last_message_at: conv?.last_message_at || null,

            unread: conv ? (unreadMap.get(conv.conversation_id) || 0) : 0
        };

    });

    // 🔹 Sort latest message first
    list.sort((a, b) =>
        new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
    );

    return list;
}

/* ===============================
   GET MESSAGES
================================ */

export async function getMessagesService(sender, receiver_id, receiver_type) {

    const conversation = await getConversationByParticipants(
        sender.id,
        sender.type,
        receiver_id,
        receiver_type
    );

    if (!conversation) {
        return [];
    }

    await markMessagesAsRead(
        conversation.id,
        sender.id,
        sender.type
    );

    const messages = await getMessagesByConversation(conversation.id);

    return messages;
}