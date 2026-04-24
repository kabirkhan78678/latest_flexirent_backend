import express from "express";
import {
  Login,
  userRegister,forgotPassword,
  getAllAmenties,
  getAllSafetyAmenties,
  getAllIdealFor,
  getAllCategory,
  getDocumentName,
  getHouseRules,
  getBedsBathPropertyCount,
  getBhkPropertyCount,
  getPolicyManagement,
  contactUs,
  getallBlog,
  getBlogById,
  getSupportDetails,
  getBusinessRuleTypes,
  getGovernmentIdTypes,
  getProofOfAddressTypes,
  getBusinessRegistrationTypes,
  getSubAdminRuleTypes,
  getAllGuestReviews
} from "../controllers/commonController.js";
import {
  contactUsSchema,
  handleValidationErrors,
  passwordChange,
  userForgotPasswordValidation,
  userLoginValidation,
  userProfileUpdateSchema,
  userSignupValidation,
} from "../validations/userValidation.js";
import { authenticateUser } from "../middleware/Auth.js";
import { uploadProfile } from "../middleware/upload.js";

const app = express();

// Auth
app.post(
  "/signup",
  userSignupValidation,
  handleValidationErrors,
  userRegister
);
app.post("/login", userLoginValidation, handleValidationErrors, Login);

app.post(
  "/forgot-password",
  userForgotPasswordValidation,
  handleValidationErrors,
  forgotPassword
);


app.get("/get-amenties",getAllAmenties);
app.get("/get-safety-amenties",getAllSafetyAmenties);
app.get("/get-ideal-for",getAllIdealFor);
app.get("/get-all-category",getAllCategory);
app.get("/get-document-name", getDocumentName);
app.get("/get-all-house-rules", getHouseRules);
app.get("/get-beds-bath-property-count", getBedsBathPropertyCount);
app.get("/get-bhk-property-count", getBhkPropertyCount);
app.get("/get-policy/:content_type",getPolicyManagement);
app.post("/contact-us",contactUsSchema, handleValidationErrors, contactUs);
app.get("/get-all-blog",getallBlog);
app.get("/get-blog/:blog_id",getBlogById);
app.get("/get-support-details",getSupportDetails);
app.get("/fetch-host-permission",getBusinessRuleTypes);
app.get("/fetch-government-id-types",getGovernmentIdTypes);
app.get("/fetch-proof-of-address-types",getProofOfAddressTypes);
app.get("/fetch-business-registration-types",getBusinessRegistrationTypes);
app.get("/get-sub-admin-permissions",getSubAdminRuleTypes);
app.get("/get-reviews",getAllGuestReviews);



export default app;
handleValidationErrors;
