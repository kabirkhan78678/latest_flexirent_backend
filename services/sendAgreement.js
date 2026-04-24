import fs from "fs";
import path from "path";
import * as DropboxSign from "@dropbox/sign";

const signatureRequestApi = new DropboxSign.SignatureRequestApi();
signatureRequestApi.username = "6d8f5d564ffa5a73b2fcb3af616821ec22c124320ca448b2343e1812dede83f0";

export const sendAgreementService = async ({
    guestEmail,
    guestName,
    // hostEmail,
    // hostName,
    filePath
}) => {
    const result = await signatureRequestApi.signatureRequestSend({
        test_mode: true,
        title: "Booking Contract",
        subject: "Please sign your booking agreement",
        message: "Review and sign this booking contract.",
        // TWO SIGNERS HERE
        signers: [
            {
                email_address: guestEmail,
                name: guestName,
            },
            // {
            //     email_address: hostEmail,
            //     name: hostName,
            // }
        ],
        files: [fs.createReadStream(filePath)], // <-- uses dynamic PDF


        form_fields_per_document: [
            {
                // Guest Signature
                page: 1,
                type: "signature",
                x: 100,
                y: 600,
                width: 200,
                height: 40,
                signer: 0,    // First signer (guest)
                required: true
            },
            // {
            //   // Host Signature
            //   page: 1,
            //   type: "signature",
            //   x: 100,
            //   y: 500,
            //   width: 200,
            //   height: 40,
            //   signer: 1,    // Second signer (host)
            //   required: true
            // }
        ]

    });

    return {
        signatureRequestId: result.body.signatureRequest.signatureRequestId,
        signerSignatureId: result.body.signatureRequest.signatures?.[0]?.signature_id,
        raw: result.body.signatureRequest,
    };
};
