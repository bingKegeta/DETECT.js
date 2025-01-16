import { defineAction } from "astro:actions";
import { z } from "astro:schema";

export const server = {
  register: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email("Invalid email address"),
      //! Checks added, comment out if you want to remove them
      password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
        )
        .max(100, "Password must be less than 100 characters long"),
    }),
    handler: async (input) => {
      // Perform registration logic here
      const { email, password } = input;
      const url = import.meta.env.SERVER_ADDRESS + "/register";
      // Send to server here
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const responseData = await response.text();
      if (!response.ok) {
        return {
          success: false,
          message: responseData || "Failed to register",
          status: response.status,
          data: responseData,
        };
      } else {
        return {
          success: true,
          message: responseData || "Registration successful",
          status: response.status,
          data: responseData,
        };
      }
    },
  }),
  login: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email("Invalid email address"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
          "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
        )
        .max(100, "Password must be less than 100 characters long"),
    }),
    handler: async (input) => {
      const { email, password } = input;
      const url = import.meta.env.SERVER_ADDRESS + "/login";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const responseData = await response.text();
      if (!response.ok) {
        return {
          success: false,
          message: responseData || "Failed to register",
          status: response.status,
          data: responseData,
        };
      } else {
        return {
          success: true,
          message: responseData || "Registration successful",
          status: response.status,
          data: responseData,
        };
      }
    },
  }),
};
