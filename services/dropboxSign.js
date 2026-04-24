import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as DropboxSign from "@dropbox/sign";
import dotenv from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import util from "util";
 
dotenv.config();
 
 
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
 
 
const API_KEY = "f1f9538930dfb8c1c50190ee66ae04dbb38dc55fc8354ac8f9f32a9e91599bb4";
 
const signatureRequestApi = new DropboxSign.SignatureRequestApi();
signatureRequestApi.username = API_KEY;
 
 
app.post("/send-agreement", async (req, res) => {
    try {
        const { email, name } = req.body;
 
        const filePath = path.join(__dirname, "agreement.pdf"); // absolute path
        if (!fs.existsSync(filePath)) {
            return res.status(400).json({ error: "agreement.pdf not found" });
        } else {
            console.log("File exists:", filePath);
        }
 
        console.log("📂 Using file path:", filePath);
        console.log("🔑 API Key prefix:", API_KEY.substring(0, 6) + "...");
 
 
        const result = await signatureRequestApi.signatureRequestSend({
            test_mode: true,
            title: "Agreement Document",
            subject: "Please sign this agreement",
            message: "Review and sign this agreement.",
            signers: [
                {
                    email_address: email,
                    name: name,
                },
            ],
            files: [fs.createReadStream(filePath)],
        });
 
        // Log the full response structure once for debugging
        console.log("📄  result.body:", result.body);
 
        // Extract the main signature request ID
const signatureRequestId = result.body.signatureRequest.signatureRequestId;
 
// Extract the first signer's signature_id
const signerSignatureId = result.body.signatureRequest.signatures?.[0]?.signature_id;
 
console.log("✅ Signature Request ID:", signatureRequestId);
console.log("✅ Signer Signature ID:", signerSignatureId);
 
// Return as JSON
return res.json({
    result: result.body.signatureRequest,
    signatureRequestId,
    signerSignatureId,
});
 
 
    } catch (err) {
        console.error("❌ Error sending agreement:", err);
        res.status(500).json(err.body || { error: err.message });
    }
});
 
app.post("/dropboxsign/webhook", (req, res) => {
    console.log("📩 Raw webhook payload:", req.body);
 
    // Dropbox Sign sends JSON string in req.body.signature_request
    let signatureRequest = {};
    try {
        if (req.body.signature_request) {
            signatureRequest = JSON.parse(req.body.signature_request);
        }
    } catch (err) {
        console.error("❌ Failed to parse signature_request:", err);
    }
 
    const signatureRequestId = signatureRequest.signature_request_id;
    const eventType = req.body.event?.event_type || "unknown";
 
    console.log("📝 Event type:", eventType);
    console.log("📝 Signature Request ID:", signatureRequestId);
 
    // Respond to Dropbox Sign to avoid retries
    res.status(200).send("OK");
});
 
 
 
app.get("/download/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
 
    // false = return the binary file
    const response = await signatureRequestApi.signatureRequestFiles(requestId, "pdf", false);
 
    // Some SDK versions wrap the buffer in { body }
    const fileBuffer = response.body || response;
 
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="signed_${requestId}.pdf"`);
    res.send(fileBuffer);
  } catch (err) {
    if (err.response?.data) {
      try {
        const apiError = JSON.parse(err.response.data.toString());
        return res.status(400).json(apiError);
      } catch {
        return res.status(400).send(err.response.data.toString());
      }
    }
    res.status(500).json({ error: err.message });
  }
});
 
 
 
 
app.listen(4000, () =>
    console.log("🚀 Server running on http://localhost:4000")
);