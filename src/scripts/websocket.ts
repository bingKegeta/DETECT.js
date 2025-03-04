// websocket.ts
import { writable } from "svelte/store";

// Removed session related code from this file.

export const wsStore = writable<WebSocket | null>(null);
export const variance = writable<number | null>(null);
export const acceleration = writable<number | null>(null);
export const probability = writable<number | null>(null);

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
        this.onMessageCallback(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }

  public sendMessage(message: object) {
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
