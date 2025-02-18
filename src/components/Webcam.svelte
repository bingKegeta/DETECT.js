<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { FaceMesh, type Results } from "@mediapipe/face_mesh";
  import { Camera } from "@mediapipe/camera_utils";
  import { drawLandmarks } from "@mediapipe/drawing_utils";
  import {
    LEFT_IRIS_CENTER,
    RIGHT_IRIS_CENTER,
    LEFT_EYE_CORNER,
    RIGHT_EYE_CORNER,
    NOSE_TIP,
    getNormalizedIrisPosition,
    getLandmarks,
  } from "../scripts/utils";

  let videoEl: HTMLVideoElement;
  let canvasEl: HTMLCanvasElement;
  let graphCanvasEl: HTMLCanvasElement;

  let camera: Camera | null = null;
  let faceMesh: FaceMesh | null = null;
  let ws: WebSocket | null = null;

  const WEBSOCKET_URL = "ws://localhost:9090/ws";
  let variance: number | null = null;
  let acceleration: number | null = null;
  let probability: number | null = null;
  let probabilityData: number[] = [];

  // Initialize WebSocket connection with reconnection logic
  function startWebSocket() {
    if (ws) {
      ws.close(); // Ensure no duplicate connections
    }

    ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log("WebSocket is open and ready to send/receive messages");
      }
    };

    ws.onclose = (event) => {
      console.log("❌ WebSocket disconnected", event);
      // Attempt to reconnect after a short delay
      setTimeout(() => {
        console.log("🔄 Reconnecting WebSocket...");
        startWebSocket();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error("⚠️ WebSocket error:", error);
      ws?.close(); // Reset connection on error
    };

    ws.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.variance !== undefined && data.acceleration !== undefined && data.probability !== undefined) {
          variance = data.variance;
          acceleration = data.acceleration;
          probability = data.probability;
          console.log("Received Metrics - Variance:", variance, "Acceleration:", acceleration, "Probability:", probability);

          // Update graph data
          if (probabilityData.length >= 100) {
            probabilityData.shift(); // Keep the array size fixed
          }
          probabilityData.push(probability);
          drawGraph();
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }

  // Function to draw the probability graph
  function drawGraph() {
    const ctx = graphCanvasEl.getContext("2d");
    if (ctx) {
      const width = graphCanvasEl.width;
      const height = graphCanvasEl.height;

      // Clear previous graph
      ctx.clearRect(0, 0, width, height);

      // Draw the new graph
      ctx.beginPath();
      ctx.strokeStyle = "#FF5733"; // Graph color
      ctx.lineWidth = 2;

      const step = width / probabilityData.length;
      for (let i = 0; i < probabilityData.length; i++) {
        const x = i * step;
        const y = height - (probabilityData[i] * height); // Scale the probability to fit the graph height
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  }

  // Start webcam capture
  function startCapture() {
    if (!camera && faceMesh && videoEl) {
      camera = new Camera(videoEl, {
        onFrame: async () => {
          if (faceMesh && videoEl) {
            await faceMesh.send({ image: videoEl });
          }
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }

  // Stop the webcam capture
  function stopCapture() {
    if (camera && canvasEl) {
      camera.stop();
      camera = null;
      const canvasCtx = canvasEl.getContext("2d");
      if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      }
    }
  }

  // Handle FaceMesh results
  onMount(() => {
    startWebSocket();

    const canvasCtx = canvasEl.getContext("2d");
    if (!canvasCtx) return;

    // Initialize FaceMesh
    faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results: Results) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasEl.width,
        canvasEl.height
      );

      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          const irisCenters = getLandmarks(landmarks, [
            LEFT_IRIS_CENTER,
            RIGHT_IRIS_CENTER,
          ]);
          drawLandmarks(canvasCtx, irisCenters, {
            color: "#FF0000",
            lineWidth: 1,
          });
          const eyeCorners = getLandmarks(landmarks, [
            LEFT_EYE_CORNER,
            RIGHT_EYE_CORNER,
          ]);
          drawLandmarks(canvasCtx, eyeCorners, {
            color: "#FF0000",
            lineWidth: 1,
          });
          const noseTip = getLandmarks(landmarks, [NOSE_TIP]);
          drawLandmarks(canvasCtx, noseTip, {
            color: "#FF0000",
            lineWidth: 1,
          });

          const { normX, normY, timestamp } = getNormalizedIrisPosition(
            landmarks,
            canvasEl.width,
            canvasEl.height
          );

          // Send metrics via WebSocket
          const metrics = JSON.stringify({
            x: normX,
            y: normY,
            time: timestamp,
          });

          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(metrics);
            console.log("WebSocket Sent:", metrics);
          }
        }
      }
      canvasCtx.restore();
    });

    // Set the internal resolution to match the displayed size.
    if (canvasEl) {
      canvasEl.width = Math.floor(window.innerWidth * 0.9);
      canvasEl.height = Math.floor(window.innerHeight * 0.9);
    }
  });

  // Cleanup on destroy
  onDestroy(() => {
    if (faceMesh) {
      faceMesh.close();
    }
    if (camera) {
      camera.stop();
    }
    if (ws) {
      ws.close();
    }
  });
</script>

<!-- Outer container -->
<div class="bg-base-200 m-4 overflow-hidden flex flex-col items-center justify-center border-primary rounded-lg border-4 opacity-90 shadow-glow h-[84svh] relative">
  <div class="border-2 border-accent rounded-lg relative">
    <!-- Hidden video element for camera frames -->
    <video bind:this={videoEl} style="display: none;">
      <track kind="captions" />
    </video>
    <!-- Canvas where the camera feed and landmarks are drawn -->
    <canvas
      bind:this={canvasEl}
      class="m-2 rounded bg-neutral shadow-glow"
      style="width: 75vw; height: 63vh;"
    ></canvas>

    <!-- Graph Overlay (positioned at the bottom right of the screen) -->
    <canvas
      bind:this={graphCanvasEl}
      class="absolute bottom-4 right-4 border-2 border-accent rounded-lg"
      style="width: 300px; height: 200px; background: rgba(0, 0, 0, 0.5);"
    ></canvas>
  </div>

  <div class="flex w-full font-semibold text-lg text-primary-content">
    <button
      on:click={startCapture}
      class="bg-info m-2 ml-3 my-2 py-4 rounded-md w-full h-full text-info-content hover:bg-success hover:text-success-content hover:scale-105 hover:shadow-glow transition-transform"
    >
      Start
    </button>
    <button
      on:click={stopCapture}
      class="bg-accent m-2 mr-3 my-2 py-4 rounded-md w-full h-full text-accent-content hover:bg-error hover:text-error-content hover:scale-105 hover:shadow-glow-magenta transition-transform"
    >
      Stop
    </button>
  </div>

  {#if variance !== null && acceleration !== null && probability !== null}
    <div class="mt-4 text-lg text-center text-success">
      <p>Variance: {variance}</p>
      <p>Acceleration: {acceleration}</p>
      <p>Probability: {probability}</p>
    </div>
  {/if}
</div>
