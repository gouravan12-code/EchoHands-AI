import { analyzeHand } from "./fingerAnalyzer";
import { GESTURES } from "./index";
import { Landmark } from "./types";

export function matchGesture(landmarks: Landmark[]) {

    const fingers = analyzeHand(landmarks);

    for (const gesture of GESTURES) {

        if (

            fingers.thumb === gesture.fingers.thumb &&
            fingers.index === gesture.fingers.index &&
            fingers.middle === gesture.fingers.middle &&
            fingers.ring === gesture.fingers.ring &&
            fingers.pinky === gesture.fingers.pinky

        ) {

            return {
                gesture,
                confidence: 100
            };

        }

    }

    return null;

}