import path from "path";
import crypto from "crypto";
import { NotificationTypes, StatusCode } from "../utils/constant.js";
import { DB_TABLE, Message } from "../utils/Messages.js";
import { handleError, handleSuccess } from "../utils/responseHandler.js";
import { pushAndStoreNotification } from "../utils/notification.js";

import {
  getDataByLabel,
  addDataIntoTable,
  updateDataByLabel,
  hardDeleteNotificationsByReceiver,
} from "../models/commonModels.js";
import {
  __dirname,
  hashPassword,
  generateToken,
  comparePassword,
  sendVerificationEmail,
  randomStringAsBase64Url,
  sendForgotPasswordEmailUser,
  decodeId,
  generateStrongPassword,
  sendSubUserCredentialsEmail,
  sendBookingRequestEmail,
  sendBookingConfirmedEmail,
  generateTransactionId,
  sendBookingConfirmedHostEmail,
  sendBookingCancelledEmail,
} from "../utils/user_helper.js";
import { type } from "os";
import nodemailer from "nodemailer";
import {
  addWishlistModel, bulkInsertGuestDocuments, cancelBookingModel, checkBookingPaymentStatus, checkPropertyBooking, checkSubGuestBookingCount, deleteGuestDocumentsByUserType, getActiveSubscriptionPlans, getAdminEarnings, getAllBookingOfUser, getBookingPayments, getBusinessBookingsById, getBusnessAllDashboardCount, getGuestDashboardCount, getGuestDocumentsByUserType, getGuestRecentBookings, getHostRating, getKycDoc, getPaymentHistoryBookingBYIdModel, getPaymentHistoryBookingModel, getProperty, getPropertyBYId, getPropertyById, getPropertyFilter, getPropertyReview, getRecentBookingOfUser, getRecentBookings, getReportsModel, getSingleBookingOfUser, getSubGuest, getSupportTicketModel, getUserByAct_Token, getWishlistByUser, getWishlistByUserAndProperty, getWishlistPropertyIdsForUser, removeWishlistModel, restoreWishlistModel,
  getPropertyReviewById,
  // -------------------------user inquiry----------------------
  fetchUserPropertyByPropertyId,
  fetchUserInquiryByUserId,
  fetchSeoMasterByPageSlug,

  getActiveOfferByPropertyId,
  getUserNotifications,

} from "../models/usersModel.js";
import { getDataByLabel2, getServiceFeeModel } from "../models/adminModel.js";
import { getAllPropertySafety, getBooking, getHouseRulesByIds, getPropertyAmenitits, getPropertyIdealFor } from "../models/hostModel.js";
// const hbs = require("nodemailer-express-handlebars");
const BASE_URL = process.env.BASE_URL;

import Stripe from "stripe";
import { getAllGuestsIds } from "../utils/misc.util.js";
import { generatePdfService } from "../services/generatePdf.js";
import { sendAgreementService } from "../services/sendAgreement.js";
import jwt from "jsonwebtoken";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const calculateHostPayoutAmount = (totalAmount, adminEarnings) => {
  const payoutAmount = Number(totalAmount || 0) - Number(adminEarnings || 0);
  return Number(Math.max(0, payoutAmount).toFixed(2));
};

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

const getLatestBookingPayment = async (booking_id) => {
  const bookingPaymentHistory = await getPaymentHistoryBookingBYIdModel(booking_id);
  const paymentDetailsRaw = bookingPaymentHistory?.[0]?.payment_details;

  if (!paymentDetailsRaw) return null;

  let paymentDetails = paymentDetailsRaw;

  if (typeof paymentDetailsRaw === "string") {
    try {
      paymentDetails = JSON.parse(paymentDetailsRaw);
    } catch {
      paymentDetails = [];
    }
  }

  if (!Array.isArray(paymentDetails) || paymentDetails.length === 0) {
    return null;
  }

  return paymentDetails[paymentDetails.length - 1];
};

const calculateCancellationRefundBreakdown = ({
  bookingDate,
  checkinDate,
  cancellationDate,
  paidAmount,
}) => {
  const bookingTime = new Date(bookingDate);
  const checkinTime = new Date(checkinDate);
  const cancellationTime = new Date(cancellationDate);
  const paid = roundCurrency(paidAmount);
  const oneDayMs = 1000 * 60 * 60 * 24;

  const bookingToCancellationMs = cancellationTime - bookingTime;
  const totalWindowMs = checkinTime - bookingTime;
  const remainingWindowMs = checkinTime - cancellationTime;

  let deductionPercentage = 0;
  let usedPercentage = 0;
  let ruleApplied = "full_refund_within_24_hours_of_booking";

  if (cancellationTime >= checkinTime) {
    deductionPercentage = 100;
    usedPercentage = 100;
    ruleApplied = "no_refund_after_checkin";
  } else if (bookingToCancellationMs <= oneDayMs) {
    deductionPercentage = 0;
    usedPercentage = 0;
    ruleApplied = "full_refund_within_24_hours_of_booking";
  } else {
    if (totalWindowMs > 0) {
      usedPercentage = ((totalWindowMs - remainingWindowMs) / totalWindowMs) * 100;
    } else {
      usedPercentage = 100;
    }

    usedPercentage = Math.min(100, Math.max(0, usedPercentage));

    if (usedPercentage <= 20) {
      deductionPercentage = 10;
      ruleApplied = "0_to_20_percent_used";
    } else if (usedPercentage <= 50) {
      deductionPercentage = 25;
      ruleApplied = "20_to_50_percent_used";
    } else if (usedPercentage <= 80) {
      deductionPercentage = 50;
      ruleApplied = "50_to_80_percent_used";
    } else {
      deductionPercentage = 100;
      ruleApplied = "80_to_100_percent_used";
    }
  }

  const deductionAmount = roundCurrency((paid * deductionPercentage) / 100);
  const refundAmount = roundCurrency(Math.max(0, paid - deductionAmount));

  return {
    booking_date: bookingTime,
    checkin_date: checkinTime,
    cancellation_date: cancellationTime,
    total_days: Number((Math.max(totalWindowMs, 0) / oneDayMs).toFixed(2)),
    remaining_days: Number((Math.max(remainingWindowMs, 0) / oneDayMs).toFixed(2)),
    used_percentage: Number(usedPercentage.toFixed(2)),
    deduction_percentage: deductionPercentage,
    paid_amount: paid,
    deduction_amount: deductionAmount,
    refund_amount: refundAmount,
    refund_status:
      refundAmount === paid
        ? "FULL_REFUND"
        : refundAmount > 0
          ? "PARTIAL_REFUND"
          : "NO_REFUND",
    rule_applied: ruleApplied,
  };
};

const getOptionalUserIdFromRequest = async (req) => {
  try {
    const authorizationHeader = req.headers["authorization"];
    if (!authorizationHeader) return null;
    const tokenParts = authorizationHeader.split(" ");
    if (tokenParts[0] !== "Bearer" || !tokenParts[1]) return null;

    const decodedToken = jwt.verify(tokenParts[1], process.env.AUTH_SECRETKEY);
    const [user] = await getDataByLabel(
      DB_TABLE.users,
      "id",
      decodedToken.data.id
    );
    if (!user || user.is_active == 0 || user.is_blocked == 1) return null;
    return user.id;
  } catch (error) {
    return null;
  }
};


export const userRegister = async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;
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
    };
    const add_user = await addDataIntoTable(DB_TABLE.users, data);
    if (add_user?.affectedRows > 0) {
      await sendVerificationEmail(act_token, email, res);
    } else {
      return handleError(
        res,
        StatusCode.status400,
        Message.failedToUsersCreate
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

export const userEmailVarify = async (req, res) => {
  try {
    const act_token = req?.params?.act_token || "";
    if (!act_token) {
      return handleError(res, StatusCode.status400, Message.INVALID_URL);
    } else {
      const userDetails = await getDataByLabel(
        DB_TABLE.users,
        "act_token",
        act_token
      );
      if (userDetails?.length == 0) {
        return res.sendFile(path.join(__dirname, "../view/notverify.html"));
      };
      const data = {
        is_verify: 1,
        act_token: "",
      };
      const result = await updateDataByLabel(
        DB_TABLE?.users,
        data,
        "id",
        userDetails[0]?.id
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

export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await getDataByLabel(DB_TABLE.users, "email", email);
    if (userData?.length == 0) {
      return handleError(res, StatusCode.status400, Message.accountNotFound);
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
    const password_check = await comparePassword(
      password,
      userData[0]?.password
    );
    if (!password_check) {
      return handleError(res, StatusCode.status400, Message.invalidPassword);
    }
    const jwt_token = generateToken(userData[0]);
    return handleSuccess(
      res,
      StatusCode.status200,
      Message.loginSuccess,
      jwt_token
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

export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    const userId = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", userId);
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
      DB_TABLE.users,
      data,
      "id",
      userDetails[0].id
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

var transporter = nodemailer.createTransport({
  // service: 'gmail',
  host: "smtp.gmail.com",
  port: 587,
  // secure: true,
  auth: {
    user: "kpatel74155@gmail.com",
    pass: "mitbpoatzprnwfac",
  },
});

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
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
    const BASE_URL = process.env.BASE_URL
    if (update_data?.affectedRows > 0) {

      await sendForgotPasswordEmailUser(act_token, email, res, 1);
    } else {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }
    console.log({ update_data });
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
    const userId = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", userId);

    const finalData = userDetails?.map((item, i) => {
      return {
        ...item,
        profile_image: item?.profile_image
          ? `${process.env.BASE_URL}profile/${item?.profile_image}`
          : "",
      };
    });

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

export const updateProfile = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      address,
      nationality,
      gender,
      dob,
      business_name, country
    } = req.body;
    const file = req.file;
    const userId = req.user?.id;
    let data = {
      first_name,
      last_name,
      phone,
      address,
      nationality,
      gender,
      dob,
      business_name, country
    };
    console.log({ file });
    if (file) {
      data.profile_image = file?.filename;
    }
    const result = await updateDataByLabel(DB_TABLE.users, data, "id", userId);
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

export const forgotResetPassword = async (req, res) => {
  try {
    const act_token = req?.params?.act_token || "";

    if (!act_token) {
      return handleError(res, StatusCode.status400, Message.INVALID_URL);
    }

    const userDetails = await getDataByLabel(DB_TABLE.users, "act_token", act_token);

    if (!userDetails || userDetails.length === 0) {
      return res.sendFile(path.join(__dirname, "../view/forgotPasswordError.html"));
    }


    return res.render(
      path.join(__dirname, "../view/forgetPassword.ejs"),
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


    const [userDetails] = await getUserByAct_Token(act_token);
    console.log(userDetails)
    if (!userDetails) {
      return res.sendFile(path.join(__dirname, "../view/forgotPasswordError.html"));
    }

    const hash = await hashPassword(password);
    const data = { password: hash, act_token: null };
    const result = await updateDataByLabel(
      DB_TABLE.users,
      data,
      "id",
      userDetails.id
    );
    if (result?.affectedRows) {
      return res.sendFile(path.join(__dirname, "../view/password-reset-success.html"));
    } else {
      return res.sendFile(path.join(__dirname, "../view/forgotPasswordError.html"));
    }
  } catch (error) {
    console.log(error);

    res.render(path.join(__dirname, "/view/", "adminforgetPassword.ejs"), {
      msg: "Internal server error",
    });
  }
};


export const getAllProperty = async (req, res) => {
  try {
    const optionalUserId = await getOptionalUserIdFromRequest(req);
    const property = await getProperty();
    if (!property?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, property);
    }

    let wishlistSet = new Set();
    if (optionalUserId) {
      const propertyIds = property.map((p) => p.property_id);
      const wishlistRows = await getWishlistPropertyIdsForUser(
        optionalUserId,
        propertyIds
      );
      wishlistSet = new Set(wishlistRows.map((r) => r.property_id));
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

        [item.rating] = await getHostRating(item.host_id);
        let review = await getPropertyReview(item.property_id);
        review?.map((data) => {
          data.profile_image = data.profile_image
            ? `${process.env.BASE_URL}profile/${data.profile_image}`
            : "";
        });
        item.reviews = review;
        item.is_wishlist = wishlistSet.has(item.property_id);
        [item.canellationPolicy] = await getDataByLabel(
          DB_TABLE.cancellationPolicy, "content_type", 3);

        const bookings = await checkPropertyBooking(item.property_id);
        const expandDates = (start, end) => {
          const dates = [];
          const current = new Date(start);
          const toDate = new Date(end);

          while (current <= toDate) {
            // Format YYYY-MM-DD
            const yyyy = current.getFullYear();
            const mm = String(current.getMonth() + 1).padStart(2, '0');
            const dd = String(current.getDate()).padStart(2, '0');
            dates.push(`${yyyy}-${mm}-${dd}`);

            current.setDate(current.getDate() + 1);
          }

          return dates;
        };

        // Flatten all date ranges into individual dates
        item.booked_dates = bookings.flatMap(b => expandDates(b.start_date, b.end_date));

        const offer = await getActiveOfferByPropertyId(item.property_id);

        if (offer) {
          item.offer_value = offer.offer_value;
          item.offer_type = offer.offer_type;
          item.offer_start_date = offer.start_date;
          item.offer_end_date = offer.end_date;
        } else {
          item.offer_value = null;
          item.offer_type = null;
          item.offer_start_date = null;
          item.offer_end_date = null;
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

export const getAllPropertyFilter = async (req, res) => {
  try {
    const {
      sort_by,
      amenties,
      min_price,
      max_price,
      bed_bath,
      bhk,
      location,
      max_person,
      move_in,
      move_out,

      //   // ✅ NEW (viewport)
      // sw_lat,
      // sw_lng,
      // ne_lat,
      // ne_lng

      viewport, // 👈 stringified viewport
    } = req.query;

    let sw_lat = null;
    let sw_lng = null;
    let ne_lat = null;
    let ne_lng = null;

    // // ✅ Parse viewport if present
    // if (viewport) {
    //   try {
    //     const parsedViewport =
    //       typeof viewport === "string" ? JSON.parse(viewport) : viewport;

    //     sw_lat = parsedViewport.sw_lat;
    //     sw_lng = parsedViewport.sw_lng;
    //     ne_lat = parsedViewport.ne_lat;
    //     ne_lng = parsedViewport.ne_lng;
    //   } catch (err) {
    //     return handleError(
    //       res,
    //       StatusCode.status400,
    //       "Invalid viewport format"
    //     );
    //   }
    // }

    if (viewport) {
      try {
        console.log("Viewport:", viewport);
        const parsed =
          typeof viewport === "string" ? JSON.parse(viewport) : viewport;

        // ✅ Map Google bounds → DB query bounds
        sw_lat = parseFloat(parsed.south);
        sw_lng = parseFloat(parsed.west);
        ne_lat = parseFloat(parsed.north);
        ne_lng = parseFloat(parsed.east);

        if (
          Number.isNaN(sw_lat) ||
          Number.isNaN(sw_lng) ||
          Number.isNaN(ne_lat) ||
          Number.isNaN(ne_lng)
        ) {
          throw new Error("Invalid viewport values");
        }
      } catch (err) {
        return handleError(
          res,
          StatusCode.status400,
          "Invalid viewport format"
        );
      }
    }

    const property = await getPropertyFilter(
      sort_by,
      amenties,
      min_price,
      max_price,
      bed_bath,
      bhk,
      location,
      max_person,

      sw_lat,
      sw_lng,
      ne_lat,
      ne_lng
    );

    if (!property?.length) {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.dataNotFound,
        property
      );
    }

    const optionalUserId = await getOptionalUserIdFromRequest(req);
    let wishlistSet = new Set();
    if (optionalUserId) {
      const propertyIds = property.map((p) => p.property_id);
      const wishlistRows = await getWishlistPropertyIdsForUser(
        optionalUserId,
        propertyIds
      );
      wishlistSet = new Set(wishlistRows.map((r) => r.property_id));
    }

    const requestedFrom = move_in ? new Date(move_in) : null;
    const requestedTo = move_out ? new Date(move_out) : null;

    let filteredProperties = property;

    // If date range is provided, filter out overlapping bookings
    if (requestedFrom && requestedTo) {
      filteredProperties = [];

      for (const item of property) {
        const bookings = await checkPropertyBooking(item.property_id); // Fetch bookings for property

        const isOverlapping = bookings.some((b) => {
          const bookedFrom = new Date(b.start_date);
          const bookedTo = new Date(b.end_date);

          return (
            (requestedFrom >= bookedFrom && requestedFrom <= bookedTo) || // Start inside booked
            (requestedTo >= bookedFrom && requestedTo <= bookedTo) || // End inside booked
            (requestedFrom <= bookedFrom && requestedTo >= bookedTo) // Encloses booking
          );
        });

        if (!isOverlapping) {
          filteredProperties.push(item);
        }
      }
    }

    // Attach extra details
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
        item.video_url = item?.video_url
          ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        let amenities = item.amenities ? item.amenities.split(",") : [];
        let safety_amenities = item.safety_amenities
          ? item.safety_amenities.split(",")
          : [];
        let ideal_for = item.ideal_for ? item.ideal_for.split(",") : [];
        let house_rules = item.house_rules ? item.house_rules.split(",") : [];

        if (Array.isArray(amenities) && amenities.length > 0) {
          item.amenities_label = await getPropertyAmenitits(amenities);
        }

        if (Array.isArray(safety_amenities) && safety_amenities.length > 0) {
          item.safety_amenities_label = await getAllPropertySafety(
            safety_amenities
          );
        }

        if (Array.isArray(ideal_for) && ideal_for.length > 0) {
          item.ideal_for_label = await getPropertyIdealFor(ideal_for);
        }
        if (Array.isArray(house_rules) && house_rules.length > 0) {
          item.house_rules_label = await getHouseRulesByIds(house_rules);
        }

        [item.rating] = await getHostRating(item.host_id);
        let review = await getPropertyReview(item.property_id);
        review?.map((data) => {
          data.profile_image = data.profile_image
            ? `${process.env.BASE_URL}profile/${data.profile_image}`
            : "";
        });
        item.reviews = review;
        item.is_wishlist = wishlistSet.has(item.property_id);
        [item.canellationPolicy] = await getDataByLabel(
          DB_TABLE.cancellationPolicy,
          "content_type",
          3
        );

        const bookings = await checkPropertyBooking(item.property_id);
        const expandDates = (start, end) => {
          const dates = [];
          const current = new Date(start);
          const toDate = new Date(end);

          while (current <= toDate) {
            // Format YYYY-MM-DD
            const yyyy = current.getFullYear();
            const mm = String(current.getMonth() + 1).padStart(2, "0");
            const dd = String(current.getDate()).padStart(2, "0");
            dates.push(`${yyyy}-${mm}-${dd}`);

            current.setDate(current.getDate() + 1);
          }

          return dates;
        };

        // Flatten all date ranges into individual dates
        item.booked_dates = bookings.flatMap((b) =>
          expandDates(b.start_date, b.end_date)
        );

        const offer = await getActiveOfferByPropertyId(item.property_id);

        if (offer) {
          item.offer_value = offer.offer_value;
          item.offer_type = offer.offer_type;
          item.offer_start_date = offer.start_date;
          item.offer_end_date = offer.end_date;
        } else {
          item.offer_value = null;
          item.offer_type = null;
          item.offer_start_date = null;
          item.offer_end_date = null;
        }


      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      filteredProperties
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


export const getPropertyByIdController = async (req, res) => {
  try {
    const { property_id } = req.params;
    const [property] = await getPropertyBYId(property_id);

    if (!property) {
      return handleError(
        res,
        StatusCode.status404,
        Message.msgPropertyNotFound
      );
    }

    const optionalUserId = await getOptionalUserIdFromRequest(req);
    let isWishlist = false;
    if (optionalUserId) {
      const wishlistRows = await getWishlistPropertyIdsForUser(optionalUserId, [
        property.property_id,
      ]);
      isWishlist = wishlistRows.some(
        (item) => item.property_id === property.property_id
      );
    }

    const image = await getDataByLabel(
      DB_TABLE.propertyImage,
      "property_id",
      property.property_id
    );

    const finalData = image?.map((item) => ({
      ...item,
      image: item?.image ? `${process.env.BASE_URL}profile/${item?.image}` : "",
    }));
    property.propertyImage = finalData;
    property.video_url = property?.video_url
      ? `${process.env.BASE_URL}profile/${property?.video_url}`
      : "";

    const amenities = property.amenities ? property.amenities.split(",") : [];
    const safety_amenities = property.safety_amenities
      ? property.safety_amenities.split(",")
      : [];
    const ideal_for = property.ideal_for ? property.ideal_for.split(",") : [];
    const house_rules = property.house_rules ? property.house_rules.split(",") : [];

    if (Array.isArray(amenities) && amenities.length > 0) {
      property.amenities_label = await getPropertyAmenitits(amenities);
    }

    if (Array.isArray(safety_amenities) && safety_amenities.length > 0) {
      property.safety_amenities_label = await getAllPropertySafety(
        safety_amenities
      );
    }

    if (Array.isArray(ideal_for) && ideal_for.length > 0) {
      property.ideal_for_label = await getPropertyIdealFor(ideal_for);
    }

    if (Array.isArray(house_rules) && house_rules.length > 0) {
      property.house_rules_label = await getHouseRulesByIds(house_rules);
    }

    [property.rating] = await getHostRating(property.host_id);
    const review = await getPropertyReview(property.property_id);
    review?.map((item) => {
      item.profile_image = item.profile_image
        ? `${process.env.BASE_URL}profile/${item.profile_image}`
        : "";
    });
    property.reviews = review;
    property.is_wishlist = isWishlist;
    [property.canellationPolicy] = await getDataByLabel(
      DB_TABLE.cancellationPolicy,
      "content_type",
      3
    );

    const bookings = await checkPropertyBooking(property.property_id);
    const expandDates = (start, end) => {
      const dates = [];
      const current = new Date(start);
      const toDate = new Date(end);

      while (current <= toDate) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, "0");
        const dd = String(current.getDate()).padStart(2, "0");
        dates.push(`${yyyy}-${mm}-${dd}`);
        current.setDate(current.getDate() + 1);
      }

      return dates;
    };

    property.booked_dates = bookings.flatMap((item) =>
      expandDates(item.start_date, item.end_date)
    );

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


// export const getAllPropertyFilter = async (req, res) => {
//   try {
//     const { sort_by, amenties, min_price, max_price, bed_bath, bhk, location,max_person, } = req.query;

//     const property = await getPropertyFilter(sort_by, amenties, min_price, max_price, bed_bath, bhk, location,max_person);



//     if (!property?.length) {
//       return handleSuccess(res, StatusCode.status200, Message.dataNotFound, property);
//     }

//     await Promise.all(
//       property.map(async (item) => {
//         let image = await getDataByLabel(
//           DB_TABLE.propertyImage,
//           "property_id",
//           item.property_id
//         );

//                   let finalData = image?.map((item, i) => {
//       return {
//         ...item,
//         image: item?.image
//           ? `${process.env.BASE_URL}profile/${item?.image}`
//           : "",
//       };
//     });
//     item.propertyImage = finalData;
//     item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
//           : "";


//         [item.rating] = await getHostRating(item.host_id);
//         [item.canellationPolicy] = await getDataByLabel(
//           DB_TABLE.cancellationPolicy, "content_type", 3);
//       })
//     );

//     return handleSuccess(
//       res,
//       StatusCode.status200,
//       Message.dataFoundSuccessful,
//       property
//     );


//   } catch (error) {
//     console.log("Error :", error);
//     return handleError(
//       res,
//       StatusCode.status500,
//       Message.INTERNAL_SERVER_ERROR
//     );
//   }
// };

export const propertyBooking = async (req, res) => {
  try {
    const id = req.user?.id;
    console.log('id', id);

    const { property_id, booked_from, booked_to, total_price, purpose_of_stay, guest, user_earning, full_name, email, nationality, phone_number, offer_value } = req.body;

    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);


    if (userDetails[0]?.added_by) {
      const [checkSubUser] = await checkSubGuestBookingCount(id);
      if (checkSubUser?.is_exceeded) {
        return handleError(res, StatusCode.status400, Message.msgSubUserExceeded);
      }
    }

    const propertyDetails = await getPropertyById(property_id);

    if (propertyDetails?.length <= 0)
      return handleError(res, StatusCode.status400, Message.msgPropertyNotFound);

    const bookings = await checkPropertyBooking(property_id);
    const requestedFrom = new Date(booked_from);
    const requestedTo = new Date(booked_to);

    const isOverlapping = bookings.some(b => {
      const bookedFrom = new Date(b.start_date);
      const bookedTo = new Date(b.end_date);

      return (
        (requestedFrom >= bookedFrom && requestedFrom <= bookedTo) ||
        (requestedTo >= bookedFrom && requestedTo <= bookedTo) ||
        (requestedFrom <= bookedFrom && requestedTo >= bookedTo)
      );
    });

    if (isOverlapping) {
      return handleError(res, StatusCode.status400, Message.propertyAlreadyBooked);
    }


    let [host_earning_details] = await getAdminEarnings(2);

    if (!host_earning_details) {
      host_earning_details = {
        fee_type: 1,
        commission: 10.00
      };
    }

    let host_earning;

    if (host_earning_details.fee_type == 1) {
      host_earning = total_price * (host_earning_details.commission / 100);
    } else if (host_earning_details.fee_type == 2) {
      host_earning = total_price - host_earning_details.commission;
    }

    const data = {
      property_id,
      booked_from,
      booked_to,
      total_price,
      purpose_of_stay,
      guest,
      user_earning,
      host_earning,
      user_id: id,
      host_id: propertyDetails[0].host_id,
      monthly_rent: propertyDetails[0].monthly_rent,
      security_deposit: propertyDetails[0].security_deposit,
      stay_duration: Math.ceil(
        (new Date(booked_to) - new Date(booked_from)) / (1000 * 60 * 60 * 24)
      ),
      full_name, email, nationality, phone_number,
      cleaning_fee_type: propertyDetails[0].cleaning_fee_type,
      cleaning_fee: propertyDetails[0].cleaning_fee,
      offer_value: offer_value ? offer_value : 0
    };

    const booking = await addDataIntoTable(DB_TABLE.booking, data);

    if (booking?.affectedRows) {
      const [host_details] = await getDataByLabel(DB_TABLE.host, "host_id", propertyDetails[0].host_id);
      await sendBookingRequestEmail(`${host_details.first_name} ${host_details.last_name}`, host_details.email, res, booking.insertId, propertyDetails[0].property_title, booked_from, booked_to, guest, propertyDetails[0].monthly_rent)

      await pushAndStoreNotification({
        sender_id: id,
        sender_type: "user",
        receiver_id: propertyDetails[0].host_id,
        receiver_type: "host",
        title: "New Booking Request",
        message: `${full_name} sent a booking request for ${propertyDetails[0].property_title}`,
        reference_id: booking.insertId,
        reference_type: "booking",
        notification_type: NotificationTypes.BOOKING_REQUEST,
        // fcm_token: host_details.fcm_token
        fcm_token: 'Testing_host_token'
      });

      return handleSuccess(res, StatusCode.status200, Message.bookingRequestReceived);
    } else {
      return handleError(res, StatusCode.status400, Message.bookingFailed);
    }
  } catch (error) {
    console.log(error);

    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};




// export const bookingPaymentConfirmed = async (req, res) => {
//   try {
//     const id = req.user?.id;
//     const { booking_id, } = req.body;

//     const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

//     if (!userDetails?.length)
//       return handleError(res, StatusCode.status400, Message.dataNotFound);

//     if (!booking_id) {
//       return handleError(res, StatusCode.status400, "Booking ID is required.");
//     }

//     const bookingDetails = await getBooking(booking_id);
//     const start_date = bookingDetails[0].booked_from;
//     const end_date = bookingDetails[0].booked_to;
//     const security_deposit = bookingDetails[0].security_deposit;
//     const platform_fee = bookingDetails[0].user_earning;
//     const total_amount = bookingDetails[0].total_price;

//     if (!bookingDetails?.length) {
//       return handleError(res, StatusCode.status400, Message.dataNotFound);
//     }
//     const transaction_id = generateTransactionId()
//     const updateData = {
//       payment_status: 1,
//       payment_at: new Date()
//     };

//     let [host_earning_details] = await getAdminEarnings(2);

//     if (!host_earning_details) {
//       host_earning_details = {
//         fee_type: 1,
//         commission: 10.00
//       };
//     }

//     let admin_earnings;

//     if (host_earning_details.fee_type == 1) {
//       admin_earnings = total_amount * (host_earning_details.commission / 100);
//     } else if (host_earning_details.fee_type == 2) {
//       admin_earnings = total_amount - host_earning_details.commission;
//     }

//     const paymentData = {
//       booking_id,
//       user_id: id,
//       start_date,
//       end_date,
//       security_deposit,
//       platform_fee,
//       total_amount,
//       transaction_id,
//       number_of_days: Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)),
//       admin_earnings,
//       payment_status: "COMPLETED",
//       payment_method: "CARD"
//     }
//     const result = await updateDataByLabel(DB_TABLE.booking, updateData, "booking_id", booking_id);


//     if (result?.affectedRows) {
//       const paymentResult = await addDataIntoTable(DB_TABLE.payment, paymentData);

//       await sendBookingConfirmedEmail(`${bookingDetails[0].first_name} ${bookingDetails[0].last_name}`, bookingDetails[0].email, res, booking_id, bookingDetails[0].property_title, bookingDetails[0].booked_from, bookingDetails[0].booked_to, bookingDetails[0].guest, bookingDetails[0].total_amount)
//     } else {
//       return handleError(res, StatusCode.status400, Message.somethingWentWrong);
//     }

//   } catch (error) {
//     console.error("Error in bookingPaymentConfirmed:", error);
//     return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
//   }
// };


export const bookingPaymentConfirmed = async (req, res) => {
  try {
    const id = req.user?.id;
    const { booking_id } = req.body;

    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (!booking_id) {
      return handleError(res, StatusCode.status400, "Booking ID is required.");
    }

    const bookingDetails = await getBooking(booking_id);

    if (!bookingDetails?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const booking = bookingDetails[0];

    const start_date = booking.booked_from;
    const end_date = booking.booked_to;
    const security_deposit = booking.security_deposit;
    const platform_fee = booking.user_earning;
    const original_total = Number(booking.total_price) || 0;
    const offer_value = Number(booking.offer_value) || 0;

    // ✅ APPLY OFFER
    const total_amount = original_total - offer_value;

    const transaction_id = generateTransactionId();

    const updateData = {
      payment_status: 1,
      payment_at: new Date()
    };

    let [host_earning_details] = await getAdminEarnings(2);

    if (!host_earning_details) {
      host_earning_details = {
        fee_type: 1,
        commission: 10.00
      };
    }

    let admin_earnings = 0;

    // ✅ APPLY ON FINAL AMOUNT (after discount)
    if (host_earning_details.fee_type == 1) {
      admin_earnings = total_amount * (host_earning_details.commission / 100);
    } else if (host_earning_details.fee_type == 2) {
      admin_earnings = total_amount - host_earning_details.commission;
    }

    admin_earnings = Number(admin_earnings.toFixed(2));
    const host_payout_amount = calculateHostPayoutAmount(total_amount, admin_earnings);

    const paymentData = {
      booking_id,
      user_id: id,
      start_date,
      end_date,
      security_deposit,
      platform_fee,
      total_amount, // ✅ discounted amount
      offer_value,  // ✅ save offer
      transaction_id,
      number_of_days: Math.ceil(
        (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)
      ),
      admin_earnings,
      host_payout_amount,
      release_on: start_date,
      payout_status: "PENDING",
      payment_status: "COMPLETED",
      payment_method: "CARD"
    };

    const result = await updateDataByLabel(
      DB_TABLE.booking,
      updateData,
      "booking_id",
      booking_id
    );

    if (result?.affectedRows) {

      const paymentResult = await addDataIntoTable(DB_TABLE.payment, paymentData);

      await pushAndStoreNotification({
        sender_id: id,
        sender_type: "user",
        receiver_id: booking.host_id,
        receiver_type: "host",
        title: "Payment Received",
        message: `Payment received for booking of ${booking.property_title}`,
        reference_id: booking_id,
        reference_type: "booking",
        notification_type: NotificationTypes.PAYMENT_RECEIVED,
        fcm_token: 'Testing_host_fcm_token'
      });

      await sendBookingConfirmedEmail(
        `${booking.first_name} ${booking.last_name}`,
        booking.email,
        res,
        booking_id,
        booking.property_title,
        booking.booked_from,
        booking.booked_to,
        booking.guest,
        total_amount // ✅ send discounted amount
      );

      return handleSuccess(res, StatusCode.status200, "Payment completed successfully", paymentResult);

    } else {
      return handleError(res, StatusCode.status400, Message.somethingWentWrong);
    }

  } catch (error) {
    console.error("Error in bookingPaymentConfirmed:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


export const getAllBooking = async (req, res) => {
  try {
    const id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const booking = await getAllBookingOfUser(id);



    if (!booking?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, booking);
    }

    await Promise.all(
      booking.map(async (item) => {
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
        [item.rating] = await getHostRating(item.host_id);
        [item.canellationPolicy] = await getDataByLabel(
          DB_TABLE.cancellationPolicy, "content_type", 3);
        if (item.booked_to > new Date()) {
          item.isActive = true;
        } else if (item.booked_to < new Date()) {
          item.isActive = false;
        }

        item.propertyImage = finalData;
        item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        item.host_image = item?.host_image ? `${process.env.BASE_URL}profile/${item?.host_image}`
          : "";

        const offer = await getActiveOfferByPropertyId(item.property_id);
        if (offer) {
          item.offer_value = offer.offer_value;
          item.offer_type = offer.offer_type;
          item.offer_start_date = offer.start_date;
          item.offer_end_date = offer.end_date;
        } else {
          item.offer_value = null;
          item.offer_type = null;
          item.offer_start_date = null;
          item.offer_end_date = null;
        }

        let amenities = item.amenities ? item.amenities.split(',') : [];
        let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
        let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];
        let house_rules = item.house_rules ? item.house_rules.split(',') : [];

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


        [item.rating] = await getHostRating(item.host_id);
        let review = await getPropertyReview(item.property_id);
        review?.map((data) => {
          data.profile_image = data.profile_image
            ? `${process.env.BASE_URL}profile/${data.profile_image}`
            : "";
        });
        item.reviews = review;

      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      booking
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


export const addSubUsers = async (req, res) => {
  try {
    const id = req.user?.id;
    const { email, first_name, last_name, number_of_bookings } = req.body;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    if (userDetails[0].user_type != 2) {
      return handleError(res, StatusCode.status400, Message.onlyHostCanAddSubUsers);
    }

    const existingUser = await getDataByLabel(DB_TABLE.users, "email", email);

    if (existingUser?.length) {
      return handleError(res, StatusCode.status400, Message.emailAlreadyExist);
    }

    const password = generateStrongPassword();
    const hash = await hashPassword(password);
    const data = {
      email,
      first_name,
      last_name,
      number_of_bookings,
      user_type: 1,
      is_verify: 1,
      is_active: 1,
      added_by: id,
      password: hash,
    };

    const add = await addDataIntoTable(DB_TABLE.users, data);

    if (add?.affectedRows > 0) {
      await sendSubUserCredentialsEmail(email, password, res);
    } else {
      return handleError(res, StatusCode.status400, Message.failedToUsersCreate);
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


export const updateMySubUsers = async (req, res) => {
  try {
    const id = req.user?.id;
    const { number_of_bookings, user_id } = req.body;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    if (userDetails[0].user_type != 2) {
      return handleError(res, StatusCode.status400, Message.onlyHostCanAddSubUsers);
    }

    const subUsers = await getDataByLabel2(DB_TABLE.users, "id", user_id, "added_by", id);

    if (subUsers?.length > 0) {
      const updateData = {
        number_of_bookings
      }
      const update = await updateDataByLabel(DB_TABLE.users, updateData, "id", user_id);
      if (update?.affectedRows > 0) {
        return handleSuccess(res, StatusCode.status200, Message.guestUpdateSuccess);
      } else {
        return handleError(res, StatusCode.status400, Message.failedToGuestUpdate);
      }
    } else {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.dataNotFound,
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

export const addRating = async (req, res) => {
  try {
    const id = req.user?.id;
    const { booking_id, rating, review } = req.body;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const booking = await getDataByLabel2(DB_TABLE.booking, "booking_id", booking_id, "booking_status", 1);

    if (booking?.length <= 0) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const ratingDetails = await getDataByLabel2(DB_TABLE.rating, "booking_id", booking_id, "user_id", id);

    if (ratingDetails?.length > 0) {
      return handleError(res, StatusCode.status400, Message.alreadyRated);
    }

    const data = {
      property_id: booking[0].property_id,
      booking_id,
      user_id: id,
      rating,
      review,
    };
    const add = await addDataIntoTable(DB_TABLE.rating, data);
    if (add?.affectedRows > 0) {
      return handleSuccess(res, StatusCode.status200, Message.ratingAdded);
    } else {
      return handleError(res, StatusCode.status400, Message.failedToRatingAdd);
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

export const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { property_id } = req.body;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", userId);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const property = await getPropertyById(property_id);
    if (!property?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const existing = await getWishlistByUserAndProperty(userId, property_id);
    console.log(existing, "exi")
    if (existing?.length > 0) {
      if (existing[0]?.deleted_at) {
        await restoreWishlistModel(existing[0].id);
        return handleSuccess(res, StatusCode.status200, Message.wishlistAdded, {
          action: "added",
        });
      }

      const removed = await removeWishlistModel(userId, property_id);
      if (removed?.affectedRows > 0) {
        return handleSuccess(res, StatusCode.status200, Message.wishlistRemoved, {
          action: "removed",
        });
      }
      return handleError(res, StatusCode.status400, Message.wishlistNotFound);
    }

    const data = {
      user_id: userId,
      property_id,
    };
    const add = await addWishlistModel(data);
    if (add?.affectedRows > 0) {
      return handleSuccess(res, StatusCode.status200, Message.wishlistAdded, {
        action: "added",
      });
    }
    return handleError(res, StatusCode.status400, Message.somethingWentWrong);
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", userId);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const wishlist = await getWishlistByUser(userId);
    if (!wishlist?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, wishlist);
    }

    await Promise.all(
      wishlist.map(async (item) => {
        let image = await getDataByLabel(
          DB_TABLE.propertyImage,
          "property_id",
          item.property_id
        );

        let finalData = image?.map((img) => {
          return {
            ...img,
            image: img?.image
              ? `${process.env.BASE_URL}profile/${img?.image}`
              : "",
          };
        });
        item.propertyImage = finalData;
        item.video_url = item?.video_url
          ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        item.is_wishlist = true;
      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      wishlist
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

export const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await getActiveSubscriptionPlans();
    if (!plans?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, plans);
    }

    plans?.forEach((item) => {
      if (typeof item?.content === "string") {
        try {
          item.content = JSON.parse(item.content);
        } catch {
          // silently ignore if invalid
        }
      }
    });


    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      plans
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

// export const uploadGuestDocuments = async (req, res) => {
//   try {
//     const { gov_doc_title, address_proof_title, driving_licence_title, business_reg_title } = req.body || {};
//     const userId = req.user?.id;
//     // const file = req.file ? req.file.filename : null;

//     const uploadedFiles = req.files || {};
//     const gov_file = uploadedFiles?.gov_file?.[0]?.filename || null;
//     const address_proof = uploadedFiles?.address_proof?.[0]?.filename || null;
//     const driving_license = uploadedFiles?.driving_license?.[0]?.filename || null;
//     const business_reg = uploadedFiles?.business_reg?.[0]?.filename || null;

//     let data = [];


//     if (gov_doc_title) {
//       data.push({
//         id: userId,
//         title: gov_doc_title,
//         file: gov_file,
//         user_type: 1
//       });
//     }

//     if (address_proof_title) {
//       data.push({
//         id: userId,
//         title: address_proof_title,
//         file: address_proof,
//         user_type: 1
//       });
//     }

//     if (driving_licence_title) {
//       data.push({
//         id: userId,
//         title: driving_licence_title,
//         file: driving_license,
//         user_type: 1
//       });
//     }

//     if (business_reg_title) {
//       data.push({
//         id: userId,
//         title: business_reg_title,
//         file: business_reg,
//         user_type: 1
//       });
//     }

//     const userDetails = await getDataByLabel(DB_TABLE.users, "id", userId);


//     if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);


//     if (userDetails[0]?.is_verify == 0) {
//       return handleError(
//         res,
//         StatusCode.status400,
//         Message.userEmailNotVerified
//       );
//     }
//     if (userDetails[0]?.is_active == 0) {
//       return handleError(res, StatusCode.status400, Message.userBlocked);
//     }


//     const result = await Promise.all(
//       data.map(async (item) => {
//         return await addDataIntoTable(DB_TABLE.document, item);
//       })
//     )


//     return handleSuccess(
//       res,
//       StatusCode.status200,
//       Message.msgDocumentAddedSuccess
//     );


//   } catch (error) {
//     console.error("Error in changePassword:", error);
//     return handleError(
//       res,
//       StatusCode.status500,
//       Message.INTERNAL_SERVER_ERROR
//     );
//   }
// };

export const uploadGuestDocuments = async (req, res) => {
  try {
    const {
      gov_doc_title,
      address_proof_title,
      driving_licence_title,
      business_reg_title
    } = req.body || {};

    const userId = req.user?.id;
    const uploadedFiles = req.files || {};

    const documents = [
      {
        title: gov_doc_title,
        file: uploadedFiles?.gov_file?.[0]?.filename,
      },
      {
        title: address_proof_title,
        file: uploadedFiles?.address_proof?.[0]?.filename,
      },
      {
        title: driving_licence_title,
        file: uploadedFiles?.driving_license?.[0]?.filename,
      },
      {
        title: business_reg_title,
        file: uploadedFiles?.business_reg?.[0]?.filename,
      }
    ].filter(d => d.title && d.file);

    if (!documents.length) {
      return handleError(res, StatusCode.status400, Message.msgDocumentNotAdded);
    }

    const userDetails = await getDataByLabel(DB_TABLE.users, "id", userId);
    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0].is_verify === 0)
      return handleError(res, StatusCode.status400, Message.userEmailNotVerified);

    if (userDetails[0].is_active === 0)
      return handleError(res, StatusCode.status400, Message.userBlocked);

    const userType = userDetails[0].user_type;

    const existingDoc = await getGuestDocumentsByUserType(userId, userType);
    if (existingDoc.length > 0) {
      await deleteGuestDocumentsByUserType(userId, userType);
    }

    const bulkRows = documents.map((doc) => [
      userId,
      userType,
      doc.title,
      doc.file,
      0,
      null,
    ]);

    await bulkInsertGuestDocuments(bulkRows);

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.msgDocumentAddedSuccess
    );

  } catch (error) {
    console.error("Error in uploadGuestDocuments:", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
};



export const getAllMyKycDocuments = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", userId);


    if (!userDetails?.length) return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    let document = await getKycDoc(userId, userDetails[0]?.user_type);

    if (!document?.length) {
      return handleError(res, StatusCode.status200, Message.dataNotFound, document);
    }


    let finalData = document?.map((item, i) => {
      return {
        ...item,
        file: item?.file
          ? `${process.env.BASE_URL}profile/${item?.file}`
          : "",
      };
    });

    let data = {};

    const idTypes = await getDataByLabel(DB_TABLE.document_name, "type", 1);

    const addressTypes = await getDataByLabel(DB_TABLE.document_name, "type", 2);

    const businessTypes = await getDataByLabel(DB_TABLE.document_name, "type", 3);

    finalData.forEach(item => {
      if (idTypes.some(type => type.title === item.title)) {
        data.gov_doc_title = item.title;
        data.gov_file = item.file;
      } else if (addressTypes.some(type => type.title === item.title)) {
        data.address_proof_title = item.title;
        data.address_proof = item.file;
      } else if (businessTypes.some(type => type.title === item.title)) {
        data.business_reg_title = item.title;
        data.business_reg = item.file;
      } else if (item.title === "Driving Licence") {
        data.driving_licence_title = item.title;
        data.driving_license = item.file;
      }
      data.status = item.status;
      data.rejected_reason = item.rejected_reason;
      data.created_at = item.created_at;
      data.updated_at = item.updated_at;
    });


    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
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

export const getGuestBusninessDashboard = async (req, res) => {
  try {
    const id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    if (userDetails[0].user_type != 2) {
      return handleError(res, StatusCode.status400, Message.onlyBusinessCanSeeDetails);
    }

    const dashboardCount = await getBusnessAllDashboardCount(id);
    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      dashboardCount[0]
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

export const getGuestDashboard = async (req, res) => {
  try {
    const id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    if (userDetails[0].user_type != 1) {
      return handleError(res, StatusCode.status400, Message.accessNotAllowed);
    }

    const dashboardCount = await getGuestDashboardCount(id);
    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      dashboardCount[0]
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

export const getGuestRecentBookingsController = async (req, res) => {
  try {
    const id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    if (userDetails[0].user_type != 1) {
      return handleError(res, StatusCode.status400, Message.accessNotAllowed);
    }

    const recentBookings = await getGuestRecentBookings(id);
    if (!recentBookings?.length) {
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.dataNotFound,
        recentBookings
      );
    }

    const statusLabel = (status) => {
      if (status === 1) return "Approved";
      if (status === 2) return "Rejected";
      return "Pending";
    };

    const paymentLabel = (status) => {
      if (status === 1 || status === "COMPLETED") return "Paid";
      return "Pending";
    };

    const data = recentBookings.map((item) => ({
      ...item,
      host_name: `${item.host_first_name || ""} ${item.host_last_name || ""}`.trim(),
      booking_status_label: statusLabel(item.booking_status),
      payment_status_label: paymentLabel(item.payment_status),
    }));

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
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

export const getGuestBusninessRecentBookings = async (req, res) => {
  try {
    const id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    if (userDetails[0].user_type != 2) {
      return handleError(res, StatusCode.status400, Message.onlyBusinessCanSeeDetails);
    }

    let subUsers = await getDataByLabel(DB_TABLE.users, "added_by", id);

    let allIds = []
    if (subUsers?.length <= 0)
      allIds.push(id);
    else {
      allIds = subUsers.map((user) => user.id);
      allIds.push(id);
    }


    const recentBookings = await getRecentBookings(allIds);

    if (recentBookings.length > 0) {
      await Promise.all(recentBookings.map(async (item) => {
        item.user_image = item?.user_image
          ? `${process.env.BASE_URL}profile/${item?.user_image}`
          : "";
        item.host_image = item?.host_image
          ? `${process.env.BASE_URL}profile/${item?.host_image}`
          : "";

        if (item.user_id == id) item.user_type_label = "Business";
        else item.user_type_label = "Guest";

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
        const paymentDetails = await getDataByLabel(DB_TABLE.payment, "booking_id", item.booking_id);
        if (paymentDetails?.length > 0) {
          paymentDetails.map((payment) => {
            payment.property_address = item.address;
            payment.property_title = item.property_title;
            payment.property_description = item.property_description;
          })
        }
        item.paymentArray = paymentDetails

        if (item.booking_status === 2 || item.is_canceled != "No") {
          item.booking_status_label = "Cancelled";
          item.booking_type = "Cancelled";
        } else if (item.booking_status === 1) {
          item.booking_type = "Approved";
        } else {
          item.booking_type = "Pending";
        }
      }));
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      recentBookings
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

export const getGuestBusninessBookingsById = async (req, res) => {
  try {
    const id = req.user?.id;
    const { booking_id } = req.params;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    if (userDetails[0].user_type != 2) {
      return handleError(res, StatusCode.status400, Message.onlyBusinessCanSeeDetails);
    }


    const recentBookings = await getBusinessBookingsById(booking_id);

    if (recentBookings.length > 0) {
      await Promise.all(recentBookings.map(async (item) => {
        item.user_image = item?.user_image
          ? `${process.env.BASE_URL}profile/${item?.user_image}`
          : "";
        item.host_image = item?.host_image
          ? `${process.env.BASE_URL}profile/${item?.host_image}`
          : "";

        if (item.user_id == id) item.user_type_label = "Business";
        else item.user_type_label = "Guest";

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
        const businessBookingOffer = await getActiveOfferByPropertyId(item.property_id);
        if (businessBookingOffer) {
          item.offer_value = businessBookingOffer.offer_value;
          item.offer_type = businessBookingOffer.offer_type;
          item.offer_start_date = businessBookingOffer.start_date;
          item.offer_end_date = businessBookingOffer.end_date;
        } else {
          item.offer_value = item.offer_value ?? null;
          item.offer_type = item.offer_type ?? null;
          item.offer_start_date = item.offer_start_date ?? null;
          item.offer_end_date = item.offer_end_date ?? null;
        }
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

        const paymentDetails = await getDataByLabel(DB_TABLE.payment, "booking_id", item.booking_id);
        if (paymentDetails?.length > 0) {
          paymentDetails.map((payment) => {
            payment.property_address = item.address;
            payment.property_title = item.property_title;
            payment.property_description = item.property_description;
          })
        }
        item.paymentArray = paymentDetails

        let review = await getPropertyReviewById(item.property_id);
        review?.map((data) => {
          data.profile_image = data.profile_image
            ? `${process.env.BASE_URL}profile/${data.profile_image}`
            : "";
        });
        item.reviews = review;

        const completed = [];
        const cancelled = [];
        const upcoming = [];
        const ongoing = [];

        const currentDate = new Date();

        recentBookings.forEach((item) => {
          if (item.booking_status === 2 || item.is_canceled != "No") {
            item.booking_type = "Cancelled";
            cancelled.push(item);
          } else if (
            item.booking_status === 1 &&
            item.payment_status === 1 &&
            new Date(item.booked_from) > currentDate
          ) {
            item.booking_type = "Upcoming";
            upcoming.push(item);
          } else if (
            item.booking_status === 1 &&
            item.payment_status === 1 &&
            new Date(item.booked_from) <= currentDate &&
            new Date(item.booked_to) >= currentDate
          ) {
            item.booking_type = "Ongoing";
            ongoing.push(item);
          } else if (
            item.booking_status === 1 &&
            item.payment_status === 1 &&
            new Date(item.booked_to) < currentDate
          ) {
            item.booking_type = "Completed";
            completed.push(item);
          }
        });

      }));


      return handleSuccess(
        res,
        StatusCode.status200,
        Message.dataFoundSuccessful,
        recentBookings.length > 0 ? recentBookings[0] : {}
      );
    } else {
      return handleError(res, StatusCode.status404, Message.dataNotFound)
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

export const getAllSubGuests = async (req, res) => {
  try {
    const id = req.user?.id;
    const { booking_id } = req.params;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    if (userDetails[0].user_type != 2) {
      return handleError(res, StatusCode.status400, Message.onlyBusinessCanSeeDetails);
    }

    const subGuest = await getSubGuest(id);

    if (subGuest.length > 0) {
      subGuest.map((item) => {
        item.profile_image = item?.profile_image ? `${process.env.BASE_URL}profile/${item?.profile_image}` : "";
      })
      return handleSuccess(
        res,
        StatusCode.status200,
        Message.dataFoundSuccessful,
        subGuest
      );
    } else {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, subGuest);
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

export const updateSubGuestBlockStatus = async (req, res) => {
  try {
    const id = req.user?.id;
    const { user_id } = req.body
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    const userData = await getDataByLabel2(DB_TABLE.users, "id", user_id, "added_by", id);

    if (userData.length <= 0) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const newData = { is_blocked: userData[0].is_blocked == 1 ? 0 : 1 };

    const updateUser = await updateDataByLabel(DB_TABLE.users, newData, "id", user_id);

    if (updateUser.affectedRows > 0) {
      return handleSuccess(res, StatusCode.status200, userData[0].is_blocked == 0 ? Message.userBlockSuccess : Message.userUnblockSuccess);
    } else {
      return handleError(res, StatusCode.status400, Message.somethingWentWrong);
    }
  } catch (error) {
    console.error("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const getGuestBusinessPayments = async (req, res) => {
  try {
    const id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    if (userDetails[0].user_type != 2) {
      return handleError(res, StatusCode.status400, Message.onlyBusinessCanSeeDetails);
    }

    let allIds = await getAllGuestsIds(userDetails);


    const recentBookings = await getBookingPayments(allIds);

    if (recentBookings.length > 0) {
      await Promise.all(recentBookings.map(async (item) => {
        // item.user_image = item?.user_image
        //   ? `${process.env.BASE_URL}profile/${item?.user_image}`
        //   : "";
        // item.host_image = item?.host_image
        //   ? `${process.env.BASE_URL}profile/${item?.host_image}`
        //   : "";

        //   item.payment_method = "Card";
        if (item.booking_user_id == id) item.user_type_label = "Business";
        else item.user_type_label = "Guest";

        if (item.vat_details) {
          item.vat_details = JSON.parse(item.vat_details);
        }

        //                  let image = await getDataByLabel(
        //             DB_TABLE.propertyImage,
        //             "property_id",
        //             item.property_id
        //           );

        //                     let finalData = image?.map((item, i) => {
        //         return {
        //           ...item,
        //           image: item?.image
        //             ? `${process.env.BASE_URL}profile/${item?.image}`
        //             : "",
        //         };
        //       });
        //       item.propertyImage = finalData;
        //       item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
        //             : "";
        //           let amenities = item.amenities ? item.amenities.split(',') : [];
        //           let safety_amenities = item.safety_amenities? item.safety_amenities.split(',') : [];
        //           let ideal_for = item.ideal_for? item.ideal_for.split(',') : [];

        //   if (Array.isArray(amenities) && amenities.length > 0) {
        //     item.amenities_label = await getPropertyAmenitits(amenities);
        //   }

        //   if (Array.isArray(safety_amenities) && safety_amenities.length > 0) {
        //     item.safety_amenities_label = await getAllPropertySafety(safety_amenities);
        //   }

        //   if (Array.isArray(ideal_for) && ideal_for.length > 0) {
        //     item.ideal_for_label = await getPropertyIdealFor(ideal_for);
        //   }
      }));
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      recentBookings
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

export const getRecentBooking = async (req, res) => {
  try {
    const id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    let booking = await getRecentBookingOfUser(id);

    // Fallback to the simpler guest recent-bookings query because the
    // dashboard counts are based on the same user scope.
    if ((!booking || booking.length === 0) && userDetails[0]?.user_type == 1) {
      booking = await getGuestRecentBookings(id);
    }



    if (!booking?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, booking);
    }

    await Promise.all(
      booking.map(async (item) => {
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
        [item.rating] = await getHostRating(item.host_id);
        [item.canellationPolicy] = await getDataByLabel(
          DB_TABLE.cancellationPolicy, "content_type", 3);
        if (item.booked_to > new Date()) {
          item.isActive = true;
        } else if (item.booked_to < new Date()) {
          item.isActive = false;
        }

        item.propertyImage = finalData;
        item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        item.host_image = item?.host_image ? `${process.env.BASE_URL}profile/${item?.host_image}`
          : "";
        const offer = await getActiveOfferByPropertyId(item.property_id);
        if (offer) {
          item.offer_value = offer.offer_value;
          item.offer_type = offer.offer_type;
          item.offer_start_date = offer.start_date;
          item.offer_end_date = offer.end_date;
        } else {
          item.offer_value = item.offer_value ?? null;
          item.offer_type = item.offer_type ?? null;
          item.offer_start_date = item.offer_start_date ?? null;
          item.offer_end_date = item.offer_end_date ?? null;
        }
        let amenities = item.amenities ? item.amenities.split(',') : [];
        let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
        let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];
        let house_rules = item.house_rules ? item.house_rules.split(',') : [];

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

        [item.rating] = await getHostRating(item.host_id);
        let review = await getPropertyReview(item.property_id);
        review?.map((data) => {
          data.profile_image = data.profile_image
            ? `${process.env.BASE_URL}profile/${data.profile_image}`
            : "";
        });
        item.reviews = review;


      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      booking
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

export const getMyBookings = async (req, res) => {
  try {
    const id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const booking = await getAllBookingOfUser(id);



    if (!booking?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, booking);
    }

    await Promise.all(
      booking.map(async (item) => {
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
        [item.rating] = await getHostRating(item.host_id);
        [item.canellationPolicy] = await getDataByLabel(
          DB_TABLE.cancellationPolicy, "content_type", 3);
        if (item.booked_to > new Date()) {
          item.isActive = true;
        } else if (item.booked_to < new Date()) {
          item.isActive = false;
        }

        item.propertyImage = finalData;
        item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        item.host_image = item?.host_image ? `${process.env.BASE_URL}profile/${item?.host_image}`
          : "";
        let amenities = item.amenities ? item.amenities.split(',') : [];
        let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
        let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];
        let house_rules = item.house_rules ? item.house_rules.split(',') : [];

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

        [item.rating] = await getHostRating(item.host_id);
        // let review = await getPropertyReview(item.property_id);

        let review = await getPropertyReviewById(item.property_id);
        review?.map((data) => {
          data.profile_image = data.profile_image
            ? `${process.env.BASE_URL}profile/${data.profile_image}`
            : "";
        });
        item.reviews = review;


      })
    );
    console.log('booking', booking);

    const completed = [];
    const cancelled = [];
    const upcoming = [];
    const ongoing = [];

    const currentDate = new Date();

    booking.forEach((item) => {
      if (item.booking_status === 2 || item.is_canceled != "No") {
        item.booking_type = "Cancelled";
        cancelled.push(item);
      } else if (
        item.booking_status === 1 &&
        item.payment_status === 1 &&
        new Date(item.booked_from) > currentDate
      ) {
        item.booking_type = "Upcoming";
        upcoming.push(item);
      } else if (
        item.booking_status === 1 &&
        item.payment_status === 1 &&
        new Date(item.booked_from) <= currentDate &&
        new Date(item.booked_to) >= currentDate
      ) {
        item.booking_type = "Ongoing";
        ongoing.push(item);
      } else if (
        item.booking_status === 1 &&
        item.payment_status === 1 &&
        new Date(item.booked_to) < currentDate
      ) {
        item.booking_type = "Completed";
        completed.push(item);
      }
    });

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      {
        completed,
        cancelled,
        upcoming,
        ongoing
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

export const getSingleBooking = async (req, res) => {
  try {
    const id = req.user?.id;
    const booking_id = req.params.booking_id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const booking = await getSingleBookingOfUser(booking_id);



    if (!booking?.length) {
      return handleError(res, StatusCode.status404, Message.dataNotFound);
    }

    await Promise.all(
      booking.map(async (item) => {
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
        [item.rating] = await getHostRating(item.host_id);
        [item.canellationPolicy] = await getDataByLabel(
          DB_TABLE.cancellationPolicy, "content_type", 3);
        if (item.booked_to > new Date()) {
          item.isActive = true;
        } else if (item.booked_to < new Date()) {
          item.isActive = false;
        }

        item.propertyImage = finalData;
        item.video_url = item?.video_url ? `${process.env.BASE_URL}profile/${item?.video_url}`
          : "";
        item.host_image = item?.host_image ? `${process.env.BASE_URL}profile/${item?.host_image}`
          : "";
        const offer = await getActiveOfferByPropertyId(item.property_id);
        if (offer) {
          item.offer_value = offer.offer_value;
          item.offer_type = offer.offer_type;
          item.offer_start_date = offer.start_date;
          item.offer_end_date = offer.end_date;
        } else {
          item.offer_value = item.offer_value ?? null;
          item.offer_type = item.offer_type ?? null;
          item.offer_start_date = item.offer_start_date ?? null;
          item.offer_end_date = item.offer_end_date ?? null;
        }
        let amenities = item.amenities ? item.amenities.split(',') : [];
        let safety_amenities = item.safety_amenities ? item.safety_amenities.split(',') : [];
        let ideal_for = item.ideal_for ? item.ideal_for.split(',') : [];
        let house_rules = item.house_rules ? item.house_rules.split(',') : [];

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


        [item.rating] = await getHostRating(item.host_id);
        let review = await getPropertyReview(item.property_id);
        review?.map((data) => {
          data.profile_image = data.profile_image
            ? `${process.env.BASE_URL}profile/${data.profile_image}`
            : "";
        });
        item.reviews = review;

      })
    );



    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      booking[0]
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

export const supportTicket = async (req, res) => {
  try {
    const id = req.user?.id;
    const { message, property_id, host_id } = req.body;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const data = {
      id,
      message,
      property_id: property_id ? property_id : 0,
      host_id: host_id ? host_id : 0,
      user_type: 1
    };
    const ticket = await addDataIntoTable(DB_TABLE.supportTicket, data);
    return handleSuccess(
      res,
      StatusCode.status200,
      Message.contactUsSuccessful,
      null
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

export const getSupportTicket = async (req, res) => {
  try {
    const id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }


    const ticket = await getSupportTicketModel(id);

    if (ticket.length > 0) {
      await Promise.all(ticket.map(async (item) => {
        item.reply_message = item.reply_message ? JSON.parse(item.reply_message) : [];
      }));
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      ticket
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


export const uploadBookingDocuments = async (req, res) => {
  try {
    const id = req.user?.id;
    const { booking_id } = req.params;
    const files = req.files;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    if (!files || files.length == 0) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }


    const booking = await getDataByLabel(DB_TABLE.booking, "booking_id", booking_id);
    if (!booking || booking.length == 0) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    let data = [];


    for (let i = 0; i < files.length; i++) {
      data.push({ file: files[i].filename, booking_id });
    }

    const ticket = await Promise.all(data.map(async (item) => {
      return addDataIntoTable(DB_TABLE.bookingDocument, item);
    }))

    const updateBooking = await updateDataByLabel(DB_TABLE.booking, { doc_status: "UPLOADED" }, "booking_id", booking_id);


    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      ticket
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


const calculateTotalPrice = (
  start_date,
  end_date,
  monthly_rent,
  security_deposit,
  cleaning_fee,
  cleaning_fee_type,
  guest_count,
  monthly_rent_type
) => {
  if (!start_date || !end_date || !monthly_rent) return 0;

  const start = new Date(start_date);
  const end = new Date(end_date);

  // Difference in days
  const diffInMs = end - start;
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  if (diffInDays <= 0) return 0;

  // Approximate months (30 days)
  const months = diffInDays / 30;

  let rentTotal = 0;
  if (monthly_rent_type === 0) {
    // Fixed monthly rent
    rentTotal = months * Number(monthly_rent);

  } else if (monthly_rent_type === 1) {
    // Rent per guest
    rentTotal = months * Number(monthly_rent) * Number(guest_count || 0);

  }
  const deposit = Number(security_deposit || 0);

  // Cleaning fee logic
  let cleaningTotal = 0;
  if (cleaning_fee) {
    if (cleaning_fee_type === 0) {
      cleaningTotal = Number(cleaning_fee); // fixed
    } else if (cleaning_fee_type === 1) {
      cleaningTotal = Number(cleaning_fee) * Number(guest_count || 0); // per guest
    }
  }

  const total = rentTotal + deposit + cleaningTotal;

  return total.toFixed(2); // always 2 decimal places
};



export const getPropertyBookingPrice = async (req, res) => {
  try {
    const { property_id, booked_from, booked_to, guest } = req.query;
    const property = await getPropertyBYId(property_id);
    if (!property?.length) {
      return handleError(res, StatusCode.status404, Message.dataNotFound);
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

        [item.rating] = await getHostRating(item.host_id);
        let review = await getPropertyReview(item.property_id);
        review?.map((data) => {
          data.profile_image = data.profile_image
            ? `${process.env.BASE_URL}profile/${data.profile_image}`
            : "";
        });
        item.reviews = review;
        [item.canellationPolicy] = await getDataByLabel(
          DB_TABLE.cancellationPolicy, "content_type", 3);

        const bookings = await checkPropertyBooking(item.property_id);


        const expandDates = (start, end) => {
          const dates = [];
          const current = new Date(start);
          const toDate = new Date(end);

          while (current <= toDate) {
            // Format YYYY-MM-DD
            const yyyy = current.getFullYear();
            const mm = String(current.getMonth() + 1).padStart(2, '0');
            const dd = String(current.getDate()).padStart(2, '0');
            dates.push(`${yyyy}-${mm}-${dd}`);

            current.setDate(current.getDate() + 1);
          }

          return dates;
        };

        // Flatten all date ranges into individual dates
        item.booked_dates = bookings.flatMap(b => expandDates(b.start_date, b.end_date));



        // item.total_price = calculateTotalPrice(booked_from, booked_to, item.monthly_rent, item.security_deposit, item.cleaning_fee, item.cleaning_fee_type, guest, item.monthly_rent_type);
        // item.sub_total = item.total_price - item.security_deposit;

        // // Base price
        // let totalPrice = calculateTotalPrice(
        //   booked_from,
        //   booked_to,
        //   item.monthly_rent,
        //   item.security_deposit,
        //   item.cleaning_fee,
        //   item.cleaning_fee_type,
        //   guest,
        //   item.monthly_rent_type
        // );

        // // 🔥 Get active offer
        // const offer = await getActiveOfferByPropertyId(item.property_id);

        // let discountAmount = 0;

        // if (offer && offer.offer_value) {
        //   const offerPercentage = Number(offer.offer_value);

        //   discountAmount = (Number(totalPrice) * offerPercentage) / 100;

        //   totalPrice = Number(totalPrice) - discountAmount;
        // }

        // // Final assignment
        // item.total_price = Number(totalPrice).toFixed(2);
        // item.discount = discountAmount.toFixed(2);
        // item.sub_total = (Number(totalPrice) - Number(item.security_deposit || 0)).toFixed(2);

        // item.booked_from = booked_from;
        // item.booked_to = booked_to;
        // item.guest = guest;

        // item.booked_from = booked_from;
        // item.booked_to = booked_to;
        // item.guest = guest;

        // 1️⃣ Base total (without offer)
        let baseTotal = calculateTotalPrice(
          booked_from,
          booked_to,
          item.monthly_rent,
          0, // ❗ deposit exclude here
          item.cleaning_fee,
          item.cleaning_fee_type,
          guest,
          item.monthly_rent_type
        );

        baseTotal = Number(baseTotal);

        // 2️⃣ Get active offer
        const offer = await getActiveOfferByPropertyId(item.property_id);

        let discountAmount = 0;
        let discountPercent = 0;

        if (offer && offer.offer_value) {
          discountPercent = Number(offer.offer_value);
          discountAmount = (baseTotal * discountPercent) / 100;
        }

        // 3️⃣ Subtotal (after discount)
        const subTotal = baseTotal - discountAmount;

        // 4️⃣ Final payable (add deposit)
        const securityDeposit = Number(item.security_deposit || 0);
        const totalPayable = subTotal + securityDeposit;

        // 5️⃣ Assign values (🔥 UI ready format)
        item.price_breakdown = {
          total_amount: baseTotal.toFixed(2),
          discount_percent: discountPercent,
          discount_amount: discountAmount.toFixed(2),
          subtotal: subTotal.toFixed(2),
          security_deposit: securityDeposit.toFixed(2),
          total_payable: totalPayable.toFixed(2)
        };

        // Optional (backward compatibility)
        item.total_price = totalPayable.toFixed(2);
        item.sub_total = subTotal.toFixed(2);

        item.booked_from = booked_from;
        item.booked_to = booked_to;
        item.guest = guest;

      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      property[0]
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



// -----------------------------old code without offe_value-----------------------------------

// export const bookingPaymentConfirmedStripe = async (req, res) => {
//   try {
//     const userId = req.user?.id;
//     const { booking_id } = req.body;

//     if (!booking_id) {
//       return handleError(res, StatusCode.status400, "Booking ID is required.");
//     }

//     const userDetails = await getDataByLabel(DB_TABLE.users, "id", userId);

//     const bookingDetails = await getBooking(booking_id);
//     if (!bookingDetails?.length) {
//       return handleError(res, StatusCode.status400, Message.dataNotFound);
//     }

//     const booking = bookingDetails[0];
//     const { booked_from: start_date, booked_to: end_date, total_price: total_amount, security_deposit, user_earning: platform_fee } = booking;

//     const transaction_id = generateTransactionId();

//     // let [hostEarningDetails] = await getAdminEarnings(2);
//     let [hostEarningDetails] = await getServiceFeeModel(booking.location, booking.country);
//     if (!hostEarningDetails) {
//       hostEarningDetails = { fee_type: 1, commission: 10.0 };
//     }

//     let admin_earnings;
//     if (hostEarningDetails.fee_type == 1) {
//       admin_earnings = total_amount * (hostEarningDetails.commission / 100);
//     } else if (hostEarningDetails.fee_type == 2) {
//       admin_earnings = total_amount - hostEarningDetails.commission;
//     }

//     const paymentData = {
//       booking_id,
//       user_id: userId,
//       start_date,
//       end_date,
//       security_deposit,
//       platform_fee,
//       total_amount,
//       number_of_days: Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)),
//       admin_earnings,
//       transaction_id,
//     };

//     // ⚠️ Stripe requires at least one line_item
//     const session = await stripe.checkout.sessions.create({
//       mode: "payment",
//       automatic_tax: { enabled: true },
//       line_items: [
//         {
//           price_data: {
//             currency: "usd",
//             product_data: { name: booking.property_title },
//             unit_amount: Math.round(total_amount * 100), // Stripe expects cents
//           },
//           quantity: 1,
//         },
//       ],
//       success_url: `https://3.75.55.216/success?session_id={CHECKOUT_SESSION_ID}&user_type=${userDetails[0].user_type}`,
//       cancel_url: `https://3.75.55.216/failed?session_id={CHECKOUT_SESSION_ID}&user_type=${userDetails[0].user_type}`,
//       metadata: paymentData,
//     });

//     return handleSuccess(
//       res,
//       StatusCode.status200,
//       "",
//       session.url
//     );

//   } catch (error) {
//     console.error("❌ Error in bookingPaymentConfirmedStripe:", error);
//     return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
//   }
// };

// ---------------------------------------------------------------------

// ----------------------------code with offe_value-----------------------------------

export const bookingPaymentConfirmedStripe = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { booking_id } = req.body;

    if (!booking_id) {
      return handleError(res, StatusCode.status400, "Booking ID is required.");
    }

    const userDetails = await getDataByLabel(DB_TABLE.users, "id", userId);
    const bookingDetails = await getBooking(booking_id);
    if (!bookingDetails?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    const booking = bookingDetails[0];

    const {
      booked_from: start_date,
      booked_to: end_date,
      total_price,
      security_deposit,
      user_earning: platform_fee,
      offer_value
    } = booking;

    // ✅ APPLY OFFER (percentage)
    const original_amount = Number(total_price) || 0;
    const discount_percent = Number(offer_value) || 0;

    const discount_amount = (original_amount * discount_percent) / 100;

    const total_amount = Math.max(0, original_amount - discount_amount);

    const transaction_id = generateTransactionId();

    // let [hostEarningDetails] = await getAdminEarnings(2);
    let [hostEarningDetails] = await getServiceFeeModel(booking.location, booking.country);

    if (!hostEarningDetails) {
      hostEarningDetails = { fee_type: 1, commission: 10.0 };
    }

    let admin_earnings = 0;

    // ✅ APPLY COMMISSION ON DISCOUNTED AMOUNT
    if (hostEarningDetails.fee_type == 1) {
      admin_earnings = total_amount * (hostEarningDetails.commission / 100);
    } else if (hostEarningDetails.fee_type == 2) {
      admin_earnings = total_amount - hostEarningDetails.commission;
    }

    admin_earnings = Number(admin_earnings.toFixed(2));
    const host_payout_amount = calculateHostPayoutAmount(total_amount, admin_earnings);

    const paymentData = {
      booking_id,
      user_id: userId,
      start_date,
      end_date,
      security_deposit,
      platform_fee,
      total_amount,
      offer_value,
      discount_amount,
      number_of_days: Math.ceil(
        (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)
      ),
      admin_earnings,
      host_payout_amount,
      release_on: start_date,
      payout_status: "PENDING",
      transaction_id,
    };

    // ✅ Stripe payment on discounted amount
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      automatic_tax: { enabled: true },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: booking.property_title },
            unit_amount: Math.round(total_amount * 100), // ✅ discounted amount
          },
          quantity: 1,
        },
      ],
      success_url: `https://app.flexsirent.com/success?session_id={CHECKOUT_SESSION_ID}&user_type=${userDetails[0].user_type}`,
      cancel_url: `https://app.flexsirent.com/failed?session_id={CHECKOUT_SESSION_ID}&user_type=${userDetails[0].user_type}`,
      metadata: paymentData,
    });

    return handleSuccess(
      res,
      StatusCode.status200,
      "",
      session.url
    );

  } catch (error) {
    console.error("❌ Error in bookingPaymentConfirmedStripe:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

// ---------------------------------------------------------------------

export const stripeSuccessHandler = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return handleError(res, StatusCode.status400, "Session ID is required.");
    }

    // ✅ Retrieve session with expanded PaymentIntent and breakdown
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent.charges.data", "total_details.breakdown"],
    });


    const paymentIntent = session.payment_intent; // Already expanded
    const charge = paymentIntent.latest_charge
      ? await stripe.charges.retrieve(paymentIntent.latest_charge)
      : paymentIntent.charges?.data?.[0];

    if (!charge || !charge.balance_transaction) {
      throw new Error("Charge or associated balance transaction not found.");
    }

    // ✅ Get balance transaction details
    const balanceTx = await stripe.balanceTransactions.retrieve(charge.balance_transaction);

    // ✅ VAT / Tax breakdown
    const vatDetails =
      session.total_details?.breakdown?.taxes?.map((tax) => ({
        amount: tax.amount / 100,
        rate: tax.rate,
        description: tax.tax_rate?.display_name,
      })) || [];

    // ✅ Payment method type
    const paymentMethodType = charge.payment_method_details?.type?.toUpperCase() || "UNKNOWN";

    // ✅ Core payment data
    let paymentData = {
      ...session.metadata,
      transaction_id: charge.balance_transaction,
      payment_status: "COMPLETED",
      payment_method: paymentMethodType,
      currency: balanceTx.currency?.toUpperCase(),
      stripe_fee: balanceTx.fee / 100,
      net_amount: balanceTx.net / 100,
      gross_amount: balanceTx.amount / 100,
      stripe_total_amount: paymentIntent.amount / 100,
      vat_details: JSON.stringify(vatDetails),
      session_id
    };

    const normalizeDecimal = (value) => {
      if (value === '' || value === null || value === undefined || isNaN(value)) return 0;
      return Number(value);
    };

    paymentData.admin_earnings = normalizeDecimal(paymentData.admin_earnings);
    paymentData.host_payout_amount = normalizeDecimal(paymentData.host_payout_amount);
    paymentData.platform_fee = normalizeDecimal(paymentData.platform_fee);
    paymentData.security_deposit = normalizeDecimal(paymentData.security_deposit);
    paymentData.total_amount = normalizeDecimal(paymentData.total_amount);
    paymentData.stripe_fee = normalizeDecimal(paymentData.stripe_fee);
    paymentData.net_amount = normalizeDecimal(paymentData.net_amount);
    paymentData.gross_amount = normalizeDecimal(paymentData.gross_amount);
    paymentData.stripe_total_amount = normalizeDecimal(paymentData.stripe_total_amount);

    if (!paymentData.host_payout_amount) {
      paymentData.host_payout_amount = calculateHostPayoutAmount(
        paymentData.total_amount,
        paymentData.admin_earnings
      );
    }

    paymentData.payout_status = paymentData.payout_status || "PENDING";
    paymentData.release_on = paymentData.release_on || paymentData.start_date || null;

    const formatForMySQL = (date) => {
      if (!date) return null;
      const d = new Date(date);
      return d.toISOString().slice(0, 19).replace('T', ' '); // "2025-09-20 00:00:00"
    };

    if (!isNaN(paymentData.start_date)) {
      paymentData.start_date = formatForMySQL(Number(paymentData.start_date) * 1000);
    }
    if (!isNaN(paymentData.end_date)) {
      paymentData.end_date = formatForMySQL(Number(paymentData.end_date) * 1000);
    }
    if (!isNaN(paymentData.release_on)) {
      paymentData.release_on = formatForMySQL(Number(paymentData.release_on) * 1000);
    }


    // ✅ Stripe summary (for logging or response)
    const stripeSummary = {
      currency: balanceTx.currency?.toUpperCase(),
      stripe_fee: balanceTx.fee / 100,
      net_amount: balanceTx.net / 100,
      gross_amount: balanceTx.amount / 100,
      total_amount: paymentIntent.amount / 100,
      vat_details: vatDetails,
    };

    console.log("✅ Stripe Payment Summary:", stripeSummary);
    console.log("✅ Payment Data (to insert):", paymentData);

    // ✅ Update booking
    const booking_id = paymentData.booking_id;
    const bookingDetails = await checkBookingPaymentStatus(booking_id);
    if (!bookingDetails?.length) {
      return handleError(res, StatusCode.status404, "Booking not found.");
    }

    const booking = bookingDetails[0];

    const [user] = await getDataByLabel(DB_TABLE.users, "id", session.metadata.user_id);

    if (booking.session_id != session_id && booking.transaction_id != charge.balance_transaction) {
      await updateDataByLabel(DB_TABLE.booking, { payment_status: 1, payment_at: new Date() }, "booking_id", booking_id);
      const payment = await addDataIntoTable(DB_TABLE.payment, paymentData);

      await sendBookingConfirmedEmail(
        `${booking.first_name} ${booking.last_name}`,
        booking.email,
        null,
        booking_id,
        booking.property_title,
        booking.booked_from,
        booking.booked_to,
        booking.guest,
        session.metadata.total_amount
      );

      await sendBookingConfirmedEmail(
        `${user.first_name} ${user.last_name}`,
        user.email,
        null,
        booking_id,
        booking.property_title,
        booking.booked_from,
        booking.booked_to,
        booking.guest,
        session.metadata.total_amount
      );

      await sendBookingConfirmedHostEmail(
        `${booking.host_first_name} ${booking.host_last_name}`,
        booking.host_email,
        null,
        booking_id,
        booking.property_title,
        booking.booked_from,
        booking.booked_to,
        booking.guest,
        session.metadata.total_amount,
        `${booking.first_name} ${booking.last_name}`
      );


      // const pdfPath = await generatePdfService({
      //   startDate: booking.booked_from,
      //   endDate: booking.booked_to,
      //   propertyTitle: booking.property_title,
      //   description: booking.property_description,
      //   guestName: `${user.first_name} ${user.last_name}`,
      //   hostName: `${booking.first_name} ${booking.last_name}`,
      //   price: session.metadata.total_amount,
      //   address: booking.address
      // });

      // console.log("📄 Generated Contract PDF:", pdfPath);

      // // 5️⃣ SEND THE CONTRACT FOR E-SIGNATURE (Dropbox Sign)
      // // ----------------------------------------------
      // const signatureResponse = await sendAgreementService({
      //   guestEmail: "abhay.ctinfotech@gmail.com",
      //   guestName: `${user.first_name} ${user.last_name}`,
      //   // hostEmail: "abhay.ctinfotech@gmail.com",
      //   // hostName : `${booking.first_name} ${booking.last_name}`,
      //   filePath: pdfPath,
      // });

      // console.log("📬 Contract sent for signature:", signatureResponse);

      // await updateDataByLabel(
      //   DB_TABLE.payment,
      //   { signature_request_id: signatureResponse.signatureRequestId },
      //   "payment_id",
      //   payment.insertId
      // );

    }


    return res.json({
      success: true,
      message: "Payment confirmed and booking updated successfully.",
      stripe_summary: stripeSummary,
    });
  } catch (error) {
    console.error("❌ Error in stripeSuccessHandler:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


export const stripeCancelHandler = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return handleError(res, StatusCode.status400, "Session ID is required.");
    }

    // ✅ Retrieve the session with tax breakdown
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["total_details.breakdown"],
    });

    // ✅ VAT / Tax breakdown (if any)
    const vatDetails =
      session.total_details?.breakdown?.taxes?.map((tax) => ({
        amount: tax.amount / 100,
        description: tax.tax_rate?.display_name || "Tax",
        rate: tax.tax_rate?.percentage || null,
      })) || [];

    // ✅ Build the safe payment data (no actual payment occurred)
    let paymentData = {
      ...session.metadata,
      transaction_id: session.metadata?.transaction_id || null,
      payment_status: "REJECTED",
      payment_method: "#N/A",
      currency: session.currency?.toUpperCase() || null,
      host_payout_amount: 0,
      payout_status: "PENDING",
      release_on: session.metadata?.release_on || session.metadata?.start_date || null,
      stripe_fee: 0,
      net_amount: 0,
      gross_amount: 0,
      stripe_total_amount: session.amount_total ? session.amount_total / 100 : 0,
      vat_details: JSON.stringify(vatDetails),
      session_id,
    };

    // ✅ Normalize numeric fields to avoid NaN/null DB errors
    const normalizeDecimal = (value) => {
      if (value === "" || value === null || value === undefined || isNaN(value)) return 0;
      return Number(value);
    };

    paymentData.admin_earnings = normalizeDecimal(paymentData.admin_earnings);
    paymentData.host_payout_amount = normalizeDecimal(paymentData.host_payout_amount);
    paymentData.platform_fee = normalizeDecimal(paymentData.platform_fee);
    paymentData.security_deposit = normalizeDecimal(paymentData.security_deposit);
    paymentData.total_amount = normalizeDecimal(paymentData.total_amount);
    paymentData.stripe_fee = normalizeDecimal(paymentData.stripe_fee);
    paymentData.net_amount = normalizeDecimal(paymentData.net_amount);
    paymentData.gross_amount = normalizeDecimal(paymentData.gross_amount);
    paymentData.stripe_total_amount = normalizeDecimal(paymentData.stripe_total_amount);

    // ✅ Format timestamps for MySQL
    const formatForMySQL = (date) => {
      if (!date) return null;
      const d = new Date(date);
      return d.toISOString().slice(0, 19).replace("T", " "); // "YYYY-MM-DD HH:MM:SS"
    };

    if (!isNaN(paymentData.start_date)) {
      paymentData.start_date = formatForMySQL(Number(paymentData.start_date) * 1000);
    }
    if (!isNaN(paymentData.end_date)) {
      paymentData.end_date = formatForMySQL(Number(paymentData.end_date) * 1000);
    }
    if (!isNaN(paymentData.release_on)) {
      paymentData.release_on = formatForMySQL(Number(paymentData.release_on) * 1000);
    }

    console.log("🚫 Stripe Cancelled Payment Summary:", {
      currency: paymentData.currency,
      amount_total: paymentData.stripe_total_amount,
      vat_details: vatDetails,
    });

    console.log("🧾 Payment Data (to insert):", paymentData);

    // ✅ Update booking/payment record
    const booking_id = paymentData.booking_id;
    const bookingDetails = await checkBookingPaymentStatus(booking_id);
    if (!bookingDetails?.length) {
      return handleError(res, StatusCode.status404, "Booking not found.");
    }

    const booking = bookingDetails[0];

    // Prevent duplicate insertion for same session_id
    if (booking.session_id !== session_id) {
      await addDataIntoTable(DB_TABLE.payment, paymentData);
    }

    return res.json({
      success: true,
      message: "Payment cancelled or failed — data recorded successfully.",
    });
  } catch (error) {
    console.error("❌ Error in stripeCancelHandler:", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};


export const handleStripeConnect = async (req, res) => {
  try {
    const { email, host_id, hasExistingStripeAccount } = req.body;

    // 🔹 STEP 1: Fetch host record from your DB
    const [host] = await getDataByLabel(DB_TABLE.host, "host_id", host_id);
    let accountId = host?.stripe_account_id;

    // ✅ CASE 1: Host already connected to Stripe → generate onboarding link again
    if (accountId) {
      console.log(`ℹ️ Host ${host_id} already connected to Stripe: ${accountId}`);

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.BASE_URL}/reauth`,
        return_url: `${process.env.BASE_URL}/onboard-success`,
        type: "account_onboarding",
      });

      return res.json({
        message: "Host already connected — onboarding link regenerated.",
        onboarding_url: accountLink.url,
        stripe_account_id: accountId,
      });
    }

    // ✅ CASE 2: Host says they already have a Stripe account → OAuth flow
    if (hasExistingStripeAccount) {
      const clientId = process.env.STRIPE_CLIENT_ID;
      const redirectUri = `${process.env.BASE_URL}/stripe/oauth/callback`;

      const oauthLink = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${redirectUri}`;

      return res.json({
        message: "Redirect host to Stripe OAuth to connect existing account.",
        oauth_url: oauthLink,
      });
    }

    // ✅ CASE 3: Create a new Express connected account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email,
      capabilities: {
        transfers: { requested: true },
      },
    });

    accountId = account.id;

    // 🔹 Save new Stripe account ID to your DB
    await updateHostStripeAccountId(host_id, accountId);
    console.log(`✅ Created new Stripe account for host ${host_id}: ${accountId}`);

    // 🔹 Generate onboarding link for the new account
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.APP_URL}/reauth`,
      return_url: `${process.env.APP_URL}/onboard-success`,
      type: "account_onboarding",
    });

    // 🔹 Respond to frontend
    res.json({
      message: "New Stripe Express account created successfully.",
      onboarding_url: accountLink.url,
      stripe_account_id: accountId,
    });

  } catch (err) {
    console.error("⚠️ Stripe Connect Error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const gePaymentHistoryBookingController = async (req, res) => {
  try {
    const id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    let allIds = await getAllGuestsIds(userDetails);

    const booking = await getPaymentHistoryBookingModel(allIds);



    if (!booking?.length) {
      return handleSuccess(res, StatusCode.status200, Message.dataNotFound, booking);
    }

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      booking
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


// // Safe JSON parsing helper function
// const safeJsonParse = (jsonString, fallback = null) => {
//   if (!jsonString || typeof jsonString !== 'string') {
//     return fallback;
//   }

//   try {
//     // Trim and clean the JSON string
//     const trimmed = jsonString.trim();

//     // Check if it's a valid JSON string
//     if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
//       console.warn('Invalid JSON format:', trimmed.substring(0, 50));
//       return fallback;
//     }

//     return JSON.parse(trimmed);
//   } catch (error) {
//     console.error('JSON parsing error:', error.message);

//     // Try to fix common issues
//     try {
//       // Fix 1: Handle escaped quotes
//       let fixedString = jsonString.replace(/\\"/g, '"');

//       // Fix 2: Ensure proper array format if it's supposed to be an array
//       if (fixedString.startsWith('[') && !fixedString.endsWith(']')) {
//         fixedString = fixedString + ']';
//       }

//       // Fix 3: Remove any trailing commas in arrays/objects
//       fixedString = fixedString.replace(/,(\s*[\]}])/g, '$1');

//       return JSON.parse(fixedString);
//     } catch (parseError) {
//       console.error('Failed to fix JSON:', parseError.message);
//       return fallback;
//     }
//   }
// };


const safeJsonParse = (value, fallback = null) => {
  try {
    // ✅ already parsed object/array ho toh wahi return karo
    if (Array.isArray(value) || typeof value === "object") {
      return value;
    }

    // ✅ null / undefined
    if (!value) {
      return fallback;
    }

    // ✅ string JSON ho toh parse karo
    if (typeof value === "string") {
      return JSON.parse(value);
    }

    return fallback;
  } catch (error) {
    console.error("JSON parsing error:", error.message);
    return fallback;
  }
};

export const gePaymentHistoryBookingByUserByIdController = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);

    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const booking = await getPaymentHistoryBookingBYIdModel(booking_id);



    if (!booking?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }

    await Promise.all(
      booking.map(async (item) => {
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
        [item.rating] = await getHostRating(item.host_id);
        const now = new Date();

        if (now < item.booked_from) {
          item.current_status = "Upcoming";
        }
        else if (now >= item.booked_from && now <= item.booked_to) {
          item.current_status = "Ongoing";
        }
        else if (now > item.booked_to) {
          item.current_status = "Completed";
        }


        item.propertyImage = finalData;
        item.host_image = item?.host_image ? `${process.env.BASE_URL}profile/${item?.host_image}`
          : "";



        [item.rating] = await getHostRating(item.host_id);
        let review = await getPropertyReview(item.property_id);
        review?.map((data) => {
          data.profile_image = data.profile_image
            ? `${process.env.BASE_URL}profile/${data.profile_image}`
            : "";
        });
        item.reviews = review;
        console.log('item?.payment_details', item?.payment_details);

        // FIXED: Use safe JSON parsing
        item.payment_details = safeJsonParse(item?.payment_details, []);

        // Parse vat_details safely
        if (item.payment_details && Array.isArray(item.payment_details)) {
          item.payment_details.forEach((data) => {
            if (data && typeof data === 'object') {
              data.vat_details = safeJsonParse(data?.vat_details);
            }
          });
        }

      })
    );

    return handleSuccess(
      res,
      StatusCode.status200,
      Message.dataFoundSuccessful,
      booking[0]
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

export const cancelBookingController = async (req, res) => {
  try {
    const { cancel_reason, booking_id } = req.body;
    const id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", id);


    if (!userDetails?.length)
      return handleError(res, StatusCode.status400, Message.dataNotFound);

    if (userDetails[0]?.is_verify == 0) {
      return handleError(
        res,
        StatusCode.status400,
        Message.userEmailNotVerified
      );
    }
    if (userDetails[0]?.is_active == 0) {
      return handleError(res, StatusCode.status400, Message.userBlocked);
    }

    const bookingDetails = await getBooking(booking_id);
    if (!bookingDetails?.length) {
      return handleError(res, StatusCode.status400, Message.dataNotFound);
    }
    const bookingDetail = bookingDetails[0];

    if (Number(bookingDetail.user_id) !== Number(id)) {
      return handleError(res, StatusCode.status403, "You are not allowed to cancel this booking.");
    }

    if (
      bookingDetail.booking_status == 2 ||
      (bookingDetail.is_canceled && bookingDetail.is_canceled !== "No")
    ) {
      return handleError(res, StatusCode.status400, "Booking is already canceled.");
    }

    const latestPayment = await getLatestBookingPayment(booking_id);
    const paidAmount =
      latestPayment?.payment_status === "COMPLETED"
        ? latestPayment?.total_amount
        : bookingDetail.payment_status == 1
          ? bookingDetail.total_price
          : 0;
    const refundBreakdown = calculateCancellationRefundBreakdown({
      bookingDate: bookingDetail.created_at,
      checkinDate: bookingDetail.booked_from,
      cancellationDate: new Date(),
      paidAmount,
    });

    const booking = await cancelBookingModel(cancel_reason, booking_id);

    await sendBookingCancelledEmail(`${userDetails[0].first_name} ${userDetails[0].last_name}`, userDetails[0].email, null, booking_id, bookingDetail.property_title, bookingDetail.booked_from, bookingDetail.booked_to, bookingDetail.guest, cancel_reason);

    const hostDetails = await getDataByLabel(DB_TABLE.host, "host_id", bookingDetail.host_id);

    await sendBookingCancelledEmail(`${hostDetails[0].first_name} ${hostDetails[0].last_name}`, hostDetails[0].email, null, booking_id, bookingDetail.property_title, bookingDetail.booked_from, bookingDetail.booked_to, bookingDetail.guest, cancel_reason);

    return handleSuccess(res, StatusCode.status200, Message.bookingCanceledSuccess, {
      booking_updated: booking,
      cancellation_policy: {
        booking_id: Number(booking_id),
        cancel_reason,
        ...refundBreakdown,
      },
    });
  } catch (error) {
    console.log("Error :", error);
    return handleError(
      res,
      StatusCode.status500,
      Message.INTERNAL_SERVER_ERROR
    );
  }
}

// --------------------karan devlopment here-----------------------
export const createReport = async (req, res) => {
  try {
    const id = req.user?.id;
    const user_id = id;
    const { property_id, report_title, description } = req.body;
    const data = { user_id, property_id, report_title, description, status: "pending", };
    await addDataIntoTable("report_master", data);
    return handleSuccess(res, 200, "Report submitted successfully");
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const getReportByUserId = async (req, res) => {
  try {
    const id = req.user?.id;
    const data = await getReportsModel(id);
    return handleSuccess(res, 200, "Data found successfully", data);
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

// ---------------------------------------user inquiry-----------------------

export const createInquiry = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const { property_id, name, message, email } = req.body;
    if (!property_id || !name || !message || !email) {
      return handleError(res, 400, "All fields required");
    }
    const property = await fetchUserPropertyByPropertyId(property_id);
    if (!property || property.length === 0) {
      return handleError(res, 404, "Property not found");
    }
    const host_id = property[0].host_id;
    const data = { user_id, property_id, host_id, name, message, email };
    await addDataIntoTable("inquiry_master", data);
    return handleSuccess(res, 200, "Inquiry submitted successfully");
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const getUserInquiries = async (req, res) => {
  try {
    const user_id = req.user?.id;
    let rows = await fetchUserInquiryByUserId(user_id);
    if (!rows || rows.length === 0) {
      return handleSuccess(res, 400, "No inquiries found", []);
    }
    return handleSuccess(res, 200, "User inquiries", rows);
  } catch (error) {
    console.log(error);
    return handleError(res, 500, "Internal Server Error");
  }
};

export const getSeoByPage = async (req, res) => {
  try {
    const { page_slug } = req.params;
    console.log('req.params', req.params)
    let rows = await fetchSeoMasterByPageSlug(page_slug);
    if (rows.length === 0) {
      return handleError(res, 400, "SEO not found");
    }
    return handleSuccess(res, 200, "SEO data", rows[0]);
  } catch (error) {
    return handleError(res, 500, "Internal Server Error");
  }
};


export const fetchUserNotifications = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", user_id);
    if (!userDetails?.length) {
      return handleError(res, StatusCode.status400, 'User not found');
    }

    const notifications = await getUserNotifications(user_id);
    return handleSuccess(res, StatusCode.status200, Message.dataFoundSuccessful, notifications);
  } catch (error) {
    console.log("Error :", error);
    return handleError(res, StatusCode.status500, Message.INTERNAL_SERVER_ERROR);
  }
};

export const deleteUserNotifications = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const userDetails = await getDataByLabel(DB_TABLE.users, "id", user_id);

    if (!userDetails?.length) {
      return handleError(res, StatusCode.status400, "User not found");
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
      user_id,
      "user",
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


