import express from "express";
import {
  Login,
  addBlog,
  addGuset,
  addGusetBusiness,
  addHost,
  addServiceFeeController,
  addSubAdmin,
  changePassword,
  deleteBlogManagement,
  deleteServiceFeeController,
  fetchProfile,
  forgotPassword,
  forgotResetPassword,
  getAllDocuments,
  getAllProperty,
  getAllPropertyListing,
  getApprovedBookedPropertyData,
  getBlogManagement,
  getBookedPropertyByIdData,
  getContactUs,
  getDashboardData,
  getDocumentById,
  getHostBusinessById,
  getHostBusinessManagementData,
  getHostManagementData,
  getHostPropertyListed,
  getHostSubHostManagementData,
  getListingRequestData,
  getPendingBookedPropertyData,
  getPlatformFeeController,
  getPolicyManagement,
  getRejectedBookedPropertyData,
  getServiceFeeController,
  getSingleContactUs,
  getSingleSupportQuery,
  getSubAdmin,
  getSubAdminData,
  getSupportQuery,
  getUserBookedPropertyData,
  getUserBusinessDataById,
  getUserBusinessManagementData,
  getUserManagementData,
  replyContactUs,
  resetPassword,
  subAdminEmailVarify,
  supportTicketReply,
  updateBlogManagement,
  updateDocumentStatus,
  updateHostBlockStatus,
  updateListingProperty,
  updatePolicyManagement,
  updateProfile,
  updatePropertyStatus,
  updateServiceFeeController,
  updateSubAdmin,
  updateSubAdminStaus,
  updateUserBlockStatus,
  upsertPlatformFeeController,
  addSubscriptionPlan,
  getAllSubscriptionPlansController,
  getSubscriptionByIdController,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getBookingOverview,
  getBookingOverviewById,
  getAllReviewsAdmin,
  addAdminReview,
  deleteAdminReview,
  getApprovedPropertyOptionsForReviewController,
  getSeoManagement,
  updateSeoManagement,
  updateAdminReview,
  getAllReports,
  getReportDashboardCount,
  updateReportStatus,
  getReportById,
  getManagePayoutList,
  getPayoutDashboard,
  getPropertyCommissionReport,
  getAllPropertyCommissionReport,
  processDuePayoutsController,
  releasePayoutByPaymentId,
  createTestPayoutFunds,
  getStripePlatformBalance,
  getAllInquiries,

  getAllOfferList,
  getAllRatingsAdminController,
  fetchAdminNotifications,
  deleteAdminNotifications,
  createCancellationPolicy,
  getCancellationPolicies,
  getCancellationPolicyById,
  updateCancellationPolicy,
  deleteCancellationPolicy


} from "../controllers/adminController.js";
import {
  addBlogSchema,
  addGusestSchema,
  addServiceFeeSchema,
  addSubscriptionSchema,
  addSubAdminSchema,
  adminLoginValidation,
  adminProfileUpdateSchema,
  deleteBlogSchema,
  deleteSubscriptionSchema,
  docUpdateStaus,
  getSubscriptionByIdSchema,
  getBookingOverviewByIdSchema,
  addAdminReviewSchema,
  deleteAdminReviewSchema,
  getContentSchema,
  getDocumentByIdSchema,
  getUserBusinessByIdSchema,
  handleValidationErrors,
  hostPropertyListSchema,
  passwordChange,
  propertyBookedSchema,
  propertyUpdateStaus,
  replyContactUsSchema,
  seoManagementSchema,
  supportTicketReplySchema,
  updateSubscriptionSchema,
  updateBlogSchema,
  updateContentSchema,
  updateHostSchema,
  updateListingproperty,
  updateSubAdminSchema,
  updateSubAdminStatusSchema,
  updateUserSchema,
  upsertPlatformFeeSchema,
  userForgotPasswordValidation,
} from "../validations/userValidation.js";
import { authenticateAdmin } from "../middleware/Auth.js";
import { uploadProfile } from "../middleware/upload.js";

const app = express();

app.post("/login", adminLoginValidation, handleValidationErrors, Login);
app.get('/fetch-profile', authenticateAdmin, fetchProfile);
app.get('/get-all-property', authenticateAdmin, getAllProperty);
app.post("/update-property-status", authenticateAdmin, propertyUpdateStaus, handleValidationErrors, updatePropertyStatus);

app.get("/get-all-documents", authenticateAdmin, getAllDocuments);
app.get("/get-document", authenticateAdmin, getDocumentByIdSchema, handleValidationErrors, getDocumentById);
app.post(
  "/update-document-status",
  authenticateAdmin,
  docUpdateStaus,
  handleValidationErrors,
  updateDocumentStatus
);

app.post(
  "/forgot-password",
  userForgotPasswordValidation,
  handleValidationErrors,
  forgotPassword
);

app.post("/resetPassword", resetPassword)

app.get("/reset-password/:act_token", forgotResetPassword);

app.post(
  "/update-profile",
  authenticateAdmin,
  uploadProfile.single("file"),
  adminProfileUpdateSchema,
  handleValidationErrors,
  updateProfile
);

app.post(
  "/change-password",
  authenticateAdmin,
  passwordChange,
  handleValidationErrors,
  changePassword
);

app.post('/add-sub-admin', authenticateAdmin, addSubAdminSchema, handleValidationErrors, addSubAdmin);

app.get("/get-all-sub-admin", authenticateAdmin, getSubAdmin);

app.post("/update-sub-admin", authenticateAdmin, updateSubAdminSchema, handleValidationErrors, updateSubAdmin);

app.post("/update-sub-admin-status", authenticateAdmin, updateSubAdminStatusSchema, handleValidationErrors, updateSubAdminStaus);

app.get("/get-property-listing", authenticateAdmin, getAllPropertyListing);

app.post("/update-property-listing", authenticateAdmin, uploadProfile.fields([
  { name: "file", maxCount: 10 },
  { name: "videoFile", maxCount: 1 }
]), updateListingproperty, handleValidationErrors, updateListingProperty);

app.get("/verifySubadmin/:act_token", subAdminEmailVarify);

app.get("/get-all-sub-admin-count", authenticateAdmin, getSubAdminData);

app.get("/get-all-listing-request-count", authenticateAdmin, getListingRequestData);

app.get("/fetch-dashboard-data", authenticateAdmin, getDashboardData);

app.get("/fetch-user-management", authenticateAdmin, getUserManagementData);

app.get("/fetch-host-management", authenticateAdmin, getHostManagementData);

app.post("/update-user-block-status", authenticateAdmin, updateUserSchema, handleValidationErrors, updateUserBlockStatus);

app.post("/update-host-block-status", authenticateAdmin, updateHostSchema, handleValidationErrors, updateHostBlockStatus);

app.get("/get-user-business-management", authenticateAdmin, getUserBusinessManagementData);

app.get("/get-user-property-booked-data", authenticateAdmin, handleValidationErrors, getUserBookedPropertyData);

app.get("/get-policy-terms", authenticateAdmin, getContentSchema, handleValidationErrors, getPolicyManagement);

app.post("/update-policy-terms", authenticateAdmin, updateContentSchema, handleValidationErrors, updatePolicyManagement);

app.post("/add-blog", authenticateAdmin, uploadProfile.array("image", 10), addBlogSchema, handleValidationErrors, addBlog);

app.get("/get-blog-management", authenticateAdmin, getBlogManagement);

app.post("/update-blog", authenticateAdmin, uploadProfile.array("image", 10), updateBlogSchema, handleValidationErrors, updateBlogManagement);

app.delete("/delete-blog/:blog_id", authenticateAdmin, deleteBlogSchema, handleValidationErrors, deleteBlogManagement);

app.get("/get-host-property-listed", authenticateAdmin, hostPropertyListSchema, handleValidationErrors, getHostPropertyListed);

app.post("/add-guest", authenticateAdmin, uploadProfile.single("image"), addGusestSchema, handleValidationErrors, addGuset);

app.post("/add-host", authenticateAdmin, uploadProfile.single("image"), addGusestSchema, handleValidationErrors, addHost);

app.post("/add-guest-business", authenticateAdmin, uploadProfile.single("image"), addGusestSchema, handleValidationErrors, addGusetBusiness);

app.get("/get-user-by-business-id", authenticateAdmin, getUserBusinessByIdSchema, handleValidationErrors, getUserBusinessDataById);

app.get("/get-contact-us", authenticateAdmin, getContactUs);
app.post("/reply-contact-us", authenticateAdmin, replyContactUsSchema, handleValidationErrors, replyContactUs);
app.get("/get-contact-us/:contact_id", authenticateAdmin, getSingleContactUs);

app.get("/get-support-ticket", authenticateAdmin, getSupportQuery);
app.post("/support-ticket-reply", authenticateAdmin, supportTicketReplySchema, handleValidationErrors, supportTicketReply);
app.get("/get-support-query/:ticket_id", authenticateAdmin, getSingleSupportQuery);

app.get("/fetch-host-business-management", authenticateAdmin, getHostBusinessManagementData);
app.get("/get-host-business-by-id/:host_id", authenticateAdmin, getHostBusinessById);
app.get("/get-sub-host/:host_id", authenticateAdmin, getHostSubHostManagementData);

app.get("/pending-bookings", authenticateAdmin, getPendingBookedPropertyData);
app.get("/approve-bookings", authenticateAdmin, getApprovedBookedPropertyData);
app.get("/rejected-bookings", authenticateAdmin, getRejectedBookedPropertyData);
app.get("/bookings/:booking_id", authenticateAdmin, getBookedPropertyByIdData);

app.post("/add-service-fee", authenticateAdmin, addServiceFeeSchema, handleValidationErrors, addServiceFeeController);
app.get("/get-service-fee", authenticateAdmin, getServiceFeeController);
app.patch("/update-service-fee/:fee_id", authenticateAdmin, addServiceFeeSchema, handleValidationErrors, updateServiceFeeController);
app.delete("/delete-service-fee/:fee_id", authenticateAdmin, deleteServiceFeeController);

app.post("/add-subscription", authenticateAdmin, addSubscriptionSchema, handleValidationErrors, addSubscriptionPlan);
app.get("/get-all-subscription", authenticateAdmin, getAllSubscriptionPlansController);
app.get("/get-subscription", authenticateAdmin, getSubscriptionByIdSchema, handleValidationErrors, getSubscriptionByIdController);
app.post("/update-subscription", authenticateAdmin, updateSubscriptionSchema, handleValidationErrors, updateSubscriptionPlan);
app.post("/delete-subscription", authenticateAdmin, deleteSubscriptionSchema, handleValidationErrors, deleteSubscriptionPlan);


app.post(
  "/upsert-platform-fee",
  authenticateAdmin,
  upsertPlatformFeeSchema,
  handleValidationErrors,
  upsertPlatformFeeController
);

app.get(
  "/get-platform-fee",
  authenticateAdmin,
  getPlatformFeeController
);

app.get("/booking-overview", authenticateAdmin, getBookingOverview);
app.get("/booking-overview/:booking_id",
  authenticateAdmin,
  getBookingOverviewById
);
app.get("/reviews", authenticateAdmin, getAllReviewsAdmin);
app.get("/reviews/property-options", authenticateAdmin, getApprovedPropertyOptionsForReviewController);
app.post("/reviews", authenticateAdmin, uploadProfile.single("file"), addAdminReviewSchema, handleValidationErrors, addAdminReview);
app.delete("/reviews/:rating_id", authenticateAdmin, deleteAdminReviewSchema, handleValidationErrors, deleteAdminReview);

app.get("/seo-management", authenticateAdmin, getSeoManagement);
app.post("/update-seo-management", authenticateAdmin, seoManagementSchema, handleValidationErrors, updateSeoManagement);

// ------------------------------karan starting development from here------------------------------
app.post("/update-admin-review", authenticateAdmin, updateAdminReview);
app.get("/reports", authenticateAdmin, getAllReports);
app.get("/report-dashboard", authenticateAdmin, getReportDashboardCount);
app.post("/update-report-status", authenticateAdmin, updateReportStatus);
app.get("/report/:report_id", authenticateAdmin, getReportById);
app.get("/manage-payout", authenticateAdmin, getManagePayoutList);
app.get("/payout-dashboard", authenticateAdmin, getPayoutDashboard);
app.get("/property-commission-report", authenticateAdmin, getPropertyCommissionReport);
app.get("/property-commission-report-all", authenticateAdmin, getAllPropertyCommissionReport);
app.post("/process-due-payouts", authenticateAdmin, processDuePayoutsController);
app.post("/release-payout/:payment_id", authenticateAdmin, releasePayoutByPaymentId);
app.post("/test-fund-payout-balance", authenticateAdmin, createTestPayoutFunds);
app.get("/stripe-platform-balance", authenticateAdmin, getStripePlatformBalance);

// -----------------------------------fetch all inquiry of all users----------------------

app.get("/getAllInquiries", authenticateAdmin, getAllInquiries);
app.get("/fetch-all-ratings", authenticateAdmin, getAllRatingsAdminController);


// -------------------fetch admin notifications----------------------
app.get("/fetchAdminNotifications", authenticateAdmin, fetchAdminNotifications);
app.post("/delete-notification", authenticateAdmin, deleteAdminNotifications);

// Cancellation Policy APIs
app.get("/get-all-offers", authenticateAdmin, getAllOfferList);
app.post("/create-cancellation-policy", authenticateAdmin, createCancellationPolicy);
app.get("/get-cancellation-policies", authenticateAdmin, getCancellationPolicies);
app.get("/get-cancellation-policy/:policy_id", authenticateAdmin, getCancellationPolicyById);
app.post("/update-cancellation-policy", authenticateAdmin, updateCancellationPolicy);
app.post("/delete-cancellation-policy", authenticateAdmin, deleteCancellationPolicy);
app.post("/cancellation-policy-settings", authenticateAdmin, updateCancellationPolicy);


export default app;
handleValidationErrors;
