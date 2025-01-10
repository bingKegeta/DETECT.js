import { defineAction } from "astro:actions";
import { z } from "astro:schema";

export const server = {
  register: defineAction({
    accept: "form",
    input: z.object({
      name: z.string().min(3, "Username must be at least 3 characters long"),
      email: z.string().email("Invalid email address"),
      //! Important: Add more checks to password
      password: z
        .string()
        .min(8, "Password must be at least 8 characters long"),
    }),
    handler: async (input) => {
      // Perform registration logic here
      const { email, name, password } = input;
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
};
