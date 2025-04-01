import { writable } from "svelte/store";
import { get } from "svelte/store";

// Writable stores for tracking the largest variance and acceleration
export const variance = writable<number | null>(
  typeof window !== "undefined" && sessionStorage.getItem("variance")
    ? parseFloat(sessionStorage.getItem("variance")!)
    : 0.0013
);

export const acceleration = writable<number | null>(
  typeof window !== "undefined" && sessionStorage.getItem("acceleration")
    ? parseFloat(sessionStorage.getItem("acceleration")!)
    : 10.0
);


// Writable store for storing AnalysisData
export const analysisData = writable<Analysis[]>([]);

// Define the Analysis type
type Analysis = {
  session_id: number;  
  timestamp: number;   
  x: number;           
  y: number;           
  prob: number;        
};

export const wsStore = writable<WebSocket | null>(null);

let timestamp = 0;
let x_coord = 0;
let y_coord = 0;
let prob = 0;

// Initialize WebSocket connection with reconnection logic
export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessageCallback: (data: any) => void;

  constructor(url: string, onMessageCallback: (data: any) => void) {
    this.url = url;
    this.onMessageCallback = onMessageCallback;
  }

  public start() {
    if (this.ws) {
      this.ws.close(); // Ensure no duplicate connections
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    this.ws.onclose = (event) => {
      console.log("❌ WebSocket disconnected", event);

      // Save variance and acceleration to sessionStorage on close
      sessionStorage.setItem("variance", get(variance)?.toString() || "0.0013");
      sessionStorage.setItem("acceleration", get(acceleration)?.toString() || "10.0");

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

        const newVariance = data.variance;
        const newAcceleration = data.acceleration;
        prob = data.probability;

        // Update variance only if new value is higher
        variance.update((currentVariance) =>
          currentVariance === null || newVariance > currentVariance ? newVariance : currentVariance
        );

        // Update acceleration only if new value is higher
        acceleration.update((currentAcceleration) =>
          currentAcceleration === null || newAcceleration > currentAcceleration ? newAcceleration : currentAcceleration
        );

        const analysisEntry: Analysis = {
          session_id: 0,
          timestamp: timestamp,
          x: x_coord,
          y: y_coord,
          prob: prob,
        };

        // Push the new Analysis object to analysisData store
        analysisData.update((currentData) => [...currentData, analysisEntry]);

        console.log("Updated Variance:", get(variance));
        console.log("Updated Acceleration:", get(acceleration));
        console.log("Analysis Data Store:", get(analysisData));

        // Call the message callback, if needed
        this.onMessageCallback(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }

  public sendMessage(message: object) {
    if (message) {
      const { x, y, time } = message as { x: number; y: number; time: number; sensitivity: number };
      x_coord = x;
      y_coord = y;
      timestamp = time;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log("WebSocket Sent:", message);
    }
  }

  public close() {
    if (this.ws) {
      // Save values before closing
      sessionStorage.setItem("variance", get(variance)?.toString() || "0.0013");
      sessionStorage.setItem("acceleration", get(acceleration)?.toString() || "10.0");

      this.ws.close();
    }
  }
}
