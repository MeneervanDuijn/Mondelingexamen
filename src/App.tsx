import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ChevronRight, Download, GraduationCap, History, Play, Save, Send, User, Users } from 'lucide-react';
import { Avatar } from './components/Avatar';
import { SpeechControls } from './components/SpeechControls';
import { generateExamResponse, generateSpeech, analyzeFinalScore } from './services/geminiService';

type Phase = 'setup' | 'intro' | 'explanation' | 'case_selection' | 'discussion' | 'deepening' | 'conclusion' | 'result';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const DEFAULT_CASES = [
  { 
    id: 1, 
    title: "Medicijn tegen overgewicht in basispakket", 
    text: "Een ruime meerderheid van de Nederlanders is ervoor om nieuwe medicijnen tegen ernstig overgewicht te vergoeden uit het basispakket. Bijna 90 procent van de ondervraagden vindt dit een goed idee, zelfs als de premie omhoog gaat. Het Zorginstituut adviseerde vorig jaar echter om het nog niet te vergoeden vanwege de hoge kosten (tot 60 miljoen euro per jaar). Driekwart van de voorstanders wil wel voorwaarden stellen, zoals begeleiding door een specialist en eigen inspanning om af te vallen. Tegenstanders vinden dat ze niet hoeven te betalen voor overgewicht dat ze niet zelf hebben veroorzaakt." 
  },
  { 
    id: 2, 
    title: "Helmplicht op fatbikes en e-bikes", 
    text: "Vanaf 2027 moeten jongeren tot 18 jaar waarschijnlijk verplicht een helm op op een fatbike of e-bike. Het aantal slachtoffers met hersenletsel in deze leeftijdsgroep is de afgelopen jaren enorm toegenomen. De Tweede Kamer wilde eigenlijk alleen een helmplicht voor fatbikes, maar dat bleek juridisch onuitvoerbaar. Artsen waarschuwen al jaren dat de kans op ernstig letsel op een elektrische fiets twee keer zo groot is als op een gewone fiets." 
  },
  { 
    id: 3, 
    title: "Tekort bij Defensie", 
    text: "Het Nederlandse leger moet groter en sterker worden, maar de groei gaat langzaam. Er zijn genoeg aanmeldingen, maar er is een groot tekort aan opleidingsplekken, instructeurs en moderne kazernes. Naast militairen zijn er ook veel burgers nodig voor medische functies en logistiek. Sinds 2023 is er het 'dienjaar' om jongeren kennis te laten maken met het leger. Hoewel de opkomstplicht in 1997 is opgeschort, is iedereen tussen 17 en 45 jaar nog steeds dienstplichtig." 
  },
  { 
    id: 4, 
    title: "Gelijke betaling in de sport", 
    text: "Sportvrouwen verdienen nog steeds vaak minder dan sportmannen. Dit komt door een mix van factoren: mannen zijn vaak fysiek sterker, maar mannensport trekt ook meer publiek, sponsors en media-aandacht. Dit is een cirkel: minder media-aandacht betekent minder fans en dus minder geld. Ook seksisme speelt een rol; vrouwensport werd lang niet serieus genomen. Toch is er vooruitgang: bij het nationale vrouwenelftal in Nederland zijn de vergoedingen inmiddels gelijkgetrokken met die van de mannen." 
  },
  { 
    id: 5, 
    title: "Vakanties worden onbetaalbaar", 
    text: "Een op de zeven Nederlanders gaat zelden of nooit op vakantie omdat het te duur is geworden. In zes jaar tijd zijn de kosten met 30 procent gestegen. Veel mensen sparen hun vakantiegeld liever dan het uit te geven aan een reis die ze niet kunnen betalen. Er ontstaat een duidelijke kloof: wie het kan betalen reist vaker en luxer, wie weinig te besteden heeft blijft thuis of zoekt het dichter bij huis in Nederland, zoals in Zeeland of op de Veluwe." 
  }
];

export default function App() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [examMode, setExamMode] = useState<'short' | 'long'>('long');
  const [selectedCase, setSelectedCase] = useState<typeof DEFAULT_CASES[0] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [expression, setExpression] = useState<'neutral' | 'positive' | 'serious'>('neutral');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assessment, setAssessment] = useState<any>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === 'case_selection' && countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (phase === 'case_selection' && countdown === 0) {
      // Countdown finished
    }
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  const handleStart = async () => {
    if (!studentName || !studentClass) return;
    setPhase('intro');
    const introMsg = "Hoi! Ik ben je examinator. Hoe gaat het? Stel jezelf even kort voor.";
    setMessages([{ role: 'model', parts: [{ text: introMsg }] }]);
    if (autoSpeak) playAudio(introMsg);
  };

  const playAudio = async (text: string) => {
    try {
      setIsSpeaking(true);
      const base64Audio = await generateSpeech(text);
      if (base64Audio) {
        const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          audioRef.current.onended = () => setIsSpeaking(false);
        }
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("Audio error:", error);
      setIsSpeaking(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    
    const newMessages: Message[] = [...messages, { role: 'user', parts: [{ text }] }];
    setMessages(newMessages);
    setInputText('');
    setIsProcessing(true);

    try {
      const response = await generateExamResponse(
        messages, 
        text, 
        phase, 
        examMode,
        selectedCase?.text
      );
      
      if (response) {
        const updatedMessages: Message[] = [...newMessages, { role: 'model', parts: [{ text: response }] }];
        setMessages(updatedMessages);
        
        // Detect phase changes or feedback
        if (response.toLowerCase().includes("top:")) setExpression('positive');
        else if (response.toLowerCase().includes("tip:")) setExpression('serious');
        else setExpression('neutral');

        if (autoSpeak) await playAudio(response);

        // Logic to progress phases based on AI response or message count
        // Move to case selection much earlier (after intro response)
        if (phase === 'intro' && updatedMessages.length >= 2) {
          setPhase('case_selection');
          setCountdown(5);
        }
        
        // Discussion phase: 5 questions (approx 10 messages in this phase)
        // Total messages so far: intro(2) + case_select(1) + discussion(10) = 13
        if (phase === 'discussion' && updatedMessages.length >= 13) setPhase('deepening');
        
        // Deepening phase: 
        // Short: 2-3 questions (4-6 messages) -> Total ~20
        // Long: 5-6 questions (10-12 messages) -> Total ~26
        const resultThreshold = examMode === 'short' ? 20 : 26;
        if (phase === 'deepening' && updatedMessages.length >= resultThreshold) {
          setPhase('conclusion');
          const final = await analyzeFinalScore(updatedMessages);
          setAssessment(final);
          setPhase('result');
        }
      }
    } catch (error) {
      console.error("Gemini error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectCase = (c: typeof DEFAULT_CASES[0]) => {
    setSelectedCase(c);
    setPhase('discussion');
    const msg = `Je hebt gekozen voor: ${c.title}. Kun je in je eigen woorden vertellen waar dit over gaat?`;
    setMessages([...messages, { role: 'model', parts: [{ text: msg }] }]);
    if (autoSpeak) playAudio(msg);
  };

  const saveResult = async () => {
    if (!assessment) return;
    const resultData = {
      name: studentName,
      className: studentClass,
      caseNumber: selectedCase?.id,
      scores: assessment.scores,
      summary: assessment.summary,
      tops: assessment.tops,
      tips: assessment.tips,
      finalGrade: assessment.finalGrade,
      date: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultData)
      });
      if (response.ok) {
        alert("Resultaat succesvol online opgeslagen!");
      } else {
        throw new Error("Online opslaan mislukt");
      }
    } catch (error) {
      console.warn("Kon resultaat niet online opslaan, bewaart nu lokaal:", error);
      try {
        const localResults = JSON.parse(localStorage.getItem('exam_results') || '[]');
        localResults.push(resultData);
        localStorage.setItem('exam_results', JSON.stringify(localResults));
        alert("Resultaat lokaal in je browser opgeslagen!");
      } catch (err) {
        console.error("Lokaal opslaan mislukt:", err);
        alert("Kon het resultaat niet opslaan.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <audio ref={audioRef} hidden />
      
      {/* Header */}
      <header className="bg-white border-bottom border-slate-200 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <GraduationCap size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Mondeling Trainer Maatschappijleer</h1>
          </div>
          {phase !== 'setup' && (
            <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
              <span className="bg-slate-100 px-3 py-1 rounded-full">{studentName} ({studentClass})</span>
              <span className="capitalize bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">{phase.replace('_', ' ')}</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          {phase === 'setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 max-w-md mx-auto w-full mt-12"
            >
              <h2 className="text-2xl font-bold mb-6 text-center">Start je Mondeling</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <User size={16} className="text-indigo-500" /> Naam Leerling
                  </label>
                  <input 
                    type="text" 
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Bijv. Jan de Vries"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <Users size={16} className="text-indigo-500" /> Klas
                  </label>
                  <input 
                    type="text" 
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Bijv. 4B"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <History size={16} className="text-indigo-500" /> Duur van het examen
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setExamMode('short')}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                        examMode === 'short' 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Korte versie<br/><span className="text-[10px] opacity-70">0 - 5 minuten</span>
                    </button>
                    <button
                      onClick={() => setExamMode('long')}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                        examMode === 'long' 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Lange versie<br/><span className="text-[10px] opacity-70">5 - 10 minuten</span>
                    </button>
                  </div>
                </div>
                <button 
                  onClick={handleStart}
                  disabled={!studentName || !studentClass}
                  className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  Start Examen <Play size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'case_selection' && (
            <motion.div 
              key="cases"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center min-h-[60vh] w-full"
            >
              {countdown !== null && countdown > 0 ? (
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-4">Welke casus kies jij?</h2>
                  <motion.div 
                    key={countdown}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-8xl font-black text-indigo-600"
                  >
                    {countdown}
                  </motion.div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl">
                  <div className="md:col-span-2 text-center mb-4">
                    <h2 className="text-2xl font-bold mb-2">Maak je keuze</h2>
                    <p className="text-slate-500">Klik op een casus om te beginnen.</p>
                  </div>
                  {DEFAULT_CASES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCase(c)}
                      className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all text-left flex flex-col gap-2 group"
                    >
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Casus {c.id}</span>
                      <h3 className="text-lg font-bold group-hover:text-indigo-600">{c.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2">{c.text}</p>
                      <ChevronRight size={20} className="self-end text-slate-300 group-hover:text-indigo-500" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {(phase !== 'setup' && phase !== 'case_selection' && phase !== 'result') && (
            <motion.div 
              key="exam"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col md:flex-row gap-6 h-[calc(100vh-180px)]"
            >
              {/* Left: Avatar & Case Info */}
              <div className="w-full md:w-1/3 flex flex-col gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center">
                  <Avatar 
                    isSpeaking={isSpeaking} 
                    isListening={isProcessing} 
                    expression={expression} 
                    onStop={stopAudio}
                  />
                  <div className="mt-4 text-center">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-lg font-semibold text-indigo-600">
                      {isSpeaking ? "Aan het praten..." : isProcessing ? "Aan het nadenken..." : "Aan het luisteren"}
                    </p>
                  </div>
                </div>

                {selectedCase && (
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-indigo-600">
                      <BookOpen size={20} />
                      <h3 className="font-bold">Huidige Casus</h3>
                    </div>
                    <div className="overflow-y-auto pr-2 text-sm leading-relaxed text-slate-600">
                      <p className="font-bold text-slate-900 mb-2">{selectedCase.title}</p>
                      {selectedCase.text}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Chat */}
              <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] p-4 rounded-2xl ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-slate-100 text-slate-800 rounded-tl-none'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.parts[0].text}</p>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3">
                  <SpeechControls 
                    onTranscript={handleSendMessage} 
                    isProcessing={isProcessing}
                    autoSpeak={autoSpeak}
                    toggleAutoSpeak={() => setAutoSpeak(!autoSpeak)}
                  />
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                    placeholder="Typ je antwoord..."
                    className="flex-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    disabled={isProcessing}
                  />
                  <button 
                    onClick={() => handleSendMessage(inputText)}
                    disabled={!inputText.trim() || isProcessing}
                    className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'result' && assessment && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl mx-auto w-full space-y-6"
            >
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap size={40} />
                </div>
                <h2 className="text-3xl font-bold mb-2">Examen Afgerond!</h2>
                <p className="text-slate-500 mb-6">Goed gedaan, {studentName}. Hier zijn je resultaten.</p>
                
                <div className="inline-block bg-indigo-50 text-indigo-700 px-6 py-3 rounded-2xl font-bold text-2xl mb-8">
                  Eindbeoordeling: {assessment.finalGrade}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {Object.entries(assessment.scores).map(([key, value]: [string, any]) => (
                    <div key={key} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">{key}</p>
                      <p className="text-xl font-bold text-slate-800">{value} / 5</p>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6 text-left">
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                    <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                      <span className="bg-emerald-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">★</span> Tops
                    </h3>
                    <ul className="space-y-2 text-sm text-emerald-700">
                      {assessment.tops.map((t: string, i: number) => <li key={i}>• {t}</li>)}
                    </ul>
                  </div>
                  <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                    <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                      <span className="bg-amber-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">!</span> Tips
                    </h3>
                    <ul className="space-y-2 text-sm text-amber-700">
                      {assessment.tips.map((t: string, i: number) => <li key={i}>• {t}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-slate-50 rounded-2xl text-left">
                  <h3 className="font-bold mb-2">Samenvatting</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{assessment.summary}</p>
                </div>

                <div className="flex flex-wrap gap-4 justify-center mt-8">
                  <button 
                    onClick={saveResult}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                  >
                    <Save size={20} /> Resultaat Opslaan
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-900 transition-all"
                  >
                    <Download size={20} /> Download Rapport
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-300 transition-all"
                  >
                    <History size={20} /> Nieuw Examen
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-slate-400 text-xs border-t border-slate-200 bg-white">
        &copy; {new Date().getFullYear()} Mondeling Trainer Maatschappijleer VMBO • Ontwikkeld voor Onderwijs
      </footer>
    </div>
  );
}
