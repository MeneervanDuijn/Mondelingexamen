import { motion } from "motion/react";
import React from "react";

interface AvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  expression: "neutral" | "positive" | "serious";
  onStop?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({ isSpeaking, isListening, expression, onStop }) => {
  return (
    <div className="relative w-48 h-48 mx-auto">
      <div className="relative w-48 h-48 bg-slate-100 rounded-full border-4 border-slate-200 shadow-inner flex items-center justify-center overflow-hidden">
        {/* Face Base */}
        <div className="relative w-32 h-32 bg-slate-200 rounded-full flex flex-col items-center justify-center">
          {/* Eyes */}
          <div className="flex gap-8 mb-4">
            <motion.div 
              className="w-4 h-4 bg-slate-800 rounded-full"
              animate={{ 
                scaleY: [1, 0.1, 1],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 3, 
                times: [0, 0.1, 0.2] 
              }}
            />
            <motion.div 
              className="w-4 h-4 bg-slate-800 rounded-full"
              animate={{ 
                scaleY: [1, 0.1, 1],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 3, 
                times: [0, 0.1, 0.2] 
              }}
            />
          </div>

          {/* Mouth */}
          <motion.div 
            className="w-12 h-2 bg-slate-800 rounded-full"
            animate={isSpeaking ? {
              height: [4, 16, 4],
              borderRadius: ["50%", "10%", "50%"]
            } : {
              height: expression === "positive" ? 8 : 2,
              borderRadius: expression === "positive" ? "0 0 20px 20px" : "50%"
            }}
            transition={isSpeaking ? {
              repeat: Infinity,
              duration: 0.2
            } : {}}
          />

          {/* Listening Indicator */}
          {isListening && (
            <motion.div 
              className="absolute -bottom-2 w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          )}
        </div>

        {/* Head Nodding */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={isListening ? { y: [0, 5, 0] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      </div>

      {/* Stop Button */}
      {isSpeaking && onStop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onStop}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg hover:bg-red-600 transition-colors z-20"
        >
          STOP PRATEN
        </motion.button>
      )}
    </div>
  );
};
