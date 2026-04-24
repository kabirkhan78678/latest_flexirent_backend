import express from "express";
import {
  changePassword,
  userEmailVarify,
  forgotPassword,
  fetchProfile,
  updateProfile,
  forgotResetPassword,
  getAllProperty,
  getAllPropertyFilter,
  propertyBooking,
  bookingPaymentConfirmed,
  getAllBooking,
  resetPassword,
  addSubUsers,
  updateMySubUsers,
  addRating,
  getGuestBusninessDashboard,
  uploadGuestDocuments,
  getAllMyKycDocuments,
  getGuestBusninessRecentBookings,
  getGuestBusninessBookingsById,
  getAllSubGuests,
  updateSubGuestBlockStatus,
  getGuestBusinessPayments,
  getRecentBooking,
  getMyBookings,
  getSingleBooking,
  supportTicket,
  getSupportTicket,
  uploadBookingDocuments,
  getPropertyBookingPrice,
  bookingPaymentConfirmedStripe,
  stripeSuccessHandler,
  stripeCancelHandler,
  gePaymentHistoryBookingController,
  gePaymentHistoryBookingByUserByIdController,
  cancelBookingController,
  toggleWishlist,
  getWishlist,
  getSubscriptionPlans,
  getGuestDashboard,
  getGuestRecentBookingsController,
  getPropertyByIdController,
  createReport,
  getReportByUserId,
  getUserInquiries,
  createInquiry,
  getSeoByPage,

  fetchUserNotifications,
  deleteUserNotifications,

} from "../controllers/usersController.js";
import {
  addRatingSchema,
  addSubUserSchema,
  addWishlistSchema,
  bookingConfirmedSchama,
  cancelBookingSchema,
  getPropertyBookingPriceSchema,
  getSubGuestUpdateSchema,
  handleValidationErrors,
  passwordChange,
  propertyBookingSchema,
  getPropertyByIdSchema,
  propertyFilterSchema,
  supportTicketSchema,
  updateSubUserSchema,
  uploadDocumentSchema,
  userForgotPasswordValidation,
  userLoginValidation,
  userProfileUpdateSchema,
  userSignupValidation,
  reportPropertySchema,
} from "../validations/userValidation.js";
import { authenticateUser } from "../middleware/Auth.js";
import { uploadProfile } from "../middleware/upload.js";
const app = express();



app.get("/verifyUser/:act_token", userEmailVarify);
app.post(
  "/change-password/",
  authenticateUser,
  passwordChange,
  handleValidationErrors,
  changePassword
);

app.post(
  "/forgot-password",
  userForgotPasswordValidation,
  handleValidationErrors,
  forgotPassword
);

app.post("/resetPassword", resetPassword)

app.get("/reset-password/:act_token", forgotResetPassword);

app.get("/fetch-profile", authenticateUser, fetchProfile);
app.post(
  "/update-profile",
  authenticateUser,
  uploadProfile.single("file"),
  userProfileUpdateSchema,
  handleValidationErrors,
  updateProfile
);

app.get("/get-all-property", getAllProperty);
app.get("/get-filtered-property", propertyFilterSchema, handleValidationErrors, getAllPropertyFilter);
app.get("/get-property-by-id/:property_id", getPropertyByIdSchema, handleValidationErrors, getPropertyByIdController);

app.post('/property-booking', authenticateUser, propertyBookingSchema, handleValidationErrors, propertyBooking);

app.post("/pay-booking", authenticateUser, bookingConfirmedSchama, handleValidationErrors, bookingPaymentConfirmed);
app.get("/get-all-my-booking", authenticateUser, getAllBooking);
app.get("/get-recent-booking", authenticateUser, getRecentBooking);

app.post("/add-sub-guest", authenticateUser, addSubUserSchema, handleValidationErrors, addSubUsers);
app.post("/update-sub-guest", authenticateUser, updateSubUserSchema, handleValidationErrors, updateMySubUsers);

app.post("/add-rating", authenticateUser, addRatingSchema, handleValidationErrors, addRating);

app.get("/get-business-dashboard-count", authenticateUser, getGuestBusninessDashboard);
app.get("/get-guest-dashboard-count", authenticateUser, getGuestDashboard);
app.get("/get-guest-recent-bookings", authenticateUser, getGuestRecentBookingsController);
app.post("/upload-kyc-document", authenticateUser, uploadProfile.fields([
  { name: "gov_file", maxCount: 1 },
  { name: "address_proof", maxCount: 1 },
  { name: "driving_license", maxCount: 1 },
  { name: "business_reg", maxCount: 1 }
]), uploadDocumentSchema, handleValidationErrors, uploadGuestDocuments);
app.get("/get-kyc-document", authenticateUser, getAllMyKycDocuments);

app.get("/get-guest-business-recent-booking", authenticateUser, getGuestBusninessRecentBookings);
app.get("/get-guest-business-booking-by-id/:booking_id", authenticateUser, getGuestBusninessBookingsById);
app.get("/get-all-sub-guest", authenticateUser, getAllSubGuests);
app.post("/update-sub-guest-block-status", authenticateUser, getSubGuestUpdateSchema, handleValidationErrors, updateSubGuestBlockStatus);
app.get("/get-guest-business-payments", authenticateUser, getGuestBusinessPayments);

app.get("/get-my-bookings", authenticateUser, getMyBookings);
app.get("/get-single-booking/:booking_id", authenticateUser, getSingleBooking);


app.post("/support-ticket", authenticateUser, supportTicketSchema, handleValidationErrors, supportTicket);
app.get("/get-support-ticket", authenticateUser, getSupportTicket);

app.post("/upload-booking-document/:booking_id", authenticateUser, uploadProfile.array("file", 10), uploadBookingDocuments);

app.get("/get-property-booking-price", authenticateUser, getPropertyBookingPriceSchema, handleValidationErrors, getPropertyBookingPrice);

app.post("/pay-booking-stripe", authenticateUser, bookingConfirmedSchama, handleValidationErrors, bookingPaymentConfirmedStripe);
app.get("/success", stripeSuccessHandler);
app.get("/failed", stripeCancelHandler);


app.get("/get-payment-history", authenticateUser, gePaymentHistoryBookingController);
app.get("/get-payment-history/:booking_id", authenticateUser, gePaymentHistoryBookingByUserByIdController);

app.post("/cancel-booking", authenticateUser, cancelBookingSchema, handleValidationErrors, cancelBookingController);

app.post("/toggle-wishlist", authenticateUser, addWishlistSchema, handleValidationErrors, toggleWishlist);
app.get("/get-wishlist", authenticateUser, getWishlist);
app.get("/get-subscription-plans", getSubscriptionPlans);

// -------------------------karan starting development from here------------------------------
app.post("/create-report", authenticateUser, reportPropertySchema, handleValidationErrors, createReport);
app.get("/get-report-by-userId", authenticateUser, getReportByUserId);

// ------------------------user inquiry----------------------

app.post("/create-user-inquiry", authenticateUser, createInquiry);
app.get("/get-all-user-inquiry", authenticateUser, getUserInquiries);

app.get("/seo/:page_slug", getSeoByPage);


app.get("/fetchUserNotifications", authenticateUser,fetchUserNotifications);
app.post("/delete-notification", authenticateUser, deleteUserNotifications);


export default app;
handleValidationErrors;
