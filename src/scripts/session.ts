import { writable, get } from "svelte/store";
import { insertAnalysisData } from "./insert";
import { analysisData } from "../scripts/websocket";

export const sessionId = writable<number | null>(null); 

const serverAddress = import.meta.env.PUBLIC_SERVER_ADDRESS

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
    const userId = sessionStorage.getItem("userId");

    if (!userId) {
      throw new Error("User ID is not found in sessionStorage");
    }
    const response = await fetch(`${serverAddress}/createSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...sessionData,
        user_id: Number(userId),
      }),
    });

    console.log(sessionData);

    if (!response.ok) {
      throw new Error("Failed to create session");
    }

    const result = await response.json();
    console.log(result.message); // Handle success message

    // Save sessionId to store
    if (result.sessionId) {
      sessionId.set(Number(result.sessionId)); // Ensure it's treated as a number
      uploadData(); // Upload the data to the server
    }    

  } catch (error) {
    console.error("Error creating session:", error);
  }
}

function uploadData() {
  const currentSessionId = get(sessionId);
  console.log("Session Id:", currentSessionId);
  if (currentSessionId) {
    console.log("analysisData before updates:", get(analysisData));
    analysisData.update((data) => {
      return data.map(item => ({
        ...item,
        session_id: currentSessionId,
      }));
    });
    console.log("analysisData after updates:", get(analysisData));
    insertAnalysisData(get(analysisData));
  } else {
    console.error('Session ID is not available');
  }
}
