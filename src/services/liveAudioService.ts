import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { pcmToBase64 } from "./audioUtils";

declare global {
  interface Window {
    bcnSettings?: {
      root: string;
      nonce: string;
      geminiApiKey: string;
    };
  }
}

export interface LiveAudioCallbacks {
  apiKey: string;
  onAudioData: (base64: string) => void;
  onInterrupted: () => void;
  onTranscription: (text: string, isModel: boolean) => void;
  onTurnComplete?: () => void;
  onStatusChange: (status: 'connecting' | 'open' | 'closed' | 'error') => void;
  onToolCall?: (name: string, args: any) => Promise<any>;
}

export class LiveAudioService {
  private session: any = null;
  private ai: GoogleGenAI;
  private callbacks: LiveAudioCallbacks;

  constructor(callbacks: LiveAudioCallbacks) {
    this.ai = new GoogleGenAI({ apiKey: callbacks.apiKey });
    this.callbacks = callbacks;
  }

  async connect(systemInstruction: string, tools: any[]) {
    this.callbacks.onStatusChange('connecting');

    try {
      this.session = await this.ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction,
          tools,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            this.callbacks.onStatusChange('open');
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData) {
                  console.log("Live Audio: Received audio chunk from model");
                  this.callbacks.onAudioData(part.inlineData.data);
                }
                if (part.text) {
                  // This is the transcription of the model's speech
                  this.callbacks.onTranscription(part.text, true);
                }
              }
            }

            // Handle user transcription
            const inputTranscription = (message.serverContent as any)?.inputAudioTranscription;
            if (inputTranscription?.text) {
              this.callbacks.onTranscription(inputTranscription.text, false);
            }

            if (message.serverContent?.interrupted) {
              this.callbacks.onInterrupted();
            }

            if (message.serverContent?.turnComplete) {
              if (this.callbacks.onTurnComplete) {
                this.callbacks.onTurnComplete();
              }
            }

            if (message.toolCall) {
              for (const call of message.toolCall.functionCalls) {
                if (this.callbacks.onToolCall) {
                  const result = await this.callbacks.onToolCall(call.name, call.args);
                  this.session.sendToolResponse({
                    functionResponses: [{
                      name: call.name,
                      id: call.id,
                      response: { result }
                    }]
                  });
                }
              }
            }
          },
          onclose: () => {
            this.callbacks.onStatusChange('closed');
            this.session = null;
          },
          onerror: (error) => {
            console.error("Live Audio Error:", error);
            this.callbacks.onStatusChange('error');
          }
        }
      });
    } catch (error) {
      console.error("Failed to connect to Live API:", error);
      this.callbacks.onStatusChange('error');
    }
  }

  sendAudio(pcmData: Int16Array) {
    if (this.session) {
      this.session.sendRealtimeInput({
        audio: {
          data: pcmToBase64(pcmData),
          mimeType: 'audio/pcm;rate=16000'
        }
      });
    }
  }

  sendText(text: string) {
    if (this.session) {
      this.session.sendRealtimeInput({
        text
      });
    } else {
      console.warn("Cannot send text: No active session");
    }
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }
}
