/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Landmark {
  x: number; // 0 to 1
  y: number; // 0 to 1
  z: number; // depth
}

export interface GestureDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  speechText: string;
  landmarks: Landmark[];
}

// Helper to add random jitter to landmarks for realistic real-time simulation
export function addJitter(landmarks: Landmark[], intensity: number = 0.005): Landmark[] {
  return landmarks.map(pt => ({
    x: pt.x + (Math.random() - 0.5) * intensity,
    y: pt.y + (Math.random() - 0.5) * intensity,
    z: pt.z + (Math.random() - 0.5) * intensity * 0.5
  }));
}


// Connection indices for hand tracking skeleton representation (pairs of joints)
export const SKELETON_CONNECTIONS: [number, number][] = [
  // Wrist to Thumb base
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Wrist to Index MCP, and Index finger
  [0, 5], [5, 6], [6, 7], [7, 8],
  // MCP to MCP joints
  [5, 9], [9, 13], [13, 17], [0, 17],
  // Middle finger
  [9, 10], [10, 11], [11, 12],
  // Ring finger
  [13, 14], [14, 15], [15, 16],
  // Pinky finger
  [17, 18], [18, 19], [19, 20]
];

// Interactive FAQ Questions
export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQS: FAQItem[] = [
  {
    question: "How does the browser-based hand landmarking work?",
    answer: "We utilize MediaPipe's lightweight deep learning models compiled into WebAssembly. It identifies 21 spatial hand coordinate joints directly inside your GPU thread at 60 FPS, maintaining 100% data privacy since no frame is sent to external servers."
  },
  {
    question: "Can it recognize sentence structures or only single words?",
    answer: "EchoHands AI extracts spatial sequence features and pipes them into a temporal connectionist AI engine. It translates continuous gestures into structured sentences, matching ASL syntax and converting them into normal conversation flow."
  },
  {
    question: "What hardware is required for the real-time demo?",
    answer: "Any standard laptop, tablet, or smartphone camera works perfectly! Our neural network templates are highly optimized for WebGL and WebAssembly acceleration, running fluidly even on entry-level mobile devices."
  },
  {
    question: "Is it compliant with accessibility and privacy standards?",
    answer: "Absolutely. By processing all video frames client-side, EchoHands AI exceeds HIPAA and GDPR privacy requirements. This makes it safe for clinical, banking, and government applications."
  }
];

// Industry use cases
export interface UseCase {
  title: string;
  iconName: string;
  category: string;
  benefit: string;
  description: string;
}

export const USE_CASES: UseCase[] = [
  {
    title: "Healthcare & Emergency",
    category: "Clinical Communication",
    iconName: "HeartPulse",
    benefit: "Saves critical minutes",
    description: "Allows doctors and emergency response teams to understand deaf patients instantly during crises, without waiting for an on-site human interpreter."
  },
  {
    title: "Smart Classrooms",
    category: "Inclusive Education",
    iconName: "GraduationCap",
    benefit: "Boosts peer interaction",
    description: "Enables natural social and learning communication in mainstream schools, letting hearing classmates and deaf students understand each other in real-time."
  },
  {
    title: "Government & Legal Offices",
    category: "Public Access",
    iconName: "Building2",
    benefit: "Ensures ADA compliance",
    description: "Provides on-demand accessibility at city halls, courtrooms, and service desks so deaf citizens can apply for documents or complete procedures with dignity."
  },
  {
    title: "Retail & Customer Support",
    category: "Commercial Service",
    iconName: "Users",
    benefit: "Increases CSAT scores",
    description: "Equips service desks and cashier points with sign language translation kiosks, driving seamless, friendly, and highly accessible purchasing experiences."
  }
];
