import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { parseSetCookie } from "../scripts/utils";

const serverAddress = import.meta.env.SERVER_ADDRESS;
// import * as sessionActions from "./sessionActions";

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
      const url = `${serverAddress}/login`;

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
      const url = `${serverAddress}/register`;

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
      const url = `${serverAddress}/logout`;

      const backendResponse = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await backendResponse.json();
      if (!backendResponse.ok) {
        return {
          success: false,
          message: data || "Failed to logout",
          status: backendResponse.status,
          data,
        };
      }

      const setCookieHeader = backendResponse.headers.get("set-cookie");
      if (setCookieHeader) {
        const parsed = parseSetCookie(setCookieHeader);
        if (parsed) {
          event.cookies.set("token", "", {
            path: "/",
            httpOnly: true,
            // secure: parsed.secure,
            expires: parsed.expires,
          });
        }
      }

      return {
        success: true,
        message: data || "Logged out successfully",
        status: backendResponse.status,
        data,
      };
    },
  }),

  getSessions: defineAction({
    accept: "json",
    handler: async () => {
      const url = `${import.meta.env.SERVER_ADDRESS}/getSessions`;

      const backendResponse = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await backendResponse.json();

      if (!backendResponse.ok) {
        return {
          success: false,
          message: data,
          status: backendResponse.status,
          data: data,
        };
      }

      return {
        success: true,
        message: "Succesfully fetching session",
        status: backendResponse.status,
        data,
      };
    },
  }),

  getSessionDetails: defineAction({
    accept: "json",
    input: z.object({
      session_id: z.number().int(),
    }),
    handler: async ({ session_id }) => {
      const url = `${import.meta.env.SERVER_ADDRESS}/sessionAnalysis`;

      const backendResponse = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session_id,
        }),
        credentials: "include",
      });
      const data = await backendResponse.json();

      if (!backendResponse.ok) {
        return {
          success: false,
          message: "Failed to fetch session details",
          status: backendResponse.status,
          data: null,
        };
      }

      return {
        success: true,
        message: "Succesfully fetching session details",
        status: backendResponse.status,
        data,
      };
    },
  }),

  createSession: defineAction({
    accept: "json",
    input: z.object({
      start_time: z.string(),
      end_time: z.string(),
      min: z.number(),
      max: z.number(),
    }),
    handler: async ({ start_time, end_time, min, max }) => {
      const url = `${import.meta.env.SERVER_ADDRESS}/createSession`; // API Endpoint

      const backendResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_time: start_time,
          end_time: end_time,
          min: min,
          max: max,
        }),
        credentials: "include",
      });

      const data = await backendResponse.json();

      if (!backendResponse.ok) {
        return {
          success: false,
          message: "Failed to create session",
          status: backendResponse.status,
          data: data,
        };
      }

      return {
        success: true,
        message: "Session created successfully",
        status: backendResponse.status,
        data,
      };
    },
  }),
};
