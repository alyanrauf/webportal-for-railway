import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, MessageSquare, Sparkles } from 'lucide-react';
import { LiveAudioService } from '../services/liveAudioService';
import { floatTo16BitPCM, base64ToPCM, resample } from '../services/audioUtils';
import { getSystemInstruction, tools, executeToolAction, SalonSettings } from '../services/geminiService';

interface VoiceCallProps {
  settings: SalonSettings;
  onClose: () => void;
}

export const VoiceCall: React.FC<VoiceCallProps> = ({ settings, onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed' | 'error'>('closed');
  const [isMuted, setIsMuted] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveServiceRef = useRef<LiveAudioService | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const isBufferingRef = useRef(true);
  const BUFFER_THRESHOLD = 3; // Lowered from 12 to 3 for better responsiveness
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ringingToneRef = useRef<{ oscs: OscillatorNode[]; gain: GainNode } | null>(null);
  const greetingSentRef = useRef(false);
  const isProcessingQueueRef = useRef(false);
  const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const firstAudioReceivedRef = useRef(false);

  useEffect(() => {
    startCall();
    return () => {
      stopCall();
    };
  }, []);

  const playBeep = (frequency: number, duration: number, volume: number = 0.1) => {
    if (!audioContextRef.current) return;
    try {
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      gain.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.current.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);
      osc.start();
      osc.stop(audioContextRef.current.currentTime + duration);
    } catch (e) {
      console.error("Failed to play beep:", e);
    }
  };

  const startRingingTone = () => {
    if (!audioContextRef.current) return;
    try {
      const osc1 = audioContextRef.current.createOscillator();
      const osc2 = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();
      
      osc1.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
      osc2.frequency.setValueAtTime(480, audioContextRef.current.currentTime);
      
      gain.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      
      // Cadence: 2s on, 4s off
      const now = audioContextRef.current.currentTime;
      for (let i = 0; i < 20; i++) {
        const start = now + i * 6;
        gain.gain.setTargetAtTime(0.05, start, 0.1);
        gain.gain.setTargetAtTime(0, start + 2, 0.1);
      }
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioContextRef.current.destination);
      
      osc1.start();
      osc2.start();
      ringingToneRef.current = { oscs: [osc1, osc2], gain };
    } catch (e) {
      console.error("Failed to start ringing tone:", e);
    }
  };

  const stopRingingTone = () => {
    if (ringingToneRef.current) {
      try {
        ringingToneRef.current.oscs.forEach(osc => {
          osc.stop();
          osc.disconnect();
        });
        ringingToneRef.current.gain.disconnect();
      } catch (e) {}
      ringingToneRef.current = null;
    }
  };

  const startRepeatingBeep = () => {
    if (beepIntervalRef.current) return;
    
    const playSingleBeep = () => {
      if (firstAudioReceivedRef.current) {
        stopRepeatingBeep();
        return;
      }
      playBeep(800, 1.0, 0.05); // 1s beep at 800Hz
    };

    playSingleBeep(); // Start first beep immediately
    beepIntervalRef.current = setInterval(playSingleBeep, 2000); // Every 2s (1s on, 1s off)
  };

  const stopRepeatingBeep = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  };

  const startCall = async () => {
    try {
      // 1. Setup Audio Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext not supported in this browser");
      }
      audioContextRef.current = new AudioContextClass({
        sampleRate: 24000,
      });

      // Play ringing tone immediately
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      startRingingTone();

      // 2. Setup Live Service
      liveServiceRef.current = new LiveAudioService({
        apiKey: settings.geminiApiKey,
        onAudioData: (base64) => {
          // Stop repeating beep when first audio data arrives
          if (!firstAudioReceivedRef.current) {
            firstAudioReceivedRef.current = true;
            stopRepeatingBeep();
          }

          const pcm = base64ToPCM(base64);
          playbackQueueRef.current.push(pcm);
          
          // If we are buffering and reached the threshold, start playing
          if (isBufferingRef.current && playbackQueueRef.current.length >= BUFFER_THRESHOLD) {
            isBufferingRef.current = false;
            processPlaybackQueue();
          } else if (!isBufferingRef.current) {
            processPlaybackQueue();
          }
        },
        onInterrupted: () => {
          playbackQueueRef.current = [];
          isPlayingRef.current = false;
          isBufferingRef.current = true;
          isProcessingQueueRef.current = false;
          if (activeSourceRef.current) {
            try {
              activeSourceRef.current.stop();
            } catch (e) {
              // Ignore errors if already stopped
            }
            activeSourceRef.current = null;
          }
        },
        onTranscription: (_text, _isModel) => {
          // Transcription UI removed
        },
        onTurnComplete: () => {
          // If we are still buffering, start playing now because the turn is over
          if (isBufferingRef.current && playbackQueueRef.current.length > 0) {
            isBufferingRef.current = false;
            processPlaybackQueue();
          }
        },
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
          if (newStatus === 'open') {
            stopRingingTone();
            startRepeatingBeep(); // Start the 1s on/1s off beep until AI speaks
            playBeep(1000, 0.15, 0.1); // Call connected beep
            startMicrophone();
            if (!greetingSentRef.current) {
              // Prompt the model to start the conversation with a clear instruction
              // We use a slight timeout to ensure the session is ready for input
              setTimeout(() => {
                liveServiceRef.current?.sendText("Hi");
                greetingSentRef.current = true;
              }, 3000);
            }
          } else if (newStatus === 'error' || newStatus === 'closed') {
            stopRingingTone();
          }
        },
        onToolCall: async (name, args) => {
          console.log(`Voice Call Tool Execution: ${name}`, args);
          return await executeToolAction(name, args);
        }
      });

      const voiceSystemInstruction = `${getSystemInstruction(settings)}
      
      STRICT VOICE CALL RULES:
      - You are currently on a real-time voice call with a client.
      - NEVER output internal reasoning, planning, or thoughts. Speak ONLY the final response.
      - Do NOT use phrases like "Initiating the Connection" or "Initiating Reservation Inquiry".
      - Speak like a human receptionist: be warm, concise, and natural.
      - Use short, scannable sentences. Avoid reading long lists of information.
      - If you need to look something up (using a tool), tell the user: "Just a second, let me check that for you..." or "One moment while I look at our schedule..."
      - Use verbal fillers occasionally like "Mhm", "I see", or "Right" to sound more engaged.
      - Do NOT use markdown formatting in your speech (no asterisks or hashtags).
      - If the user is silent, you can gently ask if they are still there or if they need help with anything else.
      - YOUR FIRST TASK: When the call starts, you MUST greet the user immediately.
      - Do NOT wait for the user to speak first. As soon as you receive the 'User connected' signal, start the conversation yourself.
      `;

      await liveServiceRef.current.connect(voiceSystemInstruction, tools);
    } catch (error: any) {
      console.error("Failed to start call:", error);
      setStatus('error');
    }
  };

  const startMicrophone = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser does not support microphone access");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if (!audioContextRef.current) return;
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      // Processor will run at 24000Hz (context rate)
      // Increased buffer size to 8192 for better stability
      const processor = audioContextRef.current.createScriptProcessor(8192, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted) return;
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Local barge-in: stop playback if user speaks
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        if (rms > 0.025 && (isPlayingRef.current || playbackQueueRef.current.length > 0)) {
          // User is speaking, stop playback
          playbackQueueRef.current = [];
          if (activeSourceRef.current) {
            try { activeSourceRef.current.stop(); } catch(e) {}
            activeSourceRef.current = null;
          }
          isPlayingRef.current = false;
        }

        // Resample from context rate to 16000Hz for Gemini
        const resampledData = resample(inputData, audioContextRef.current!.sampleRate, 16000);
        const pcmData = floatTo16BitPCM(resampledData);
        liveServiceRef.current?.sendAudio(pcmData);
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
    } catch (error: any) {
      console.error("Microphone access denied:", error);
      setStatus('error');
      // Provide more specific feedback if possible
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        console.warn("Microphone permission was denied.");
      } else {
        console.warn(`Error accessing microphone: ${error.message}`);
      }
    }
  };

  const stopCall = () => {
    stopRingingTone();
    stopRepeatingBeep();
    playBeep(400, 0.2, 0.1); // End call beep
    liveServiceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(track => track.stop());
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    setStatus('closed');
  };

  const processPlaybackQueue = async () => {
    if (isProcessingQueueRef.current || playbackQueueRef.current.length === 0 || !audioContextRef.current) {
      // If queue is empty and we're not playing, set buffering back to true
      if (playbackQueueRef.current.length === 0 && !isPlayingRef.current) {
        isBufferingRef.current = true;
      }
      return;
    }

    isProcessingQueueRef.current = true;

    try {
      while (playbackQueueRef.current.length > 0 && audioContextRef.current) {
        isPlayingRef.current = true;
        const pcm = playbackQueueRef.current.shift()!;
        
        const float32 = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) {
          float32[i] = pcm[i] / 32768.0;
        }

        const buffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);

        const source = audioContextRef.current.createBufferSource();
        activeSourceRef.current = source;
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        
        await new Promise<void>((resolve) => {
          source.onended = () => {
            if (activeSourceRef.current === source) {
              activeSourceRef.current = null;
            }
            resolve();
          };
          source.start();
        });
      }
    } catch (e) {
      console.error("Error in playback queue:", e);
    } finally {
      isPlayingRef.current = false;
      isProcessingQueueRef.current = false;
      // Check if more data arrived while we were playing
      if (playbackQueueRef.current.length > 0) {
        processPlaybackQueue();
      } else {
        isBufferingRef.current = true;
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="bg-[#FAF9F6] w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-[#E5E5DF] flex flex-col">
        {/* Header */}
        <div className="bg-[#5A5A40] p-8 text-center text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <PhoneOff size={24} />
          </button>
          
          <div className="w-24 h-24 bg-white/10 rounded-full mx-auto flex items-center justify-center relative">
            <motion.div 
              animate={status === 'open' ? { scale: [1, 1.2, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-white/5 rounded-full"
            />
            <Sparkles size={40} className="text-[#D4AF37]" />
          </div>
        </div>

        {/* Transcriptions removed as per user request */}
        <div className="flex-1 p-6 min-h-[200px] flex flex-col items-center justify-center">
          <motion.div
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 4,
              ease: "easeInOut"
            }}
            className="w-40 h-40 rounded-full border-4 border-[#5A5A40]/10 flex items-center justify-center"
          >
            <div className="w-32 h-32 rounded-full bg-[#5A5A40]/5 flex items-center justify-center">
              <Volume2 size={48} className="text-[#5A5A40]/30" />
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="p-8 flex justify-center items-center gap-8 bg-white border-t border-[#E5E5DF]">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full transition-all ${
              isMuted ? 'bg-red-500 text-white' : 'bg-[#F0F0E8] text-[#5A5A40] hover:bg-[#E5E5DF]'
            }`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          <button 
            onClick={onClose}
            className="p-6 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all hover:scale-110"
          >
            <PhoneOff size={32} />
          </button>

          <button 
            className="p-4 bg-[#F0F0E8] text-[#5A5A40] rounded-full hover:bg-[#E5E5DF] transition-all"
          >
            <Volume2 size={24} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
