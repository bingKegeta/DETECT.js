import { writable } from "svelte/store";

export const sessionId = writable<number | null>(null); 

const serverAddress = "http://localhost:8080/createSession";

export async function createSession(sessionData: {
  name: string;
  start_time: string;
  end_time: string;
  var_min: number;
  var_max: number;
  acc_min: number;
  acc_max: number;
}) {
  try {
    const response = await fetch(serverAddress, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(sessionData),
    });

    console.log(sessionData);

    if (!response.ok) {
      throw new Error("Failed to create session");
    }

    const result = await response.json();
    console.log(result.message); // Handle success message

    // Save sessionId to store
    if (result.sessionId) {
      sessionId.set(result.sessionId); // Store the sessionId in the writable store
    }

  } catch (error) {
    console.error("Error creating session:", error);
  }
}
