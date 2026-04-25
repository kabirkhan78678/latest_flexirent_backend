
import { NotificationTypes, StatusCode } from "../utils/constant.js";
import { DB_TABLE, Message } from "../utils/Messages.js";
import { handleError, handleSuccess } from "../utils/responseHandler.js";
import crypto from "crypto";
import {
  addDataIntoTable,
  deleteDataByLable,
  getAllDataFromTable,
  getAllDataFromTableInDesc,
  getContactus,
  getDataByLabel,
  getPlatformFeeModel,
  updateDataByLabel,
  updatePlatformFeeModel,
  hardDeleteNotificationsByReceiver,
} from "../models/commonModels.js";
import { deleteProfileImage } from "../middleware/deleteImage.js";
import {
  __dirname,
  generateToken,
  comparePassword,
  generateAdminToken,
  sendForgotPasswordEmailAdmin,
  randomStringAsBase64Url,
  hashPassword,
  sendSubadminCredentialsEmail,
  generateStrongPassword,
  sendUserCredentialEmail,
  sendHostCredentialEmail,
  sendUserBusinessCredentialEmail,
  sendContactUsSupportEmail,
} from "../utils/user_helper.js";
import { getProperty, getApprovedPropertyOptionsForReview, getDataByLabel2, getPropertyListing, getPropertyListingByHostTypes, getAllSubAdminCount, getAllListingRequestCount, getAllDashboardCount, getRecentBooking, getAllUsers, getUserAllBooking, getAllHosts, getAllHostProperty, getAllHostPropertyListing, getAllUsersBusiness, getAllBusinessUsers, getAllBlog, getPropertyBookedCount, getAllReviewsForAdmin, getAllSubUserBookings, getReviewSubmittedCount, getAllHostBookings, getAllUserBookings, getGuestDocument, getGuestBusinessDocument, getHostDocument, getHostBusinessDocument, getDocumentDashboardCount, getUserSupportQuery, getHostSupportQuery, getsingleSupportQuery, getPropertyBookingsCount, getGuestDocumentById, getHostDocumentByIdModel, updateKycDocumentStatus, getAllHostBusiness, getPendingBookings, getApprovedBookings, getRejectedBookings, getBookingById, checkCommissionExists, getServiceFeeModel, getAllServiceFeeModel, getAllSubscriptionPlans, getSubscriptionByIdModel, getSubscriptionByPlanKeyAnyModel, getSubscriptionByPlanKeyModel, getBookingOverviewByIdModel, getBookingOverviewCounts, getBookingOverviewList, getSeoSettings, upsertSeoSettings, getManagePayoutListModel, getPayoutDashboardModel, getPropertyCommissionReportModel, getAllPropertyCommissionReportModel, fetchallInquiriesModel, getAllOfferListModel, fetchSeoMasterByPageSlug, getAllRatingsForAdmin, getAdminNotifications, createCancellationPolicyModel, getCancellationPoliciesModel, getCancellationPolicyByIdModel, updateCancellationPolicyModel, deleteCancellationPolicyModel } from "../models/adminModel.js";
import path from "path";
import { getAllPropertySafety, getHouseRulesByIds, getPropertyAmenitits, getPropertyIdealFor } from "../models/hostModel.js";
import { title } from "process";

import {
  fetchAllReportsModel,
  getActiveOfferByPropertyId,
  getReportByIdModel,
  getReportDashboardCountModel,
} from "../models/usersModel.js";
import { PayoutProcessingError, processDuePayouts, releasePayoutForPayment } from "../services/payoutService.js";
import { pushAndStoreNotification } from "../utils/notification.js";
import Stripe from "stripe";

const BASE_URL = process.env.BASE_URL;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let userData = await getDataByLabel(DB_TABLE.admin, "email", email);


    if (userData?.length == 0) {
      return handleError(res, StatusCode.status400, Message.accountNotFound);
    }


    const password_check = await comparePassword(
      password,
      userData[0]?.password
    );
    if (!password_check) {
      return handleError(res, StatusCode.status400, Message.invalidPassword);
    }
    const jwt_token = generateAdminToken(userData[0]);

    if (userData[0].user_type == 2) {
      let permission = await getDataByLabel(DB_TABLE.permission, "admin_id", userData[0].admin_id);

      let sub_admin_permission_label = await getAllDataFromTable(DB_TABLE.sub_admin_perimission);
      const updatedPermissions = [{ permission_id: 1, title: 'Dashboard' }, ...sub_admin_permission_label];
      const permissionWithLabels = permission.map(perm => {
        const labelObj = updatedPermissions.find(label => label.permission_id == perm.type);
        return {
          ...perm,
          title: labelObj.title, // add title if matched, else null
        };
      });

      userData[0].permission = permissionWithLabels;
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.loginSuccess,
      {
        jwt_token,
        user_type: userData[0].user_type,
        permission: userData[0].permission || [],
      }
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

export const fetchProfile = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    const finalData = userDetails?.map((item, i) => {
      return {
        ...item,
        profile_image: item?.profile_image
          ? `${process.env.BASE_URL}profile/${item?.profile_image}`
          : "",
      };
    });

    if (userDetails.user_type == 2) {
      userDetails[0].permission = await getDataByLabel(DB_TABLE.permission, "admin_id", admin_id);
      userDetails[0].permission_label = "1 = all 2 = Dashboard 3 = User Management 4 = Host Management 5 = Property Management 6 = Booking Overview 7 = Blog Management 8 = Reviews 9 = Support Tickets 10 = Booking Calender 11 = Chat Management"
    }


    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      finalData[0]
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

export const getAllProperty = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



    const property = await getProperty();



    if (!property?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, property);
    }

    await Promise.all(
      property.map(async (item) => {
        let image = await getDataByLabel(
          DB_TABLE.propertyImage,
          "property_id",
          item.property_id
        );

        let finalData = image?.map((item, i) => {
          return {
            ...item,
            image: item?.image
              ? `${process.env.BASE_URL}profile/${item?.image}`
              : "",
          };
        });
        item.propertyImage = finalData;
        item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        let amenities = item.amenities ? item.amenities.split(',') : [];
        let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
        let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];
        let house_rules = item.house_rules ? item.house_rules.split(',') : [];

        let [total_bookings] = await getPropertyBookingsCount(item.property_id);
        item.property_booked_count = total_bookings?.total_booking || 0;
        delete item.total_bookings;
        delete item.bookings;

        if (Array.isArray(amenities) && amenities.length > 0) {
          item.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (Array.isArray(safety_amenities) && safety_amenities.length > 0) {
          item.safety_amenities_label = await getAllPropertySafety(safety_amenities);
        }

        if (Array.isArray(ideal_for) && ideal_for.length > 0) {
          item.ideal_for_label = await getPropertyIdealFor(ideal_for);
        }
        if (Array.isArray(house_rules) && house_rules.length > 0) {
          item.house_rules_label = await getHouseRulesByIds(house_rules);
        }
      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      property
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

export const updatePropertyStatus = async (req, res) => {
  try {
    const { property_id, status } = req.body;
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const propertyDetails = await getDataByLabel2(DB_TABLE.property, "property_id", property_id, "list_status", 1)

    if (!propertyDetails?.length)
      return handleError(res, StatusCode.status400, Message.msgPropertyNotFound);

    const data = { status, approved_at: status == 1 ? new Date() : null, rejected_at: status == 2 ? new Date() : null, }
    const udpateProperty = await updateDataByLabel(DB_TABLE.property, data, "property_id", property_id);

    if (udpateProperty?.affectedRows) {

      await pushAndStoreNotification({
        sender_id: admin_id,
        sender_type: "admin",
        receiver_id: propertyDetails[0].host_id,
        receiver_type: "host",
        title: status == 1 ? "Property Approved" : "Property Rejected",
        message: `Your property "${propertyDetails[0].property_title}" has been ${status == 1 ? "approved" : "rejected"}`,
        reference_id: property_id,
        reference_type: "property",
        notification_type: status == 1 ? NotificationTypes.PROPERTY_APPROVED : NotificationTypes.PROPERTY_REJECTED,
        // fcm_token: hostDetails?.fcm_token
        fcm_token: 'Testing_host_fcm_token'
      });

      return handleSuccess(res, StatusCode.status200, status == 1 ? Message.msgPropertyApprovedSuccess : Message.msgPropertyRejectSuccess,);
    } else {
      return handleError(res, StatusCode.status400, Message.msgStatusNotUpdated);
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

// Utility function to format user documents
async function formatDocuments(docs) {
  const idTypes = await getDataByLabel(DB_TABLE.document_name, "type", 1);

  const addressTypes = await getDataByLabel(DB_TABLE.document_name, "type", 2);

  const businessTypes = await getDataByLabel(DB_TABLE.document_name, "type", 3);

  // Group by user_id
  const grouped = {};
  docs.forEach(item => {
    if (!grouped[item.id]) {
      grouped[item.id] = {
        user_type: item.user_type,
        id: item.id,
        first_name: item.first_name,
        last_name: item.last_name,
        email: item.email,
        phone: item.phone,
        profile_image: item.profile_image,
        status: item.status,
        rejected_reason: item.rejected_reason,
        created_at: item.created_at,
        updated_at: item.updated_at,
        status_label: item.status_label,
      };
    }

    // Match document type and assign to user
    if (idTypes.some(type => type.title === item.title)) {
      grouped[item.id].gov_doc_title = item.title;
      grouped[item.id].gov_file = item.file;
    } else if (addressTypes.some(type => type.title === item.title)) {
      grouped[item.id].address_proof_title = item.title;
      grouped[item.id].address_proof = item.file;
    } else if (businessTypes.some(type => type.title === item.title)) {
      grouped[item.id].business_reg_title = item.title;
      grouped[item.id].business_reg = item.file;
    } else if (item.title === "Driving Licence") {
      grouped[item.id].driving_licence_title = item.title;
      grouped[item.id].driving_license = item.file;
    }
  });

  return Object.values(grouped).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}


export const getAllDocuments = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



    const getDocumentCount = await getDocumentDashboardCount()
    const guestDoc = await getGuestDocument();
    const guestBusinessDoc = await getGuestBusinessDocument();
    const hostDoc = await getHostDocument();
    const hostBusinessDoc = await getHostBusinessDocument();

    console.log({ guestDoc, guestBusinessDoc, hostDoc, hostBusinessDoc })

    const data = getDocumentCount[0];

    if (guestDoc.length > 0) {
      guestDoc?.map((i) => {
        i.file = i?.file
          ? `${process.env.BASE_URL}profile/${i?.file}`
          : null;
        return;
      });
    }

    if (guestBusinessDoc.length > 0) {
      guestBusinessDoc?.map((i) => {
        i.file = i?.file
          ? `${process.env.BASE_URL}profile/${i?.file}`
          : null;
        return;
      });
    }

    if (hostDoc.length > 0) {
      hostDoc?.map((i) => {
        i.file = i?.file
          ? `${process.env.BASE_URL}profile/${i?.file}`
          : null;
        return;
      });
    }
    if (hostBusinessDoc.length > 0) {
      hostBusinessDoc?.map((i) => {
        i.file = i?.file
          ? `${process.env.BASE_URL}profile/${i?.file}`
          : null;
        return;
      });
    }

    data.guestDoc = await formatDocuments(guestDoc);
    data.guestBusinessDoc = await formatDocuments(guestBusinessDoc);
    data.hostDoc = await formatDocuments(hostDoc);
    data.hostBusinessDoc = await formatDocuments(hostBusinessDoc);

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, data);


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getDocumentById = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);
    const { id, user_type } = req.query;

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    let Doc = [];
    if (user_type == 1) {
      Doc = await getGuestDocumentById(id, user_type);
    } else if (user_type == 2) {
      Doc = await getHostDocumentByIdModel(id, user_type);
    }

    if (!Doc?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    if (Doc.length > 0) {
      Doc?.map((i) => {
        i.file = i?.file
          ? `${process.env.BASE_URL}profile/${i?.file}`
          : null;
        return;
      });
    }

    const document = await formatDocuments(Doc);

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, document[0]);


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const updateDocumentStatus = async (req, res) => {
  try {
    const { id, user_type, status, rejected_reason } = req.body;
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const doc = await getDataByLabel2(DB_TABLE.document, "id", id, "user_type", user_type)

    if (!doc?.length)
      return handleError(res, StatusCode.status400, Message.msgPropertyNotFound);


    const udpateProperty = await updateKycDocumentStatus(status, id, user_type, rejected_reason);

    if (udpateProperty?.affectedRows) {
      return handleSuccess(
        res,
        StatusCode.status200,
        status == 1 ? Message.msgDocumentApprovedSuccess : Message.msgDocumentRejectSuccess,
      );
    } else {
      return handleError(res, StatusCode.status400, Message.msgStatusNotUpdated);
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


export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const userData = await getDataByLabel(DB_TABLE.admin, "email", email);

    if (userData?.length == 0) {
      return handleError(res, StatusCode.status400, Message.USER_NOT_FOUND);
    }

    const act_token = randomStringAsBase64Url(20);
    const data = {
      act_token,
    };
    const update_data = await updateDataByLabel(
      DB_TABLE.admin,
      data,
      "admin_id",
      userData[0]?.admin_id
    );
    if (update_data?.affectedRows > 0) {

      await sendForgotPasswordEmailAdmin(act_token, email, res, 1);
    } else {
      return handleError(res, StatusCode.status400, Message.userBlocked);
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


export const forgotResetPassword = async (req, res) => {
  try {
    const act_token = req?.params?.act_token || "";

    if (!act_token) {
      return handleError(res, StatusCode.status400, Message.INVALID_URL);
    }

    const userDetails = await getDataByLabel(DB_TABLE.admin, "act_token", act_token);

    if (!userDetails || userDetails.length === 0) {
      return res.sendFile(path.join(__dirname, "../view/forgotPasswordError.html"));
    }


    return res.render(
      path.join(__dirname, "../view/forgetPasswordAdmin.ejs"),
      {
        msg: "",
        act_token,
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


export const resetPassword = async (req, res) => {
  try {
    const { password, confirm_password, act_token } = req.body;
    if (!password || !confirm_password || !act_token) {
      return res.sendFile(path.join(__dirname, "../view/forgotPasswordError.html"));
    }


    const [userDetails] = await getDataByLabel(DB_TABLE.admin, "act_token", act_token);
    console.log(userDetails)
    if (!userDetails) {
      return res.sendFile(path.join(__dirname, "../view/forgotPasswordError.html"));
    }

    const hash = await hashPassword(password);
    const data = { password: hash, act_token: null };
    const result = await updateDataByLabel(
      DB_TABLE.admin,
      data,
      "admin_id",
      userDetails.admin_id
    );
    if (result?.affectedRows) {
      return res.sendFile(path.join(__dirname, "../view/password-reset-success.html"));
    } else {
      return res.sendFile(path.join(__dirname, "../view/forgotPasswordError.html"));
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

export const updateProfile = async (req, res) => {
  try {
    const {
      full_name
    } = req.body;
    const file = req.file;
    const admin_id = req.user?.admin_id;
    let data = {
      full_name
    };
    console.log({ file });
    if (file) {
      data.profile_image = file?.filename;
    }
    const result = await updateDataByLabel(DB_TABLE.admin, data, "admin_id", admin_id);
    if (result?.affectedRows) {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.profileUpdatedSuccessfully
      );
    } else {
      return handleError(
        res,
        StatusCode.status400,
        Message.profileUpdateFailed
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

export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);
    if (!userDetails?.length) {
      return handleError(res, StatusCode.status400, Message.USER_NOT_FOUND);
    }
    const isMatch = await comparePassword(
      current_password,
      userDetails[0]?.password
    );
    if (!isMatch) {
      return handleError(
        res,
        StatusCode.status400,
        Message.currentPasswordIncorrect
      );
    }
    const hash = await hashPassword(new_password);
    const data = { password: hash };
    const result = await updateDataByLabel(
      DB_TABLE.admin,
      data,
      "admin_id",
      userDetails[0].admin_id
    );
    if (result?.affectedRows) {
      return handleSuccess(res, StatusCode.status200, Message.passwordChanged);
    } else {
      return handleError(res, StatusCode.status400, Message.passwordNotChanged);
    }
  } catch (error) {
    console.error("Error in changePassword:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};



export const addSubAdmin = async (req, res) => {
  try {
    let { permission, full_name, email, mobile } = req.body;
    email = email?.trim()?.toLowerCase();
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    const password = generateStrongPassword();

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const check = await getDataByLabel(DB_TABLE.admin, "email", email);

    if (check.length <= 0) {
      const hash = await hashPassword(password);

      const act_token = crypto.randomBytes(16).toString("hex");

      const data = {
        full_name,
        email, password: hash,
        mobile,
        user_type: 2,
        act_token
      }
      const add = await addDataIntoTable(DB_TABLE.admin, data);

      if (add?.affectedRows > 0) {

        if (permission.length > 0) {
          // Add 1 as default to the permission array
          const updatedPermissions = permission.includes(1) ? permission : [1, ...permission];

          let result = await Promise.all(
            updatedPermissions.map(async (item) => {
              const data = {
                admin_id: add.insertId,
                type: item,
                is_add: 1,
                is_view: 1,
                is_edit: 1,
                is_delete: 1
              };

              let addPermission = await addDataIntoTable(DB_TABLE.permission, data);
              return addPermission;
            })
          );
        }


        // return handleSuccess(res, StatusCode.status200, Message.msgSubAdminAdded);
        await sendSubadminCredentialsEmail(act_token, email, password, res);
      } else {
        return handleError(res, StatusCode.status400, Message.msgSubAdminAdded);
      }
    } else {
      return handleError(res, StatusCode.status404, Message.emailAlreadyExist);
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

export const getSubAdmin = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const check = await getDataByLabel(DB_TABLE.admin, "user_type", 2);

    if (check.length > 0) {
      const data = await Promise.all(check.map(async (item) => {
        let permission = await getDataByLabel(DB_TABLE.permission, "admin_id", item.admin_id);
        let sub_admin_permission_label = await getAllDataFromTable(DB_TABLE.sub_admin_perimission);
        const updatedPermissions = [{ permission_id: 1, title: 'Dashboard' }, ...sub_admin_permission_label];
        const permissionWithLabels = permission.map(perm => {
          const labelObj = sub_admin_permission_label.find(label => label.permission_id == perm.type);
          return {
            ...perm,
            title: labelObj?.title, // add title if matched, else null
          };
        });
        item.permission = permissionWithLabels.filter(p => p.type != 1);
        item.profile_image = item?.profile_image
          ? `${process.env.BASE_URL}profile/${item?.profile_image}`
          : "";
        return item;
      }));

      const updatedData = check.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, updatedData);
    } else {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, check);
    }


  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
}

export const updateSubAdmin = async (req, res) => {
  try {
    let { permission, full_name, mobile, sub_admin_id } = req.body;
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const check = await getDataByLabel(DB_TABLE.admin, "admin_id", sub_admin_id);

    if (check.length <= 0) {
      return handleError(res, StatusCode.status404, Message.subAdminNotFound);
    }

    const deleteLastPermission = await deleteDataByLable(DB_TABLE.permission, "admin_id", sub_admin_id);

    const data = {
      full_name,
      mobile,
    }
    const update = await updateDataByLabel(DB_TABLE.admin, data, "admin_id", sub_admin_id);

    if (update?.affectedRows > 0) {
      if (permission.length > 0) {
        // Ensure type '1' is always included
        const updatedPermissions = permission.includes(1) ? permission : [1, ...permission];

        let result = await Promise.all(
          updatedPermissions.map(async (item) => {
            const data = {
              admin_id: sub_admin_id,
              type: item,
              is_add: 1,
              is_view: 1,
              is_edit: 1,
              is_delete: 1
            };

            return await addDataIntoTable(DB_TABLE.permission, data);
          })
        );
      }


      return handleSuccess(res, StatusCode.status200, Message.msgSubAdminUpdated);
    } else {
      return handleError(res, StatusCode.status400, Message.msgSubAdminNotAdded);
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

export const getAllPropertyListing = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);
    const { user_type } = req.query;

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    let property = [];
    if (user_type) {
      const parsedUserType = Number(user_type);
      if (![1, 2, 3].includes(parsedUserType)) {
        return handleError(res, StatusCode.status400, Message.sendCorrectUserType);
      }

      const userTypes = parsedUserType === 1 || parsedUserType === 2
        ? [parsedUserType, 3]
        : [parsedUserType];

      property = await getPropertyListingByHostTypes(userTypes);
    } else {
      property = await getPropertyListing();
    }



    if (!property?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, property);
    }

    await Promise.all(
      property.map(async (item) => {
        // item.propertyImage = await getDataByLabel(
        //   DB_TABLE.propertyImage,
        //   "property_id",
        //   item.property_id
        // );
        let image = await getDataByLabel(
          DB_TABLE.propertyImage,
          "property_id",
          item.property_id
        );

        let finalData = image?.map((item, i) => {
          return {
            ...item,
            image: item?.image
              ? `${process.env.BASE_URL}profile/${item?.image}`
              : "",
          };
        });
        item.propertyImage = finalData;
        item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        let amenities = item.amenities ? item.amenities.split(',') : [];
        let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
        let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];
        let house_rules = item.house_rules ? item.house_rules.split(',') : [];

        console.log(amenities, safety_amenities, ideal_for);

        if (Array.isArray(amenities) && amenities.length > 0) {
          item.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (Array.isArray(safety_amenities) && safety_amenities.length > 0) {
          item.safety_amenities_label = await getAllPropertySafety(safety_amenities);
        }

        if (Array.isArray(ideal_for) && ideal_for.length > 0) {
          item.ideal_for_label = await getPropertyIdealFor(ideal_for);
        }
        if (Array.isArray(house_rules) && house_rules.length > 0) {
          item.house_rules_label = await getHouseRulesByIds(house_rules);
        }
      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      property
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


export const updateListingProperty = async (req, res) => {
  try {
    const {
      property_id, owner_type, category_id, property_title, property_description,
      bedrooms, bathrooms, beds, square_foot, amenities,
      safety_amenities, ideal_for, check_in, check_out,
      house_rules, monthly_rent, security_deposit, available_from, min_stay_duration, max_person, cleaning_fee_type,
      cleaning_fee, location, country, state, monthly_rent_type
    } = req.body;

    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);
    const uploadedFiles = req.files || {};
    const imageFiles = uploadedFiles?.file || [];
    const videoFiles = uploadedFiles?.videoFile || [];

    // Permissions
    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



    // Check property exists
    const propertyDetails = await getDataByLabel2(DB_TABLE.property, "property_id", property_id, "list_status", 0);
    if (!propertyDetails?.length)
      return handleError(res, StatusCode.status400, Message.msgPropertyNotFound);

    // Prepare update data
    const data = {
      owner_type,
      category_id,
      property_title,
      property_description,
      bedrooms,
      bathrooms,
      beds,
      square_foot,
      amenities,
      safety_amenities,
      ideal_for,
      check_in,
      check_out,
      house_rules,
      monthly_rent,
      security_deposit,
      available_from,
      min_stay_duration,
      status: 1,
      list_type: 2,
      list_status: 1,
      max_person,
      cleaning_fee_type,
      cleaning_fee,
      video_url: videoFiles.length > 0
        ? videoFiles[0].filename
        : propertyDetails[0].video_url,
      approved_at: new Date(),
      location,
      country,
      state,
      monthly_rent_type
    };

    const updateProperty = await updateDataByLabel(DB_TABLE.property, data, "property_id", property_id);

    if (updateProperty?.affectedRows > 0) {
      if (imageFiles.length > 0) {
        await Promise.all(
          imageFiles.map(async (item) => {
            const imageData = {
              property_id,
              image: item.filename,
            };
            await addDataIntoTable(DB_TABLE.propertyImage, imageData);
          })
        );
      }

      return handleSuccess(res, StatusCode.status200, Message.listingPropertyUpdated);
    } else {
      return handleError(res, StatusCode.status400, Message.listingPropertyNotUpdated);
    }
  } catch (error) {
    console.log("Error:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


export const updateSubAdminStaus = async (req, res) => {
  try {
    let { sub_admin_id } = req.body;
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const check = await getDataByLabel(DB_TABLE.admin, "admin_id", sub_admin_id);

    if (check.length <= 0) {
      return handleError(res, StatusCode.status404, Message.subAdminNotFound);
    }


    const is_active = check[0].is_active == 0 ? 1 : 0;

    const data = {
      is_active
    }
    const update = await updateDataByLabel(DB_TABLE.admin, data, "admin_id", sub_admin_id);

    if (update?.affectedRows > 0) {
      return handleSuccess(res, StatusCode.status200, is_active == 1 ? Message.subAdminActivateSuccess : Message.subAdminDeactivateSusscess);
    } else {
      return handleError(res, StatusCode.status400, Message.msgSubAdminNotAdded);
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

export const subAdminEmailVarify = async (req, res) => {
  try {
    const act_token = req?.params?.act_token || "";
    if (!act_token) {
      return handleError(res, StatusCode.status400, Message.INVALID_URL);
    } else {
      const userDetails = await getDataByLabel(
        DB_TABLE.admin,
        "act_token",
        act_token
      );
      if (userDetails?.length == 0) {
        return res.sendFile(path.join(__dirname, "../view/notverify.html"));
      };
      const data = {
        is_pending: 1,
        act_token: "",
      };
      const result = await updateDataByLabel(
        DB_TABLE?.admin,
        data,
        "admin_id",
        userDetails[0]?.admin_id
      );
      if (result?.affectedRows)
        return res.sendFile(path.join(__dirname, "../view/verify.html"));
      else
        return res.sendFile(path.join(__dirname, "../view/notverify.html"));
    };
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getSubAdminData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const check = await getAllSubAdminCount();

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, check[0]);



  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
}

export const getListingRequestData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



    const check = await getAllListingRequestCount();

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, check[0]);



  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
}

export const getBookingData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



    const check = await getAllListingRequestCount();

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, check[0]);



  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
}

export const getDashboardData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const check = await getAllDashboardCount();
    const recent_booking = await getRecentBooking();

    await Promise.all(recent_booking.map(async (item) => {
      let image = await getDataByLabel(
        DB_TABLE.propertyImage,
        "property_id",
        item.property_id
      );

      let finalData = image?.map((item, i) => {
        return {
          ...item,
          image: item?.image
            ? `${process.env.BASE_URL}profile/${item?.image}`
            : "",
        };
      });
      item.propertyImage = finalData;
      item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
        : "";
      let amenities = item.amenities ? item.amenities.split(',') : [];
      let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
      let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];


      if (Array.isArray(amenities) && amenities.length > 0) {
        item.amenities_label = await getPropertyAmenitits(amenities);
      }

      if (Array.isArray(safety_amenities) && safety_amenities.length > 0) {
        item.safety_amenities_label = await getAllPropertySafety(safety_amenities);
      }

      if (Array.isArray(ideal_for) && ideal_for.length > 0) {
        item.ideal_for_label = await getPropertyIdealFor(ideal_for);
      }
    }));

    const getStatusLabel = (item) => {
      if (item.booking_status == 2) return "Cancelled";
      if (item.booking_status == 0) return "Pending";
      if (item.booking_status == 1) {
        const now = new Date();
        const from = new Date(item.booked_from);
        const to = new Date(item.booked_to);
        if (now >= from && now <= to) return "Checked-In";
        if (now < from) return "Upcoming";
        return "Confirmed";
      }
      return "Pending";
    };

    check[0].recent_booking = recent_booking.map((item) => ({
      ...item,
      guest_name: `${item.user_first_name || ""} ${item.user_last_name || ""}`.trim(),
      property_type: item.category_name || null,
      price_per_month: item.monthly_rent || null,
      status_label: getStatusLabel(item),
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, check[0]);

  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
}

export const getUserManagementData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



    const users = await getAllUsers();

    const finalUsers = await Promise.all(users.map(async (user) => {
      const bookings = await getUserAllBooking(user.id);

      // Attach full URL to profile image
      user.profile_image = user?.profile_image
        ? `${process.env.BASE_URL}profile/${user.profile_image}`
        : "";

      const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
        const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", booking.property_id);

        booking.propertyImage = images?.map((img) => ({
          ...img,
          image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
        }));

        // Append media URLs
        booking.video_url = booking?.video_url
          ? `${process.env.BASE_URL}profile/${booking.video_url}`
          : "";

        booking.user_profile_image = booking?.user_profile_image
          ? `${process.env.BASE_URL}profile/${booking.user_profile_image}`
          : "";

        booking.host_profile_image = booking?.host_profile_image
          ? `${process.env.BASE_URL}profile/${booking.host_profile_image}`
          : "";

        // Handle labels from CSV fields
        const amenities = booking.amenities?.split(',') || [];
        const safety = booking.safety_amenities?.split(',') || [];
        const idealFor = booking.ideal_for?.split(',') || [];

        if (amenities.length) {
          booking.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (safety.length) {
          booking.safety_amenities_label = await getAllPropertySafety(safety);
        }

        if (idealFor.length) {
          booking.ideal_for_label = await getPropertyIdealFor(idealFor);
        }

        return booking;
      }));

      user.property_booked = enrichedBookings;
      user.total_bookings = enrichedBookings?.length;
      return user;
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, finalUsers);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getHostManagementData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



    const hosts = await getAllHosts();

    const finalUsers = await Promise.all(hosts.map(async (host) => {
      const properties = await getAllHostProperty(host.host_id);
      const property_listings = await getAllHostPropertyListing(host.host_id);

      host.approved_property_count = properties.length + property_listings.filter((p) => p.status == 1).length;

      const current_bookings = await getDataByLabel(DB_TABLE.booking, "host_id", host.host_id)

      host.current_bookings = current_bookings.length;

      // Attach full URL to profile image
      host.profile_image = host?.profile_image
        ? `${process.env.BASE_URL}profile/${host.profile_image}`
        : "";

      const enrichedProperty = await Promise.all(properties.map(async (property) => {
        const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", property.property_id);

        property.propertyImage = images?.map((img) => ({
          ...img,
          image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
        }));

        const property_booked_count = await getPropertyBookedCount(property.property_id);
        property.property_booked_count = property_booked_count[0].booked_count;

        // Append media URLs
        property.video_url = property?.video_url
          ? `${process.env.BASE_URL}profile/${property.video_url}`
          : "";

        property.user_profile_image = property?.user_profile_image
          ? `${process.env.BASE_URL}profile/${property.user_profile_image}`
          : "";

        property.host_profile_image = property?.host_profile_image
          ? `${process.env.BASE_URL}profile/${property.host_profile_image}`
          : "";

        // Handle labels from CSV fields
        const amenities = property.amenities?.split(',') || [];
        const safety = property.safety_amenities?.split(',') || [];
        const idealFor = property.ideal_for?.split(',') || [];
        let house_rules = property.house_rules ? property.house_rules.split(',') : [];

        if (amenities.length) {
          property.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (safety.length) {
          property.safety_amenities_label = await getAllPropertySafety(safety);
        }

        if (idealFor.length) {
          property.ideal_for_label = await getPropertyIdealFor(idealFor);
        }
        if (Array.isArray(house_rules) && house_rules.length > 0) {
          property.house_rules_label = await getHouseRulesByIds(house_rules);
        }

        return property;
      }));

      const enrichedPropertyListings = await Promise.all(property_listings.map(async (property) => {
        const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", property.property_id);

        property.propertyImage = images?.map((img) => ({
          ...img,
          image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
        }));

        const property_booked_count = await getPropertyBookedCount(property.property_id);
        property.property_booked_count = property_booked_count[0].booked_count;

        // Append media URLs
        property.video_url = property?.video_url
          ? `${process.env.BASE_URL}profile/${property.video_url}`
          : "";

        property.user_profile_image = property?.user_profile_image
          ? `${process.env.BASE_URL}profile/${property.user_profile_image}`
          : "";

        property.host_profile_image = property?.host_profile_image
          ? `${process.env.BASE_URL}profile/${property.host_profile_image}`
          : "";

        // Handle labels from CSV fields
        const amenities = property.amenities?.split(',') || [];
        const safety = property.safety_amenities?.split(',') || [];
        const idealFor = property.ideal_for?.split(',') || [];

        if (amenities.length) {
          property.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (safety.length) {
          property.safety_amenities_label = await getAllPropertySafety(safety);
        }

        if (idealFor.length) {
          property.ideal_for_label = await getPropertyIdealFor(idealFor);
        }

        return property;
      }));

      host.propertyListing = enrichedProperty;
      host.listingRequest = enrichedPropertyListings;
      return host;
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, finalUsers);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const updateUserBlockStatus = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { user_id } = req.body
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



    const userData = await getDataByLabel(DB_TABLE.users, "id", user_id);

    if (userData.length <= 0) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    userData[0].is_active = userData[0].is_active == 1 ? 0 : 1;

    const updateUser = await updateDataByLabel(DB_TABLE.users, userData[0], "id", user_id);

    if (updateUser.affectedRows > 0) {
      return handleSuccess(res, StatusCode.status200, userData[0].is_active == 0 ? Message.userBlockSuccess : Message.userUnblockSuccess);
    } else {
      return handleError(res, StatusCode.status400, Message.somethingWentWrong);
    }

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const updateHostBlockStatus = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { host_id } = req.body
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



    const userData = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (userData.length <= 0) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    userData[0].is_active = userData[0].is_active == 1 ? 0 : 1;

    const updateUser = await updateDataByLabel(DB_TABLE.host, userData[0], "host_id", host_id);

    if (updateUser.affectedRows > 0) {
      return handleSuccess(res, StatusCode.status200, userData[0].is_active == 0 ? Message.hostBlockSuccess : Message.hostUnblockSuccess);
    } else {
      return handleError(res, StatusCode.status400, Message.somethingWentWrong);
    }

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getUserBusinessManagementData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const users = await getAllUsersBusiness();

    let finalUsers = await Promise.all(users.map(async (user) => {


      const myBookings = await getDataByLabel(DB_TABLE.booking, "user_id", user.id);
      // Attach full URL to profile image
      user.profile_image = user?.profile_image
        ? `${process.env.BASE_URL}profile/${user.profile_image}`
        : "";

      let allSubUsers = await getAllBusinessUsers(user.id);
      let subUsersIds = allSubUsers.map((subUser) => subUser.id);
      let total_booking;
      if (subUsersIds.length > 0) {
        total_booking = await getAllSubUserBookings(subUsersIds);
      }
      if (allSubUsers.length > 0) {
        await Promise.all(allSubUsers.map(async (subUser) => {
          subUser.profile_image = subUser?.profile_image
            ? `${process.env.BASE_URL}profile/${subUser.profile_image}`
            : "";
        }));
      }

      user.total_user = allSubUsers.length;
      user.sub_users = allSubUsers;
      user.bookings = myBookings.length;
      user.total_booking = total_booking?.total_booking || 0;
      return user;
    }));


    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, finalUsers);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getUserBusinessDataById = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { user_id } = req.query;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



    const users = await getDataByLabel(DB_TABLE.users, "id", user_id);

    if (!users?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    let finalUsers = await Promise.all(users.map(async (user) => {


      const myBookings = await getDataByLabel(DB_TABLE.booking, "user_id", user.id);
      // Attach full URL to profile image
      user.profile_image = user?.profile_image
        ? `${process.env.BASE_URL}profile/${user.profile_image}`
        : "";

      let allSubUsers = await getAllBusinessUsers(user.id);
      let subUsersIds = allSubUsers.map((subUser) => subUser.id);
      let total_booking;
      if (subUsersIds.length > 0) {
        total_booking = await getAllSubUserBookings(subUsersIds);
      }
      if (allSubUsers.length > 0) {
        await Promise.all(allSubUsers.map(async (subUser) => {
          subUser.profile_image = subUser?.profile_image
            ? `${process.env.BASE_URL}profile/${subUser.profile_image}`
            : "";
          let [total_bookings] = await getAllUserBookings(subUser.id);
          subUser.total_bookings = total_bookings?.total_booking || 0;
        }));
      }

      user.total_user = allSubUsers.length;
      user.sub_users = allSubUsers;
      user.bookings = myBookings.length;
      user.total_booking = total_booking?.total_booking || 0;
      return user;
    }));


    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, finalUsers[0]);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getUserBookedPropertyData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { user_id } = req.query;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const users = await getDataByLabel(DB_TABLE.users, "id", user_id);

    if (users.length <= 0) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const finalUsers = await Promise.all(users.map(async (user) => {
      const bookings = await getUserAllBooking(user.id);
      const [ratingsCount] = await getReviewSubmittedCount(user.id);

      // Attach full URL to profile image
      user.profile_image = user?.profile_image
        ? `${process.env.BASE_URL}profile/${user.profile_image}`
        : "";

      const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
        const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", booking.property_id);

        booking.propertyImage = images?.map((img) => ({
          ...img,
          image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
        }));

        // Append media URLs
        booking.video_url = booking?.video_url
          ? `${process.env.BASE_URL}profile/${booking.video_url}`
          : "";

        booking.user_profile_image = booking?.user_profile_image
          ? `${process.env.BASE_URL}profile/${booking.user_profile_image}`
          : "";

        booking.host_profile_image = booking?.host_profile_image
          ? `${process.env.BASE_URL}profile/${booking.host_profile_image}`
          : "";

        // Handle labels from CSV fields
        const amenities = booking.amenities?.split(',') || [];
        const safety = booking.safety_amenities?.split(',') || [];
        const idealFor = booking.ideal_for?.split(',') || [];
        let house_rules = booking.house_rules ? booking.house_rules.split(',') : [];

        if (amenities.length) {
          booking.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (safety.length) {
          booking.safety_amenities_label = await getAllPropertySafety(safety);
        }

        if (idealFor.length) {
          booking.ideal_for_label = await getPropertyIdealFor(idealFor);
        }
        if (Array.isArray(house_rules) && house_rules.length > 0) {
          booking.house_rules_label = await getHouseRulesByIds(house_rules);
        }

        return booking;
      }));

      user.property_booked = enrichedBookings;
      user.review_submitted_count = ratingsCount?.review_count || 0;
      return user;
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, finalUsers[0]);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getPolicyManagement = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { content_type } = req.query;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const content = await getDataByLabel(DB_TABLE.content, "content_type", content_type);

    if (content.length <= 0) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }


    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, content[0].content);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const updatePolicyManagement = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { content_type, content } = req.body;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const data = await getDataByLabel(DB_TABLE.content, "content_type", content_type);

    if (data.length <= 0) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const updateData = {
      content: content
    }

    const updatedContent = await updateDataByLabel(DB_TABLE.content, updateData, "content_type", content_type);

    if (updatedContent.affectedRows > 0) {
      return handleSuccess(res, StatusCode.status200, Message.contentUpdateSuccess);
    } else {
      return handleError(res, StatusCode.status400, Message.contentUpdateFailure);
    }

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const addBlog = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { blog_content, title } = req.body;
    const image = req.files || [];
    if (image.length <= 0) {
      return handleError(res, StatusCode.status400, Message.msgImageError);
    }
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const blogData = {
      title: title,
      blog_content: blog_content,
    }
    const blog = await addDataIntoTable(DB_TABLE.blog, blogData);

    if (blog.insertId > 0) {
      if (image.length > 0) {
        await Promise.all(image.map(async (item) => {
          const imageData = {
            blog_id: blog.insertId,
            image: item.filename,
          };
          await addDataIntoTable(DB_TABLE.blogImage, imageData);
        }))
      }
      return handleSuccess(res, StatusCode.status200, Message.blogAddedSuccess);
    } else {
      return handleError(res, StatusCode.status400, Message.failedToBlogAdd);
    }

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getBlogManagement = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



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
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const updateBlogManagement = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { blog_id, blog_content, title, deleteImageIds } = req.body;
    const image = req.files || [];
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);




    const getBlog = await getDataByLabel(DB_TABLE.blog, "blog_id", blog_id);
    if (getBlog.length <= 0) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const blogData = {
      title: title,
      blog_content: blog_content,
    }
    const blog = await updateDataByLabel(DB_TABLE.blog, blogData, "blog_id", blog_id);

    if (blog.affectedRows > 0) {
      if (image.length > 0) {
        await Promise.all(image.map(async (item) => {
          const imageData = {
            blog_id: blog_id,
            image: item.filename,
            updated_at: new Date(),
          };
          await addDataIntoTable(DB_TABLE.blogImage, imageData);
        }))
      }
      if (deleteImageIds) {
        const Ids = deleteImageIds?.split(',');
        if (Ids.length > 0) {
          await Promise.all(Ids.map(async (id) => {
            let img = await getDataByLabel(DB_TABLE.blogImage, "blog_image_id", id);
            if (img.length > 0) {
              await deleteProfileImage(img[0].image);
              await deleteDataByLable(DB_TABLE.blogImage, "blog_image_id", id);
            }
          }))
        }
      }
      return handleSuccess(res, StatusCode.status200, Message.blogUpdateSuccess);
    } else {
      return handleError(res, StatusCode.status400, Message.failedToBlogUpdate);
    }


  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const deleteBlogManagement = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { blog_id } = req.params;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);




    const getBlog = await getDataByLabel(DB_TABLE.blog, "blog_id", blog_id);
    if (getBlog.length <= 0) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const getBlogImage = await getDataByLabel(DB_TABLE.blogImage, "blog_id", blog_id);
    if (getBlogImage.length > 0) {
      await Promise.all(getBlogImage.map(async (img) => {
        await deleteProfileImage(img.image);
        await deleteDataByLable(DB_TABLE.blogImage, "blog_image_id", img.blog_image_id);
      }))
    }

    const blog = await deleteDataByLable(DB_TABLE.blog, "blog_id", blog_id);
    if (blog.affectedRows > 0) {
      return handleSuccess(res, StatusCode.status200, Message.blogDeleteSuccess);
    } else {
      return handleError(res, StatusCode.status400, Message.failedToDeleteBlog);
    }


  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getHostPropertyListed = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { host_id } = req.query;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const hosts = await getDataByLabel(DB_TABLE.host, "host_id", host_id);


    const finalUsers = await Promise.all(hosts.map(async (host) => {
      const properties = await getAllHostProperty(host.host_id);
      const property_listings = await getAllHostPropertyListing(host.host_id);
      const current_bookings = await getDataByLabel(DB_TABLE.booking, "host_id", host.host_id)

      host.current_bookings = current_bookings.length;
      host.approved_property_count = properties.length + property_listings.filter((p) => p.status == 1).length;



      // Attach full URL to profile image
      host.profile_image = host?.profile_image
        ? `${process.env.BASE_URL}profile/${host.profile_image}`
        : "";

      const enrichedProperty = await Promise.all(properties.map(async (property) => {
        const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", property.property_id);

        const property_booked_count = await getPropertyBookedCount(property.property_id);

        property.property_booked_count = property_booked_count[0].booked_count;

        property.propertyImage = images?.map((img) => ({
          ...img,
          image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
        }));

        // Append media URLs
        property.video_url = property?.video_url
          ? `${process.env.BASE_URL}profile/${property.video_url}`
          : "";

        property.user_profile_image = property?.user_profile_image
          ? `${process.env.BASE_URL}profile/${property.user_profile_image}`
          : "";

        property.host_profile_image = property?.host_profile_image
          ? `${process.env.BASE_URL}profile/${property.host_profile_image}`
          : "";

        // Handle labels from CSV fields
        const amenities = property.amenities?.split(',') || [];
        const safety = property.safety_amenities?.split(',') || [];
        const idealFor = property.ideal_for?.split(',') || [];

        if (amenities.length) {
          property.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (safety.length) {
          property.safety_amenities_label = await getAllPropertySafety(safety);
        }

        if (idealFor.length) {
          property.ideal_for_label = await getPropertyIdealFor(idealFor);
        }

        return property;
      }));

      const enrichedPropertyListings = await Promise.all(property_listings.map(async (property) => {
        const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", property.property_id);

        const property_booked_count = await getPropertyBookedCount(property.property_id);
        property.property_booked_count = property_booked_count[0].booked_count;

        property.propertyImage = images?.map((img) => ({
          ...img,
          image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
        }));

        // Append media URLs
        property.video_url = property?.video_url
          ? `${process.env.BASE_URL}profile/${property.video_url}`
          : "";

        property.user_profile_image = property?.user_profile_image
          ? `${process.env.BASE_URL}profile/${property.user_profile_image}`
          : "";

        property.host_profile_image = property?.host_profile_image
          ? `${process.env.BASE_URL}profile/${property.host_profile_image}`
          : "";

        // Handle labels from CSV fields
        const amenities = property.amenities?.split(',') || [];
        const safety = property.safety_amenities?.split(',') || [];
        const idealFor = property.ideal_for?.split(',') || [];
        let house_rules = property.house_rules ? property.house_rules.split(',') : [];
        console.log("house_rules", house_rules);

        if (amenities.length) {
          property.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (safety.length) {
          property.safety_amenities_label = await getAllPropertySafety(safety);
        }

        if (idealFor.length) {
          property.ideal_for_label = await getPropertyIdealFor(idealFor);
        }
        if (Array.isArray(house_rules) && house_rules.length > 0) {
          property.house_rules_label = await getHouseRulesByIds(house_rules);
          console.log("house_rules_label", property.house_rules_label);
        }


        const offer = await getActiveOfferByPropertyId(property.property_id);
        if (offer) {
          property.offer_value = offer.offer_value;
          property.offer_type = offer.offer_type;
          property.offer_start_date = offer.start_date;
          property.offer_end_date = offer.end_date;
        } else {
          property.offer_value = null;
          property.offer_type = null;
          property.offer_start_date = null;
          property.offer_end_date = null;
        }

        return property;
      }));

      host.propertyListing = enrichedProperty;
      host.listingRequest = enrichedPropertyListings;
      return host;
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, finalUsers[0]);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const addGuset = async (req, res) => {
  try {
    let { first_name, last_name, email } = req.body;
    const image = req.file?.filename || null;
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    const password = generateStrongPassword();

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const check = await getDataByLabel(DB_TABLE.users, "email", email);

    if (check.length <= 0) {
      const hash = await hashPassword(password);


      const data = {
        first_name, last_name,
        email, password: hash,
        user_type: 1,
        profile_image: image,
        added_by: 0,
        is_verify: 1
      }
      const add = await addDataIntoTable(DB_TABLE.users, data);

      if (add?.affectedRows > 0) {

        await sendUserCredentialEmail(email, password, res);
      } else {
        return handleError(res, StatusCode.status400, Message.failedToGuestAdd);
      }
    } else {
      return handleError(res, StatusCode.status404, Message.emailAlreadyExist);
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

export const addHost = async (req, res) => {
  try {
    let { first_name, last_name, email } = req.body;
    const image = req.file?.filename || null;
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    const password = generateStrongPassword();

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const check = await getDataByLabel(DB_TABLE.host, "email", email);

    if (check.length <= 0) {
      const hash = await hashPassword(password);


      const data = {
        first_name, last_name,
        email, password: hash,
        user_type: 1,
        profile_image: image,
        added_by: 0,
        is_verify: 1
      }
      const add = await addDataIntoTable(DB_TABLE.host, data);

      if (add?.affectedRows > 0) {

        await sendHostCredentialEmail(email, password, res);
      } else {
        return handleError(res, StatusCode.status400, Message.failedToHostAdd);
      }
    } else {
      return handleError(res, StatusCode.status404, Message.hostEmailAlreadyExist);
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

export const addGusetBusiness = async (req, res) => {
  try {
    let { first_name, last_name, email } = req.body;
    const image = req.file?.filename || null;
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    const password = generateStrongPassword();

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const check = await getDataByLabel(DB_TABLE.users, "email", email);

    if (check.length <= 0) {
      const hash = await hashPassword(password);


      const data = {
        first_name, last_name,
        email, password: hash,
        user_type: 2,
        profile_image: image,
        added_by: 0,
        is_verify: 1
      }
      const add = await addDataIntoTable(DB_TABLE.users, data);

      if (add?.affectedRows > 0) {

        await sendUserBusinessCredentialEmail(email, password, res);
      } else {
        return handleError(res, StatusCode.status400, Message.failedToHostAdd);
      }
    } else {
      return handleError(res, StatusCode.status404, Message.emailAlreadyExist);
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

export const getContactUs = async (req, res) => {
  try {
    const contactUs = await getContactus();
    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, contactUs);
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const replyContactUs = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { contact_id, reply, subject } = req.body;


    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



    const data = {
      reply, subject, reply_datetime: new Date(), status: 1
    };

    const contact = await getDataByLabel(DB_TABLE.contact_us, "contact_id", contact_id);
    if (!contact?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const add_user = await updateDataByLabel(DB_TABLE.contact_us, data, "contact_id", contact_id);
    if (add_user?.affectedRows > 0) {

      const sent_data = {
        name: contact[0].name,
        email: contact[0].email,
        contact_id: contact[0].contact_id,
        subject: subject,
        message: contact[0].message,
        created_at: contact[0].created_at,
        reply: reply,
        reply_datetime: new Date(),
      };

      await sendContactUsSupportEmail(sent_data, res);
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

export const getSingleContactUs = async (req, res) => {
  try {
    const { contact_id } = req.params;
    const contactUs = await getDataByLabel(DB_TABLE.contact_us, "contact_id", contact_id);

    if (!contactUs?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, contactUs[0]);
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getSupportQuery = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;


    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);



    const userSupportQuery = await getUserSupportQuery();
    const hostSupportQuery = await getHostSupportQuery();

    if (userSupportQuery.length > 0) {
      await Promise.all(userSupportQuery.map(async (item) => {
        item.reply_message = item.reply_message ? JSON.parse(item.reply_message) : [];
      }));
    }
    if (hostSupportQuery.length > 0) {
      await Promise.all(hostSupportQuery.map(async (item) => {
        item.reply_message = item.reply_message ? JSON.parse(item.reply_message) : [];
      }));
    }


    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, { userQuery: userSupportQuery, hostQuery: hostSupportQuery });
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const supportTicketReply = async (req, res) => {
  try {
    const { reply_message, ticket_id } = req.body;
    const admin_id = req.user?.admin_id;


    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const supportTicket = await getDataByLabel(DB_TABLE.supportTicket, "ticket_id", ticket_id);

    if (!supportTicket?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const message = { "role": "admin", "message": reply_message, "created_at": new Date() };
    let messages = [];
    let reply = "";

    if (supportTicket[0].reply_message == null) {
      messages = [message];
      reply = JSON.stringify(messages);
    } else {
      messages = JSON.parse(supportTicket[0].reply_message);
      messages.push(message);
      reply = JSON.stringify(messages);
    }

    const data = {
      reply_message: reply,
      status: 1,
      reply_date: new Date(),
    };

    const ticket = await updateDataByLabel(DB_TABLE.supportTicket, data, "ticket_id", ticket_id);

    if (ticket?.affectedRows > 0) {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.queryReplySuccess
      );
    } else {
      return handleError(
        res,
        StatusCode.status400,
        Message.failedToQueryReply
      );
    }
  } catch (error) {
    console.error("Error in updateMyProperty:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
}

export const getSingleSupportQuery = async (req, res) => {
  try {
    const { ticket_id } = req.params;
    const supportTicket = await getsingleSupportQuery(ticket_id);

    if (!supportTicket?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    await Promise.all(supportTicket.map(async (item) => {
      item.reply_message = item.reply_message ? JSON.parse(item.reply_message) : [];
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, supportTicket[0]);
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getHostBusinessManagementData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const hosts = await getAllHostBusiness();

    const finalUsers = await Promise.all(hosts.map(async (host) => {
      const properties = await getAllHostProperty(host.host_id);
      const property_listings = await getAllHostPropertyListing(host.host_id);

      host.approved_property_count = properties.length + property_listings.filter((p) => p.status == 1).length;

      const current_bookings = await getDataByLabel(DB_TABLE.booking, "host_id", host.host_id)

      host.current_bookings = current_bookings.length;

      // Attach full URL to profile image
      host.profile_image = host?.profile_image
        ? `${process.env.BASE_URL}profile/${host.profile_image}`
        : "";

      const enrichedProperty = await Promise.all(properties.map(async (property) => {
        const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", property.property_id);

        property.propertyImage = images?.map((img) => ({
          ...img,
          image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
        }));

        const property_booked_count = await getPropertyBookedCount(property.property_id);
        property.property_booked_count = property_booked_count[0].booked_count;

        // Append media URLs
        property.video_url = property?.video_url
          ? `${process.env.BASE_URL}profile/${property.video_url}`
          : "";

        property.user_profile_image = property?.user_profile_image
          ? `${process.env.BASE_URL}profile/${property.user_profile_image}`
          : "";

        property.host_profile_image = property?.host_profile_image
          ? `${process.env.BASE_URL}profile/${property.host_profile_image}`
          : "";

        // Handle labels from CSV fields
        const amenities = property.amenities?.split(',') || [];
        const safety = property.safety_amenities?.split(',') || [];
        const idealFor = property.ideal_for?.split(',') || [];

        if (amenities.length) {
          property.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (safety.length) {
          property.safety_amenities_label = await getAllPropertySafety(safety);
        }

        if (idealFor.length) {
          property.ideal_for_label = await getPropertyIdealFor(idealFor);
        }

        return property;
      }));

      const enrichedPropertyListings = await Promise.all(property_listings.map(async (property) => {
        const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", property.property_id);

        property.propertyImage = images?.map((img) => ({
          ...img,
          image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
        }));

        const property_booked_count = await getPropertyBookedCount(property.property_id);
        property.property_booked_count = property_booked_count[0].booked_count;

        // Append media URLs
        property.video_url = property?.video_url
          ? `${process.env.BASE_URL}profile/${property.video_url}`
          : "";

        property.user_profile_image = property?.user_profile_image
          ? `${process.env.BASE_URL}profile/${property.user_profile_image}`
          : "";

        property.host_profile_image = property?.host_profile_image
          ? `${process.env.BASE_URL}profile/${property.host_profile_image}`
          : "";

        // Handle labels from CSV fields
        const amenities = property.amenities?.split(',') || [];
        const safety = property.safety_amenities?.split(',') || [];
        const idealFor = property.ideal_for?.split(',') || [];

        if (amenities.length) {
          property.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (safety.length) {
          property.safety_amenities_label = await getAllPropertySafety(safety);
        }

        if (idealFor.length) {
          property.ideal_for_label = await getPropertyIdealFor(idealFor);
        }

        return property;
      }));

      host.propertyListing = enrichedProperty;
      host.listingRequest = enrichedPropertyListings;
      return host;
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, finalUsers);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getHostBusinessById = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { host_id } = req.params;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const hosts = await getDataByLabel(DB_TABLE.host, "host_id", host_id);

    if (!hosts?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const finalUsers = await Promise.all(hosts.map(async (host) => {
      const properties = await getAllHostProperty(host.host_id);
      const property_listings = await getAllHostPropertyListing(host.host_id);

      host.approved_property_count = properties.length + property_listings.filter((p) => p.status == 1).length;

      const current_bookings = await getDataByLabel(DB_TABLE.booking, "host_id", host.host_id)

      host.current_bookings = current_bookings.length;

      // Attach full URL to profile image
      host.profile_image = host?.profile_image
        ? `${process.env.BASE_URL}profile/${host.profile_image}`
        : "";

      const enrichedProperty = await Promise.all(properties.map(async (property) => {
        const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", property.property_id);

        property.propertyImage = images?.map((img) => ({
          ...img,
          image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
        }));

        const property_booked_count = await getPropertyBookedCount(property.property_id);
        property.property_booked_count = property_booked_count[0].booked_count;

        // Append media URLs
        property.video_url = property?.video_url
          ? `${process.env.BASE_URL}profile/${property.video_url}`
          : "";

        property.user_profile_image = property?.user_profile_image
          ? `${process.env.BASE_URL}profile/${property.user_profile_image}`
          : "";

        property.host_profile_image = property?.host_profile_image
          ? `${process.env.BASE_URL}profile/${property.host_profile_image}`
          : "";

        // Handle labels from CSV fields
        const amenities = property.amenities?.split(',') || [];
        const safety = property.safety_amenities?.split(',') || [];
        const idealFor = property.ideal_for?.split(',') || [];

        if (amenities.length) {
          property.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (safety.length) {
          property.safety_amenities_label = await getAllPropertySafety(safety);
        }

        if (idealFor.length) {
          property.ideal_for_label = await getPropertyIdealFor(idealFor);
        }

        return property;
      }));

      const enrichedPropertyListings = await Promise.all(property_listings.map(async (property) => {
        const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", property.property_id);

        property.propertyImage = images?.map((img) => ({
          ...img,
          image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
        }));

        const property_booked_count = await getPropertyBookedCount(property.property_id);
        property.property_booked_count = property_booked_count[0].booked_count;

        // Append media URLs
        property.video_url = property?.video_url
          ? `${process.env.BASE_URL}profile/${property.video_url}`
          : "";

        property.user_profile_image = property?.user_profile_image
          ? `${process.env.BASE_URL}profile/${property.user_profile_image}`
          : "";

        property.host_profile_image = property?.host_profile_image
          ? `${process.env.BASE_URL}profile/${property.host_profile_image}`
          : "";

        // Handle labels from CSV fields
        const amenities = property.amenities?.split(',') || [];
        const safety = property.safety_amenities?.split(',') || [];
        const idealFor = property.ideal_for?.split(',') || [];

        if (amenities.length) {
          property.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (safety.length) {
          property.safety_amenities_label = await getAllPropertySafety(safety);
        }

        if (idealFor.length) {
          property.ideal_for_label = await getPropertyIdealFor(idealFor);
        }

        return property;
      }));

      host.propertyListing = enrichedProperty;
      host.listingRequest = enrichedPropertyListings;
      return host;
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, finalUsers[0]);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


export const getHostSubHostManagementData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { host_id } = req.params;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const hosts = await getDataByLabel2(DB_TABLE.host, "added_by", host_id, "user_type", 3);

    if (!hosts?.length)
      return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, hosts);

    const ruleTypes = [
      { type: 1, title: 'Dashboard' },
      { type: 2, title: 'Bookings' },
      { type: 3, title: 'Property' },
      { type: 4, title: 'Reviews' },
      { type: 5, title: 'Offers' },
      { type: 6, title: 'Support' },
      { type: 7, title: 'Host Communication' },
      { type: 8, title: 'Reservation Request' },
      { type: 9, title: 'Business Rules' },
      { type: 10, title: 'Cleaning' }
    ];

    await Promise.all(
      hosts?.map(async (item) => {
        item.profile_image = item?.profile_image
          ? `${process.env.BASE_URL}profile/${item?.profile_image}`
          : "";
        item.password = undefined;

        let permission = await getDataByLabel(DB_TABLE.hostPermission, "host_id", item.host_id);

        if (permission?.length) {
          permission = permission.map((perm) => {
            const match = ruleTypes.find((r) => r.type === perm.type);
            return {
              ...perm,
              title: match ? match.title : null, // add title if matched, else null
            };
          });
        }

        item.permission = permission;
      })
    );

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, hosts);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


export const getPendingBookedPropertyData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const bookings = await getPendingBookings();
    const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
      const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", booking.property_id);

      booking.propertyImage = images?.map((img) => ({
        ...img,
        image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
      }));

      // Append media URLs
      booking.video_url = booking?.video_url
        ? `${process.env.BASE_URL}profile/${booking.video_url}`
        : "";

      booking.user_profile_image = booking?.user_profile_image
        ? `${process.env.BASE_URL}profile/${booking.user_profile_image}`
        : "";

      booking.host_profile_image = booking?.host_profile_image
        ? `${process.env.BASE_URL}profile/${booking.host_profile_image}`
        : "";

      // Handle labels from CSV fields
      const amenities = booking.amenities?.split(',') || [];
      const safety = booking.safety_amenities?.split(',') || [];
      const idealFor = booking.ideal_for?.split(',') || [];
      let house_rules = booking.house_rules ? booking.house_rules.split(',') : [];

      if (amenities.length) {
        booking.amenities_label = await getPropertyAmenitits(amenities);
      }

      if (safety.length) {
        booking.safety_amenities_label = await getAllPropertySafety(safety);
      }

      if (idealFor.length) {
        booking.ideal_for_label = await getPropertyIdealFor(idealFor);
      }
      if (Array.isArray(house_rules) && house_rules.length > 0) {
        booking.house_rules_label = await getHouseRulesByIds(house_rules);
      }

      return booking;
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, enrichedBookings);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getApprovedBookedPropertyData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const bookings = await getApprovedBookings();
    const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
      const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", booking.property_id);

      booking.propertyImage = images?.map((img) => ({
        ...img,
        image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
      }));

      // Append media URLs
      booking.video_url = booking?.video_url
        ? `${process.env.BASE_URL}profile/${booking.video_url}`
        : "";

      booking.user_profile_image = booking?.user_profile_image
        ? `${process.env.BASE_URL}profile/${booking.user_profile_image}`
        : "";

      booking.host_profile_image = booking?.host_profile_image
        ? `${process.env.BASE_URL}profile/${booking.host_profile_image}`
        : "";

      // Handle labels from CSV fields
      const amenities = booking.amenities?.split(',') || [];
      const safety = booking.safety_amenities?.split(',') || [];
      const idealFor = booking.ideal_for?.split(',') || [];
      let house_rules = booking.house_rules ? booking.house_rules.split(',') : [];

      if (amenities.length) {
        booking.amenities_label = await getPropertyAmenitits(amenities);
      }

      if (safety.length) {
        booking.safety_amenities_label = await getAllPropertySafety(safety);
      }

      if (idealFor.length) {
        booking.ideal_for_label = await getPropertyIdealFor(idealFor);
      }
      if (Array.isArray(house_rules) && house_rules.length > 0) {
        booking.house_rules_label = await getHouseRulesByIds(house_rules);
      }

      return booking;
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, enrichedBookings);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getRejectedBookedPropertyData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const bookings = await getRejectedBookings();
    const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
      const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", booking.property_id);

      booking.propertyImage = images?.map((img) => ({
        ...img,
        image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
      }));

      // Append media URLs
      booking.video_url = booking?.video_url
        ? `${process.env.BASE_URL}profile/${booking.video_url}`
        : "";

      booking.user_profile_image = booking?.user_profile_image
        ? `${process.env.BASE_URL}profile/${booking.user_profile_image}`
        : "";

      booking.host_profile_image = booking?.host_profile_image
        ? `${process.env.BASE_URL}profile/${booking.host_profile_image}`
        : "";

      // Handle labels from CSV fields
      const amenities = booking.amenities?.split(',') || [];
      const safety = booking.safety_amenities?.split(',') || [];
      const idealFor = booking.ideal_for?.split(',') || [];
      let house_rules = booking.house_rules ? booking.house_rules.split(',') : [];

      if (amenities.length) {
        booking.amenities_label = await getPropertyAmenitits(amenities);
      }

      if (safety.length) {
        booking.safety_amenities_label = await getAllPropertySafety(safety);
      }

      if (idealFor.length) {
        booking.ideal_for_label = await getPropertyIdealFor(idealFor);
      }
      if (Array.isArray(house_rules) && house_rules.length > 0) {
        booking.house_rules_label = await getHouseRulesByIds(house_rules);
      }

      return booking;
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, enrichedBookings);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};
export const getBookedPropertyByIdData = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { booking_id } = req.params;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);


    const bookings = await getBookingById(booking_id);
    if (!bookings?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);
    const getStatusLabel = (item) => {
      const isCancelled = item.booking_status == 2 || (item.is_canceled && item.is_canceled !== "No");
      if (isCancelled) return "Cancelled";
      if (item.booking_status == 0) return "Pending";
      if (item.booking_status == 1) {
        const now = new Date();
        const from = new Date(item.booked_from);
        const to = new Date(item.booked_to);
        if (now >= from && now <= to) return "Checked-In";
        if (now < from) return "Upcoming";
        return "Completed";
      }
      return "Pending";
    };
    const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
      const images = await getDataByLabel(DB_TABLE.propertyImage, "property_id", booking.property_id);

      booking.propertyImage = images?.map((img) => ({
        ...img,
        image: img?.image ? `${process.env.BASE_URL}profile/${img.image}` : ""
      }));

      // Append media URLs
      booking.video_url = booking?.video_url
        ? `${process.env.BASE_URL}profile/${booking.video_url}`
        : "";

      booking.user_profile_image = booking?.user_profile_image
        ? `${process.env.BASE_URL}profile/${booking.user_profile_image}`
        : "";

      booking.host_profile_image = booking?.host_profile_image
        ? `${process.env.BASE_URL}profile/${booking.host_profile_image}`
        : "";

      // Handle labels from CSV fields
      const amenities = booking.amenities?.split(',') || [];
      const safety = booking.safety_amenities?.split(',') || [];
      const idealFor = booking.ideal_for?.split(',') || [];
      let house_rules = booking.house_rules ? booking.house_rules.split(',') : [];

      if (amenities.length) {
        booking.amenities_label = await getPropertyAmenitits(amenities);
      }

      if (safety.length) {
        booking.safety_amenities_label = await getAllPropertySafety(safety);
      }

      if (idealFor.length) {
        booking.ideal_for_label = await getPropertyIdealFor(idealFor);
      }
      if (Array.isArray(house_rules) && house_rules.length > 0) {
        booking.house_rules_label = await getHouseRulesByIds(house_rules);
      };

      booking.status_label = getStatusLabel(booking);
      booking.offer_value = booking.offer_value;

      return booking;
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, bookings[0]);

  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const addServiceFeeController = async (req, res) => {
  try {
    const { commission, location, country, state } = req.body;

    const check = await getServiceFeeModel(location, country);
    if (check?.length) return handleError(res, StatusCode.status400, Message.commissionAlreadyAdded);


    const commissionData = await addDataIntoTable(DB_TABLE.fee, { commission: commission, location, country, user_type: 2, state });
    return handleSuccess(res, StatusCode.status200, Message.commissionAddedSuccess, commissionData);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const updateServiceFeeController = async (req, res) => {
  try {
    const { commission, location, country, state } = req.body;
    const { fee_id } = req.params;

    const check = await checkCommissionExists(fee_id, location, country);
    if (check?.length) return handleError(res, StatusCode.status400, Message.commissionAlreadyAdded);


    const commissionData = await updateDataByLabel(DB_TABLE.fee, { commission: commission, location, country, state }, "fee_id", fee_id);
    return handleSuccess(res, StatusCode.status200, Message.commissionUpdatedSuccess);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getServiceFeeController = async (req, res) => {
  try {
    const commissionData = await getAllServiceFeeModel();
    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, commissionData);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
}

export const deleteServiceFeeController = async (req, res) => {
  try {
    const { fee_id } = req.params;
    const check = await getDataByLabel(DB_TABLE.fee, "fee_id", fee_id);
    if (!check?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);
    const commissionData = await deleteDataByLable(DB_TABLE.fee, "fee_id", fee_id);
    console.log("commissionData :", commissionData);
    return handleSuccess(res, StatusCode.status200, Message.commissionDeletedSuccess);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
}

// -----------subscription master controller ---------
export const addSubscriptionPlan = async (req, res) => {
  try {
    const {
      plan_key,
      plan_name,
      price,
      currency,
      duration,
      headline,
      content,
      button_text,
      is_popular,
      max_listings,
      basic_support,
      dedicated_support,
      analytics_level,
      boosted_visibility,
      featured_placement,
      api_access,
      is_active,
    } = req.body;

    const existingAny = await getSubscriptionByPlanKeyAnyModel(plan_key);
    if (existingAny?.length && existingAny[0].is_deleted == 0) {
      return handleError(res, StatusCode.status400, Message.subscriptionAlreadyExists);
    }

    const data = {
      plan_key,
      plan_name,
      price,
      currency: currency || "EUR",
      duration: duration || "monthly",
      headline,
      content: content || null,
      button_text,
      is_popular: is_popular ?? 0,
      max_listings,
      basic_support: basic_support ?? 0,
      dedicated_support: dedicated_support ?? 0,
      analytics_level: analytics_level || "none",
      boosted_visibility: boosted_visibility ?? 0,
      featured_placement: featured_placement ?? 0,
      api_access: api_access ?? 0,
      is_active: is_active ?? 1,
      is_deleted: 0,
    };

    if (existingAny?.length && existingAny[0].is_deleted == 1) {
      await updateDataByLabel(
        DB_TABLE.subscription_master,
        data,
        "subscription_id",
        existingAny[0].subscription_id
      );
      return handleSuccess(res, StatusCode.status200, Message.subscriptionUpdated);
    }

    const result = await addDataIntoTable(DB_TABLE.subscription_master, data);
    return handleSuccess(res, StatusCode.status200, Message.subscriptionAdded, result);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getAllSubscriptionPlansController = async (req, res) => {
  try {
    const data = await getAllSubscriptionPlans();
    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, data);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getSubscriptionByIdController = async (req, res) => {
  try {
    const { subscription_id } = req.query;
    const data = await getSubscriptionByIdModel(subscription_id);
    if (!data?.length) {
      return handleError(res, StatusCode.status400, Message.subscriptionNotFound);
    }
    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, data[0]);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const updateSubscriptionPlan = async (req, res) => {
  try {
    const {
      subscription_id,
      plan_key,
      plan_name,
      price,
      currency,
      duration,
      headline,
      content,
      button_text,
      is_popular,
      max_listings,
      basic_support,
      dedicated_support,
      analytics_level,
      boosted_visibility,
      featured_placement,
      api_access,
      is_active,
    } = req.body;

    const existing = await getSubscriptionByIdModel(subscription_id);
    if (!existing?.length) {
      return handleError(res, StatusCode.status400, Message.subscriptionNotFound);
    }

    if (plan_key && plan_key !== existing[0].plan_key) {
      const planKeyExists = await getSubscriptionByPlanKeyModel(plan_key);
      if (planKeyExists?.length) {
        return handleError(res, StatusCode.status400, Message.subscriptionAlreadyExists);
      }
    }

    const data = {
      plan_key,
      plan_name,
      price,
      currency,
      duration,
      headline,
      content,
      button_text,
      is_popular,
      max_listings,
      basic_support,
      dedicated_support,
      analytics_level,
      boosted_visibility,
      featured_placement,
      api_access,
      is_active,
    };

    Object.keys(data).forEach((key) => {
      if (data[key] === undefined) delete data[key];
    });

    const result = await updateDataByLabel(
      DB_TABLE.subscription_master,
      data,
      "subscription_id",
      subscription_id
    );
    return handleSuccess(res, StatusCode.status200, Message.subscriptionUpdated, result);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const deleteSubscriptionPlan = async (req, res) => {
  try {
    const { subscription_id } = req.body;
    const existing = await getSubscriptionByIdModel(subscription_id);
    if (!existing?.length) {
      return handleError(res, StatusCode.status400, Message.subscriptionNotFound);
    }
    const result = await updateDataByLabel(
      DB_TABLE.subscription_master,
      { is_deleted: 1, is_active: 0 },
      "subscription_id",
      subscription_id
    );
    return handleSuccess(res, StatusCode.status200, Message.subscriptionDeleted, result);
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getBookingOverview = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const { search = "", date = "", status = "" } = req.query;
    const [counts] = await getBookingOverviewCounts();
    const rows = await getBookingOverviewList(search, date, status);

    const getStatusLabel = (item) => {
      const isCancelled = item.booking_status == 2 || (item.is_canceled && item.is_canceled !== "No");
      if (isCancelled) return "Cancelled";
      if (item.booking_status == 0) return "Pending";
      if (item.booking_status == 1) {
        const now = new Date();
        const from = new Date(item.booked_from);
        const to = new Date(item.booked_to);
        if (now >= from && now <= to) return "Checked-In";
        if (now < from) return "Upcoming";
        return "Completed";
      }
      return "Pending";
    };

    const data = rows.map((item) => ({
      ...item,
      user_name: `${item.user_first_name || ""} ${item.user_last_name || ""}`.trim(),
      host_name: `${item.host_first_name || ""} ${item.host_last_name || ""}`.trim(),
      property_type: item.category_name || null,
      price_per_month: item.monthly_rent || null,
      status_label: getStatusLabel(item),
    }));

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, {
      counts: counts || {
        total_bookings: 0,
        completed: 0,
        upcoming: 0,
        cancelled: 0,
      },
      bookings: data,
    });
  } catch (error) {
    console.log("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getBookingOverviewById = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const { booking_id } = req.params;
    const [item] = await getBookingOverviewByIdModel(booking_id);

    if (!item) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const isCancelled = item.booking_status == 2 || (item.is_canceled && item.is_canceled !== "No");
    let status_label = "Pending";
    if (isCancelled) {
      status_label = "Cancelled";
    } else if (item.booking_status == 1) {
      const now = new Date();
      const from = new Date(item.booked_from);
      const to = new Date(item.booked_to);
      if (now >= from && now <= to) status_label = "Checked-In";
      else if (now < from) status_label = "Upcoming";
      else status_label = "Completed";
    }

    const data = {
      ...item,
      user_name: `${item.user_first_name || ""} ${item.user_last_name || ""}`.trim(),
      host_name: `${item.host_first_name || ""} ${item.host_last_name || ""}`.trim(),
      property_type: item.category_name || null,
      price_per_month: item.monthly_rent || null,
      status_label,
    };

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, data);
  } catch (error) {
    console.log("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getAllReviewsAdmin = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const reviews = await getAllReviewsForAdmin();
    if (!reviews?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, []);
    }


    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      reviews
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

export const addAdminReview = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const {
      property_id,
      first_name,
      last_name,
      rating,
      review,
    } = req.body;
    const profile_image = req.file?.filename || null;

    const property = await getDataByLabel(DB_TABLE.property, "property_id", property_id);
    if (!property?.length) {
      return handleError(res, StatusCode.status400, Message.msgPropertyNotFound);
    }

    const data = {
      user_id: null,
      property_id,
      booking_id: null,
      review,
      rating,
      is_admin_created: 1,
      first_name,
      last_name,
      profile_image: profile_image,
    };

    const result = await addDataIntoTable(DB_TABLE.rating, data);

    return handleSuccess(res, StatusCode.status200, Message.ratingAdded);

  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const deleteAdminReview = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const { rating_id } = req.params;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const [reviewDetails] = await getDataByLabel(DB_TABLE.rating, "rating_id", rating_id);
    if (!reviewDetails) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const deletedReview = await deleteDataByLable(DB_TABLE.rating, "rating_id", rating_id);
    if (!deletedReview?.affectedRows) {
      return handleError(res, StatusCode.status400, Message.reviewDeleteFailed);
    }

    if (reviewDetails?.is_admin_created == 1 && reviewDetails?.profile_image) {
      await deleteProfileImage(reviewDetails.profile_image);
    }

    return handleSuccess(res, StatusCode.status200, Message.reviewDeletedSuccess);
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getApprovedPropertyOptionsForReviewController = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const properties = await getApprovedPropertyOptionsForReview();

    return handleSuccess(
      res,
      StatusCode.status200,
      properties?.length ? Message.dataFoundSuccessful : Message.dataNotFound,
      properties || []
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

export const getSeoManagement = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const seo = await getSeoSettings();
    if (!seo || seo.length === 0) {
      return handleSuccess(res, StatusCode.status200, Message.seoNotFound, []);
    }

    return handleSuccess(res, StatusCode.status200, Message.seoFetched, seo);
  } catch (error) {
    console.log("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

// export const updateSeoManagement = async (req, res) => {
//   try {
//     const admin_id = req.user?.admin_id;
//     const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

//     if (!userDetails?.length)
//       return handleError(res, StatusCode.status400, Message.dataNotFound);

//     const { meta_title, canonical_url, focus_keywords, meta_description } = req.body;

//     const [existing] = await getSeoSettings();
//     const data = {
//       meta_title,
//       canonical_url,
//       focus_keywords,
//       meta_description,
//       updated_at: new Date(),
//     };

//     let result;
//     if (existing) {
//       result = await upsertSeoSettings(data, existing.id);
//     } else {
//       data.is_deleted = 0;
//       result = await upsertSeoSettings(data);
//     }

//     return handleSuccess(res, StatusCode.status200, Message.seoUpdated, result);
//   } catch (error) {
//     console.log("Error :", error);
//     return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
//   }
// };


export const updateSeoManagement = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    let dataArray = req.body;
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return handleError(res, StatusCode.status400, "SEO data must be an array");
    }
    await Promise.all(dataArray.map(async (item) => {
      const existing = await fetchSeoMasterByPageSlug(item.page_slug);
      const data = {
        page_slug: item.page_slug,
        meta_title: item.meta_title,
        canonical_url: item.canonical_url,
        focus_keywords: item.focus_keywords,
        meta_description: item.meta_description,
        updated_at: new Date(),
      };
      if (existing.length > 0) {
        await upsertSeoSettings(data, existing[0].id);
      } else {
        data.is_deleted = 0;
        await upsertSeoSettings(data);
      }
    }));

    return handleSuccess(res, StatusCode.status200, Message.seoAdded);
  } catch (error) {
    console.log("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

// -----------admin fee controller ---------
export const upsertPlatformFeeController = async (req, res) => {
  try {
    const { fee_value } = req.body;
    const admin_id = req.user?.admin_id;

    // ✅ Check if platform fee already exists
    const [existingFee] = await getPlatformFeeModel();

    let response;

    if (existingFee) {
      // 🔁 UPDATE existing record
      response = await updatePlatformFeeModel(
        {
          fee_value,
          admin_id,
        }
      );

      return handleSuccess(
        res,
        StatusCode.status200,
        Message.platformFeeUpdatedSuccess,
        response
      );
    } else {
      // ➕ INSERT new record (only once)
      response = await addDataIntoTable(DB_TABLE.admin_fee_master, {
        admin_id,
        fee_name: "Platform Fee",
        fee_type: "percentage",
        fee_value,
        status: 1,
      });

      return handleSuccess(
        res,
        StatusCode.status200,
        Message.platformFeeAddedSuccess,
        response
      );
    }
  } catch (error) {
    console.error("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};


export const getPlatformFeeController = async (req, res) => {
  try {
    const [platformFee] = await getPlatformFeeModel();

    if (!platformFee) {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.platformFeeNotFound,
        null
      );
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.platformFeeFetchedSuccess,
      platformFee
    );
  } catch (error) {
    console.error("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};


export const updateAdminReview = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;

    const admin = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);
    if (!admin?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const { rating_id, review, rating } = req.body;

    if (!rating_id) {
      return handleError(res, StatusCode.status400, "Rating ID is required");
    }

    const existingReview = await getDataByLabel(
      DB_TABLE.rating,
      "rating_id",
      rating_id
    );

    if (!existingReview?.length) {
      return handleError(res, StatusCode.status400, "Review not found");
    }

    const updateData = {
      review,
      rating,
      updated_at: new Date(),
    };

    await updateDataByLabel(
      DB_TABLE.rating,
      updateData,
      "rating_id",
      rating_id
    );

    return handleSuccess(res, StatusCode.status200, "Review updated successfully");

  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};


export const getAllReports = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    let reports = await fetchAllReportsModel()
    return handleSuccess(res, 200, "Report list", reports);
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const getReportDashboardCount = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const rows = await getReportDashboardCountModel()
    return handleSuccess(res, 200, "Report stats", rows);
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { report_id, status } = req.body;
    if (!["pending", "resolved", "rejected"].includes(status)) {
      return handleError(res, 400, "Invalid status");
    }
    const updateData = {
      status,
      updated_at: new Date(),
    };
    await updateDataByLabel(
      DB_TABLE.report_master,
      updateData,
      "report_id",
      report_id
    );
    return handleSuccess(res, 200, "Status updated successfully");
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const getReportById = async (req, res) => {
  try {
    const { report_id } = req.params;
    if (!report_id) {
      return handleError(res, 400, "Report ID is required");
    }
    let rows = await getReportByIdModel(report_id);
    if (!rows.length) {
      return handleError(res, 404, "Report not found");
    }
    return handleSuccess(res, 200, "Report details", rows[0]);

  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const getManagePayoutList = async (req, res) => {
  try {
    let rows = await getManagePayoutListModel()
    return handleSuccess(res, 200, "Payout list", rows);
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const getPayoutDashboard = async (req, res) => {
  try {
    const summary = await getPayoutDashboardModel();
    const records = await getAllPropertyCommissionReportModel();

    return handleSuccess(res, 200, "Payout dashboard", {
      ...summary,
      total_records: records.length,
      records,
    });
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const getPropertyCommissionReport = async (req, res) => {
  try {
    const filters = {
      property_id: req.query?.property_id || null,
      host_id: req.query?.host_id || null,
      payment_status: req.query?.payment_status || null,
      payout_status: req.query?.payout_status || null,
      from_date: req.query?.from_date || null,
      to_date: req.query?.to_date || null,
    };

    const rows = await getPropertyCommissionReportModel(filters);

    const summary = rows.reduce(
      (acc, item) => {
        acc.total_properties += 1;
        acc.total_bookings += Number(item.total_bookings || 0);
        acc.total_payments += Number(item.total_payments || 0);
        acc.total_booking_amount += Number(item.total_booking_amount || 0);
        acc.total_commission_cut += Number(item.total_commission_cut || 0);
        acc.total_admin_earnings += Number(item.total_admin_earnings || 0);
        acc.total_host_amount += Number(item.total_host_amount || 0);
        acc.total_host_paid += Number(item.total_host_paid || 0);
        acc.total_host_pending += Number(item.total_host_pending || 0);
        acc.total_host_failed += Number(item.total_host_failed || 0);
        return acc;
      },
      {
        total_properties: 0,
        total_bookings: 0,
        total_payments: 0,
        total_booking_amount: 0,
        total_commission_cut: 0,
        total_admin_earnings: 0,
        total_host_amount: 0,
        total_host_paid: 0,
        total_host_pending: 0,
        total_host_failed: 0,
      }
    );

    const normalizedSummary = Object.fromEntries(
      Object.entries(summary).map(([key, value]) => [
        key,
        typeof value === "number" ? Number(value.toFixed(2)) : value,
      ])
    );

    return handleSuccess(
      res,
      200,
      "Property commission report fetched successfully",
      {
        filters,
        summary: normalizedSummary,
        properties: rows,
      }
    );
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const getAllPropertyCommissionReport = async (req, res) => {
  try {
    const filters = {
      property_id: req.query?.property_id || null,
      host_id: req.query?.host_id || null,
      payment_status: req.query?.payment_status || null,
      payout_status: req.query?.payout_status || null,
      from_date: req.query?.from_date || null,
      to_date: req.query?.to_date || null,
    };

    const rows = await getAllPropertyCommissionReportModel(filters);

    return handleSuccess(
      res,
      200,
      "All property commission records fetched successfully",
      {
        total_records: rows.length,
        records: rows,
      }
    );
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const releasePayoutByPaymentId = async (req, res) => {
  try {
    const { payment_id } = req.params;

    const result = await releasePayoutForPayment({
      paymentId: Number(payment_id),
      triggerSource: "admin_manual",
      allowedStatuses: ["PENDING", "FAILED"],
    });

    return handleSuccess(res, 200, result.message, result);
  } catch (error) {
    console.log(error);

    if (error instanceof PayoutProcessingError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        status: error.statusCode || 400,
        message: error.message,
        details: error.details || undefined,
      });
    }

    return handleError(res, 500, "Internal Server Error");
  }
};

export const processDuePayoutsController = async (req, res) => {
  try {
    const result = await processDuePayouts({
      limit: Number(req.body?.limit || req.query?.limit || 20),
      triggerSource: "admin_batch",
    });

    return handleSuccess(res, 200, "Due payouts processed", result);
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const createTestPayoutFunds = async (req, res) => {
  try {
    if (!String(process.env.STRIPE_SECRET_KEY || "").includes("_test_")) {
      return handleError(res, 400, "Test payout funding is allowed only in Stripe test mode");
    }

    const amountInput = Number(req.body?.amount || req.query?.amount || 100);
    const amount = Math.round(amountInput * 100);

    if (!Number.isInteger(amount) || amount <= 0) {
      return handleError(res, 400, "Valid amount is required");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      payment_method: "pm_card_bypassPending",
      confirm: true,
      automatic_payment_methods: {
        enabled: false,
      },
      description: `Test funding for payout balance: ${amountInput} USD`,
    });

    const balance = await stripe.balance.retrieve();

    return handleSuccess(res, 200, "Test payout funds added successfully", {
      amount,
      amount_display: Number((amount / 100).toFixed(2)),
      currency: "usd",
      payment_intent_id: paymentIntent.id,
      payment_intent_status: paymentIntent.status,
      latest_charge: paymentIntent.latest_charge || null,
      stripe_test_source: "pm_card_bypassPending",
      balance,
      note: "Use this only in Stripe test mode to fund platform balance for payout testing.",
    });
  } catch (error) {
    console.log(error);
    return handleError(res, 500, error?.message || "Internal Server Error");
  }
};

export const getStripePlatformBalance = async (req, res) => {
  try {
    const balance = await stripe.balance.retrieve();
    return handleSuccess(res, 200, "Stripe platform balance fetched successfully", balance);
  } catch (error) {
    console.log(error);
    return handleError(res, 500, error?.message || "Internal Server Error");
  }
};

export const getAllInquiries = async (req, res) => {
  try {
    let rows = await fetchallInquiriesModel()
    if (!rows?.length) {
      return handleSuccess(res, 400, "No inquiries found", []);
    }
    return handleSuccess(res, 200, "All inquiries", rows);
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};


export const getAllOfferList = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!userDetails?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const offers = await getAllOfferListModel();

    return handleSuccess(
      res,
      StatusCode.status200,
      offers?.length ? "Offer list" : Message.dataNotFound,
      offers || []
    );
  } catch (error) {
    console.log(error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


export const getAllRatingsAdminController = async (req, res) => {
  try {
    const data = await getAllRatingsForAdmin();

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      data
    );
  } catch (error) {
    console.log(error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const fetchAdminNotifications = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const userDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);
    if (!userDetails?.length) {
      return handleError(res, StatusCode.status400, 'Admin not found');
    }
    const notifications = await getAdminNotifications(admin_id);
    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, notifications);
  } catch (error) {
    console.log("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const deleteAdminNotifications = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const adminDetails = await getDataByLabel(DB_TABLE.admin, "admin_id", admin_id);

    if (!adminDetails?.length) {
      return handleError(res, StatusCode.status400, "Admin not found");
    }

    const rawNotificationId = req.body?.notification_id ?? req.query?.notification_id;
    const hasNotificationId =
      rawNotificationId !== undefined &&
      rawNotificationId !== null &&
      rawNotificationId !== "";

    const notification_id = hasNotificationId ? Number(rawNotificationId) : null;

    if (hasNotificationId && !Number.isInteger(notification_id)) {
      return handleError(res, StatusCode.status400, "Valid notification_id is required");
    }

    const result = await hardDeleteNotificationsByReceiver(
      admin_id,
      "admin",
      notification_id
    );

    if (hasNotificationId && !result?.affectedRows) {
      return handleError(res, StatusCode.status404, "Notification not found");
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      hasNotificationId
        ? "Notification deleted successfully"
        : "All notifications deleted successfully"
    );
  } catch (error) {
    console.log("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};



// CREATE
export const createCancellationPolicy = async (req, res) => {
  try {
    const admin_id = req.user?.admin_id;
    const admin_percentage = req.user?.admin_commission;

    const { policy_name, days_before, host_percentage } = req.body;
    // if (!policy_name || !days_before || !host_percentage) {
    //   return handleError(res, StatusCode.status400, "All fields are required");
    // }
    const result = await createCancellationPolicyModel({
      policy_name,
      days_before,
      host_percentage,
      admin_percentage,
      admin_id
    });

    return handleSuccess(res, StatusCode.status200, "Policy created successfully", result);

  } catch (error) {
    console.log("Error:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


// GET ALL
export const getCancellationPolicies = async (req, res) => {
  try {
    const result = await getCancellationPoliciesModel();

    return handleSuccess(res, StatusCode.status200, 'Policies found', result);

  } catch (error) {
    console.log("Error:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


// GET BY ID
export const getCancellationPolicyById = async (req, res) => {
  try {
    const policy_id = Number(req.params.policy_id);

    if (!Number.isInteger(policy_id)) {
      return handleError(res, StatusCode.status400, "Valid policy_id is required");
    }

    const result = await getCancellationPolicyByIdModel(policy_id);

    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessfull, result);

  } catch (error) {
    console.log("Error:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


// UPDATE
export const updateCancellationPolicy = async (req, res) => {
  try {
    const admin_percentage = req.user?.admin_commission;

    const { policy_id, policy_name, days_before, host_percentage } = req.body;

    if (!policy_id) {
      return handleError(res, StatusCode.status400, "policy_id is required");
    }

    const result = await updateCancellationPolicyModel({
      policy_id,
      policy_name,
      days_before,
      host_percentage,
      admin_percentage
    });

    return handleSuccess(res, StatusCode.status200, "Policy updated successfully", result);

  } catch (error) {
    console.log("Error:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


// DELETE (soft)
export const deleteCancellationPolicy = async (req, res) => {
  try {
    const { policy_id } = req.body;

    if (!policy_id) {
      return handleError(res, StatusCode.status400, "policy_id is required");
    }

    await deleteCancellationPolicyModel(policy_id);

    return handleSuccess(res, StatusCode.status200, "Policy deleted successfully");

  } catch (error) {
    console.log("Error:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};
