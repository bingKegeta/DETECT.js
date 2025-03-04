<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { writable } from 'svelte/store';
  import { createSession } from "../scripts/websocket";
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

  import { ProbabilityGraph } from "../scripts/graph";
  import { WebSocketConnection } from "../scripts/websocket";

  let videoEl: HTMLVideoElement;
  let canvasEl: HTMLCanvasElement;
  let graphCanvasEl: HTMLCanvasElement;

  let camera: Camera | null = null;
  let faceMesh: FaceMesh | null = null;
  let ws: WebSocketConnection | null = null;

  const WEBSOCKET_URL = "ws://localhost:9090/ws";
  let variance: number | null = null;
  let acceleration: number | null = null;
  let probability: number | null = null;

  let probabilityGraph: ProbabilityGraph | null = null;

  export const webcamState = writable(false); // Default state: off

  // WebSocket message handler
  function handleWebSocketMessage(data: any) {
    if (data.variance !== undefined && data.acceleration !== undefined && data.probability !== undefined) {
      variance = data.variance;
      acceleration = data.acceleration;
      probability = data.probability;
      console.log("Received Metrics - Variance:", variance, "Acceleration:", acceleration, "Probability:", probability);

      // Update graph data
      if (probabilityGraph) {
        probabilityGraph.updateProbability(probability);
      }

      // Create session data
      const sessionData = {
        name: "Session 1", // Default session name
        startTime: new Date().toISOString(), // Capture the start time
        endTime: new Date(new Date().getTime() + 3600000).toISOString(), // Set end time 1 hour from now for demo purposes
        varMin: variance ?? 0, // Use received variance or fallback to 0
        varMax: variance ?? 0,
        accMin: acceleration ?? 0,
        accMax: acceleration ?? 0
      };

      // Call createSession function to send the session data
      createSession(sessionData);
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
    ws = new WebSocketConnection(WEBSOCKET_URL, handleWebSocketMessage);
    ws.start();

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

          const timestampInSeconds = timestamp / 1000;

          // Send metrics via WebSocket
          const metrics = {
            x: normX,
            y: normY,
            time: timestampInSeconds,
          };

          if (ws) {
            ws.sendMessage(metrics);
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

    // Initialize the probability graph
    if (graphCanvasEl) {
      probabilityGraph = new ProbabilityGraph(graphCanvasEl);
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
      style="width: 600px; height: 400px; background: rgba(0, 0, 0, 0.5);"
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
</div>
