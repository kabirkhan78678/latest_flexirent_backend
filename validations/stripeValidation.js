import { body } from "express-validator";

export const updateStripeKycValidation = [
    body("first_name").notEmpty(),
    body("last_name").notEmpty(),
    body("email").isEmail(),
    body("phone").notEmpty(),
    body("dob.day").notEmpty(),
    body("dob.month").notEmpty(),
    body("dob.year").notEmpty(),
    body("address.line1").notEmpty(),
    body("address.city").notEmpty(),
    body("address.state").notEmpty(),
    body("address.postal_code").notEmpty()
];

export const addBankValidation = [
    body("iban")
        .optional({ values: "falsy" }),
    body("account_number")
        .optional({ values: "falsy" }),
    body().custom((_, { req }) => {
        if (req.body?.iban || req.body?.account_number) {
            return true;
        }
        throw new Error("Either iban or account_number is required");
    })
];
