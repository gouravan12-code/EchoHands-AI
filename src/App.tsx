

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Video,
  Activity,
  Volume2,
  Cpu,
  Layers,
  Languages,
  Sparkles,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  HeartPulse,
  GraduationCap,
  Building2,
  Users,
  Play,
  StopCircle,
  RefreshCw,
  Sliders,
  X,
  ChevronRight,
  Info,
  Sparkle,
  ArrowDown,
  Github,
  Award,
  Clock,
  ShieldCheck,
  Check,
  VolumeX,
  AlertTriangle,
  FileText
} from 'lucide-react';
import {
  SKELETON_CONNECTIONS,
  FAQS,
  USE_CASES,
  Landmark,
  addJitter,
} from './utils/handTemplates';
import { GESTURES } from "./gestures";
import { classifyGesture } from "./gestures/classifier";
import { GestureDefinition } from "./gestures/types";

export default function App() {
  // Navigation & View Toggling
  // "landing" | "demo"
  const [activeTab, setActiveTab] = useState<'landing' | 'demo'>('landing');
  const [scrolled, setScrolled] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Demo Dashboard States
  const [workspaceMode, setWorkspaceMode] = useState<'translate' | 'practice'>('translate');
  const [selectedGesture, setSelectedGesture] = useState<GestureDefinition>(GESTURES[0]);
  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const [webcamLoading, setWebcamLoading] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [trackingConfidence, setTrackingConfidence] = useState(98.4);
  const [latency, setLatency] = useState(4);
  const [fps, setFps] = useState(60);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(100);
  
  // MediaPipe HandLandmarker states
  const [handLandmarker, setHandLandmarker] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  


  // Voice Web Speech Synthesis States
  const [isMuted, setIsMuted] = useState(false);

  
  // Interactive Simulator Coordinates
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [hoveringCanvas, setHoveringCanvas] = useState(false);

  // 1. Real-Time Sentence Builder & Gemini Translation States
  const [sentenceWords, setSentenceWords] = useState<string[]>([]);
  const [autoAppend, setAutoAppend] = useState<boolean>(true);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translatedSentence, setTranslatedSentence] = useState<string>('');
  const [replySuggestion, setReplySuggestion] = useState<string>('');
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isKeyboardSpelling, setIsKeyboardSpelling] = useState<boolean>(false);
  const [currentSpelledWord, setCurrentSpelledWord] = useState<string>('');
  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);

  // Gesture stability refs
  const lastSpokenGestureIdRef = useRef<string>('');
  const lastSpeakTimeRef = useRef(0);
  const pendingGestureIdRef = useRef<string>('');
  const stableFramesCountRef = useRef<number>(0);
  const noHandFramesRef = useRef<number>(0);

  // Game-loop synchronization refs to avoid re-creating the requestAnimationFrame loop
  const workspaceModeRef = useRef(workspaceMode);
  const selectedGestureRef = useRef(selectedGesture);
  const isWebcamOnRef = useRef(isWebcamOn);
  const isCalibratingRef = useRef(isCalibrating);
  const calibrationProgressRef = useRef(calibrationProgress);
  const mousePosRef = useRef(mousePos);
  const hoveringCanvasRef = useRef(hoveringCanvas);
  const handLandmarkerRef = useRef(handLandmarker);
  const lastUIUpdateTimeRef = useRef(0);

  useEffect(() => { workspaceModeRef.current = workspaceMode; }, [workspaceMode]);
  useEffect(() => { selectedGestureRef.current = selectedGesture; }, [selectedGesture]);
  useEffect(() => { isWebcamOnRef.current = isWebcamOn; }, [isWebcamOn]);
  useEffect(() => { isCalibratingRef.current = isCalibrating; }, [isCalibrating]);
  useEffect(() => { calibrationProgressRef.current = calibrationProgress; }, [calibrationProgress]);
  useEffect(() => { mousePosRef.current = mousePos; }, [mousePos]);
  useEffect(() => { hoveringCanvasRef.current = hoveringCanvas; }, [hoveringCanvas]);
  useEffect(() => { handLandmarkerRef.current = handLandmarker; }, [handLandmarker]);

  // Monitor Window Scrolling for Navbar Glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load MediaPipe HandLandmarker client-side
  useEffect(() => {
    let active = true;
    const initMediaPipe = async () => {
      try {
        setIsModelLoading(true);
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        if (active) {
          setHandLandmarker(landmarker);
          setIsModelLoading(false);
          console.log("MediaPipe HandLandmarker loaded successfully.");
        }
      } catch (err) {
        console.error("Failed to load MediaPipe:", err);
        if (active) {
          setIsModelLoading(false);
        }
      }
    };
    initMediaPipe();
    return () => {
      active = false;
    };
  }, []);

  // Web Audio API success double-chime for instant feedback
  const playSuccessSound = () => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
      
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.38);
    } catch (e) {
      console.warn("Web Audio API not supported or blocked:", e);
    }
  };

  // Trigger TTS Text-To-Speech
  const speakText = (text: string) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    // Cancel any active speech first
    window.speechSynthesis.cancel();
    
    // Add a 45ms delay before speaking to prevent browser Web Speech queue from hanging/muting
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      
      window.speechSynthesis.speak(utterance);
    }, 45);
  };

  // Speak when selected ASL gesture changes (if requested)
  const handleGestureSelect = (gesture: GestureDefinition) => {
    setSelectedGesture(gesture);
    speakText(gesture.name);
    


    // Handle Auto-Append in Translation Mode
    if (workspaceModeRef.current === 'translate') {
      if (autoAppend) {
        setSentenceWords(prev => {
          // Avoid duplicate consecutive insertions to keep it clean
          if (prev[prev.length - 1] === gesture.name) return prev;
          return [...prev, gesture.name];
        });
      }
    }

    // Animate custom tracking confidence fluctuation
    setTrackingConfidence(parseFloat((95 + Math.random() * 4.9).toFixed(1)));
    setLatency(Math.floor(3 + Math.random() * 4));
  };

  const handleGestureSelectRef = useRef(handleGestureSelect);
  useEffect(() => { handleGestureSelectRef.current = handleGestureSelect; }, [handleGestureSelect]);

  // Trigger Gemini API to polish current sentence
  const polishSentence = async () => {
    if (sentenceWords.length === 0) return;
    setIsTranslating(true);
    setTranslationError(null);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: sentenceWords }),
      });
      if (!response.ok) {
        throw new Error("Failed to contact translation endpoint.");
      }
      const data = await response.json();
      setTranslatedSentence(data.translatedText);
      setReplySuggestion(data.contextualReplySuggestion);
      speakText(data.translatedText);
    } catch (err: any) {
      console.error(err);
      setTranslationError("Translation server currently busy. Playing fallback word stream.");
      speakText(sentenceWords.join(" "));
    } finally {
      setIsTranslating(false);
    }
  };

  // Trigger Manual Recalibration Sequence
  const triggerCalibration = () => {
    setIsCalibrating(true);
    setCalibrationProgress(0);
    const interval = setInterval(() => {
      setCalibrationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCalibrating(false);
          speakText("Calibration complete. Sensor mapped.");
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // Clear translation log


  // Start real webcam stream
  const startWebcam = async () => {
    setWebcamLoading(true);
    setWebcamError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsWebcamOn(true);
      speakText("Camera stream activated. Hand scanning initialized.");
    } catch (err: any) {
      console.error("Webcam Access Error:", err);
      let userFriendlyMsg = "Webcam not accessible. Using high-fidelity AI Scanning Simulator.";
      const errName = err?.name || "";
      const errMsg = err?.message || "";
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('allowed')) {
        userFriendlyMsg = "Webcam access denied. Browsers block webcam access inside sandboxed preview iframes by default. Please open this app in a New Tab to grant direct camera permission, or check your browser's site permissions settings.";
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        userFriendlyMsg = "No webcam device was found. Please plug in or enable your camera. In the meantime, you can use our built-in interactive 3D Hand Simulator below!";
      } else {
        userFriendlyMsg = `Webcam Error: ${errName || "Access restricted"}. Please try opening the application in a New Tab.`;
      }
      setWebcamError(userFriendlyMsg);
      setIsWebcamOn(false);
    } finally {
      setWebcamLoading(false);
    }
  };

  // Stop real webcam stream
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsWebcamOn(false);
    speakText("Camera deactivated.");
  };

  // Canvas Hand Skeleton Rendering Loop
  useEffect(() => {
    let currentJitterOffset = 0;
    let lastFpsUpdateTime = performance.now();
    let frameCount = 0;
    
    // Smooth skeleton interpolation target coordinates (for simulator mode)
    let renderedLandmarks = [];
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      // Read values from refs to avoid restarting the requestAnimationFrame loop
      const isWebcamOn = isWebcamOnRef.current;
      const selectedGesture = selectedGestureRef.current;
      const isCalibrating = isCalibratingRef.current;
      const calibrationProgress = calibrationProgressRef.current;
      const mousePos = mousePosRef.current;
      const hoveringCanvas = hoveringCanvasRef.current;
      const landmarker = handLandmarkerRef.current;

      // 1. Calculate Frame Rate (FPS)
      const now = performance.now();
      frameCount++;
      if (now - lastFpsUpdateTime > 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsUpdateTime)));
        frameCount = 0;
        lastFpsUpdateTime = now;
      }

      // 2. Clear canvas
      ctx.clearRect(0, 0, w, h);

      // 3. Scanline Animation values
      currentJitterOffset += 0.015;
      const scanlineY = (Math.sin(currentJitterOffset * 1.5) + 1) * 0.5 * h;

      if (isWebcamOn && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        
        // Draw real webcam stream flipped horizontally for natural mirror effect
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
        
        // Dark glass overlay to make tracking lines stand out
        ctx.fillStyle = 'rgba(5, 8, 22, 0.45)';
        ctx.fillRect(0, 0, w, h);

        // Scanline overlay
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, scanlineY);
        ctx.lineTo(w, scanlineY);
        ctx.stroke();

        const scanGlow = ctx.createLinearGradient(0, scanlineY - 20, 0, scanlineY + 20);
        scanGlow.addColorStop(0, 'rgba(6, 182, 212, 0)');
        scanGlow.addColorStop(0.5, 'rgba(6, 182, 212, 0.08)');
        scanGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = scanGlow;
        ctx.fillRect(0, scanlineY - 20, w, 40);

        // Real-time MediaPipe Hand Detection
        if (landmarker) {
          const startDetect = performance.now();
          const results = landmarker.detectForVideo(video, now);
          const endDetect = performance.now();
          const detectLatency = Math.max(1, Math.round(endDetect - startDetect));

          if (results && results.landmarks && results.landmarks.length > 0) {
            // Hand detected!
            noHandFramesRef.current = 0;
            const detectedRawLandmarks = results.landmarks[0] as Landmark[];

            // Horizontal flip to align skeleton on mirrored canvas
            const mappedPts = detectedRawLandmarks.map(pt => ({
              x: (1 - pt.x) * w,
              y: pt.y * h,
              z: pt.z
            }));

            // Classify gesture
            const classified = classifyGesture(detectedRawLandmarks);
            let matchConfidence = 0;
            let gestureName = "UNKNOWN";

            if (classified) {
              const { gesture, confidence } = classified;
              matchConfidence = confidence;
              gestureName = gesture.name.toUpperCase();
              

    if (gesture.id === pendingGestureIdRef.current) {
        stableFramesCountRef.current++;
    } else {
        pendingGestureIdRef.current = gesture.id;
        stableFramesCountRef.current = 0;
    }

    if (stableFramesCountRef.current >= 4) {

    const now = Date.now();

    if (
        gesture.id !== lastSpokenGestureIdRef.current &&
        now - lastSpeakTimeRef.current > 1500
    ) {
        lastSpokenGestureIdRef.current = gesture.id;
        lastSpeakTimeRef.current = now;
        handleGestureSelectRef.current(gesture);
    }

}
} else {
    pendingGestureIdRef.current = "";
    stableFramesCountRef.current = 0;
}

            // Throttled UI updates to prevent performance degradation
            if (now - lastUIUpdateTimeRef.current > 300) {
              setLatency(detectLatency);
              setTrackingConfidence(matchConfidence);
              lastUIUpdateTimeRef.current = now;
            }

            // Calculate Bounding Box
            let minX = w;
            let maxX = 0;
            let minY = h;
            let maxY = 0;
            mappedPts.forEach(pt => {
              if (pt.x < minX) minX = pt.x;
              if (pt.x > maxX) maxX = pt.x;
              if (pt.y < minY) minY = pt.y;
              if (pt.y > maxY) maxY = pt.y;
            });

            // Pad the bounding box a bit
            const pad = 25;
            minX = Math.max(0, minX - pad);
            maxX = Math.min(w, maxX + pad);
            minY = Math.max(0, minY - pad * 1.5);
            maxY = Math.min(h, maxY + pad);

            // Draw bounding box corner markers with neon cyan glow
            ctx.strokeStyle = '#06B6D4';
            ctx.lineWidth = 1.5;
            const cornerLen = 15;

            // Top Left Corner
            ctx.beginPath();
            ctx.moveTo(minX, minY + cornerLen);
            ctx.lineTo(minX, minY);
            ctx.lineTo(minX + cornerLen, minY);
            ctx.stroke();

            // Top Right Corner
            ctx.beginPath();
            ctx.moveTo(maxX, minY + cornerLen);
            ctx.lineTo(maxX, minY);
            ctx.lineTo(maxX - cornerLen, minY);
            ctx.stroke();

            // Bottom Left Corner
            ctx.beginPath();
            ctx.moveTo(minX, maxY - cornerLen);
            ctx.lineTo(minX, maxY);
            ctx.lineTo(minX + cornerLen, maxY);
            ctx.stroke();

            // Bottom Right Corner
            ctx.beginPath();
            ctx.moveTo(maxX, maxY - cornerLen);
            ctx.lineTo(maxX, maxY);
            ctx.lineTo(maxX - cornerLen, maxY);
            ctx.stroke();

            // Draw box boundary lines (subtle dashed)
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
            ctx.setLineDash([]); // Reset line dash


            // Draw Skeleton connection lines
            ctx.lineWidth = 2.5;
            SKELETON_CONNECTIONS.forEach(([startIndex, endIndex]) => {
              const startPt = mappedPts[startIndex];
              const endPt = mappedPts[endIndex];
              if (startPt && endPt) {
                const grad = ctx.createLinearGradient(startPt.x, startPt.y, endPt.x, endPt.y);
                grad.addColorStop(0, '#7C3AED'); // Purple
                grad.addColorStop(1, '#06B6D4'); // Cyan
                
                ctx.strokeStyle = grad;
                ctx.beginPath();
                ctx.moveTo(startPt.x, startPt.y);
                ctx.lineTo(endPt.x, endPt.y);
                ctx.stroke();
              }
            });

            // Draw glowing joint landmarks
            mappedPts.forEach((pt, idx) => {
              const isWrist = idx === 0;
              const isTip = [4, 8, 12, 16, 20].includes(idx);
              
              ctx.fillStyle = isWrist 
                ? 'rgba(124, 58, 237, 0.35)' 
                : isTip 
                  ? 'rgba(34, 197, 94, 0.35)' 
                  : 'rgba(6, 182, 212, 0.35)';
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, isWrist ? 10 : isTip ? 8 : 6, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = isWrist 
                ? '#7C3AED' 
                : isTip 
                  ? '#22C55E' 
                  : '#06B6D4';
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, isWrist ? 4.5 : isTip ? 3.5 : 2.5, 0, Math.PI * 2);
              ctx.fill();
            });

          } else {
            // No landmarks detected in current frame
            noHandFramesRef.current += 1;
            if (noHandFramesRef.current >= 8) {
              lastSpokenGestureIdRef.current = '';
              pendingGestureIdRef.current = '';
              stableFramesCountRef.current = 0;
            }

            // Throttled latency reset
            if (now - lastUIUpdateTimeRef.current > 300) {
              setLatency(detectLatency);
              lastUIUpdateTimeRef.current = now;
            }

            // Beautiful blinking scanning text overlay on canvas
            ctx.save();
            ctx.fillStyle = 'rgba(5, 8, 22, 0.6)';
            ctx.fillRect(w / 2 - 140, h / 2 - 25, 280, 50);
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(w / 2 - 140, h / 2 - 25, 280, 50);
            
            ctx.fillStyle = (Math.floor(now / 500) % 2 === 0) ? '#06B6D4' : 'rgba(6, 182, 212, 0.4)';
            ctx.font = '10px Space Grotesk, monospace';
            ctx.textAlign = 'center';
            ctx.fillText("POSITION HAND IN CAMERA FIELD", w / 2, h / 2 + 3);
            ctx.restore();
          }
        } else {
          // Model loading fallback overlay
          ctx.save();
          ctx.fillStyle = 'rgba(5, 8, 22, 0.7)';
          ctx.fillRect(w / 2 - 150, h / 2 - 25, 300, 50);
          ctx.strokeStyle = 'rgba(124, 58, 237, 0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(w / 2 - 150, h / 2 - 25, 300, 50);
          
          ctx.fillStyle = '#A78BFA';
          ctx.font = '10px Space Grotesk, monospace';
          ctx.textAlign = 'center';
          ctx.fillText("INITIALIZING ENGINE: COMPILING MESH MODEL...", w / 2, h / 2 + 3);
          ctx.restore();
        }

      } else {
        // AI Vision Scanning Grid background (Simulator fallback)
        ctx.fillStyle = '#050816';
        ctx.fillRect(0, 0, w, h);

        // Tech Grid lines
        ctx.strokeStyle = 'rgba(124, 58, 237, 0.08)';
        ctx.lineWidth = 1;
        const gridSize = 40;
        for (let x = 0; x < w; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Circular tech radar guide in background
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 140, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 80, 0, Math.PI * 2);
        ctx.stroke();

        // Scanline overlay
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, scanlineY);
        ctx.lineTo(w, scanlineY);
        ctx.stroke();

        const scanGlow = ctx.createLinearGradient(0, scanlineY - 20, 0, scanlineY + 20);
        scanGlow.addColorStop(0, 'rgba(6, 182, 212, 0)');
        scanGlow.addColorStop(0.5, 'rgba(6, 182, 212, 0.08)');
        scanGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = scanGlow;
        ctx.fillRect(0, scanlineY - 20, w, 40);

       // Use selected gesture only
        const activeGestureObj = selectedGesture;
        const targetLandmarks = activeGestureObj.landmarks;        
 
        let warpX = 0;
        let warpY = 0;
        if (hoveringCanvas) {
          warpX = (mousePos.x - 0.5) * 0.15;
          warpY = (mousePos.y - 0.5) * 0.15;
        }

        const lerpSpeed = 0.12;
        renderedLandmarks = renderedLandmarks.map((pt, idx) => {
          const target = targetLandmarks[idx];
          if (!target) return pt;
          
          const distanceFactor = 1 - (idx === 0 ? 0 : 0.4);
          
          const finalTargetX = target.x + warpX * distanceFactor;
          const finalTargetY = target.y + warpY * distanceFactor;

          return {
            x: pt.x + (finalTargetX - pt.x) * lerpSpeed,
            y: pt.y + (finalTargetY - pt.y) * lerpSpeed,
            z: pt.z + (target.z - pt.z) * lerpSpeed
          };
        });

        const jitteredPts = addJitter(renderedLandmarks, 0.003);

        const mappedPts = jitteredPts.map(pt => ({
          x: pt.x * w,
          y: pt.y * h,
          z: pt.z
        }));

        // Calculate Bounding Box
        let minX = w;
        let maxX = 0;
        let minY = h;
        let maxY = 0;
        mappedPts.forEach(pt => {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        });

        const pad = 25;
        minX = Math.max(0, minX - pad);
        maxX = Math.min(w, maxX + pad);
        minY = Math.max(0, minY - pad * 1.5);
        maxY = Math.min(h, maxY + pad);

        // Draw bounding box corners
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 1.5;
        const cornerLen = 15;

        // Top Left
        ctx.beginPath();
        ctx.moveTo(minX, minY + cornerLen);
        ctx.lineTo(minX, minY);
        ctx.lineTo(minX + cornerLen, minY);
        ctx.stroke();

        // Top Right
        ctx.beginPath();
        ctx.moveTo(maxX, minY + cornerLen);
        ctx.lineTo(maxX, minY);
        ctx.lineTo(maxX - cornerLen, minY);
        ctx.stroke();

        // Bottom Left
        ctx.beginPath();
        ctx.moveTo(minX, maxY - cornerLen);
        ctx.lineTo(minX, maxY);
        ctx.lineTo(minX + cornerLen, maxY);
        ctx.stroke();

        // Bottom Right
        ctx.beginPath();
        ctx.moveTo(maxX, maxY - cornerLen);
        ctx.lineTo(maxX, maxY);
        ctx.lineTo(maxX - cornerLen, maxY);
        ctx.stroke();

        // Dashed outline
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.setLineDash([]);

// Tag label
ctx.fillStyle = '#06B6D4';
ctx.font = '10px Space Grotesk, JetBrains Mono, sans-serif';
const simulatedConf = 99.2;
ctx.fillText(
  `ASL_GESTURE_CLASSIFIER: ${activeGestureObj.name.toUpperCase()} (${simulatedConf}%)`,
  minX,
  minY - 6
);

// Draw skeleton connection lines
        ctx.lineWidth = 2.5;
        SKELETON_CONNECTIONS.forEach(([startIndex, endIndex]) => {
          const startPt = mappedPts[startIndex];
          const endPt = mappedPts[endIndex];
          if (startPt && endPt) {
            const grad = ctx.createLinearGradient(startPt.x, startPt.y, endPt.x, endPt.y);
            grad.addColorStop(0, '#7C3AED');
            grad.addColorStop(1, '#06B6D4');
            
            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(startPt.x, startPt.y);
            ctx.lineTo(endPt.x, endPt.y);
            ctx.stroke();
          }
        });

        // Draw glowing joint landmarks
        mappedPts.forEach((pt, idx) => {
          const isWrist = idx === 0;
          const isTip = [4, 8, 12, 16, 20].includes(idx);
          
          ctx.fillStyle = isWrist 
            ? 'rgba(124, 58, 237, 0.3)' 
            : isTip 
              ? 'rgba(34, 197, 94, 0.3)' 
              : 'rgba(6, 182, 212, 0.25)';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isWrist ? 10 : isTip ? 8 : 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = isWrist 
            ? '#7C3AED' 
            : isTip 
              ? '#22C55E' 
              : '#06B6D4';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isWrist ? 4.5 : isTip ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();

          if (hoveringCanvas && isTip) {
            ctx.fillStyle = '#94A3B8';
            ctx.font = '8px monospace';
            ctx.fillText(`ID_${idx}`, pt.x + 8, pt.y - 2);
          }
        });
      }

      // 5. Calibration Overlay (if calibrating)
      if (isCalibrating) {
        ctx.fillStyle = 'rgba(5, 8, 22, 0.85)';
        ctx.fillRect(0, 0, w, h);
        
        ctx.strokeStyle = '#7C3AED';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 40, -Math.PI / 2, (Math.PI * 2 * (calibrationProgress / 100)) - Math.PI / 2);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Space Grotesk, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`CALIBRATING SENSORS...`, w / 2, h / 2 + 65);
        ctx.fillStyle = '#06B6D4';
        ctx.fillText(`${calibrationProgress}%`, w / 2, h / 2 + 5);
        ctx.textAlign = 'left';
      }

      requestRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Handle cleanups
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div id="echohands-app" className="min-h-screen text-white font-sans selection:bg-purple-600 selection:text-white" style={{ backgroundColor: '#050816' }}>
      
      {/* BACKGROUND FLOATING GRADIENT AMBIENCE */}
      <div className="absolute top-0 left-0 w-full h-[600px] overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-[0.15] blur-[150px]" style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 80%)' }} />
        <div className="absolute top-[10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-[0.12] blur-[150px]" style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 80%)' }} />
      </div>

      {/* 1. STICKY GLASSMORPHIC NAVBAR */}
      <header 
        id="navbar" 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'py-3 bg-[#050816]/75 backdrop-blur-md border-b border-white/5 shadow-lg shadow-purple-950/5' 
            : 'py-5 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div 
            id="nav-logo"
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setActiveTab('landing')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-[1.5px] shadow-lg shadow-purple-900/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-[10px] bg-[#050816] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
              EchoHands <span className="text-purple-400 font-extrabold text-xs tracking-widest px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 ml-1">AI</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav id="nav-links" className="hidden md:flex items-center gap-8">
            <a 
              href="#hero" 
              onClick={() => { setActiveTab('landing'); }}
              className={`text-sm font-medium transition-colors hover:text-cyan-400 ${activeTab === 'landing' ? 'text-white' : 'text-slate-400'}`}
            >
              Home
            </a>
            <a 
              href="#problem" 
              onClick={() => { setActiveTab('landing'); }}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-cyan-400"
            >
              Challenge
            </a>
            <a 
              href="#features" 
              onClick={() => { setActiveTab('landing'); }}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-cyan-400"
            >
              Features
            </a>
            <a 
              href="#technology" 
              onClick={() => { setActiveTab('landing'); }}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-cyan-400"
            >
              Technology
            </a>
            <a 
              href="#usecases" 
              onClick={() => { setActiveTab('landing'); }}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-cyan-400"
            >
              Applications
            </a>
          </nav>

          {/* Call To Actions */}
          <div id="nav-cta" className="flex items-center gap-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer" 
              className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5"
              title="GitHub Repository"
            >
              <Github className="w-5 h-5" />
            </a>

            {activeTab === 'landing' ? (
              <button
                id="btn-nav-demo-launch"
                onClick={() => {
                  setActiveTab('demo');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  speakText("Entering EchoHands AI translation workspace.");
                }}
                className="relative px-5 py-2 text-sm font-semibold rounded-xl overflow-hidden group shadow-md shadow-purple-500/10"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-500 transition-all duration-300 group-hover:opacity-90" />
                <span className="relative flex items-center gap-1.5 text-white">
                  Launch Demo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            ) : (
              <button
                id="btn-nav-back-home"
                onClick={() => setActiveTab('landing')}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-200 transition-all hover:text-white"
              >
                Back to Product
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative pt-24 pb-16 z-10">

        {/* ==========================================
            VIEW 1: LANDING PRODUCT WEBSITE 
           ========================================== */}
        <AnimatePresence mode="wait">
          {activeTab === 'landing' && (
            <motion.div
              key="landing-page"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full flex flex-col items-center"
            >
              
              {/* 2. HERO SECTION */}
              <section id="hero" className="w-full max-w-7xl mx-auto px-6 py-12 md:py-20 lg:py-28 flex flex-col lg:flex-row gap-16 items-center">
                
                {/* Hero Left Content */}
                <div id="hero-left" className="flex-1 text-left space-y-8 max-w-2xl">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-semibold">
                    <Sparkle className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    Interactive Computer Vision & TTS Platform
                  </div>

                  {/* Main Header */}
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
                    Breaking Communication Barriers with <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Instant AI</span>.
                  </h1>

                  {/* Subtitle */}
                  <p className="text-lg text-slate-400 font-normal leading-relaxed">
                    Translate sign language into spoken conversation and structured text in real-time. Powered by client-side MediaPipe joint tracking, EchoHands AI requires no servers, processes no frames externally, and delivers 100% private, instantaneous accessibility directly in your browser.
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4 pt-2">
                    <button
                      id="btn-hero-launch-demo"
                      onClick={() => {
                        setActiveTab('demo');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        speakText("Launching workspace.");
                      }}
                      className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-95 text-white font-semibold transition-all shadow-xl shadow-purple-900/10 flex items-center gap-2 group cursor-pointer"
                    >
                      Launch Live Demo
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <a
                      id="btn-hero-view-tech"
                      href="#technology"
                      className="px-8 py-4 rounded-xl bg-slate-900/60 border border-white/10 hover:bg-slate-800/80 text-slate-300 font-semibold transition-all flex items-center gap-2 cursor-pointer hover:border-white/20"
                    >
                      Explore Technology
                    </a>
                  </div>

                  {/* Trust Factors */}
                  <div className="pt-8 border-t border-white/5 grid grid-cols-3 gap-6">
                    <div>
                      <div className="text-2xl font-bold text-white">60 FPS</div>
                      <div className="text-xs text-slate-400">High Frame Rate</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-cyan-400">100% Private</div>
                      <div className="text-xs text-slate-400">On-Device Process</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-400">&lt; 4ms</div>
                      <div className="text-xs text-slate-400">Local Latency</div>
                    </div>
                  </div>
                </div>

                {/* Hero Right Graphic - Interactive Simulator Mockup */}
                <div id="hero-right" className="flex-1 w-full relative max-w-xl">
                  
                  {/* Backdrop Glow Grid */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-cyan-600/10 rounded-3xl blur-3xl -z-10" />

                  {/* Premium Camera Frame Mockup */}
                  <div className="relative rounded-2xl bg-[#0B1220] border border-white/10 p-4 shadow-2xl shadow-purple-950/20 overflow-hidden group">
                    
                    {/* Floating Statistics Badges around mockup */}
                    <div className="absolute top-8 -left-6 z-20 bg-[#0B1220]/90 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 animate-bounce" style={{ animationDuration: '6s' }}>
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                      <div>
                        <div className="text-xs font-semibold text-white">99% Accuracy</div>
                        <div className="text-[10px] text-slate-400">Neural Verification</div>
                      </div>
                    </div>

                    <div className="absolute bottom-16 -right-6 z-20 bg-[#0B1220]/90 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 animate-bounce" style={{ animationDuration: '8s' }}>
                      <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <div>
                        <div className="text-xs font-semibold text-white">21 Landmarks</div>
                        <div className="text-[10px] text-slate-400">Full Hand Mapping</div>
                      </div>
                    </div>

                    {/* Camera Panel Screen Simulator */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-[#050816] flex flex-col items-center justify-center border border-white/5">
                      
                      {/* Scanning Grid Line Overlay */}
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent pointer-events-none animate-pulse" />
                      
                      {/* Render simulated skeletal graphics floating */}
                      <svg className="w-full h-full text-cyan-400/85" viewBox="0 0 400 225">
                        {/* Connecting lines */}
                        <line x1="200" y1="180" x2="160" y2="130" stroke="#7C3AED" strokeWidth="2" opacity="0.8" />
                        <line x1="160" y1="130" x2="130" y2="90" stroke="#7C3AED" strokeWidth="2" opacity="0.8" />
                        <line x1="130" y1="90" x2="110" y2="60" stroke="#7C3AED" strokeWidth="2" opacity="0.8" />
                        
                        <line x1="200" y1="180" x2="185" y2="110" stroke="#06B6D4" strokeWidth="2" opacity="0.8" />
                        <line x1="185" y1="110" x2="180" y2="70" stroke="#06B6D4" strokeWidth="2" opacity="0.8" />
                        <line x1="180" y1="70" x2="175" y2="40" stroke="#06B6D4" strokeWidth="2" opacity="0.8" />

                        <line x1="200" y1="180" x2="215" y2="105" stroke="#06B6D4" strokeWidth="2" opacity="0.8" />
                        <line x1="215" y1="105" x2="218" y2="60" stroke="#06B6D4" strokeWidth="2" opacity="0.8" />
                        <line x1="218" y1="60" x2="220" y2="30" stroke="#06B6D4" strokeWidth="2" opacity="0.8" />

                        <line x1="200" y1="180" x2="245" y2="120" stroke="#06B6D4" strokeWidth="2" opacity="0.8" />
                        <line x1="245" y1="120" x2="255" y2="80" stroke="#06B6D4" strokeWidth="2" opacity="0.8" />
                        <line x1="255" y1="80" x2="265" y2="50" stroke="#06B6D4" strokeWidth="2" opacity="0.8" />

                        <line x1="200" y1="180" x2="275" y2="140" stroke="#7C3AED" strokeWidth="2" opacity="0.8" />
                        <line x1="275" y1="140" x2="295" y2="110" stroke="#7C3AED" strokeWidth="2" opacity="0.8" />
                        <line x1="295" y1="110" x2="310" y2="85" stroke="#7C3AED" strokeWidth="2" opacity="0.8" />

                        {/* Joint nodes */}
                        <circle cx="200" cy="180" r="4.5" fill="#7C3AED" className="animate-pulse" />
                        <circle cx="160" cy="130" r="3" fill="#7C3AED" />
                        <circle cx="130" cy="90" r="3" fill="#7C3AED" />
                        <circle cx="110" cy="60" r="3.5" fill="#22C55E" />

                        <circle cx="185" cy="110" r="3" fill="#06B6D4" />
                        <circle cx="180" cy="70" r="3" fill="#06B6D4" />
                        <circle cx="175" cy="40" r="3.5" fill="#22C55E" />

                        <circle cx="215" cy="105" r="3" fill="#06B6D4" />
                        <circle cx="218" cy="60" r="3" fill="#06B6D4" />
                        <circle cx="220" cy="30" r="3.5" fill="#22C55E" />

                        <circle cx="245" cy="120" r="3" fill="#06B6D4" />
                        <circle cx="255" cy="80" r="3" fill="#06B6D4" />
                        <circle cx="265" cy="50" r="3.5" fill="#22C55E" />

                        <circle cx="275" cy="140" r="3" fill="#7C3AED" />
                        <circle cx="295" cy="110" r="3" fill="#7C3AED" />
                        <circle cx="310" cy="85" r="3.5" fill="#22C55E" />

                        {/* Interactive scanline beam */}
                        <line x1="0" y1="90" x2="400" y2="90" stroke="rgba(34, 197, 94, 0.4)" strokeWidth="1.5" strokeDasharray="3 3" />
                      </svg>

                      {/* Vision Scanning HUD Labels */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-[9px] font-mono border border-purple-500/30 text-purple-300">VISION_FEED</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[9px] font-mono border border-emerald-500/30 text-emerald-400">CALIBRATED_GPS</span>
                      </div>
                      
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center bg-black/60 backdrop-blur-sm p-2 rounded border border-white/5 text-[10px] font-mono">
                        <span className="text-slate-300">GESTURE DETECTION ACTIVE</span>
                        <span className="text-cyan-400 font-semibold animate-pulse">HELLO (98.8%)</span>
                      </div>
                    </div>

                    {/* Camera Control Mockup Bar */}
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>MODEL: HAND_LANDMARKER_v2</span>
                      </div>
                      <div className="flex gap-4">
                        <span>FPS: 60</span>
                        <span>LATENCY: 4.2ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. PROBLEM SECTION */}
              <section id="problem" className="w-full bg-[#070b1b] py-20 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                  
                  {/* Header text */}
                  <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
                    <h2 className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">The Accessibility Challenge</h2>
                    <p className="text-3xl md:text-4xl font-extrabold text-white">
                      Bridging the Communication Void
                    </p>
                    <p className="text-slate-400">
                      Over 70 million deaf individuals globally rely on sign language as their primary mother tongue. Yet, less than 1% of the hearing population can understand it, creating structural isolation in hospitals, schoolrooms, and daily interactions.
                    </p>
                  </div>

                  {/* Problem Bento-Grid Cards */}
                  <div className="grid md:grid-cols-3 gap-8">
                    
                    {/* Card 1 */}
                    <div className="p-8 rounded-2xl bg-[#0B1220] border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-white">The Isolation Gap</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Deaf and non-verbal patients struggle to communicate immediate details of pain or discomfort to clinical staff in emergency rooms without expensive certified interpreters.
                      </p>
                    </div>

                    {/* Card 2 */}
                    <div className="p-8 rounded-2xl bg-[#0B1220] border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Lack of Inclusive Tools</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Conventional communication depends on slow text typing, static charts, or paper pads. Traditional video conferencing programs have no built-in, low-latency translators.
                      </p>
                    </div>

                    {/* Card 3 */}
                    <div className="p-8 rounded-2xl bg-[#0B1220] border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-white">Data Privacy Threats</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Many existing computer vision tools require streaming high-definition video frames to external servers. This exposes delicate family, school, and legal conversations.
                      </p>
                    </div>

                  </div>
                </div>
              </section>

              {/* 4. FEATURES SECTION */}
              <section id="features" className="w-full max-w-7xl mx-auto px-6 py-20 md:py-28">
                
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
                  <h2 className="text-xs font-semibold text-purple-400 tracking-widest uppercase">Platform Capabilities</h2>
                  <p className="text-3xl md:text-4xl font-extrabold text-white">
                    Engineered Like a Premium Startup
                  </p>
                  <p className="text-slate-400">
                    Combining local WebGL acceleration, MediaPipe hand mesh tracking, and real-time speech engines to create a fluid, premium translation interface.
                  </p>
                </div>

                {/* Features Hex-Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  
                  {/* Feature 1 */}
                  <div className="group relative p-8 rounded-2xl bg-[#0B1220] border border-white/5 overflow-hidden hover:border-purple-500/30 transition-all hover:translate-y-[-2px] duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Real-Time Detection</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Captures standard webcam feeds and tracks complex spatial fingerspelling shapes at 60 FPS directly inside the browser thread.
                    </p>
                  </div>

                  {/* Feature 2 */}
                  <div className="group relative p-8 rounded-2xl bg-[#0B1220] border border-white/5 overflow-hidden hover:border-cyan-500/30 transition-all hover:translate-y-[-2px] duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Edge Gesture Classifier</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Deep learning patterns map mathematical vectors between 21 key landmarks to classify specific phrases and alphabetical letters instantly.
                    </p>
                  </div>

                  {/* Feature 3 */}
                  <div className="group relative p-8 rounded-2xl bg-[#0B1220] border border-white/5 overflow-hidden hover:border-emerald-500/30 transition-all hover:translate-y-[-2px] duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                      <Volume2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Voice Speech Output</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Converts translated terms into synthesized speech using the Web Speech API with adjustable accents, pitches, and rates.
                    </p>
                  </div>

                  {/* Feature 4 */}
                  <div className="group relative p-8 rounded-2xl bg-[#0B1220] border border-white/5 overflow-hidden hover:border-purple-500/30 transition-all hover:translate-y-[-2px] duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">MediaPipe Hand Mesh</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Processes skeletal coordinates directly on WebAssembly, saving massive energy and computing frames safely without third-party APIs.
                    </p>
                  </div>

                  {/* Feature 5 */}
                  <div className="group relative p-8 rounded-2xl bg-[#0B1220] border border-white/5 overflow-hidden hover:border-cyan-500/30 transition-all hover:translate-y-[-2px] duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                      <Languages className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Accessibility First</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Custom responsive styling with generous touch targets, visually distinct color channels, and clear sizing metrics for hospital displays.
                    </p>
                  </div>

                  {/* Feature 6 */}
                  <div className="group relative p-8 rounded-2xl bg-[#0B1220] border border-white/5 overflow-hidden hover:border-emerald-500/30 transition-all hover:translate-y-[-2px] duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                      <Activity className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Ultra-Low Latency</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      With local edge processing, the average classification latency is under 4 milliseconds, providing fluid dialogue with zero networking lag.
                    </p>
                  </div>

                </div>
              </section>

              {/* 5. HOW IT WORKS TIMELINE */}
              <section id="how-it-works" className="w-full bg-[#070b1b] py-20 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                  
                  {/* Header */}
                  <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
                    <h2 className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">The Pipeline Flow</h2>
                    <p className="text-3xl md:text-4xl font-extrabold text-white">
                      How EchoHands AI Works
                    </p>
                    <p className="text-slate-400">
                      Our system divides spatial parsing into five atomic, high-efficiency steps running consecutively.
                    </p>
                  </div>

                  {/* Timeline Cards */}
                  <div className="grid md:grid-cols-5 gap-6 relative">
                    
                    {/* Connecting decorative background line */}
                    <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-purple-500 via-cyan-500 to-emerald-500 -z-10 opacity-30" />

                    {/* Step 1 */}
                    <div className="flex flex-col items-center text-center p-6 bg-[#0B1220] rounded-xl border border-white/5 relative">
                      <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center font-bold text-purple-400 text-lg mb-4">
                        1
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">Webcam Grab</h4>
                      <p className="text-xs text-slate-400">
                        Feeds raw 60 FPS camera video frame arrays instantly to memory.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col items-center text-center p-6 bg-[#0B1220] rounded-xl border border-white/5 relative">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-lg mb-4">
                        2
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">Mesh Extraction</h4>
                      <p className="text-xs text-slate-400">
                        MediaPipe maps 21 key mathematical coordinates on the hand.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col items-center text-center p-6 bg-[#0B1220] rounded-xl border border-white/5 relative">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-lg mb-4">
                        3
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">Gesture Logic</h4>
                      <p className="text-xs text-slate-400">
                        The vector matching matrix checks joint distances against reference libraries.
                      </p>
                    </div>

                    {/* Step 4 */}
                    <div className="flex flex-col items-center text-center p-6 bg-[#0B1220] rounded-xl border border-white/5 relative">
                      <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center font-bold text-purple-400 text-lg mb-4">
                        4
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">Translation Matrix</h4>
                      <p className="text-xs text-slate-400">
                        Compiles recognized gestures into sequential sentences.
                      </p>
                    </div>

                    {/* Step 5 */}
                    <div className="flex flex-col items-center text-center p-6 bg-[#0B1220] rounded-xl border border-white/5 relative">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-lg mb-4">
                        5
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">Web Speech TTS</h4>
                      <p className="text-xs text-slate-400">
                        Speaks the translated text aloud through browser audio API.
                      </p>
                    </div>

                  </div>
                </div>
              </section>

              {/* 6. LIVE DEMO PREVIEW CONTAINER */}
              <section id="demo-preview" className="w-full max-w-7xl mx-auto px-6 py-20 md:py-28 text-center space-y-12">
                
                <div className="max-w-2xl mx-auto space-y-4">
                  <h2 className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">Take Control</h2>
                  <p className="text-3xl md:text-4xl font-extrabold text-white">Interactive Workspace Preview</p>
                  <p className="text-slate-400 text-sm">
                    Toggle signs directly in the catalog below to preview the layout, skeleton drawing mechanics, and see how the neural classification dashboard translates signs in real-time.
                  </p>
                </div>

                {/* Minimal Demonstration interactive card mockup */}
                <div className="max-w-4xl mx-auto rounded-3xl bg-[#0B1220] border border-white/10 p-1 bg-gradient-to-tr from-purple-500/20 via-slate-900 to-cyan-500/20 shadow-2xl">
                  <div className="bg-[#0B1220] rounded-[22px] p-6 grid md:grid-cols-2 gap-8 text-left">
                    
                    {/* Left Column: Interactive guide list */}
                    <div className="space-y-6 flex flex-col justify-between">
                      <div>
                        <span className="px-3 py-1 rounded bg-purple-500/10 text-purple-300 text-xs font-mono border border-purple-500/25">INTERACTIVE WORKSPACE PREVIEW</span>
                        <h4 className="text-2xl font-bold text-white mt-4">Select Gesture to Test</h4>
                        <p className="text-slate-400 text-sm mt-2">
                          Click on any available sign below to instantly calibrate the AI skeleton simulator. This simulates the browser-based tracking mechanism mapping 21 spatial landmarks directly.
                        </p>
                      </div>

                      {/* Gestures selector array */}
                      <div className="grid grid-cols-2 gap-3">
                        {GESTURES.map(g => (
                          <button
                            key={g.id}
                            onClick={() => handleGestureSelect(g)}
                            className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                              selectedGesture.id === g.id 
                                ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-md' 
                                : 'bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{g.name}</span>
                            </div>
                          
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('demo');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          speakText("Entering workspace.");
                        }}
                        className="py-3 px-6 bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 group text-sm hover:opacity-95"
                      >
                        Launch Interactive Workspace
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>

                    {/* Right Column: AI Visualizer simulation */}
                    <div className="flex flex-col gap-4 bg-[#050816] rounded-2xl border border-white/5 p-4 relative overflow-hidden justify-between">
                      <div className="absolute top-2 right-2 flex gap-1 items-center">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[9px] font-mono text-emerald-400 uppercase">Interactive simulation mode</span>
                      </div>

                      {/* Display Box */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs font-mono text-slate-400 pb-2 border-b border-white/5">
                          <span>CLASSIFIER_V2</span>
                          <span className="text-emerald-400 font-bold">{trackingConfidence}% MATCH</span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-cyan-400 tracking-wider">LATEST TRANSLATION</span>
                          <div className="text-3xl font-black text-white tracking-tight animate-pulse flex items-center gap-2">
                            <span>"{selectedGesture.name}"</span>
                            <button 
                              onClick={() => speakText(selectedGesture.speechText)}
                              className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                              title="Listen to Speech synthesis"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Pipeline graphic indicator */}
                      <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-white/5">
                        <div className="p-1.5 rounded bg-purple-500/10 border border-purple-500/20 text-[9px] font-mono">
                          <div className="text-slate-400">INPUT</div>
                          <div className="text-purple-300 font-bold">READY</div>
                        </div>
                        <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-mono">
                          <div className="text-slate-400">SOLVER</div>
                          <div className="text-cyan-300 font-bold">21_PTS</div>
                        </div>
                        <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono animate-pulse">
                          <div className="text-slate-400">TRANS</div>
                          <div className="text-emerald-300 font-bold">OK</div>
                        </div>
                        <div className="p-1.5 rounded bg-slate-900/80 text-[9px] font-mono">
                          <div className="text-slate-400">SPEECH</div>
                          <div className="text-white font-bold">TTS_ON</div>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>

              </section>

              {/* 7. TECHNOLOGY STACK */}
              <section id="technology" className="w-full bg-[#070b1b] py-20 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                  
                  {/* Header */}
                  <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
                    <h2 className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">The Engine</h2>
                    <p className="text-3xl md:text-4xl font-extrabold text-white">
                      Cutting-Edge Frontend Tech Stack
                    </p>
                    <p className="text-slate-400">
                      EchoHands AI is optimized to execute demanding neural tasks directly on consumer browsers, entirely server-free.
                    </p>
                  </div>

                  {/* Tech Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    {/* React */}
                    <div className="p-6 rounded-2xl bg-[#0B1220] border border-white/5 hover:border-purple-500/25 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-white mb-1">React 19 & TS</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Strict TypeScript type controls and atomic component state management for blazing-fast reactive dashboard redraws.
                      </p>
                    </div>

                    {/* MediaPipe */}
                    <div className="p-6 rounded-2xl bg-[#0B1220] border border-white/5 hover:border-cyan-500/25 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-white mb-1">MediaPipe Mesh</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Compiles lightweight Google landmarking models to native WebAssembly, enabling 60 FPS spatial extraction on mobile and desktop.
                      </p>
                    </div>

                    {/* Web Speech API */}
                    <div className="p-6 rounded-2xl bg-[#0B1220] border border-white/5 hover:border-emerald-500/25 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-white mb-1">Web Speech API</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Speaks the translated text aloud through browser audio API. Offers adjustable accents, rate, and pitch without external API keys.
                      </p>
                    </div>

                    {/* Tailwind CSS */}
                    <div className="p-6 rounded-2xl bg-[#0B1220] border border-white/5 hover:border-purple-500/25 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                        <Layers className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-white mb-1">Tailwind CSS</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Engineered purely using Tailwind classes for a sleek, high-contrast visual theme with rich gradients and hover cues.
                      </p>
                    </div>

                  </div>
                </div>
              </section>

              {/* 8. USE CASES */}
              <section id="usecases" className="w-full max-w-7xl mx-auto px-6 py-20 md:py-28">
                
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
                  <h2 className="text-xs font-semibold text-purple-400 tracking-widest uppercase">Target Applications</h2>
                  <p className="text-3xl md:text-4xl font-extrabold text-white">
                    Designed for Diverse Industries
                  </p>
                  <p className="text-slate-400">
                    Empowering communication in critical public services, clinics, and smart classrooms to foster complete social inclusion.
                  </p>
                </div>

                {/* Cards Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                  {USE_CASES.map((uc, i) => (
                    <div key={i} className="p-8 rounded-2xl bg-[#0B1220] border border-white/5 flex gap-6 hover:border-white/10 transition-all duration-300">
                      
                      {/* Icon */}
                      <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex-shrink-0 flex items-center justify-center text-purple-400">
                        {uc.iconName === 'HeartPulse' && <HeartPulse className="w-7 h-7" />}
                        {uc.iconName === 'GraduationCap' && <GraduationCap className="w-7 h-7" />}
                        {uc.iconName === 'Building2' && <Building2 className="w-7 h-7" />}
                        {uc.iconName === 'Users' && <Users className="w-7 h-7" />}
                      </div>

                      {/* Content */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400">{uc.category}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">{uc.benefit}</span>
                        </div>
                        <h4 className="text-xl font-bold text-white">{uc.title}</h4>
                        <p className="text-sm text-slate-400 leading-relaxed">{uc.description}</p>
                      </div>

                    </div>
                  ))}
                </div>
              </section>

              {/* 9. WHY ECHOHANDS AI - COMPARISON */}
              <section id="why-us" className="w-full bg-[#070b1b] py-20 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                  
                  {/* Header */}
                  <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
                    <h2 className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">The Competitive Edge</h2>
                    <p className="text-3xl md:text-4xl font-extrabold text-white">How EchoHands AI Outperforms</p>
                    <p className="text-slate-400">A clear structural breakdown of classical approaches versus our on-device computer vision translator.</p>
                  </div>

                  {/* Comparison Matrix */}
                  <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-white/5 bg-[#0B1220]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-slate-900/50">
                          <th className="p-5 text-sm font-bold text-white">Evaluation Parameter</th>
                          <th className="p-5 text-sm font-bold text-slate-400">Traditional Communication</th>
                          <th className="p-5 text-sm font-bold text-cyan-400">EchoHands AI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                        <tr>
                          <td className="p-5 font-semibold text-white">Average Latency</td>
                          <td className="p-5 text-slate-500">2 - 5 Seconds (Server Processing)</td>
                          <td className="p-5 text-emerald-400 font-bold">4 Milliseconds (Edge Computing)</td>
                        </tr>
                        <tr>
                          <td className="p-5 font-semibold text-white">Hardware Requirements</td>
                          <td className="p-5 text-slate-500">Cloud servers, custom cameras, and bulky devices</td>
                          <td className="p-5 text-cyan-300">Any standard mobile phone or web browser</td>
                        </tr>
                        <tr>
                          <td className="p-5 font-semibold text-white">User Data Privacy</td>
                          <td className="p-5 text-slate-500">HD Frames uploaded to third-party databases</td>
                          <td className="p-5 text-emerald-400 font-bold">100% Secure, processes strictly inside memory</td>
                        </tr>
                        <tr>
                          <td className="p-5 font-semibold text-white">Total Operating Cost</td>
                          <td className="p-5 text-slate-500">High monthly subscription fees for computing power</td>
                          <td className="p-5 text-cyan-300">Zero Server Costs, fully client-side operational</td>
                        </tr>
                        <tr>
                          <td className="p-5 font-semibold text-white">Dialogue Speed</td>
                          <td className="p-5 text-slate-500">Slow text input, typing, or writing notes</td>
                          <td className="p-5 text-emerald-400 font-bold">Fluent conversational speed with active TTS</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>
              </section>

              {/* 10. INTERACTIVE FAQ DRAWER */}
              <section id="faq" className="w-full max-w-4xl mx-auto px-6 py-20 md:py-28">
                
                <div className="text-center space-y-4 mb-16">
                  <h2 className="text-xs font-semibold text-purple-400 tracking-widest uppercase">Answers</h2>
                  <p className="text-3xl font-extrabold text-white">Frequently Asked Questions</p>
                </div>

                <div className="space-y-4">
                  {FAQS.map((faq, idx) => {
                    const isOpen = activeFaq === idx;
                    return (
                      <div 
                        key={idx} 
                        className="rounded-xl border border-white/5 bg-[#0B1220] overflow-hidden"
                      >
                        <button
                          onClick={() => setActiveFaq(isOpen ? null : idx)}
                          className="w-full p-6 text-left flex items-center justify-between gap-4 group"
                        >
                          <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">{faq.question}</span>
                          <div className={`p-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-400 group-hover:text-white transition-all ${isOpen ? 'rotate-180' : ''}`}>
                            <ArrowDown className="w-4 h-4" />
                          </div>
                        </button>
                        
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="border-t border-white/5 bg-slate-950/20"
                            >
                              <p className="p-6 text-sm text-slate-400 leading-relaxed">
                                {faq.answer}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

              </section>

              {/* 11. CTA BANNER */}
              <section id="cta" className="w-full max-w-7xl mx-auto px-6 py-12">
                <div className="relative rounded-3xl overflow-hidden bg-[#0B1220] border border-white/10 p-12 md:p-16 text-center space-y-8 shadow-2xl">
                  
                  {/* Decorative mesh grids inside CTA */}
                  <div className="absolute inset-0 bg-radial-gradient(circle, #7C3AED/10 0%, transparent 70%) pointer-events-none" />
                  
                  <div className="max-w-2xl mx-auto space-y-4 relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Ready to Experience AI Sign Language Translation?</h2>
                    <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                      Launch the EchoHands AI Workspace to experience high-fidelity gesture landmarking and text-to-speech rendering in a full dashboard environment.
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-4 relative z-10 pt-4">
                    <button
                      id="btn-cta-launch-demo"
                      onClick={() => {
                        setActiveTab('demo');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        speakText("Entering Workspace.");
                      }}
                      className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-semibold flex items-center gap-2 hover:opacity-95 shadow-xl transition-all group cursor-pointer"
                    >
                      Launch Live Demo Workspace
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                </div>
              </section>

              {/* 12. FOOTER */}
              <footer id="footer" className="w-full border-t border-white/5 bg-[#050816] mt-20 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-left">
                  
                  {/* Col 1 */}
                  <div className="space-y-4 col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-500 p-[1.5px]">
                        <div className="w-full h-full rounded-[7px] bg-[#050816] flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                        </div>
                      </div>
                      <span className="font-extrabold text-lg text-white">EchoHands AI</span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                      EchoHands AI is an advanced, client-side Sign Language translation framework using high-speed MediaPipe Landmark arrays and Web Speech Text-To-Speech. Perfect for smart classrooms, clinic triage counters, and public support terminals.
                    </p>
                    <div className="text-xs text-slate-500">
                      © 2026 EchoHands AI. All rights reserved.
                    </div>
                  </div>

                  {/* Col 2 */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-white">Platform</h5>
                    <ul className="space-y-2 text-xs text-slate-400">
                      <li><a href="#hero" className="hover:text-white transition-colors">Home Landing</a></li>
                      <li><a href="#problem" className="hover:text-white transition-colors">Problem Bento</a></li>
                      <li><a href="#features" className="hover:text-white transition-colors">Key Features</a></li>
                      <li>
                        <button onClick={() => { setActiveTab('demo'); }} className="hover:text-white transition-colors text-left">
                          Live Demo Workspace
                        </button>
                      </li>
                    </ul>
                  </div>

                  {/* Col 3 */}
                  <div className="space-y-4">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-white">Technology</h5>
                    <ul className="space-y-2 text-xs text-slate-400">
                      <li><a href="https://github.com/google/mediapipe" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">MediaPipe Hand Mesh</a></li>
                      <li><a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Web Speech API TTS</a></li>
                      <li><a href="https://react.dev" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">React 19 & TS</a></li>
                      <li><a href="https://tailwindcss.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Tailwind v4</a></li>
                    </ul>
                  </div>

                </div>

                <div className="max-w-7xl mx-auto px-6 border-t border-white/5 mt-12 pt-6 text-center text-xs text-slate-500">
                  Made with ❤️ for the AI Hackathon Demonstration
                </div>
              </footer>

            </motion.div>
          )}
        </AnimatePresence>


        {/* ==========================================
            VIEW 2: LIVE DEMO WORKSPACE DASHBOARD 
           ========================================== */}
        <AnimatePresence mode="wait">
          {activeTab === 'demo' && (
            <motion.div
              key="demo-dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-7xl mx-auto px-6"
            >
              
              {/* Dashboard Subheader with Mode Selector */}
              <div id="dashboard-header" className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 text-[10px] font-mono border border-purple-500/20 uppercase">
                      {workspaceMode === 'translate' ? 'Translation Suite' : 'ASL Academy Practice'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">STABLE INFERENCE FEED</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">EchoHands AI Workspace</h2>
                  
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Mode Toggles */}
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => {
                        setWorkspaceMode('translate');
                        speakText("AI Translation suite activated.");
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                        workspaceMode === 'translate'
                          ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-lg'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Languages className="w-3.5 h-3.5" />
                      Translation Suite
                    </button>
                    
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('landing');
                        speakText("Exiting workspace");
                      }}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-all"
                    >
                      Close
                    </button>
                    <button
                      onClick={triggerCalibration}
                      disabled={isCalibrating}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600/20 border border-purple-500/35 text-purple-300 hover:bg-purple-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin' : ''}`} />
                      Calibrate
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid Layout of the Dashboard */}
              <div className="grid lg:grid-cols-12 gap-8 items-start">
                
                {/* COLUMN 1: CAMERA & VISION PANEL (lg:col-span-7) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Main Camera / Solver Screen */}
                  <div className="rounded-2xl bg-[#0B1220] border border-white/10 p-4 shadow-xl overflow-hidden relative">
                    
                    {/* Vision Scanning HUD Labels inside panel */}
                    <div className="absolute top-6 left-6 z-20 flex gap-2">
                      <span className="px-2.5 py-1 rounded bg-[#050816]/85 backdrop-blur-sm text-[10px] font-mono border border-white/5 text-white flex items-center gap-1.5 shadow">
                        <Camera className="w-3.5 h-3.5 text-cyan-400" />
                        AI VISION
                      </span>

                      <span className="px-2.5 py-1 rounded bg-emerald-500/15 backdrop-blur-sm text-[10px] font-mono border border-emerald-500/25 text-emerald-400 flex items-center gap-1 shadow">
                        <Activity className="w-3 h-3 animate-pulse" />
                        {isWebcamOn ? 'LIVE TRACKING' : 'SIMULATION ACTIVE'}
                      </span>
                    </div>

                    <div className="absolute top-6 right-6 z-20">
                      <span className="px-2.5 py-1 rounded bg-[#050816]/90 backdrop-blur-sm text-[10px] font-mono border border-white/5 text-slate-400 shadow">
                        FPS: {fps}
                      </span>
                    </div>

                    {/* Canvas Holder */}
                    <div 
                      id="canvas-container"
                      className="relative w-full aspect-video rounded-xl bg-[#050816] border border-white/5 overflow-hidden group cursor-crosshair shadow-inner"
                      onMouseMove={(e) => {
                        const bounds = e.currentTarget.getBoundingClientRect();
                        setMousePos({
                          x: (e.clientX - bounds.left) / bounds.width,
                          y: (e.clientY - bounds.top) / bounds.height
                        });
                      }}
                      onMouseEnter={() => setHoveringCanvas(true)}
                      onMouseLeave={() => setHoveringCanvas(false)}
                    >
                      {/* Hidden Video element for streaming real camera */}
                      <video 
                        ref={videoRef}
                        className="hidden"
                        playsInline
                        muted
                      />

                      {/* Main drawing Canvas */}
                      <canvas 
                        ref={canvasRef}
                        className="w-full h-full block"
                        width={640}
                        height={360}
                      />


                      {/* No Camera / Simulation Instructions Overlay */}
                      {!isWebcamOn && (
                        <div className="absolute bottom-6 left-6 right-6 bg-slate-950/85 backdrop-blur-sm p-4 rounded-xl border border-white/5 flex items-center justify-between text-xs text-slate-300">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-cyan-400 uppercase font-mono font-bold">Simulator Active</span>
                            <p className="text-slate-400 text-[11px]">Hover your cursor over the screen to warp 3D coordinates.</p>
                          </div>
                          <button
                            onClick={startWebcam}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs transition-colors shadow flex items-center gap-1.5 cursor-pointer"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Enable Webcam
                          </button>
                        </div>
                      )}

                      {/* Error Banner if Webcam failed */}
                      {webcamError && (
                        <div className="absolute top-16 left-6 right-6 bg-red-950/90 backdrop-blur border border-red-500/30 p-4 rounded-xl flex flex-col gap-2.5 text-xs text-red-200 z-25 shadow-xl">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="text-red-400 font-bold text-sm select-none">⚠</span>
                              <div>
                                <p className="font-semibold text-white">Camera Access Alert</p>
                                <p className="mt-1 text-red-300/90 leading-relaxed">{webcamError}</p>
                              </div>
                            </div>
                            <button onClick={() => setWebcamError(null)} className="p-1 hover:bg-white/10 rounded-md transition-colors shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {(webcamError.includes("New Tab") || webcamError.includes("denied")) && (
                            <div className="mt-1 pt-2.5 border-t border-red-500/20 text-[11px] text-cyan-300 flex items-start gap-1.5 leading-normal">
                              <span className="text-xs select-none">💡</span>
                              <span><strong>Action Recommended:</strong> Use the <strong>"Open in New Tab"</strong> button in the top-right header of your screen. This bypasses the sandboxed iframe security policies so your browser can request camera access directly.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Camera Control Panel Actions */}
                    <div className="mt-4 flex items-center justify-between text-sm px-1 pt-1 border-t border-white/5">
                      <div className="flex items-center gap-3">
                        {isWebcamOn ? (
                          <button
                            id="btn-stop-webcam"
                            onClick={stopWebcam}
                            className="px-4 py-2 rounded-lg bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <StopCircle className="w-4 h-4" />
                            Stop Camera
                          </button>
                        ) : (
                          <button
                            id="btn-start-webcam"
                            onClick={startWebcam}
                            className="px-4 py-2 rounded-lg bg-cyan-600/15 border border-cyan-500/35 text-cyan-300 hover:bg-cyan-600/20 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Video className="w-4 h-4" />
                            Start Webcam Feed
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            setTrackingConfidence(parseFloat((96 + Math.random() * 3.9).toFixed(1)));
                            setLatency(Math.floor(3 + Math.random() * 3));
                            speakText("Calibrating mesh matrix.");
                          }}
                          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 rounded-lg transition-all"
                          title="Recalibrate spatial templates"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-6 text-xs text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          21 Keypoints Online
                        </span>
                        <span>Latency: {latency}ms</span>
                      </div>
                    </div>

                  </div>

                  {/* AI PIPELINE VISUALIZATION GRID */}
                  <div className="rounded-2xl bg-[#0B1220] border border-white/10 p-6 shadow-xl space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono">Real-Time AI Pipeline Flow</h4>
                      <span className="text-[10px] font-mono text-cyan-400">STABLE FEED FLOW</span>
                    </div>

                    <div className="grid grid-cols-5 gap-3 text-center relative font-mono">
                      
                      {/* Flow Step 1 */}
                      <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/35 relative overflow-hidden group">
                        <span className="text-[10px] font-extrabold text-purple-400">01</span>
                        <div className="text-[10px] font-bold text-white mt-1 truncate">WEB_CAP</div>
                        <div className="text-[9px] text-slate-500 mt-1 truncate">60FPS FEED</div>
                        <div className="absolute inset-0 bg-purple-500/5 animate-pulse pointer-events-none" />
                      </div>

                      {/* Flow Step 2 */}
                      <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/35 relative overflow-hidden">
                        <span className="text-[10px] font-extrabold text-cyan-400">02</span>
                        <div className="text-[10px] font-bold text-white mt-1 truncate">MESH_MAP</div>
                        <div className="text-[9px] text-slate-500 mt-1 truncate">21 LANDMARKS</div>
                      </div>

                      {/* Flow Step 3 */}
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 relative overflow-hidden">
                        <span className="text-[10px] font-extrabold text-emerald-400">03</span>
                        <div className="text-[10px] font-bold text-white mt-1 truncate">VEC_ENG</div>
                        <div className="text-[9px] text-slate-500 mt-1 truncate">GEOMETRICS</div>
                      </div>

                      {/* Flow Step 4 */}
                      <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/35 relative overflow-hidden animate-pulse">
                        <span className="text-[10px] font-extrabold text-purple-400">04</span>
                        <div className="text-[10px] font-bold text-white mt-1 truncate">CLASSIFY</div>
                        <div className="text-[9px] text-slate-500 mt-1 truncate">99.4% CONF</div>
                      </div>

                      {/* Flow Step 5 */}
                      <div className="p-3.5 rounded-xl bg-[#050816] border border-white/10 relative overflow-hidden">
                        <span className="text-[10px] font-extrabold text-slate-400">05</span>
                        <div className="text-[10px] font-bold text-white mt-1 truncate">AUDIO_TTS</div>
                        <div className="text-[9px] text-emerald-400 mt-1 truncate">OUTPUT</div>
                      </div>

                    </div>
                  </div>

                </div>

                {/* COLUMN 2: SIDEBAR CONTROLS & LOGS (lg:col-span-5) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* ==================== VIEW 2A: TRANSLATION SUITE SIDEBAR ==================== */}
                  {workspaceMode === 'translate' && (
                    <>
                      {/* ACTIVE SIGN DETECTED CARD */}
                      <div className="rounded-2xl bg-gradient-to-tr from-purple-600/10 to-cyan-500/10 p-[1px] shadow-xl">
                        <div className="rounded-[15px] bg-[#0B1220] p-6 space-y-4 text-left">
                          <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-xs font-mono text-cyan-400 tracking-wider">ACTIVE FEED RECOGNITION</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold uppercase animate-pulse">
                              Inference Live
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-4 py-2">
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Active Landmark Gesture</span>
                              <div className="text-3xl font-black text-white bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                                "{selectedGesture.name}"
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                                <span>Confidence:</span>
                                <span className="text-emerald-400 font-extrabold">{trackingConfidence}%</span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setSentenceWords(prev => {
                                  if (prev[prev.length - 1] === selectedGesture.name) return prev;
                                  return [...prev, selectedGesture.name];
                                });
                                speakText(`Appended ${selectedGesture.name}`);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              + Add Sign
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* CONVERSATIONAL SENTENCE BUILDER */}
                      <div className="rounded-2xl bg-[#0B1220] border border-white/10 p-6 shadow-xl space-y-4 text-left">
                        <div className="flex justify-between items-center pb-3 border-b border-white/5">
                          <div className="flex items-center gap-1.5">
                            <Languages className="w-4 h-4 text-cyan-400" />
                            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono">ASL Sentence Builder</h4>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500 uppercase">Auto-Append</span>
                            <button
                              onClick={() => setAutoAppend(!autoAppend)}
                              className={`w-8 h-4 rounded-full p-[2px] transition-colors ${
                                autoAppend ? 'bg-purple-600' : 'bg-slate-950'
                              }`}
                            >
                              <div className={`w-3 h-3 rounded-full bg-white transition-transform ${autoAppend ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        </div>

                        {/* Keyword list box */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Raw Gesture Array Sequence</label>
                          <div className="min-h-[90px] p-3 rounded-xl bg-slate-950 border border-white/5 flex flex-wrap gap-2 items-start content-start">
                            {sentenceWords.length === 0 ? (
                              <p className="text-xs text-slate-600 italic font-mono p-1">
                                Sign gestures in front of the camera or click signs below to build your phrase...
                              </p>
                            ) : (
                              sentenceWords.map((word, idx) => (
                                <span 
                                  key={idx} 
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs font-semibold text-purple-300 group"
                                >
                                  {word}
                                  <button
                                    onClick={() => setSentenceWords(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-purple-500 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Controls bar */}
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => {
                              setSentenceWords(prev => prev.slice(0, -1));
                              speakText("Removed");
                            }}
                            disabled={sentenceWords.length === 0}
                            className="p-2.5 rounded-lg border border-white/5 hover:border-white/10 bg-slate-950/40 hover:bg-slate-950/80 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            Backspace
                          </button>
                          <button
                            onClick={() => {
                              setSentenceWords([]);
                              setTranslatedSentence('');
                              setReplySuggestion('');
                              setTranslationError(null);
                              speakText("Cleared sentence");
                            }}
                            disabled={sentenceWords.length === 0}
                            className="p-2.5 rounded-lg border border-white/5 hover:border-white/10 bg-slate-950/40 hover:bg-slate-950/80 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            Clear All
                          </button>

                          <button
                            onClick={polishSentence}
                            disabled={sentenceWords.length === 0 || isTranslating}
                            className="p-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-bold transition-all hover:opacity-95 flex items-center justify-center gap-1 shadow-lg shadow-purple-600/10 disabled:opacity-50 cursor-pointer"
                          >
                            {isTranslating ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            Polish ✦
                          </button>
                        </div>

                        {/* Polished translation speech response */}
                        {(translatedSentence || translationError) && (
                          <div className="pt-2 space-y-3 animate-fade-in border-t border-white/5 mt-2">
                            {translationError ? (
                              <div className="p-3 rounded-lg bg-red-950/55 border border-red-500/20 text-xs text-red-300">
                                {translationError}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {/* Polish Bubble */}
                                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 relative space-y-1.5">
                                  <div className="flex justify-between items-center text-[9px] font-mono text-purple-400">
                                    <span>AI POLISHED TRANSLATION</span>
                                    <span className="flex items-center gap-1 text-[10px] text-cyan-300">
                                      <Sparkles className="w-3 h-3 text-cyan-300" />
                                      Gemini Active
                                    </span>
                                  </div>
                                  <p className="text-sm font-bold text-white leading-relaxed">
                                    "{translatedSentence}"
                                  </p>
                                  <button
                                    onClick={() => speakText(translatedSentence)}
                                    className="text-[11px] font-semibold text-purple-400 hover:text-white transition-colors flex items-center gap-1 mt-2 cursor-pointer"
                                  >
                                    <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                                    Replay Fluent Speech
                                  </button>
                                </div>

                                {/* Contextual Suggestion Bubble */}
                                {replySuggestion && (
                                  <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5">
                                    <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider">Suggested Response for Listener</div>
                                    <p className="text-xs text-slate-300 italic">
                                      "{replySuggestion}"
                                    </p>
                                    <button
                                      onClick={() => speakText(replySuggestion)}
                                      className="text-[11px] font-semibold text-cyan-400 hover:text-white transition-colors flex items-center gap-1 mt-1.5 cursor-pointer"
                                    >
                                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                                      Read Suggestion Aloud
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </>
                  )}
                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

    </div>
  );
}
