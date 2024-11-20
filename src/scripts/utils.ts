export const LEFT_IRIS_CENTER = 468;
export const LEFT_EYE_CORNER = 33;
export const RIGHT_EYE_CORNER = 263;
export const RIGHT_IRIS_CENTER = 473;
export const NOSE_TIP = 4;

export interface IrisPosition {
  normX: number;
  normY: number;
  timestamp: number;
}

export const getLandmarks = (landmarks: any[], indices: number[]): any[] => {
  return indices.map((index) => landmarks[index]);
};

export const getNormalizedIrisPosition = (
  faceLandmarks: any[],
  imgW: number,
  imgH: number
): IrisPosition => {
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
