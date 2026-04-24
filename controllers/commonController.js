import path from "path";
import crypto from "crypto";
import { StatusCode } from "../utils/constant.js";
import { DB_TABLE, Message } from "../utils/Messages.js";
import { handleError, handleSuccess } from "../utils/responseHandler.js";
import {
  getDataByLabel,
  addDataIntoTable,
  updateDataByLabel,
  getAllDocumentName,
  getAllHouseRules,
  getBedsPropertyCount,
  getBHKPropertyCount,
  getAllDataFromTable,
  getAllDataFromTableInDesc,
  getGuestReviewModel,
} from "../models/commonModels.js";
import {
  __dirname,
  hashPassword,
  generateToken,
  comparePassword,
  sendVerificationEmail,
  randomStringAsBase64Url,
  generateHostToken,
  sendForgotPasswordEmailUser,
  sendSupportEmail,
} from "../utils/user_helper.js";
import { getAllAccoumodationCategory, getAllSafety, getAmenitits, getIdealFor } from "../models/hostModel.js";
import { getAllBlog } from "../models/adminModel.js";
import { subHostPermission } from "../utils/misc.util.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const isStripeKycCompleted = (account) => {
  if (!account) return false;

  const currentlyDue = account.requirements?.currently_due || [];
  const pastDue = account.requirements?.past_due || [];
  const pendingVerification = account.requirements?.pending_verification || [];

  return Boolean(
    account.details_submitted &&
    currentlyDue.length === 0 &&
    pastDue.length === 0 &&
    pendingVerification.length === 0
  );
};

const getLoginAccountType = (type, userType) => {
  if (type == 1) {
    if (userType == 1) return "user";
    if (userType == 2) return "user_business";
  }

  if (type == 2) {
    if (userType == 1) return "host";
    if (userType == 2) return "host_business";
    if (userType == 3) return "host";
  }

  return null;
};

export const userRegister = async (req, res) => {
  try {
    const { first_name, last_name, email, password, user_type, type } = req.body;

    if (type == 1) {
      const userData = await getDataByLabel(DB_TABLE.users, "email", email);
      if (userData?.length != 0) {
        return handleError(
          res,
          StatusCode.status400,
          Message.allreadyHaveAccount
        );
      }
      const hash = await hashPassword(password);
      const act_token = crypto.randomBytes(16).toString("hex");
      const data = {
        first_name,
        last_name,
        email: email?.toLowerCase(),
        password: hash,
        act_token,
        user_type
      };
      const add_user = await addDataIntoTable(DB_TABLE.users, data);
      if (add_user?.affectedRows > 0) {
        await sendVerificationEmail(act_token, email, res, type);
      } else {
        return handleError(
          res,
          StatusCode.status400,
          Message.failedToUsersCreate
        );
      }
    } else if (type == 2) {
      const userData = await getDataByLabel(DB_TABLE.host, "email", email);
      if (userData?.length != 0) {
        return handleError(
          res,
          StatusCode.status400,
          Message.allreadyHaveAccount
        );
      }
      const hash = await hashPassword(password);
      const act_token = crypto.randomBytes(16).toString("hex");
      const data = {
        first_name,
        last_name,
        email: email?.toLowerCase(),
        password: hash,
        act_token,
        user_type
      };
      const add_user = await addDataIntoTable(DB_TABLE.host, data);
      if (add_user?.affectedRows > 0) {
        await sendVerificationEmail(act_token, email, res, type);
      } else {
        return handleError(
          res,
          StatusCode.status400,
          Message.failedToUsersCreate
        );
      }
    } else {
      return handleError(
        res,
        StatusCode.status400,
        Message.sendCorrectUserType
      );
    }
  } catch (error) {
    console.log("Error:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const Login = async (req, res) => {
  try {
    const { email, password, type, user_type } = req.body;
    let userData;
    if (type == 1) {
      userData = await getDataByLabel(DB_TABLE.users, "email", email);
    } else if (type == 2) {
      userData = await getDataByLabel(DB_TABLE.host, "email", email);
    }

    if (userData?.length == 0) {
      return handleError(res, StatusCode.status400, Message.accountNotFound);
    }

    if (userData[0]?.user_type != user_type && type == 1) {
      {
        return handleError(res, StatusCode.status400, user_type == 1 ? Message.youAreNotaGuest : Message.youAreNotaGuestBusiness);
      }
    }

    const mapUserType = (t) => {
      if (t == 1 || t == 3) return "host";
      if (t == 2) return "business";
      return null;
    };

    if (
      type == 2 &&
      mapUserType(userData[0]?.user_type) !== mapUserType(user_type)
    ) {
      return handleError(
        res,
        StatusCode.status400,
        user_type == 1
          ? Message.youAreNotaHost
          : Message.youAreNotaHostBusiness
      );
    }



    if (userData[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userData[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }
    if (userData[0]?.is_blocked == 1) {
      return handleError(res, StatusCode.status401, Message.ACCOUNT_SUSPENDED_By_Owner);
    }
    const password_check = await comparePassword(
      password,
      userData[0]?.password
    );
    if (!password_check) {
      return handleError(res, StatusCode.status400, Message.invalidPassword);
    }
    let jwt_token;
    let data = {};

    if (type == 1) {
      jwt_token = generateToken(userData[0]);
      data.jwt_token = jwt_token;
      data.user_type = userData[0].user_type;
      data.account_type = getLoginAccountType(type, userData[0].user_type);
    } else if (type == 2) {
      const hasStripeAccount = Boolean(userData[0]?.stripe_account_id);
      let kycCompleted = false;

      if (hasStripeAccount) {
        try {
          const stripeAccount = await stripe.accounts.retrieve(
            userData[0].stripe_account_id
          );
          kycCompleted = isStripeKycCompleted(stripeAccount);
        } catch (stripeError) {
          console.error("❌ host login stripe status error:", stripeError);
        }
      }

      jwt_token = generateHostToken(userData[0]);
      data.jwt_token = jwt_token;
      data.user_type = userData[0].user_type;
      data.account_type = getLoginAccountType(type, userData[0].user_type);
      data.has_stripe_account = hasStripeAccount;
      data.kyc_completed = kycCompleted;
    }

    if (userData[0].user_type == 3) {
      let permissions = await getDataByLabel(DB_TABLE.hostPermission, "host_id", userData[0].host_id);

      const ruleTypes = subHostPermission;

      // Map permissions with titles
      if (permissions.length > 0) {
        permissions = permissions.map((perm) => {
          const rule = ruleTypes.find(r => r.type === perm.type);
          return {
            ...perm,
            title: rule ? rule.title : null   // add title if found
          };
        });
      }

      data.permission = permissions;
    }


    return handleSuccess(
      res,
      StatusCode.status200,
      Message.loginSuccess,
      data
    );
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email, type } = req.body;

    if (type == 1) {
      const userData = await getDataByLabel(DB_TABLE.users, "email", email);
      if (userData?.length == 0) {
        return handleError(res, StatusCode.status400, Message.USER_NOT_FOUND);
      }
      if (userData[0]?.is_verify == 0) {
        return handleError(
          res,
          StatusCode.status400,
          Message.userEmailNotVerified
        );
      }
      if (userData[0]?.is_active == 0) {
        return handleError(res, StatusCode.status400, Message.userBlocked);
      }
      const act_token = randomStringAsBase64Url(20);
      const data = {
        act_token,
      };
      const update_data = await updateDataByLabel(
        DB_TABLE.users,
        data,
        "id",
        userData[0]?.id
      );
      if (update_data?.affectedRows > 0) {

        await sendForgotPasswordEmailUser(act_token, email, res, 1);
      } else {
        return handleError(res, StatusCode.status400, Message.userBlocked);
      }
    } else {
      const userData = await getDataByLabel(DB_TABLE.host, "email", email);
      if (userData?.length == 0) {
        return handleError(res, StatusCode.status400, Message.USER_NOT_FOUND);
      }
      if (userData[0]?.is_verify == 0) {
        return handleError(
          res,
          StatusCode.status400,
          Message.userEmailNotVerified
        );
      }
      if (userData[0]?.is_active == 0) {
        return handleError(res, StatusCode.status400, Message.userBlocked);
      }
      const act_token = randomStringAsBase64Url(20);
      const data = {
        act_token,
      };
      const update_data = await updateDataByLabel(
        DB_TABLE.host,
        data,
        "host_id",
        userData[0]?.host_id
      );
      if (update_data?.affectedRows > 0) {

        await sendForgotPasswordEmailUser(act_token, email, res, 2);
      } else {
        return handleError(res, StatusCode.status400, Message.userBlocked);
      }
    }
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};


export const getAllAmenties = async (req, res) => {
  try {

    const category = await getAmenitits();
    if (!category?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, category);
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      category
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getAllSafetyAmenties = async (req, res) => {
  try {

    const category = await getAllSafety();
    if (!category?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, category);
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      category
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};
export const getAllIdealFor = async (req, res) => {
  try {


    const category = await getIdealFor();
    if (!category?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, category);
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      category
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getAllCategory = async (req, res) => {
  try {


    const category = await getAllAccoumodationCategory();
    if (!category?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, category);
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      category
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getDocumentName = async (req, res) => {
  try {
    const name = await getAllDocumentName();
    if (!name?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, name);
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      name
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getHouseRules = async (req, res) => {
  try {
    const name = await getAllHouseRules();
    if (!name?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, name);
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      name
    );


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getBedsBathPropertyCount = async (req, res) => {
  try {

    const beds = await getBedsPropertyCount();

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      beds[0]
    );
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
}

export const getBhkPropertyCount = async (req, res) => {
  try {

    const beds = await getBHKPropertyCount();

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      beds[0]
    );
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
}

export const getPolicyManagement = async (req, res) => {
  try {
    const content_type = req.params.content_type;
    const content = await getDataByLabel(DB_TABLE.content, "content_type", content_type);

    if (!content?.length) {
      return handleError(
        res,
        StatusCode.status404,
        Message.dataNotFound
      );
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      content[0].content
    );

  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
}


export const contactUs = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const data = {
      name,
      email,
      message,
    };
    const add_user = await addDataIntoTable(DB_TABLE.contact_us, data);
    if (add_user?.affectedRows > 0) {
      const support = await getDataByLabel(DB_TABLE.supportAddress, "support_address_id ", 1);
      await sendSupportEmail(data, support[0].email, res);
    } else {
      return handleError(
        res,
        StatusCode.status400,
        Message.failedToContactUs
      );
    }
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getallBlog = async (req, res) => {
  try {
    const blog = await getAllBlog();


    if (blog.length > 0) {
      await Promise.all(blog.map(async (item) => {
        let image = await getDataByLabel(DB_TABLE.blogImage, "blog_id", item.blog_id);

        if (image.length > 0) {
          image.map((img) => {
            img.image = `${process.env.BASE_URL}profile/${img.image}`;
          })
        }
        item.blogImage = image;
      }))
    }


    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, blog);
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getBlogById = async (req, res) => {
  try {
    const blog_id = req.params.blog_id;
    const blog = await getDataByLabel(DB_TABLE.blog, "blog_id", blog_id);

    if (!blog?.length) {
      return handleError(
        res,
        StatusCode.status404,
        Message.dataNotFound
      );
    }

    if (blog.length > 0) {
      let image = await getDataByLabel(DB_TABLE.blogImage, "blog_id", blog_id);

      if (image.length > 0) {
        image.map((img) => {
          img.image = `${process.env.BASE_URL}profile/${img.image}`;
        })
      }
      blog[0].blogImage = image;
    }
    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, blog[0]);
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getSupportDetails = async (req, res) => {
  try {
    const support = await getDataByLabel(DB_TABLE.supportAddress, "support_address_id ", 1);
    if (!support?.length) {
      return handleError(
        res,
        StatusCode.status404,
        Message.dataNotFound
      );
    }
    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, support[0]);
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getBusinessRuleTypes = async (req, res) => {
  try {
    const ruleTypes = subHostPermission;

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      ruleTypes
    );
  } catch (error) {
    console.error('Error in getBusinessRuleTypes:', error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getSubAdminRuleTypes = async (req, res) => {
  try {
    const ruleTypes = await getAllDataFromTable(DB_TABLE.sub_admin_perimission);

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      ruleTypes
    );
  } catch (error) {
    console.error('Error in getSubAdminRuleTypes:', error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};



export const getGovernmentIdTypes = async (req, res) => {
  try {
    const idTypes = await getDataByLabel(DB_TABLE.document_name, "type", 1);

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      idTypes
    );
  } catch (error) {
    console.error("Error in getGovernmentIdTypes:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getProofOfAddressTypes = async (req, res) => {
  try {
    const addressTypes = await getDataByLabel(DB_TABLE.document_name, "type", 2);

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      addressTypes
    );
  } catch (error) {
    console.error("Error in getProofOfAddressTypes:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getBusinessRegistrationTypes = async (req, res) => {
  try {
    const businessTypes = await getDataByLabel(DB_TABLE.document_name, "type", 3);

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      businessTypes
    );
  } catch (error) {
    console.error("Error in getBusinessRegistrationTypes:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getAllGuestReviews = async (req, res) => {
  try {
    const reviews = await getGuestReviewModel();

    reviews.map((item) => {
      item.profile_image = item?.profile_image
        ? `${process.env.BASE_URL}profile/${item.profile_image}`
        : "";
      item.full_name = `${item.first_name} ${item.last_name ? item.last_name : null}`
    });

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      reviews
    );
  } catch (error) {
    console.error("Error in getAllGuestReviews:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};
