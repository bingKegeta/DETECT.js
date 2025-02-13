import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { parseSetCookie } from "../scripts/utils";

export const server = {
  login: defineAction({
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
    handler: async (input, event) => {
      const { email, password } = input;
      const url = `${import.meta.env.SERVER_ADDRESS}/login`;

      const backendResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // Parse the JSON from your Go server
      const data = await backendResponse.json();

      if (!backendResponse.ok) {
        return {
          success: false,
          message: data.error || "Failed to login",
          status: backendResponse.status,
          data,
        };
      }

      // Extract the raw "Set-Cookie" header
      const setCookieHeader = backendResponse.headers.get("set-cookie");
      if (setCookieHeader) {
        // Parse out name, value, path, expires, secure, httpOnly, sameSite, etc.
        const parsed = parseSetCookie(setCookieHeader);
        if (parsed) {
          event.cookies.set(parsed.name, parsed.value, {
            path: parsed.path,
            httpOnly: parsed.httpOnly,
            // secure: parsed.secure,
            expires: parsed.expires,
            // sameSite: parsed.sameSite,
          });
        }
      }

      return {
        success: true,
        message: data.message || "Login successful",
        status: backendResponse.status,
        data,
      };
    },
  }),

  register: defineAction({
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
    handler: async (input, event) => {
      const url = `${import.meta.env.SERVER_ADDRESS}/register`;

      const backendResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await backendResponse.json();

      if (!backendResponse.ok) {
        return {
          success: false,
          message: data.error || "Failed to register",
          status: backendResponse.status,
          data,
        };
      }

      const setCookieHeader = backendResponse.headers.get("set-cookie");
      if (setCookieHeader) {
        const parsed = parseSetCookie(setCookieHeader);
        if (parsed) {
          event.cookies.set(parsed.name, parsed.value, {
            path: parsed.path,
            httpOnly: parsed.httpOnly,
            // secure: parsed.secure,
            expires: parsed.expires,
            // sameSite: parsed.sameSite,
          });
        }
      }

      return {
        success: true,
        message: data.message || "Registration successful",
        status: backendResponse.status,
        data,
      };
    },
  }),

  logout: defineAction({
    accept: "form",
    handler: async (_, event) => {
      const url = `${import.meta.env.SERVER_ADDRESS}/logout`;

      const backendResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await backendResponse.json();
      if (!backendResponse.ok) {
        return {
          success: false,
          message: data.error || "Failed to logout",
          status: backendResponse.status,
          data,
        };
      }

      const setCookieHeader = backendResponse.headers.get("set-cookie");
      if (setCookieHeader) {
        const parsed = parseSetCookie(setCookieHeader);
        if (parsed) {
          event.cookies.set(parsed.name, parsed.value, {
            path: parsed.path,
            httpOnly: parsed.httpOnly,
            // secure: parsed.secure,
            expires: parsed.expires,
            // sameSite: parsed.sameSite,
          });
        }
      }

      return {
        success: true,
        message: data.message || "Logged out successfully",
        status: backendResponse.status,
        data,
      };
    },
  }),
};
