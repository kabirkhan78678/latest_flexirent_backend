import jwt from "jsonwebtoken";
import { getDataByLabel } from "../models/commonModels.js";
import { DB_TABLE } from "../utils/Messages.js";

import {
    sendMessageService,
    getChatListByRole,
    getMessagesService
} from "../services/chatService.js";

import {
    getUserConversations,
    markMessagesAsRead,
    getUserHosts,
    findConversation,
    createConversation,
    getMessagesByConversation,
    getHostUsers,
    getAllHosts
} from "../models/chatModel.js";

const JWT_SECRET = process.env.AUTH_SECRETKEY;

/* ===============================
TYPE NORMALIZER
================================ */
function normalizeType(type) {
    const map = {
        "host-business": "hostBusiness",
        "user-business": "userBusiness",
        "sub-admin": "subadmin"
    };
    return map[type] || type;
}

/* ===============================
ONLINE USERS STORE
================================ */
const onlineUsers = new Map();

/* ===============================
SOCKET INIT
================================ */
export default function initSocket(io) {


    /* ===============================
       AUTH
    ================================ */
    io.use(async (socket, next) => {

        try {

            const token = socket.handshake.query.token;
            if (!token) return next(new Error("Token missing"));

            const decoded = jwt.verify(token, JWT_SECRET);

            let userId = null;
            let userType = null;

            if (decoded.data?.id) {

                const rows = await getDataByLabel(DB_TABLE.users, "id", decoded.data.id);
                const user = rows?.[0];

                if (!user) return next(new Error("User not found"));

                userId = user.id;
                userType = user.user_type === 2 ? "userBusiness" : "user";

            }

            else if (decoded.data?.host_id) {

                const rows = await getDataByLabel(DB_TABLE.host, "host_id", decoded.data.host_id);
                const host = rows?.[0];

                if (!host) return next(new Error("Host not found"));

                userId = host.host_id;
                userType = host.user_type === 2 ? "hostBusiness" : "host";

            }

            else if (decoded.data?.admin_id) {

                const rows = await getDataByLabel(DB_TABLE.admin, "admin_id", decoded.data.admin_id);
                const admin = rows?.[0];

                if (!admin) return next(new Error("Admin not found"));

                userId = admin.admin_id;
                userType = admin.user_type === 2 ? "subadmin" : "admin";
            }

            if (!userId || !userType) {
                return next(new Error("Invalid token payload"));
            }

            socket.user = {
                id: userId,
                type: normalizeType(userType)
            };

            next();

        } catch (err) {

            console.log("Socket Auth Error:", err.message);
            next(new Error("Unauthorized"));

        }

    });

    /* ===============================
       CONNECTION
    ================================ */
    io.on("connection", (socket) => {

        const userKey = `${socket.user.id}_${normalizeType(socket.user.type)}`;

        onlineUsers.set(userKey, {
            socketId: socket.id,
            activeConversation: null
        });

        console.log("🟢 Connected:", userKey);

        socket.emit("connected_user", socket.user);

        /* ===============================
           SEND MESSAGE
        ================================ */
        socket.on("send_message", async (data) => {

            try {

                const receiverType = normalizeType(data.receiver_type);

                const payload = await sendMessageService({
                    sender: socket.user,
                    receiver_id: data.receiver_id,
                    receiver_type: receiverType,
                    message: data.message
                });

                if (!payload) return;

                const receiverKey = `${data.receiver_id}_${receiverType}`;
                const receiverEntry = onlineUsers.get(receiverKey);

                /* ===============================
                   RECEIVER REALTIME MESSAGE
                ================================ */

                if (receiverEntry && receiverEntry.socketId) {

                    io.to(receiverEntry.socketId).emit("receive_message", payload);

                    const expectedActive =
                        `${socket.user.id}_${normalizeType(socket.user.type)}`;

                    if (receiverEntry.activeConversation === expectedActive) {

                        await markMessagesAsRead(
                            payload.conversation_id,
                            data.receiver_id,
                            receiverType
                        );

                        const receiverMessages = await getMessagesByConversation(payload.conversation_id);

                        io.to(receiverEntry.socketId).emit("chat_history", receiverMessages);

                    }
                }

                /* ===============================
                   SENDER EVENTS
                ================================ */

                socket.emit("message_sent", payload);

                // ✅ SENDER CHAT HISTORY UPDATE
                const senderMessages = await getMessagesByConversation(payload.conversation_id);
                socket.emit("chat_history", senderMessages);

                const senderList = await getChatListByRole(socket.user);
                socket.emit("chat_list", senderList);

                /* ===============================
                   RECEIVER CHAT LIST UPDATE
                ================================ */

                if (receiverEntry && receiverEntry.socketId) {

                    const receiverUser = {
                        id: data.receiver_id,
                        type: receiverType
                    };
console.log('receiverUser',receiverUser);

                    const receiverList = await getChatListByRole(receiverUser);
                    console.log('receiverList', receiverList);

                    io.to(receiverEntry.socketId).emit("chat_list", receiverList);

                }

            } catch (err) {

                socket.emit("error_message", { error: err.message });

            }

        });

        /* ===============================
           CHAT LIST
        ================================ */
        socket.on("get_chat_list", async () => {

            try {

                const list = await getChatListByRole(socket.user);
                socket.emit("chat_list", list);

            } catch (err) {

                socket.emit("error_message", { error: err.message });

            }

        });

        /* ===============================
           AVAILABLE USERS
        ================================ */
        socket.on("get_available_users", async () => {

            try {

                let list = [];
                const { id, type } = socket.user;
                const BASE_URL = process.env.BASE_URL;

                if (type === "user" || type === "userBusiness") {
                    list = await getUserHosts(id);
                }

                else if (type === "host" || type === "hostBusiness") {
                    list = await getHostUsers(id);
                }

                else if (type === "admin" || type === "subadmin") {
                    list = await getAllHosts();
                }

                const conversations = await getUserConversations(id, type);

                const existingUsers = conversations.map(
                    c => `${c.id}_${normalizeType(c.type)}`
                );

                list = list.filter(
                    user =>
                        !existingUsers.includes(
                            `${user.id}_${normalizeType(user.type)}`
                        )
                );

                list = list.map(user => ({
                    ...user,
                    profile_image: user.profile_image
                        ? `${BASE_URL}/profile/${user.profile_image}`
                        : null
                }));

                socket.emit("available_users", list);

            } catch (err) {

                socket.emit("error_message", { error: err.message });

            }

        });

        /* ===============================
           START CHAT
        ================================ */
        socket.on("start_chat", async ({ receiver_id, receiver_type }) => {

            try {

                const receiverType = normalizeType(receiver_type);

                let conversation = await findConversation(
                    socket.user.id,
                    socket.user.type,
                    receiver_id,
                    receiverType
                );

                if (!conversation) {

                    conversation = await createConversation(
                        socket.user.id,
                        socket.user.type,
                        receiver_id,
                        receiverType
                    );

                }

                const messages = await getMessagesByConversation(conversation.id);

                socket.emit("chat_history", messages);

                const meKey = `${socket.user.id}_${normalizeType(socket.user.type)}`;
                const meEntry = onlineUsers.get(meKey);

                if (meEntry) {
                    meEntry.activeConversation = `${receiver_id}_${receiverType}`;
                }

                const updatedList = await getChatListByRole(socket.user);
                socket.emit("chat_list", updatedList);

            } catch (err) {

                socket.emit("error_message", { error: err.message });

            }

        });

        /* ===============================
           GET MESSAGES
        ================================ */
        socket.on("get_messages", async ({ receiver_id, receiver_type }) => {

            try {
                const receiverType = normalizeType(receiver_type);

                const messages = await getMessagesService(
                    socket.user,
                    receiver_id,
                    receiverType
                );

                socket.emit("chat_history", messages || []);

                const meKey = `${socket.user.id}_${normalizeType(socket.user.type)}`;
                const meEntry = onlineUsers.get(meKey);

                if (meEntry) {
                    meEntry.activeConversation = `${receiver_id}_${receiverType}`;
                }

                const senderList = await getChatListByRole(socket.user);
                socket.emit("chat_list", senderList);

                const receiverKey = `${receiver_id}_${receiverType}`;
                const receiverEntry = onlineUsers.get(receiverKey);

                if (receiverEntry && receiverEntry.socketId) {

                    const receiverUser = {
                        id: receiver_id,
                        type: receiverType
                    };

                    const receiverList = await getChatListByRole(receiverUser);
                    io.to(receiverEntry.socketId).emit("chat_list", receiverList);

                }

            } catch (err) {

                socket.emit("error_message", { error: err.message });

            }

        });

        /* ===============================
           CLOSE CHAT
        ================================ */
        socket.on("close_chat", () => {

            const meKey = `${socket.user.id}_${normalizeType(socket.user.type)}`;
            const meEntry = onlineUsers.get(meKey);

            if (meEntry) {
                meEntry.activeConversation = null;
            }

        });

        /* ===============================
           DISCONNECT
        ================================ */
        socket.on("disconnect", () => {

            onlineUsers.delete(userKey);

            console.log("🔴 Disconnected:", userKey);

        });

    });

}
