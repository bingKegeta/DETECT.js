<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { FaceMesh, type Results } from "@mediapipe/face_mesh";
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
  let faceMesh: FaceMesh | null = null;
  let ws: WebSocket | null = null;

  const WEBSOCKET_URL = "ws://localhost:9090/ws";
  let variance: number | null = null;
  let acceleration: number | null = null;
  let probability: number | null = null;
  let isVideoUploaded = false;

  function startWebSocket() {
    if (ws) ws.close(); // Ensure no duplicate connections
    ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => console.log("✅ WebSocket connected");
    ws.onclose = (event) => {
      console.log("❌ WebSocket disconnected", event);
      setTimeout(() => startWebSocket(), 3000); // Attempt reconnection
    };
    ws.onerror = (error) => {
      console.error("⚠️ WebSocket error:", error);
      ws?.close();
    };
    ws.onmessage = (event) => {
      console.log("WebSocket message received:", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.variance !== undefined && data.acceleration !== undefined && data.probability !== undefined) {
          variance = data.variance;
          acceleration = data.acceleration;
          probability = data.probability;
          console.log("Received Metrics:", { variance, acceleration, probability });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }

  function processFrame() {
    if (faceMesh && videoEl) {
      faceMesh.send({ image: videoEl });
    }
  }

  function onVideoPlay() {
    if (!faceMesh) return;
    videoEl.addEventListener("timeupdate", processFrame);
  }

  function onVideoStop() {
    videoEl.removeEventListener("timeupdate", processFrame);
    const canvasCtx = canvasEl.getContext("2d");
    if (canvasCtx) canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }

  onMount(() => {
    startWebSocket();
    const canvasCtx = canvasEl.getContext("2d");
    if (!canvasCtx) return;

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
      canvasCtx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          const irisCenters = getLandmarks(landmarks, [LEFT_IRIS_CENTER, RIGHT_IRIS_CENTER]);
          drawLandmarks(canvasCtx, irisCenters, { color: "#FF0000", lineWidth: 1 });
          const eyeCorners = getLandmarks(landmarks, [LEFT_EYE_CORNER, RIGHT_EYE_CORNER]);
          drawLandmarks(canvasCtx, eyeCorners, { color: "#FF0000", lineWidth: 1 });
          const noseTip = getLandmarks(landmarks, [NOSE_TIP]);
          drawLandmarks(canvasCtx, noseTip, { color: "#FF0000", lineWidth: 1 });

          const { normX, normY, timestamp } = getNormalizedIrisPosition(
            landmarks,
            canvasEl.width,
            canvasEl.height
          );

          const metrics = JSON.stringify({ x: normX, y: normY, time: timestamp });
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(metrics);
            console.log("WebSocket Sent:", metrics);
          }
        }
      }
      canvasCtx.restore();
    });

    canvasEl.width = Math.floor(window.innerWidth * 0.9);
    canvasEl.height = Math.floor(window.innerHeight * 0.9);
  });

  onDestroy(() => {
    if (faceMesh) faceMesh.close();
    if (ws) ws.close();
  });
</script>

<div class="bg-base-200 m-4 overflow-hidden flex flex-col items-center justify-center border-primary rounded-lg border-1 opacity-90 shadow-glow h-[8svh]">
  <div class="border-2 border-accent rounded-lg">
    <input type="file" accept="video/*" on:change={(e) => {
      const file = (e.target as HTMLInputElement)?.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        videoEl.src = url;
        videoEl.play();
        isVideoUploaded = true;
      }
    }} class="m-2 p-2 bg-secondary text-secondary-content rounded cursor-pointer" />
    <video bind:this={videoEl} class="hidden" on:play={onVideoPlay} on:pause={onVideoStop} on:ended={onVideoStop} />
    {#if isVideoUploaded}
      <canvas bind:this={canvasEl} class="m-2 rounded bg-neutral shadow-glow" style="width: 75vw; height: 63vh;"></canvas>
    {/if}
  </div>

  {#if variance !== null && acceleration !== null && probability !== null}
    <div class="mt-4 text-lg text-center text-success">
      <p>Variance: {variance}</p>
      <p>Acceleration: {acceleration}</p>
      <p>Probability: {probability}</p>
    </div>
  {/if}
</div>