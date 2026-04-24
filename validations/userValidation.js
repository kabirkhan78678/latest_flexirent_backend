import { body, param, query, validationResult } from "express-validator";
import { vallidationErrorHandle } from "../utils/responseHandler.js";

// const emailValidator =

export const userSignupValidation = [
  // body("email")
  //   .notEmpty()
  //   .withMessage(
  //     "The email field cannot be empty. Please provide your email address."
  //   )
  //   .isEmail()
  //   .withMessage(
  //     "Please enter a valid email address (e.g., example@example.com)."
  //   ),

  body("password")
    .notEmpty()
    .withMessage(
      "The password field cannot be empty. Please provide a password."
    )
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/\d/)
    .withMessage("Password must contain at least one digit.")
    .matches(/[!@#$%^&*]/)
    .withMessage(
      "Password must include at least one special character (e.g., !@#$%^&*)."
    )
    .matches(/[A-Z]/)
    .withMessage("Password must include at least one uppercase letter."),

  body("first_name")
    .notEmpty()
    .withMessage(
      "The first name field cannot be empty. Please provide a first name."
    )
    .isLength({ min: 3, max: 30 })
    .withMessage("First Name must be between 3 and 30 characters long.")
    .matches(/^[a-zA-Z]+$/)
    .withMessage(
      "First Name can only contain letters without spaces or special characters."
    ),

  body("last_name")
    .notEmpty()
    .withMessage(
      "The last name field cannot be empty. Please provide a last name."
    )
    .isLength({ min: 3, max: 30 })
    .withMessage("Last Name must be between 3 and 30 characters long.")
    .matches(/^[a-zA-Z]+$/)
    .withMessage(
      "Last Name can only contain letters without spaces or special characters."
    ),

  body("type")
    .notEmpty()
    .withMessage("The 'type' field cannot be empty. Please provide a type.")
    .isInt({ min: 1, max: 2 })
    .withMessage("The 'type' field must be either 1 or 2."),

  body("user_type")
    .notEmpty()
    .withMessage("The 'user_type' field cannot be empty. Please provide a user_type.")
    .isInt({ min: 1, max: 2 })
    .withMessage("The 'user_type' field must be either 1 or 2."),
];

export const userLoginValidation = [
  // body("email")
  //   .notEmpty()
  //   .withMessage(
  //     "The email field cannot be empty. Please provide your email address."
  //   )
  //   .isEmail()
  //   .withMessage(
  //     "Please enter a valid email address (e.g., example@example.com)."
  //   ),

  body("password")
    .notEmpty()
    .withMessage(
      "The password field cannot be empty. Please provide a password."
    )
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/\d/)
    .withMessage("Password must contain at least one digit.")
    .matches(/[!@#$%^&*]/)
    .withMessage(
      "Password must include at least one special character (e.g., !@#$%^&*)."
    )
    .matches(/[A-Z]/)
    .withMessage("Password must include at least one uppercase letter."),

  body("type")
    .notEmpty()
    .withMessage("The 'type' field cannot be empty. Please provide a type.")
    .isInt({ min: 1, max: 2 })
    .withMessage("The 'type' field must be either 1 or 2."),

  body("user_type")
    .notEmpty()
    .withMessage("The 'user_type' field cannot be empty. Please provide a user_type.")
    .isInt({ min: 1, max: 3 })
    .withMessage("The 'user_type' field must be either 1, 2 or 3."),
];

export const adminLoginValidation = [
  // body("email")
  //   .notEmpty()
  //   .withMessage(
  //     "The email field cannot be empty. Please provide your email address."
  //   )
  //   .isEmail()
  //   .withMessage(
  //     "Please enter a valid email address (e.g., example@example.com)."
  //   ),

  body("password")
    .notEmpty()
    .withMessage(
      "The password field cannot be empty. Please provide a password."
    )
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/\d/)
    .withMessage("Password must contain at least one digit.")
    .matches(/[!@#$%^&*]/)
    .withMessage(
      "Password must include at least one special character (e.g., !@#$%^&*)."
    )
    .matches(/[A-Z]/)
    .withMessage("Password must include at least one uppercase letter."),

];

export const userForgotPasswordValidation = [
  // body("email")
  //   .notEmpty()
  //   .withMessage(
  //     "The email field cannot be empty. Please provide your email address."
  //   )
  //   .isEmail()
  //   .withMessage(
  //     "Please enter a valid email address (e.g., example@example.com)."
  //   ),
];

export const passwordChange = [
  body("current_password")
    .notEmpty()
    .withMessage("Current password is required"),

  body("new_password").notEmpty().withMessage("New password is required").isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/\d/)
    .withMessage("Password must contain at least one digit.")
    .matches(/[!@#$%^&*]/)
    .withMessage(
      "Password must include at least one special character (e.g., !@#$%^&*)."
    ),
];

export const userProfileUpdateSchema = [
  body("first_name")
    .notEmpty()
    .withMessage(
      "The first_name field cannot be empty. Please provide a first_name."
    ),
  body("last_name")
    .notEmpty()
    .withMessage(
      "The last_name field cannot be empty. Please provide a last_name."
    ),
  body("phone")
    .notEmpty()
    .withMessage("The phone field cannot be empty. Please provide a phone.")
    .isMobilePhone("any", { strictMode: true })
    .withMessage("Invalid phone number"),
  // body("address")
  //   .notEmpty()
  //   .withMessage(
  //     "The address field cannot be empty. Please provide a address."
  //   ),
  // body("nationality")
  //   .notEmpty()
  //   .withMessage(
  //     "The nationality field cannot be empty. Please provide a nationality."
  //   ),
  // body("gender")
  //   .notEmpty()
  //   .withMessage("The gender field cannot be empty. Please provide a gender."),
  // body("dob")
  //   .notEmpty()
  //   .withMessage("The dob field cannot be empty. Please provide a dob."),
];

export const userProfileUpdateSchemaHost = [
  body("first_name")
    .notEmpty()
    .withMessage(
      "The first_name field cannot be empty. Please provide a first_name."
    ),
  body("last_name")
    .notEmpty()
    .withMessage(
      "The last_name field cannot be empty. Please provide a last_name."
    ),
  body("phone")
    .notEmpty()
    .withMessage("The phone field cannot be empty. Please provide a phone.")
    .isMobilePhone("any", { strictMode: true })
    .withMessage("Invalid phone number"),
  body("about")
    .optional()
    .notEmpty()
    .withMessage("The about field cannot be empty if provided. Please provide a valid about.")
];


export const propertySchema = [

  body("owner_type")
    .isIn([1, 2])
    .withMessage("owner_type must be 1 or 2"),

  body("category_id")
    .isInt({ min: 1 })
    .withMessage("category_id must be a valid integer"),

  body("property_title")
    .notEmpty()
    .withMessage("property_title cannot be empty"),

  body("property_description")
    .notEmpty()
    .withMessage("property_description cannot be empty"),

  body("floor")
    .notEmpty()
    .withMessage("floor cannot be empty"),

  body("address")
    .notEmpty()
    .withMessage("address cannot be empty"),

  body("post_code")
    .notEmpty()
    .withMessage("post_code cannot be empty"),

  body("bedrooms")
    .isInt({ min: 0 })
    .withMessage("bedrooms must be a non-negative integer"),

  body("bathrooms")
    .isInt({ min: 0 })
    .withMessage("bathrooms must be a non-negative integer"),

  body("beds")
    .isInt({ min: 0 })
    .withMessage("beds must be a non-negative integer"),

  body("cleaning_fee")
    .isFloat({ min: 0 })
    .withMessage("cleaning_fee must be a non-negative integer"),

  body("cleaning_fee_type")
    .isInt({ min: 0, max: 1 })
    .withMessage("cleaning_fee_type must be a non-negative integer"),


  body("square_foot")
    .isFloat({ min: 0 })
    .withMessage("square_foot must be a non-negative number"),

  body("amenities")
    // .isObject()
    // .withMessage("amenities must be an object")
    .notEmpty()
    .withMessage("amenities cannot be empty"),

  body("safety_amenities")
    // .isObject()
    // .withMessage("safety_amenities must be an object")
    .notEmpty()
    .withMessage("safety_amenities cannot be empty"),

  body("ideal_for")
    // .isObject()
    // .withMessage("ideal_for must be an object")
    .notEmpty()
    .withMessage("ideal_for cannot be empty"),


  body("check_in")
    .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .withMessage("check_in must be in 24-hour HH:MM:SS format (e.g., 14:30:00)"),

  body("check_out")
    .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .withMessage("check_out must be in 24-hour HH:MM:SS format (e.g., 11:00:00)"),


  body("house_rules")
    .notEmpty()
    .withMessage("house_rules cannot be empty"),

  body("monthly_rent")
    .isFloat({ min: 0 })
    .withMessage("monthly_rent must be a non-negative number"),

  body("monthly_rent_type")
    .isInt({ min: 0, max: 1 })
    .withMessage("monthly_rent_type must be a non-negative integer"),

  body("security_deposit")
    .isFloat({ min: 0 })
    .withMessage("security_deposit must be a non-negative number"),

  body("available_from")
    .isISO8601()
    .withMessage("available_from must be a valid date (YYYY-MM-DD)"),

  body("min_stay_duration")
    .isInt({ min: 1 })
    .withMessage("min_stay_duration must be at least 1"),

  body("max_person")
    .notEmpty()
    .isInt({ min: 0 })
    .withMessage("max_person must be a non-negative integer"),

  body("location")
    .notEmpty()
    .withMessage("The location field cannot be empty. Please provide a location."),

  body("country")
    .notEmpty()
    .withMessage("The country field cannot be empty. Please provide a country."),

  body("state")
    .notEmpty()
    .withMessage("The state field cannot be empty. Please provide a state."),

     // ✅ ADDED: Latitude
  body("latitude")
    .notEmpty()
    .withMessage("latitude cannot be empty")
    .isFloat({ min: -90, max: 90 })
    .withMessage("latitude must be between -90 and 90"),

  // ✅ ADDED: Longitude
  body("longitude")
    .notEmpty()
    .withMessage("longitude cannot be empty")
    .isFloat({ min: -180, max: 180 })
    .withMessage("longitude must be between -180 and 180"),

];

export const propertyListSchema = [

  body("floor")
    .notEmpty()
    .withMessage("floor cannot be empty"),

  body("address")
    .notEmpty()
    .withMessage("address cannot be empty"),

  body("post_code")
    .notEmpty()
    .withMessage("post_code cannot be empty"),

  body("website_address")
    .notEmpty()
    .withMessage("website_address cannot be empty"),

    // ✅ ADDED: Latitude
  body("latitude")
    .notEmpty()
    .withMessage("latitude cannot be empty")
    .isFloat({ min: -90, max: 90 })
    .withMessage("latitude must be between -90 and 90"),

  // ✅ ADDED: Longitude
  body("longitude")
    .notEmpty()
    .withMessage("longitude cannot be empty")
    .isFloat({ min: -180, max: 180 })
    .withMessage("longitude must be between -180 and 180"),

];


export const propertyUpdateStaus = [
  body("property_id")
    .notEmpty()
    .withMessage("property_id cannot be empty"),

  body("status")
    .isIn([1, 2])
    .withMessage("status must be 1 or 2"),
]

export const docUpdateStaus = [
  body("id")
    .notEmpty()
    .withMessage("id cannot be empty"),

  body("user_type")
    .isIn([1, 2])
    .withMessage("user_type must be 1 or 2"),

  body("status")
    .isIn([1, 2])
    .withMessage("status must be 1 or 2"),

  body("rejected_reason")
    .if(body("status").equals("2")) // only check if status = 2
    .notEmpty()
    .withMessage("rejected_reason is required when status is 2"),
]

export const getDocumentByIdSchema = [
  query("id")
    .notEmpty()
    .withMessage("id cannot be empty"),

  query("user_type")
    .isIn([1, 2])
    .withMessage("user_type must be 1 or 2"),
]

export const propertyFilterSchema = [
  // amenties (should be an array or a comma-separated string)
  query("amenties")
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) return true;
      if (typeof value === "string") return true;
      throw new Error("amenties must be an array or comma-separated string");
    }),

  query("move_in")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("move_in must be a valid ISO date")
    .custom((value, { req }) => {
      if (value && !req.query.move_out) {
        throw new Error("move_out is required when move_in is provided");
      }
      return true;
    }),

  query("move_out")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("move_out must be a valid ISO date")
    .custom((value, { req }) => {
      if (value && !req.query.move_in) {
        throw new Error("move_in is required when move_out is provided");
      }
      if (value && req.query.move_in) {
        const moveIn = new Date(req.query.move_in);
        const moveOut = new Date(value);
        if (moveIn >= moveOut) {
          throw new Error("move_out must be after move_in");
        }
      }
      return true;
    }),



  // min_price and max_price must be valid floats
  query("min_price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("min_price must be a non-negative number"),

  query("max_price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("max_price must be a non-negative number"),

  // bed_bath (should be a number)
  query("bed_bath")
    .optional()
    .isString()
    .withMessage("bed_bath must be a non-negative integer"),

  // bhk (should be a number)
  query("bhk")
    .optional()
    .isString()
    .withMessage("bhk must be a non-negative integer"),

  query("max_person")
    .optional()
    .isInt({ min: 0 })
    .withMessage("max_person must be a non-negative integer"),

  // location (text search)
  query("location")
    .optional()
    .isString()
    .withMessage("location must be a string"),

  // sort_by (1 = ASC, 2 = DESC)
  query("sort_by")
    .optional()
    .isIn(["1", "2"])
    .withMessage("sort_by must be 1 (ASC) or 2 (DESC)"),
];

export const getPropertyByIdSchema = [
  param("property_id")
    .notEmpty()
    .withMessage("property_id is required")
    .isInt({ min: 1 })
    .withMessage("property_id must be a valid positive integer"),
];



export const propertyBookingSchema = [
  body("property_id")
    .notEmpty()
    .withMessage("property_id is required")
    .isInt({ min: 1 })
    .withMessage("property_id must be a valid integer"),

  body("booked_from")
    .notEmpty()
    .withMessage("booked_from date is required")
    .isISO8601()
    .withMessage("booked_from must be a valid ISO date"),

  body("booked_to")
    .notEmpty()
    .withMessage("booked_to date is required")
    .isISO8601()
    .withMessage("booked_to must be a valid ISO date")
    .custom((value, { req }) => {
      const from = new Date(req.body.booked_from);
      const to = new Date(value);
      if (from >= to) {
        throw new Error("booked_to must be after booked_from");
      }
      return true;
    }),

  body("total_price")
    .notEmpty()
    .withMessage("total_price is required")
    .isFloat({ min: 0 })
    .withMessage("total_price must be a non-negative number"),

  body("purpose_of_stay")
    .notEmpty()
    .withMessage("purpose_of_stay is required")
    .isString()
    .withMessage("purpose_of_stay must be a string"),

  body("guest")
    .optional()
    .isInt({ min: 1 })
    .withMessage("guest must be a positive integer"),

  body("user_earning")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("user_earning must be a non-negative number"),

  body("full_name")
    .notEmpty()
    .withMessage("full_name is required")
    .isString()
    .withMessage("full_name must be a string"),

  body("email")
    .notEmpty()
    .withMessage("email is required")
    .isString()
    .withMessage("email must be a string"),

  body("nationality")
    .notEmpty()
    .withMessage("nationality is required")
    .isString()
    .withMessage("nationality must be a string"),

  body("phone_number")
    .notEmpty()
    .withMessage("phone_number is required")
];

export const bookingStatusUpdateSchema = [
  body("booking_id")
    .notEmpty()
    .withMessage("booking_id is required")
    .isInt({ min: 1 })
    .withMessage("booking_id must be a valid positive integer"),

  body("booking_status")
    .notEmpty()
    .withMessage("booking_status is required")
    .isIn([1, 2])
    .withMessage("booking_status must be 1 (approve) or 2 (reject/cancel)"),
];


export const uploadDocumentSchema = [
  body("gov_doc_title")
    .notEmpty()
    .withMessage("gov_doc_title is required")
    .isString()
    .withMessage("gov_doc_title must be a string"),

  body("address_proof_title")
    .notEmpty()
    .withMessage("address_proof_title is required")
    .isString()
    .withMessage("address_proof_title must be a string"),

  body("driving_licence_title")
    .optional()
    .isString()
    .withMessage("driving_licence_title must be a string"),

  body("business_reg_title")
    .optional()
    .isString()
    .withMessage("business_reg_title must be a string"),
];

export const adminProfileUpdateSchema = [
  body("full_name")
    .notEmpty()
    .withMessage(
      "The full_name field cannot be empty. Please provide a full_name."
    ),
];

export const propertyDeleteSchama = [
  body("property_id")
    .notEmpty()
    .withMessage("property_id is required")
    .isInt({ min: 1 })
    .withMessage("property_id must be a valid positive integer"),

];

export const bookingConfirmedSchama = [
  body("booking_id")
    .notEmpty()
    .withMessage("booking_id is required")
    .isInt({ min: 1 })
    .withMessage("booking_id must be a valid positive integer"),
];

export const addSubAdminSchema = [
  body("full_name")
    .notEmpty()
    .withMessage("The full_name field cannot be empty. Please provide a full_name."),

  // body("email")
  //   .notEmpty()
  //   .withMessage("The email field cannot be empty. Please provide an email.")
  //   .isEmail()
  //   .withMessage("Please enter a valid email address.")
  //   .normalizeEmail(),

  body("mobile")
    .notEmpty()
    .withMessage("The mobile field cannot be empty. Please provide a mobile.")
    .isMobilePhone("any", { strictMode: true })
    .withMessage("Invalid phone number."),

  body("permission")
    .custom((value) => {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error("Permission must be a non-empty array.");
      }
      return true;
    }),
];

export const updateSubAdminSchema = [
  body("full_name")
    .notEmpty()
    .withMessage("The full_name field cannot be empty. Please provide a full_name."),

  body("sub_admin_id")
    .notEmpty()
    .withMessage("The sub_admin_id field cannot be empty. Please provide a sub_admin_id."),


  body("mobile")
    .notEmpty()
    .withMessage("The mobile field cannot be empty. Please provide a mobile.")
    .isMobilePhone("any", { strictMode: true })
    .withMessage("Invalid phone number."),


  body("permission")
    .custom((value) => {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error("Permission must be a non-empty array.");
      }
      return true;
    }),
];

export const updatepropertySchema = [
  body("property_id")
    .notEmpty()
    .withMessage("property_id cannot be empty"),

  body("deleteImageIds")
    .optional(),
  // .custom((value) => {
  //   if (!Array.isArray(value)) {
  //     throw new Error("deleteImageIds must be an array.");
  //   }
  //   return true;
  // }),


  body("owner_type")
    .isIn([1, 2])
    .withMessage("owner_type must be 1 or 2"),

  body("category_id")
    .isInt({ min: 1 })
    .withMessage("category_id must be a valid integer"),

  body("property_title")
    .notEmpty()
    .withMessage("property_title cannot be empty"),

  body("property_description")
    .notEmpty()
    .withMessage("property_description cannot be empty"),

  body("bedrooms")
    .isInt({ min: 0 })
    .withMessage("bedrooms must be a non-negative integer"),

  body("bathrooms")
    .isInt({ min: 0 })
    .withMessage("bathrooms must be a non-negative integer"),

  body("beds")
    .isInt({ min: 0 })
    .withMessage("beds must be a non-negative integer"),

  body("cleaning_fee")
    .isFloat({ min: 0 })
    .withMessage("cleaning_fee must be a non-negative integer"),

  body("cleaning_fee_type")
    .isInt({ min: 0, max: 1 })
    .withMessage("cleaning_fee_type must be a non-negative integer"),



  body("amenities")
    // .isObject()
    // .withMessage("amenities must be an object")
    .notEmpty()
    .withMessage("amenities cannot be empty"),

  body("safety_amenities")
    // .isObject()
    // .withMessage("safety_amenities must be an object")
    .notEmpty()
    .withMessage("safety_amenities cannot be empty"),

  body("ideal_for")
    // .isObject()
    // .withMessage("ideal_for must be an object")
    .notEmpty()
    .withMessage("ideal_for cannot be empty"),


  body("check_in")
    .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .withMessage("check_in must be in 24-hour HH:MM:SS format (e.g., 14:30:00)"),

  body("check_out")
    .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .withMessage("check_out must be in 24-hour HH:MM:SS format (e.g., 11:00:00)"),


  body("house_rules")
    .notEmpty()
    .withMessage("house_rules cannot be empty"),

  body("monthly_rent")
    .isFloat({ min: 0 })
    .withMessage("monthly_rent must be a non-negative number"),

  body("monthly_rent_type")
    .isInt({ min: 0, max: 1 })
    .withMessage("monthly_rent_type must be a non-negative integer"),

  body("security_deposit")
    .isFloat({ min: 0 })
    .withMessage("security_deposit must be a non-negative number"),


  body("min_stay_duration")
    .isInt({ min: 1 })
    .withMessage("min_stay_duration must be at least 1"),

  body("max_person")
    .notEmpty()
    .isInt({ min: 0 })
    .withMessage("max_person must be a non-negative integer"),

  body("location")
    .notEmpty()
    .withMessage("The location field cannot be empty. Please provide a location."),

  body("country")
    .notEmpty()
    .withMessage("The country field cannot be empty. Please provide a country."),

  body("state")
    .notEmpty()
    .withMessage("The state field cannot be empty. Please provide a state."),
];

export const updateListingproperty = [
  body("property_id")
    .notEmpty()
    .withMessage("property_id cannot be empty"),


  body("owner_type")
    .isIn([1, 2])
    .withMessage("owner_type must be 1 or 2"),

  body("category_id")
    .isInt({ min: 1 })
    .withMessage("category_id must be a valid integer"),

  body("property_title")
    .notEmpty()
    .withMessage("property_title cannot be empty"),

  body("property_description")
    .notEmpty()
    .withMessage("property_description cannot be empty"),

  body("bedrooms")
    .isInt({ min: 0 })
    .withMessage("bedrooms must be a non-negative integer"),

  body("bathrooms")
    .isInt({ min: 0 })
    .withMessage("bathrooms must be a non-negative integer"),

  body("beds")
    .isInt({ min: 0 })
    .withMessage("beds must be a non-negative integer"),

  body("cleaning_fee")
    .isFloat({ min: 0 })
    .withMessage("cleaning_fee must be a non-negative integer"),

  body("cleaning_fee_type")
    .isInt({ min: 0, max: 1 })
    .withMessage("cleaning_fee_type must be a non-negative integer"),



  body("amenities")
    // .isObject()
    // .withMessage("amenities must be an object")
    .notEmpty()
    .withMessage("amenities cannot be empty"),

  body("safety_amenities")
    // .isObject()
    // .withMessage("safety_amenities must be an object")
    .notEmpty()
    .withMessage("safety_amenities cannot be empty"),

  body("ideal_for")
    // .isObject()
    // .withMessage("ideal_for must be an object")
    .notEmpty()
    .withMessage("ideal_for cannot be empty"),


  body("check_in")
    .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .withMessage("check_in must be in 24-hour HH:MM:SS format (e.g., 14:30:00)"),

  body("check_out")
    .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .withMessage("check_out must be in 24-hour HH:MM:SS format (e.g., 11:00:00)"),


  body("house_rules")
    .notEmpty()
    .withMessage("house_rules cannot be empty"),

  body("monthly_rent")
    .isFloat({ min: 0 })
    .withMessage("monthly_rent must be a non-negative number"),

  body("monthly_rent_type")
    .isInt({ min: 0, max: 1 })
    .withMessage("monthly_rent_type must be a non-negative integer"),

  body("security_deposit")
    .isFloat({ min: 0 })
    .withMessage("security_deposit must be a non-negative number"),


  body("min_stay_duration")
    .isInt({ min: 1 })
    .withMessage("min_stay_duration must be at least 1"),

  body("square_foot")
    .isInt({ min: 1 })
    .withMessage("square_foot must be at least 1"),

  body("max_person")
    .notEmpty()
    .isInt({ min: 0 })
    .withMessage("max_person must be a non-negative integer"),

  body("location")
    .notEmpty()
    .withMessage("The location field cannot be empty. Please provide a location."),

  body("country")
    .notEmpty()
    .withMessage("The country field cannot be empty. Please provide a country."),

  body("state")
    .notEmpty()
    .withMessage("The state field cannot be empty. Please provide a state."),
];

export const updateSubAdminStatusSchema = [
  body("sub_admin_id")
    .notEmpty()
    .withMessage("The sub_admin_id field cannot be empty. Please provide a sub_admin_id."),

];

export const updateUserSchema = [
  body("user_id")
    .notEmpty()
    .withMessage("The user_id field cannot be empty. Please provide a user_id."),

];

export const updateHostSchema = [
  body("host_id")
    .notEmpty()
    .withMessage("The host_id field cannot be empty. Please provide a host_id."),

];

export const propertyBookedSchema = [
  query("user_id")
    .notEmpty()
    .withMessage("The user_id field cannot be empty. Please provide a user_id."),

];

export const hostPropertyListSchema = [
  query("host_id")
    .notEmpty()
    .withMessage("The host_id field cannot be empty. Please provide a host_id."),

];

export const getUserBusinessByIdSchema = [
  query("user_id")
    .notEmpty()
    .withMessage("The user_id field cannot be empty. Please provide a user_id."),

];

export const getContentSchema = [
  query("content_type")
    .notEmpty()
    .withMessage("The content_type field cannot be empty. Please provide a content_type."),

];

export const updateContentSchema = [
  body("content_type")
    .notEmpty()
    .withMessage("The content_type field cannot be empty. Please provide a content_type."),

  body("content")
    .notEmpty()
    .withMessage("The content field cannot be empty. Please provide a content."),

];

export const addBlogSchema = [
  body("title")
    .notEmpty()
    .withMessage("The title field cannot be empty. Please provide a title."),

  body("blog_content")
    .notEmpty()
    .withMessage("The blog_content field cannot be empty. Please provide a blog_content."),

];

export const updateBlogSchema = [
  body("blog_id")
    .notEmpty()
    .withMessage("The blog_id field cannot be empty. Please provide a blog_id."),

  body("title")
    .notEmpty()
    .withMessage("The title field cannot be empty. Please provide a title."),

  body("blog_content")
    .notEmpty()
    .withMessage("The blog_content field cannot be empty. Please provide a blog_content."),

];

export const deleteBlogSchema = [
  param("blog_id")
    .notEmpty()
    .withMessage("The blog_id field cannot be empty. Please provide a blog_id."),

];

export const addSubUserSchema = [
  // body("email")
  //   .notEmpty()
  //   .withMessage("Email is required.")
  //   .isEmail()
  //   .withMessage("Invalid email address."),

  body("first_name")
    .notEmpty()
    .withMessage("First name is required.")
    .isLength({ min: 2 })
    .withMessage("First name must be at least 2 characters long."),

  body("last_name")
    .notEmpty()
    .withMessage("Last name is required.")
    .isLength({ min: 2 })
    .withMessage("Last name must be at least 2 characters long."),

  body("number_of_bookings")
    .notEmpty()
    .withMessage("Number of bookings is required.")
    .isInt({ min: 1 })
    .withMessage("Number of bookings must be a positive integer."),
];

export const updateSubUserSchema = [
  body("number_of_bookings")
    .notEmpty()
    .withMessage("Number of bookings is required.")
    .isInt({ min: 1 })
    .withMessage("Number of bookings must be a positive integer."),

  body("user_id")
    .notEmpty()
    .withMessage("The user_id field cannot be empty. Please provide a user_id."),
];

export const addRatingSchema = [
  body("booking_id")
    .notEmpty()
    .withMessage("booking_id is required.")
    .isInt({ min: 1 })
    .withMessage("booking_id must be a positive integer."),

  body("rating")
    .notEmpty()
    .withMessage("The rating field cannot be empty. Please provide a rating."),

  body("review")
    .optional()
];

export const addGusestSchema = [
  body("first_name")
    .notEmpty()
    .withMessage("The first_name field cannot be empty. Please provide a first_name."),

  body("last_name")
    .notEmpty()
    .withMessage("The last_name field cannot be empty. Please provide a last_name."),

  // body("email")
  //   .notEmpty()
  //   .withMessage("The email field cannot be empty. Please provide an email.")
  //   .isEmail()
  //   .withMessage("Please enter a valid email address.")
  //   .normalizeEmail(),
];

export const getSubGuestUpdateSchema = [
  body("user_id")
    .notEmpty()
    .withMessage("The user_id field cannot be empty. Please provide a user_id."),

];


export const contactUsSchema = [
  body("name")
    .notEmpty()
    .withMessage("The name field cannot be empty. Please provide a name."),
  body("email")
    .notEmpty()
    .withMessage("The email field cannot be empty. Please provide an email.")
    .isEmail()
    .withMessage("Please enter a valid email address.")
    .normalizeEmail(),
  body("message")
    .notEmpty()
    .withMessage("The message field cannot be empty. Please provide a message."),
];

export const replyContactUsSchema = [
  body("contact_id")
    .notEmpty()
    .withMessage("The contact_id field cannot be empty. Please provide a contact_id."),
  body("reply")
    .notEmpty()
    .withMessage("The reply field cannot be empty. Please provide a reply."),
  // body("subject")
  //   .notEmpty()
  //   .withMessage("The subject field cannot be empty. Please provide a subject."),
];

export const supportTicketSchema = [
  body("message")
    .notEmpty()
    .withMessage("The message field cannot be empty. Please provide a message."),

  body("property_id")
    .optional()
    .isInt().withMessage("Property ID must be an integer."),

  body("host_id")
    .optional()
    .isInt().withMessage("Host ID must be an integer."),
];

export const supportTicketReplySchema = [
  body("reply_message")
    .notEmpty()
    .withMessage("The reply_message field cannot be empty. Please provide a reply_message."),

  body("ticket_id")
    .notEmpty()
    .withMessage("The ticket_id field cannot be empty. Please provide a ticket_id."),

];


export const requestForDocumentSchema = [
  body("requested_doc")
    .notEmpty()
    .withMessage("The requested_doc field cannot be empty. Please provide a requested_doc."),

  body("booking_id")
    .notEmpty()
    .withMessage("The booking_id field cannot be empty. Please provide a booking_id."),

];


// Middleware function to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return vallidationErrorHandle(res, errors);
  }
  next();
};


export const addSubHostSchema = [
  body("first_name")
    .notEmpty()
    .withMessage("The first_name field cannot be empty. Please provide a first_name."),

  body("last_name")
    .notEmpty()
    .withMessage("The last_name field cannot be empty. Please provide a last_name."),


  body("mobile")
    .notEmpty()
    .withMessage("The mobile field cannot be empty. Please provide a mobile.")
    .isMobilePhone("any", { strictMode: true })
    .withMessage("Invalid phone number."),

  body("permission")
    .custom((value) => {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error("Permission must be a non-empty array.");
      }
      return true;
    }),
];

export const updateSubhostSchema = [
  body("first_name")
    .notEmpty()
    .withMessage("The first_name field cannot be empty. Please provide a first_name."),

  body("last_name")
    .notEmpty()
    .withMessage("The last_name field cannot be empty. Please provide a last_name."),

  body("host_id")
    .notEmpty()
    .withMessage("The host_id field cannot be empty. Please provide a host_id."),


  body("mobile")
    .notEmpty()
    .withMessage("The mobile field cannot be empty. Please provide a mobile.")
    .isMobilePhone("any", { strictMode: true })
    .withMessage("Invalid phone number."),


  body("permission")
    .custom((value) => {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error("Permission must be a non-empty array.");
      }
      return true;
    }),
];


export const updatePropertyCleaningStatusSchema = [
  body("property_id")
    .notEmpty()
    .withMessage("property_id is required")
    .isInt({ min: 1 })
    .withMessage("property_id must be a valid integer"),

  body("cleaning_status")
    .notEmpty()
    .withMessage("cleaning_status is required")
    .isString()
    .withMessage("cleaning_status must be a string")
    .isIn(["READY", "CLEANING", "PENDING"])
    .withMessage("cleaning_status must be either 'READY' ,'PENDING' or 'CLEANING'"),
];

export const getPropertyBookingPriceSchema = [
  query("property_id")
    .notEmpty().withMessage("Property ID is required.")
    .isInt().withMessage("Property ID must be an integer."),

  query("booked_from")
    .notEmpty().withMessage("Booked from date is required.")
    .isISO8601().withMessage("Booked from must be a valid date."),

  query("booked_to")
    .notEmpty().withMessage("Booked to date is required.")
    .isISO8601().withMessage("Booked to must be a valid date."),

  query("guest")
    .notEmpty().withMessage("Guest count is required.")
    .isInt({ min: 1 }).withMessage("Guest count must be a positive integer."),
];

export const addServiceFeeSchema = [
  body("location")
    .notEmpty()
    .withMessage("The location field cannot be empty. Please provide a location."),

  body("country")
    .notEmpty()
    .withMessage("The country field cannot be empty. Please provide a country."),

  body("state")
    .notEmpty()
    .withMessage("The state field cannot be empty. Please provide a state."),

  body("commission")
    .notEmpty()
    .withMessage("The commission field cannot be empty. Please provide a commission.")
    .isNumeric()
    .withMessage("Commission must be a number."),

];

export const addSubscriptionSchema = [
  body("plan_key")
    .notEmpty()
    .withMessage("plan_key is required")
    .isString()
    .withMessage("plan_key must be a string"),
  body("plan_name")
    .notEmpty()
    .withMessage("plan_name is required")
    .isString()
    .withMessage("plan_name must be a string"),
  body("price")
    .notEmpty()
    .withMessage("price is required")
    .isFloat({ min: 0 })
    .withMessage("price must be a valid number"),
  body("currency")
    .optional()
    .isString()
    .withMessage("currency must be a string"),
  body("duration")
    .optional()
    .isIn(["monthly", "yearly"])
    .withMessage("duration must be monthly or yearly"),
  body("headline")
    .notEmpty()
    .withMessage("headline is required")
    .isString()
    .withMessage("headline must be a string"),
  body("content")
    .optional()
    .isString()
    .withMessage("content must be a string"),
  body("button_text")
    .notEmpty()
    .withMessage("button_text is required")
    .isString()
    .withMessage("button_text must be a string"),
  body("is_popular")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("is_popular must be 0 or 1"),
  body("max_listings")
    .notEmpty()
    .withMessage("max_listings is required")
    .isIn(["1", "10", "unlimited"])
    .withMessage("max_listings must be 1, 10 or unlimited"),
  body("basic_support")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("basic_support must be 0 or 1"),
  body("dedicated_support")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("dedicated_support must be 0 or 1"),
  body("analytics_level")
    .optional()
    .isIn(["none", "basic", "advanced"])
    .withMessage("analytics_level must be none, basic or advanced"),
  body("boosted_visibility")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("boosted_visibility must be 0 or 1"),
  body("featured_placement")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("featured_placement must be 0 or 1"),
  body("api_access")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("api_access must be 0 or 1"),
  body("is_active")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("is_active must be 0 or 1"),
];

export const updateSubscriptionSchema = [
  body("subscription_id")
    .notEmpty()
    .withMessage("subscription_id is required")
    .isInt({ min: 1 })
    .withMessage("subscription_id must be a valid integer"),
  body("plan_key")
    .optional()
    .isString()
    .withMessage("plan_key must be a string"),
  body("plan_name")
    .optional()
    .isString()
    .withMessage("plan_name must be a string"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("price must be a valid number"),
  body("currency")
    .optional()
    .isString()
    .withMessage("currency must be a string"),
  body("duration")
    .optional()
    .isIn(["monthly", "yearly"])
    .withMessage("duration must be monthly or yearly"),
  body("headline")
    .optional()
    .isString()
    .withMessage("headline must be a string"),
  body("content")
    .optional()
    .isString()
    .withMessage("content must be a string"),
  body("button_text")
    .optional()
    .isString()
    .withMessage("button_text must be a string"),
  body("is_popular")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("is_popular must be 0 or 1"),
  body("max_listings")
    .optional()
    .isIn(["1", "10", "unlimited"])
    .withMessage("max_listings must be 1, 10 or unlimited"),
  body("basic_support")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("basic_support must be 0 or 1"),
  body("dedicated_support")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("dedicated_support must be 0 or 1"),
  body("analytics_level")
    .optional()
    .isIn(["none", "basic", "advanced"])
    .withMessage("analytics_level must be none, basic or advanced"),
  body("boosted_visibility")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("boosted_visibility must be 0 or 1"),
  body("featured_placement")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("featured_placement must be 0 or 1"),
  body("api_access")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("api_access must be 0 or 1"),
  body("is_active")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage("is_active must be 0 or 1"),
];

export const deleteSubscriptionSchema = [
  body("subscription_id")
    .notEmpty()
    .withMessage("subscription_id is required")
    .isInt({ min: 1 })
    .withMessage("subscription_id must be a valid integer"),
];

export const getSubscriptionByIdSchema = [
  query("subscription_id")
    .notEmpty()
    .withMessage("subscription_id is required")
    .isInt({ min: 1 })
    .withMessage("subscription_id must be a valid integer"),
];

export const getBookingOverviewByIdSchema = [
  body("booking_id")
    .notEmpty()
    .withMessage("booking_id is required")
    .isInt({ min: 1 })
    .withMessage("booking_id must be a valid positive integer"),
];

export const hostSubscribeSchema = [
  body("subscription_id")
    .notEmpty()
    .withMessage("subscription_id is required")
    .isInt({ min: 1 })
    .withMessage("subscription_id must be a valid integer"),
];

// export const seoManagementSchema = [
//   body("meta_title")
//     .notEmpty()
//     .withMessage("meta_title is required")
//     .isString()
//     .withMessage("meta_title must be a string"),
//   body("canonical_url")
//     .notEmpty()
//     .withMessage("canonical_url is required")
//     .isString()
//     .withMessage("canonical_url must be a string"),
//   body("focus_keywords")
//     .notEmpty()
//     .withMessage("focus_keywords is required")
//     .isString()
//     .withMessage("focus_keywords must be a string"),
//   body("meta_description")
//     .notEmpty()
//     .withMessage("meta_description is required")
//     .isString()
//     .withMessage("meta_description must be a string"),
// ];

export const seoManagementSchema = [
  body()
    .isArray({ min: 1 })
    .withMessage("SEO data must be a non-empty array"),

  body("*.page_slug")
    .notEmpty()
    .withMessage("page_slug is required")
    .isString()
    .withMessage("page_slug must be a string"),

  body("*.meta_title")
    .notEmpty()
    .withMessage("meta_title is required")
    .isString()
    .withMessage("meta_title must be a string"),

  // body("*.canonical_url")
  //   .notEmpty()
  //   .withMessage("canonical_url is required")
  //   .isString()
  //   .withMessage("canonical_url must be a string"),

  // body("*.focus_keywords")
  //   .notEmpty()
  //   .withMessage("focus_keywords is required")
  //   .isString()
  //   .withMessage("focus_keywords must be a string"),

  body("*.meta_description")
    .notEmpty()
    .withMessage("meta_description is required")
    .isString()
    .withMessage("meta_description must be a string"),
];

export const addAdminReviewSchema = [
  body("property_id")
    .notEmpty()
    .withMessage("property_id is required")
    .isInt({ min: 1 })
    .withMessage("property_id must be a valid positive integer"),

  body("first_name")
    .notEmpty()
    .withMessage("first_name is required")
    .isString()
    .withMessage("first_name must be a string"),

  body("last_name")
    .notEmpty()
    .withMessage("last_name is required")
    .isString()
    .withMessage("last_name must be a string"),

  body("rating")
    .notEmpty()
    .withMessage("rating is required")
    .isFloat({ min: 0, max: 5 })
    .withMessage("rating must be between 0 and 5"),

  body("review")
    .notEmpty()
    .withMessage("review is required")
    .isString()
    .withMessage("review must be a string"),
];

export const deleteAdminReviewSchema = [
  param("rating_id")
    .notEmpty()
    .withMessage("rating_id is required")
    .isInt({ min: 1 })
    .withMessage("rating_id must be a valid positive integer"),
];

export const cancelBookingSchema = [
  body("cancel_reason")
    .notEmpty()
    .withMessage("The cancel_reason field cannot be empty. Please provide a cancel_reason."),

  body("booking_id")
    .notEmpty()
    .withMessage("booking_id is required")
    .isInt({ min: 1 })
    .withMessage("booking_id must be a valid positive integer"),

];

export const addWishlistSchema = [
  body("property_id")
    .notEmpty()
    .withMessage("The property_id field cannot be empty. Please provide a property_id.")
    .isInt({ min: 1 })
    .withMessage("property_id must be a valid positive integer"),
];

export const removeWishlistSchema = [
  body("wishlist_id")
    .notEmpty()
    .withMessage("The wishlist id field cannot be empty. Please provide a wishlist id.")
    .isInt({ min: 1 })
    .withMessage("wishlist id must be a valid positive integer"),
];

export const upsertPlatformFeeSchema = [
  // body("fee_type")
  //   .notEmpty()
  //   .withMessage("fee_type is required")
  //   .isIn(["fixed", "percentage"])
  //   .withMessage("fee_type must be fixed or percentage"),

  body("fee_value")
    .notEmpty()
    .withMessage("fee_value is required")
    .isFloat({ gt: 0 })
    .withMessage("fee_value must be greater than 0"),

  // body("status")
  //   .optional()
  //   .isIn([0, 1])
  //   .withMessage("status must be 0 or 1"),
];


export const reportPropertySchema = [
  body("property_id")
    .notEmpty()
    .withMessage("property_id is required")
    .isInt({ min: 1 })
    .withMessage("property_id must be a valid positive integer"),

  body("report_title")
    .notEmpty()
    .withMessage("report_title is required")
    .isString()
    .withMessage("report_title must be a string"),

  body("description")
    .notEmpty()
    .withMessage("description is required")
    .isString()
    .withMessage("description must be a string"),
];