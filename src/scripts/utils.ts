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

export interface SessionRequestData {
  id: number;
  userId: number;
  name: string;
  startTime: string;
  endTime: string;
  varMin: number;
  varMax: number;
  accMin: number;
  accMax: number;
  createdAt: string;
}

export interface AnalysisResponseData {
  session_id: number;
  timestamp: number;
  x: number;
  y: number;
  prob: number;
  created_at: string;
}

export interface AnalysisDisplayData {
  timestamp: number;
  x: number;
  y: number;
  prob: number;
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

/**
 * parseSetCookie will:
 *   1. Split the Set-Cookie string on semicolons (e.g., "token=VALUE; Expires=...; Path=/; HttpOnly; ...")
 *   2. Extract the cookie "Name=Value" plus any attributes (Expires, Path, HttpOnly, Secure, SameSite, etc.).
 *   3. Return an object describing the cookie so we can replicate it in Astro with the same settings.
 */
export function parseSetCookie(setCookieHeader: string) {
  if (!setCookieHeader) return null;

  // Break out the parts on semicolons. The first part is always "name=value"
  const parts = setCookieHeader.split(";");
  const cookiePart = parts.shift(); // e.g. "token=abc123..."
  if (!cookiePart) return null;

  // Extract the name and value (e.g. "token" and "abc123...")
  const [rawName, rawVal] = cookiePart.split("=");
  if (!rawName || !rawVal) return null;

  const name = rawName.trim();
  let value = decodeURIComponent(rawVal.trim());

  // If it was quoted/encoded, remove surrounding quotes
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }

  // Default cookie settings
  let path = "/";
  let httpOnly = false;
  let secure = true;
  let expires: Date | undefined;
  let sameSite: "none" | "lax" | "strict" | undefined;

  // Now parse the remaining attributes
  for (const attr of parts) {
    const trimmed = attr.trim().toLowerCase();
    if (trimmed === "httponly") {
      httpOnly = true;
      secure = true; //! Change to true when prod
    } else if (trimmed.startsWith("expires=")) {
      const dateStr = trimmed.substring("expires=".length).trim();
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        expires = parsedDate;
      }
    } else if (trimmed.startsWith("path=")) {
      path = attr.split("=")[1]?.trim() || "/";
    } else if (trimmed.startsWith("samesite=")) {
      const samesiteVal = attr.split("=")[1]?.trim().toLowerCase();
      if (samesiteVal === "none") sameSite = "none";
      else if (samesiteVal === "lax") sameSite = "lax";
      else if (samesiteVal === "strict") sameSite = "strict";
    }
  }

  return { name, value, path, httpOnly, secure, sameSite, expires };
}
