import express from "express";
import {
    getConversationList,
    getConversationMessages
} from "../controllers/chatController.js";

import {
    authenticateUser,
} from "../middleware/Auth.js";

const router = express.Router();

// Use proper middleware based on route structure
router.get("/chat-list", authenticateUser, getConversationList);
router.get("/messages/:conversation_id", authenticateUser, getConversationMessages);

export default router;