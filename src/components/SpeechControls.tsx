import { Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface SpeechControlsProps {
  onTranscript: (text: string) => void;
  isProcessing: boolean;
  autoSpeak: boolean;
  toggleAutoSpeak: () => void;
}

export const SpeechControls: React.FC<SpeechControlsProps> = ({ 
  onTranscript, 
  isProcessing,
  autoSpeak,
  toggleAutoSpeak
}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'nl-NL';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onTranscript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleListening}
        disabled={isProcessing}
        className={`p-4 rounded-full transition-all ${
          isListening 
            ? "bg-red-500 text-white animate-pulse" 
            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
        } disabled:opacity-50`}
        title={isListening ? "Stop met luisteren" : "Start met praten"}
      >
        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
      </button>

      <button
        onClick={toggleAutoSpeak}
        className={`p-4 rounded-full transition-all ${
          autoSpeak 
            ? "bg-indigo-500 text-white" 
            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
        }`}
        title={autoSpeak ? "Audio aan" : "Audio uit"}
      >
        {autoSpeak ? <Volume2 size={24} /> : <VolumeX size={24} />}
      </button>
    </div>
  );
};
