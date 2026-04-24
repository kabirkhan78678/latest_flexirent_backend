import dotenv from "dotenv";
import { getDataByLabel } from "../models/commonModels.js";
import { DB_TABLE, Message } from "../utils/Messages.js";
import { StatusCode } from "../utils/constant.js";
import { handleError } from "../utils/responseHandler.js";
import jwt from "jsonwebtoken";

dotenv.config();

const JWT_SECRET = process.env.AUTH_SECRETKEY;


const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const readNested = (obj, path) =>
  path.split(".").reduce((acc, key) => acc?.[key], obj);

const resolveTokenId = (decodedToken, candidatePaths) => {
  for (const path of candidatePaths) {
    const parsedId = parsePositiveInt(readNested(decodedToken, path));
    if (parsedId) return parsedId;
  }
  return null;
};

// export const authenticateUser = async (req, res, next) => {
//   try {
//     const authorizationHeader = req.headers["authorization"];
//     if (!authorizationHeader) {
//       req.user = { id: 0 };
//       return next();
//       // return handleError(res, StatusCode.status401, Message.NO_TOKEN_PROVIDED);
//     }
//     const tokenParts = authorizationHeader.split(" ");
//     if (tokenParts[0] !== "Bearer" || !tokenParts[1]) {
//       return handleError(
//         res,
//         StatusCode.status401,
//         Message.INVALID_OR_MISSING_TOKEN
//       );
//     }
//     const token = tokenParts[1];
//     let decodedToken;
//     try {
//       decodedToken = jwt.verify(token, JWT_SECRET);
//       console.log(decodedToken);
//     } catch (err) {
//       return handleError(res, StatusCode.status401, Message.INVALID_TOKEN);
//     }
//     const [user] = await getDataByLabel(
//       DB_TABLE.users,
//       "id",
//       decodedToken.data.id
//     );
//     if (!user) {
//       return handleError(res, StatusCode.status404, Message.USER_NOT_FOUND);
//     }
//     if (user.is_active == 0) {
//       return handleError(res, StatusCode.status401, Message.ACCOUNT_SUSPENDED);
//     }
//      if (user.is_blocked == 1) {
//       return handleError(res, StatusCode.status401, Message.ACCOUNT_SUSPENDED_By_Owner);
//     }
//     req.user = user;
//     next();
//   } catch (error) {
//     return handleError(
//       res,
//       StatusCode.status500,
//       Message.INTERNAL_SERVER_ERROR
//     );
//   }
// };


export const authenticateUser = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers["authorization"];

    // 🔹 No Authorization header → Guest user
    if (!authorizationHeader) {
      req.user = { id: 0 };
      return next();
    }

    const tokenParts = authorizationHeader.split(" ");

    // 🔹 Invalid format → Guest user
    if (tokenParts[0] !== "Bearer" || !tokenParts[1]) {
      req.user = { id: 0 };
      return next();
    }

    const token = tokenParts[1];

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // 🔹 Invalid token → Guest user
      req.user = { id: 0 };
      return next();
    }


    const userId = resolveTokenId(decodedToken, [
      "data.id",
      "id",
      "data.user_id",
      "user_id",
    ]);

    if (!userId) {
      req.user = { id: 0 };
      return next();
    }


    const [user] = await getDataByLabel(
      DB_TABLE.users,
      "id",
      userId
    );

    // 🔹 User not found → Guest user
    if (!user) {
      req.user = { id: 0 };
      return next();
    }

    // 🔹 Suspended or blocked → Guest user
    if (user.is_active == 0 || user.is_blocked == 1) {
      req.user = { id: 0 };
      return next();
    }

    // 🔹 Valid user
    req.user = user;
    return next();

  } catch (error) {
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const authenticateHost = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers["authorization"];
    if (!authorizationHeader) {
      return handleError(res, StatusCode.status401, Message.NO_TOKEN_PROVIDED);
    }
    const tokenParts = authorizationHeader.split(" ");
    if (tokenParts[0] !== "Bearer" || !tokenParts[1]) {
      return handleError(
        res,
        StatusCode.status401,
        Message.INVALID_OR_MISSING_TOKEN
      );
    }
    const token = tokenParts[1];
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET);
      console.log(decodedToken);
    } catch (err) {
      return handleError(res, StatusCode.status401, Message.INVALID_TOKEN);
    }


    const hostId = resolveTokenId(decodedToken, [
      "data.host_id",
      "host_id",
      "data.id",
      "id",
    ]);

    if (!hostId) {
      return handleError(res, StatusCode.status401, Message.INVALID_TOKEN);
    }


    const [user] = await getDataByLabel(
      DB_TABLE.host,
      "host_id",
      hostId
    );
    if (!user) {
      return handleError(res, StatusCode.status404, Message.USER_NOT_FOUND);
    }
    if (user.is_active == 0) {
      return handleError(res, StatusCode.status401, Message.ACCOUNT_SUSPENDED);
    }
    req.user = user;
    next();
  } catch (error) {
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const authenticateAdmin = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers["authorization"];
    if (!authorizationHeader) {
      return handleError(res, StatusCode.status401, Message.NO_TOKEN_PROVIDED);
    }
    const tokenParts = authorizationHeader.split(" ");
    if (tokenParts[0] !== "Bearer" || !tokenParts[1]) {
      return handleError(
        res,
        StatusCode.status401,
        Message.INVALID_OR_MISSING_TOKEN
      );
    }
    const token = tokenParts[1];
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, JWT_SECRET);
      console.log(decodedToken);
    } catch (err) {
      return handleError(res, StatusCode.status401, Message.INVALID_TOKEN);
    }


    const adminId = resolveTokenId(decodedToken, [
      "data.admin_id",
      "admin_id",
      "data.id",
      "id",
    ]);

    if (!adminId) {
      return handleError(res, StatusCode.status401, Message.INVALID_TOKEN);
    }


    const [user] = await getDataByLabel(
      DB_TABLE.admin,
      "admin_id",
      adminId
    );
    console.log(user);
    if (!user) {
      return handleError(res, StatusCode.status404, Message.USER_NOT_FOUND);
    }
    if (user.is_active == 0) {
      return handleError(res, StatusCode.status401, Message.ACCOUNT_SUSPENDED);
    }
    req.user = user;
    next();
  } catch (error) {
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

