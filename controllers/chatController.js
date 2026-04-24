import {
    getChatListByRole
} from "../services/chatService.js";

import {
    getUserConversations,
    getMessages
} from "../models/chatModel.js";

// 🎯 Role based chat list (booking based)
export const getConversationList = async (req, res) => {
    try {
        const list = await getChatListByRole(req.user);
        res.json({ success: true, data: list });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 🎯 Messages by conversation id
export const getConversationMessages = async (req, res) => {
    try {
        const { conversation_id } = req.params;
        const messages = await getMessages(conversation_id);
        res.json({ success: true, data: messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};