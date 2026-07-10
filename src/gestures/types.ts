export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type FingerState = "open" | "closed" | "half";

export interface GestureDefinition {
  id: string;
  name: string;

  fingers: {
    thumb: FingerState;
    index: FingerState;
    middle: FingerState;
    ring: FingerState;
    pinky: FingerState;
  };

  palm: "front" | "side" | "back";

  minScore: number;

  speechText: string;
}