import { Landmark } from "./types";

export interface FingerState {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
}

function isThumbOpen(landmarks: Landmark[]) {
  return landmarks[4].x > landmarks[3].x;
}

function isIndexOpen(landmarks: Landmark[]) {
  return (
    landmarks[8].y < landmarks[7].y &&
    landmarks[7].y < landmarks[6].y
  );
}

function isMiddleOpen(landmarks: Landmark[]) {
  return (
    landmarks[12].y < landmarks[11].y &&
    landmarks[11].y < landmarks[10].y
  );
}

function isRingOpen(landmarks: Landmark[]) {
  return (
    landmarks[16].y < landmarks[15].y &&
    landmarks[15].y < landmarks[14].y
  );
}

function isPinkyOpen(landmarks: Landmark[]) {
  return (
    landmarks[20].y < landmarks[19].y &&
    landmarks[19].y < landmarks[18].y
  );
}

export function analyzeHand(
  landmarks: Landmark[]
): FingerState {

  return {

    thumb: isThumbOpen(landmarks),

    index: isIndexOpen(landmarks),

    middle: isMiddleOpen(landmarks),

    ring: isRingOpen(landmarks),

    pinky: isPinkyOpen(landmarks)

  };

}