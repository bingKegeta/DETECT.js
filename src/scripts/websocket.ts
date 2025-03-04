import { writable } from "svelte/store";

export const wsStore = writable<WebSocket | null>(null);
export const variance = writable<number | null>(null);
export const acceleration = writable<number | null>(null);
export const probability = writable<number | null>(null);
export const sessionId = writable<number | null>(null); // Store for sessionId

const WEBSOCKET_URL = "ws://localhost:9090/ws";
const serverAddress = "http://localhost:8080/createSession";
const updateSessionAnalysisAddress = "http://localhost:8080/updateSessionAnalysis"; // New endpoint

// Initialize WebSocket connection with reconnection logic
export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessageCallback: (data: any) => void;

  constructor(url: string, onMessageCallback: (data: any) => void) {
    this.url = url;
    this.onMessageCallback = onMessageCallback;
  }

  // Initialize WebSocket connection with reconnection logic
  public start() {
    if (this.ws) {
      this.ws.close(); // Ensure no duplicate connections
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("✅ WebSocket connected");
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log("WebSocket is open and ready to send/receive messages");
      }
    };

    this.ws.onclose = (event) => {
      console.log("❌ WebSocket disconnected", event);
      // Attempt to reconnect after a short delay
      setTimeout(() => {
        console.log("🔄 Reconnecting WebSocket...");
        this.start();
      }, 3000);
    };

    this.ws.onerror = (error) => {
      console.error("⚠️ WebSocket error:", error);
      this.ws?.close(); // Reset connection on error
    };

    this.ws.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      try {
        const data = JSON.parse(event.data);
        this.onMessageCallback(data);
        
        // Assuming that the received data is gaze data and should be analyzed
        this.sendAnalysisData(data); // Call the function to send analysis data to the server

      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }

  // Send a message via WebSocket
  public sendMessage(message: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log("WebSocket Sent:", message);
    }
  }

  // Close WebSocket connection
  public close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  // Function to send analysis data to the server
  private async sendAnalysisData(data: any) {
    // Retrieve the sessionId from the store
    const session = sessionId;
    
    if (!session) {
      console.error("No sessionId available.");
      return;
    }

    // Prepare the analysis data to send to the server
    const analysisData = {
      session_id: session,
      timestamp: data.time,
      x: data.x,
      y: data.y,
      prob: data.prob || 0.0, // Assuming probability is part of the data
    };

    try {
      const response = await fetch(updateSessionAnalysisAddress, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(analysisData),
      });

      if (!response.ok) {
        throw new Error("Failed to insert analysis data");
      }

      const result = await response.json();
      console.log(result.message); // Handle success message

    } catch (error) {
      console.error("Error inserting analysis data:", error);
    }
  }
}

export async function createSession(sessionData: {
  name: string;
  startTime: string;
  endTime: string;
  varMin: number;
  varMax: number;
  accMin: number;
  accMax: number;
}) {
  try {
    const response = await fetch(serverAddress, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add any additional headers, like authorization, if needed
      },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      throw new Error("Failed to create session");
    }

    const result = await response.json();
    console.log(result.message); // Handle success message

    // Assuming the sessionId is returned in the response
    if (result.sessionId) {
      sessionId.set(result.sessionId); // Save the sessionId to the store
    }

  } catch (error) {
    console.error("Error creating session:", error);
  }
}
