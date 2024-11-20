import { serve } from "bun";

const users = [
  { username: "testuser", password: "password123" },
  { username: "admin", password: "admin123" },
];

// Bun server for login
serve({
  port: 5000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/login" && req.method === "POST") {
      return handleLogin(req);
    }
    return new Response("Not Found", { status: 404 });
  },
});

async function handleLogin(req) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      return new Response(
        JSON.stringify({ message: "Login successful", username }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ message: "Invalid username or password" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error handling login:", error);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

console.log("Login server running on http://localhost:5000");
