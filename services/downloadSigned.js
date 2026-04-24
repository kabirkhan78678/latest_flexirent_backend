import * as DropboxSign from "@dropbox/sign";

const signatureRequestApi = new DropboxSign.SignatureRequestApi();
signatureRequestApi.username = process.env.DROPBOX_API_KEY;

export const downloadSignedService = async (requestId) => {
  const response = await signatureRequestApi.signatureRequestFiles(
    requestId,
    "pdf",
    false
  );

  return response.body || response;
};
