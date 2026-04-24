import express from "express";
import {
  hostEmailVarify, fetchProfile, updateProfile, changePassword, createNewProperty, createPropertyListing, getAllMyPropetyListing, updateBookingStatus, getAllBooking, uploadDocuments, getAllMyDocuments, resetPassword, forgotResetPassword, deleteMyProperty, getAllCategory, getAllAmenties, getAllSafetyAmenties, getAllIdealFor, updateMyProperty, getBookingById, getSupportTicket, getSupportQuery, supportTicket, supportTicketReply, requesteForBookingDocument, addSubHost, subHostEmailVarify, updateSubHost, getAllSubHost, updatePropertyCleaningStatus, getSupportTicketById, blockUnblockSubHost, getSubHostById, getTodaysCheckOutList, updateBookingCheckOutStatus, getAllCleaningPropertyListing, getHostPermission, createHostSubscription, subscriptionSuccess, subscriptionCancel, getCurrentSubscription, getHostDashboard, getHostReviewsController, fetchPropertyInquiries,
  getMyReports,
  updatePropertyOffer,
  createMultiplePropertyOffer,
  getHostOfferProperties,
  updateOfferIsActive,
  getHostPropertiesWithoutOfferController,

  fetchHostNotifications, deleteHostNotifications,

  createStripeConnectedAccount, getStripeOnboardingLink, getStripeAccountStatus, getMyPayouts,
  stripeOnboardingSuccessPage, stripeOnboardingCancelPage, stripeOnboardingLaunchPage,

  setupStripeAccount, getStripeStatus

} from "../controllers/hostController.js";
import { authenticateHost } from "../middleware/Auth.js";
import {
  addSubAdminSchema,
  addSubHostSchema,
  bookingStatusUpdateSchema,
  handleValidationErrors,
  passwordChange,
  propertyDeleteSchama,
  propertyListSchema,
  propertySchema,
  requestForDocumentSchema,
  hostSubscribeSchema,
  supportTicketReplySchema,
  supportTicketSchema,
  updatePropertyCleaningStatusSchema,
  updatepropertySchema,
  updateSubhostSchema,
  uploadDocumentSchema,
  userProfileUpdateSchemaHost,
} from "../validations/userValidation.js";
import { uploadProfile } from "../middleware/upload.js";
import { getSubscriptionPlans } from "../controllers/usersController.js";

const app = express();


app.get("/verifyUser/:act_token", hostEmailVarify);

app.post("/resetPassword", resetPassword)

app.get("/reset-password/:act_token", forgotResetPassword);



app.get("/fetch-profile", authenticateHost, fetchProfile);
app.post(
  "/update-profile",
  authenticateHost,
  uploadProfile.single("file"),
  userProfileUpdateSchemaHost,
  handleValidationErrors,
  updateProfile
);

app.post(
  "/change-password",
  authenticateHost,
  passwordChange,
  handleValidationErrors,
  changePassword
);

app.post("/create-new-property", authenticateHost, uploadProfile.fields([
  { name: "file", maxCount: 10 },
  { name: "videoFile", maxCount: 1 }
]), propertySchema, handleValidationErrors, createNewProperty);

app.post("/update-my-property", authenticateHost, uploadProfile.fields([
  { name: "file", maxCount: 10 },
  { name: "videoFile", maxCount: 1 }
]), updatepropertySchema, handleValidationErrors, updateMyProperty);

app.post("/create-property-listing", authenticateHost, propertyListSchema, handleValidationErrors, createPropertyListing);

app.get("/get-all-my-property", authenticateHost, getAllMyPropetyListing);

app.post("/update-booking-status", authenticateHost, bookingStatusUpdateSchema, handleValidationErrors, updateBookingStatus);

app.get("/get-all-booking", authenticateHost, getAllBooking);

app.get("/get-booking-by-id/:booking_id", authenticateHost, getBookingById);

app.post("/upload-kyc-document", authenticateHost, uploadProfile.single("file"), uploadDocumentSchema, handleValidationErrors, uploadDocuments);

app.get("/get-kyc-document", authenticateHost, getAllMyDocuments);

app.post("/delete-my-property", authenticateHost, propertyDeleteSchama, handleValidationErrors, deleteMyProperty);

app.get("/get-all-category", authenticateHost, getAllCategory);

app.get("/get-amenties", authenticateHost, getAllAmenties);
app.get("/get-safety-amenties", authenticateHost, getAllSafetyAmenties);
app.get("/get-ideal-for", authenticateHost, getAllIdealFor);

app.get("/get-support-ticket", authenticateHost, getSupportTicket);
app.get("/get-support-query", authenticateHost, getSupportQuery);
app.post("/support-ticket", authenticateHost, supportTicketSchema, handleValidationErrors, supportTicket);
app.post("/support-ticket-reply", authenticateHost, supportTicketReplySchema, handleValidationErrors, supportTicketReply);
app.get("/get-support-ticket-by-id/:ticket_id", authenticateHost, getSupportTicketById);

app.post("/request-for-documents", authenticateHost, requestForDocumentSchema, handleValidationErrors, requesteForBookingDocument);

app.post('/add-sub-host', authenticateHost, addSubHostSchema, handleValidationErrors, addSubHost);
app.get("/verifySubhost/:act_token", subHostEmailVarify);
app.post("/update-sub-host", authenticateHost, updateSubhostSchema, handleValidationErrors, updateSubHost);
app.get("/get-all-sub-host", authenticateHost, getAllSubHost);

app.post("/update-property-cleaning-status", authenticateHost, updatePropertyCleaningStatusSchema, handleValidationErrors, updatePropertyCleaningStatus);

app.post("/sub-host-block-unblock/:host_id", authenticateHost, blockUnblockSubHost);
app.get("/get-sub-host-by-id/:host_id", authenticateHost, getSubHostById);

app.get("/get-todays-checkout-list", authenticateHost, getTodaysCheckOutList);

app.post("/update-booking-checkout-status/:booking_id", authenticateHost, updateBookingCheckOutStatus);

app.get("/get-cleaning-property-list", authenticateHost, getAllCleaningPropertyListing);

app.get("/fetch-host-permission", authenticateHost, getHostPermission);

app.get("/dashboard", authenticateHost, getHostDashboard);
app.get("/reviews", authenticateHost, getHostReviewsController);
app.post("/subscribe-plan", authenticateHost, hostSubscribeSchema, handleValidationErrors, createHostSubscription);
app.get("/subscription-success", subscriptionSuccess);
app.get("/subscription-cancel", subscriptionCancel);
app.get("/current-subscription", authenticateHost, getCurrentSubscription);

app.get("/get-subscription-plans", getSubscriptionPlans);

app.get("/my-reports", authenticateHost, getMyReports);
// ------------------------inquiry module------------------------------------------

app.get("/fetchPropertyInquiries", authenticateHost, fetchPropertyInquiries);

app.post("/create-multiple-offer", authenticateHost, createMultiplePropertyOffer);
app.get("/offer-properties", authenticateHost, getHostOfferProperties);
app.post("/update-offer-status", authenticateHost, updateOfferIsActive);
app.post("/update-offer", authenticateHost, updatePropertyOffer);


app.get("/host-properties-without-offer", authenticateHost, getHostPropertiesWithoutOfferController);

app.get("/fetchHostNotifications", authenticateHost, fetchHostNotifications);
app.post("/delete-notification", authenticateHost, deleteHostNotifications);

app.get("/my-payouts", authenticateHost, getMyPayouts);
app.get("/create-stripe-account", authenticateHost, createStripeConnectedAccount);
app.get("/stripe-onboarding-link", authenticateHost, getStripeOnboardingLink);
app.get("/stripe-account-status", authenticateHost, getStripeAccountStatus);
app.get("/stripe-onboarding-launch", stripeOnboardingLaunchPage);
app.get("/stripe-onboarding-success", stripeOnboardingSuccessPage);
app.get("/stripe-onboarding-cancel", stripeOnboardingCancelPage);

app.post(
  "/stripe-setup",
  authenticateHost,
  uploadProfile.fields([
    { name: "file", maxCount: 1 },
    { name: "documents", maxCount: 1 }
  ]),
  setupStripeAccount
);

app.get("/stripe-status", authenticateHost, getStripeStatus);


export default app;
