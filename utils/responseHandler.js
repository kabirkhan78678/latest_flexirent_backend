import { StatusCode } from "./constant.js";

const sendResponse = (res, success, statusCode, message, data = null) => {
    return res.status(statusCode).json({
        success: success,
        status: statusCode,
        message: message,
        data: data || undefined,
    });
};

export const handleError = (res, statusCode, message) => {
    return sendResponse(res, false, statusCode, message);
};

export const handleSuccess = (res, statusCode, message="", ...data) => {
    return sendResponse(res, true, statusCode, message, data.length > 0 ? data[0] : null);
};

export const vallidationErrorHandle = (res, error) => {
    const errorMessage = error.errors[0].msg;
    return sendResponse(res, false, StatusCode.status400, errorMessage);
};