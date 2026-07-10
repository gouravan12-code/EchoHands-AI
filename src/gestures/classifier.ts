import { Landmark } from "./types";
import { GESTURES } from "./index";

function isThumbOpen(landmarks: Landmark[]) {
  return landmarks[4].x > landmarks[3].x;
}

function isIndexOpen(landmarks: Landmark[]) {
  return (
    landmarks[8].y < landmarks[7].y &&
    landmarks[7].y < landmarks[6].y &&
    landmarks[6].y < landmarks[5].y
  );
}

function isMiddleOpen(landmarks: Landmark[]) {
  return (
    landmarks[12].y < landmarks[11].y &&
    landmarks[11].y < landmarks[10].y &&
    landmarks[10].y < landmarks[9].y
  );
}

function isRingOpen(landmarks: Landmark[]) {
  return (
    landmarks[16].y < landmarks[15].y &&
    landmarks[15].y < landmarks[14].y &&
    landmarks[14].y < landmarks[13].y
  );
}

function isPinkyOpen(landmarks: Landmark[]) {
  return (
    landmarks[20].y < landmarks[19].y &&
    landmarks[19].y < landmarks[18].y &&
    landmarks[18].y < landmarks[17].y
  );
}

function getFingerStates(landmarks: Landmark[]) {
  return {
    thumb: isThumbOpen(landmarks),
    index: isIndexOpen(landmarks),
    middle: isMiddleOpen(landmarks),
    ring: isRingOpen(landmarks),
    pinky: isPinkyOpen(landmarks),
  };
}

export function classifyGesture(landmarks: Landmark[]) {
  if (!landmarks || landmarks.length !== 21) return null;

  const detected = getFingerStates(landmarks);

  console.log("Detected:", detected);

  for (const gesture of GESTURES) {
    if (
      detected.thumb === gesture.fingers.thumb &&
      detected.index === gesture.fingers.index &&
      detected.middle === gesture.fingers.middle &&
      detected.ring === gesture.fingers.ring &&
      detected.pinky === gesture.fingers.pinky
    ) {
      return {
        gesture,
        confidence: 100,
      };
    }
  }

  return null;
}