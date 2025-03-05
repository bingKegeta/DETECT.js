import { writable } from "svelte/store";
import { get } from 'svelte/store';

// Writable store for storing AnalysisData
export const analysisData = writable<Analysis[]>([]);

// Define the Analysis type
type Analysis = {
  session_id: number;  // Session ID (to be used when creating a session)
  timestamp: number;   // Timestamp when the data was captured (in seconds)
  x: number;           // X coordinate
  y: number;           // Y coordinate
  prob: number;        // Probability value
};

export const wsStore = writable<WebSocket | null>(null);
export const variance = writable<number | null>(null);
export const acceleration = writable<number | null>(null);

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

        // Extract relevant data
        prob = data.probability;

        const analysisEntry: Analysis = {
          session_id: 0,
          timestamp: timestamp,
          x: x_coord,
          y: y_coord,
          prob: prob,
        };

        // Push the new Analysis object to analysisData store
        analysisData.update((currentData) => [...currentData, analysisEntry]);

        console.log("Analysis Data Store:", get(analysisData));

        // Call the message callback, if needed
        this.onMessageCallback(data);

      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }

  public sendMessage(message: object) {
    // Assuming message includes normX, normY, and timestampInSeconds
    if (message) {
      const { x, y, time } = message as { x: number; y: number; time: number };
      // Store values in respective writable variables
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
      this.ws.close();
    }
  }
}
