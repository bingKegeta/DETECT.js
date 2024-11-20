import React, { useRef, useEffect, useState } from 'react';
import { FaceMesh, type Results } from '@mediapipe/face_mesh';
import { drawLandmarks } from '@mediapipe/drawing_utils';

const LEFT_IRIS_CENTER = 468;
const LEFT_EYE_CORNER = 33;
const RIGHT_EYE_CORNER = 263;
const RIGHT_IRIS_CENTER = 473;
const NOSE_TIP = 4;

interface IrisPosition {
  normX: number;
  normY: number;
  timestamp: number;
}

const VideoUploadProcessing: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement?.getContext('2d') ?? null;

    if (canvasElement && canvasCtx) {
      faceMeshRef.current = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMeshRef.current.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMeshRef.current.onResults((results: Results) => {
        if (!canvasCtx) return;
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        if (results.multiFaceLandmarks) {
          for (const landmarks of results.multiFaceLandmarks) {
            const irisCenterLandmarks = getLandmarks(landmarks, [LEFT_IRIS_CENTER, RIGHT_IRIS_CENTER]);
            drawLandmarks(canvasCtx, irisCenterLandmarks, { color: '#FF0000', lineWidth: 1 });
            const eyeCornerLandmarks = getLandmarks(landmarks, [LEFT_EYE_CORNER, RIGHT_EYE_CORNER]);
            drawLandmarks(canvasCtx, eyeCornerLandmarks, { color: '#FF0000', lineWidth: 1 });
            const noseLandmarks = getLandmarks(landmarks, [NOSE_TIP]);
            drawLandmarks(canvasCtx, noseLandmarks, { color: '#FF0000', lineWidth: 1 });

            const { normX, normY, timestamp } = getNormalizedIrisPosition(landmarks, canvasElement.width, canvasElement.height);
            console.log(`Normalized Iris Position: X: ${normX}, Y: ${normY}, Timestamp: ${timestamp}`);
          }
        }
        canvasCtx.restore();
      });
    }
  }, [key]);

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && videoRef.current) {
      const videoElement = videoRef.current;
      videoElement.src = URL.createObjectURL(file);
      videoElement.onloadeddata = () => {
        setVideoLoaded(true);
        setIsPlaying(true);
        videoElement.play();
        processVideo();
      };
    }
  };

  const processVideo = () => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    if (videoElement && canvasElement && faceMeshRef.current) {
      const onVideoFrame = async () => {
        if (!videoElement.paused && !videoElement.ended) {
          await faceMeshRef.current!.send({ image: videoElement });
          requestAnimationFrame(onVideoFrame);
        }
      };
      requestAnimationFrame(onVideoFrame);
    }
  };

  const handlePlay = () => {
    if (videoRef.current) {
      setIsPlaying(true);
      videoRef.current.play();
      processVideo();
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      setIsPlaying(false);
      videoRef.current.pause();
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setVideoLoaded(false);
    setKey((prevKey) => prevKey + 1);
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement?.getContext('2d') ?? null;
    if (canvasCtx) {
      canvasCtx.clearRect(0, 0, canvasElement!.width, canvasElement!.height);
    }
  };

  const getLandmarks = (landmarks: any[], indices: number[]): any[] => {
    return indices.map((index) => landmarks[index]);
  };

  const getNormalizedIrisPosition = (faceLandmarks: any[], imgW: number, imgH: number): IrisPosition => {
    const leftIris = faceLandmarks[LEFT_IRIS_CENTER];
    const rightIris = faceLandmarks[RIGHT_IRIS_CENTER];

    const irisX = (leftIris.x + rightIris.x) / 2;
    const irisY = (leftIris.y + rightIris.y) / 2;

    const nose = faceLandmarks[NOSE_TIP];
    const noseX = nose.x;
    const noseY = nose.y;

    const relX = irisX - noseX;
    const relY = noseY - irisY;

    const leftEye = faceLandmarks[LEFT_EYE_CORNER];
    const rightEye = faceLandmarks[RIGHT_EYE_CORNER];
    const interOcularDistance = Math.sqrt(
      Math.pow(leftEye.x - rightEye.x, 2) + Math.pow(leftEye.y - rightEye.y, 2)
    );

    const normX = relX / interOcularDistance;
    const normY = relY / interOcularDistance;
    const timestamp = performance.now();

    return { normX, normY, timestamp };
  };

  return (
    <div>
      <input type="file" accept="video/*" onChange={handleVideoUpload} />
      {videoLoaded && (
        <div>
          <button onClick={handlePlay} disabled={isPlaying}>Play</button>
          <button onClick={handlePause} disabled={!isPlaying}>Pause</button>
          <button onClick={handleStop} disabled={isPlaying}>Stop</button>
        </div>
      )}
      <video
        key={key}
        ref={videoRef}
        width="640"
        height="480"
        style={{ display: 'none' }}
      ></video>
      <canvas ref={canvasRef} width="640" height="480"></canvas>
    </div>
  );
};

export default VideoUploadProcessing;
