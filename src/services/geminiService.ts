import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const EXAM_SYSTEM_INSTRUCTION = `
Je bent een ervaren en motiverende examinator Maatschappijleer voor het VMBO Basis/Kader.
Je doel is om een mondeling examen af te nemen.

DOELGROEP:
VMBO Basis/Kader leerlingen (14-16 jaar). Gebruik eenvoudige, duidelijke taal. Geen academische termen zonder uitleg.

STRUCTUUR:
1. Binnenkomst: Welkom, stel jezelf voor, vraag naam en klas. Stel de leerling gerust. Eindig je eerste of tweede bericht ALTIJD met de vraag: "Welke casus kies jij?".
2. Casusbespreking: Vraag om samenvatting, probleem, partijen en begrippen.
3. Verdieping: Bredere vragen over democratie, rechtsstaat, grondrechten.
4. Afronding: Bedank de leerling, geef tops/tips en de beoordeling volgens de rubric.

GEDRAGSREGELS:
- WEES ZEER KORT EN BONDIG. Maximaal 2 zinnen per beurt.
- Stel ALTIJD slechts één vraag tegelijk.
- Geef NOOIT het antwoord voor.
- Vraag door als antwoorden oppervlakkig zijn ("Waarom?", "Kun je dat uitleggen?").
- Geef na belangrijke antwoorden 1 TOP (wat ging goed) en 1 TIP (wat kan beter). Houd dit extreem kort (max 1 zin per top/tip).
- Wees geduldig en motiverend.
- Gebruik korte zinnen voor natuurlijke spraak.

RUBRIC (Score 1-5):
1. Inhoudelijke kennis
2. Inzicht en onderbouwing
3. Herkennen van betrokken partijen
4. Gevolgen uitleggen
5. Mondelinge vaardigheden
6. Actieve deelname

Eindbeoordeling:
1.0 - 2.4: Onvoldoende
2.5 - 3.5: Voldoende
3.6 - 5.0: Goed
`;

export async function generateExamResponse(history: any[], userMessage: string, currentPhase: string, examMode: 'short' | 'long', caseText?: string) {
  const model = "gemini-3.1-pro-preview";
  
  const modeInstruction = examMode === 'short' 
    ? "Dit is de KORTE versie. Wees extra kort in je antwoorden en kom sneller tot een afronding." 
    : "Dit is de LANGE versie. Neem iets meer tijd voor verdieping, maar houd je eigen spreektijd nog steeds beperkt.";

  const contents = [
    ...history,
    { role: "user", parts: [{ text: userMessage }] }
  ];

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: EXAM_SYSTEM_INSTRUCTION + 
        `\n\nMODUS: ${modeInstruction}` +
        `\n\nBELANGRIJK: Houd je antwoorden en vragen kort (maximaal 2-3 zinnen). De leerling moet het meeste aan het woord zijn.` +
        `\n\nStel in de fase 'discussion' precies 5 verschillende vragen over de casus.` +
        (caseText ? `\n\nHUIDIGE CASUS:\n${caseText}` : "") + 
        `\n\nHUIDIGE FASE: ${currentPhase}`,
    }
  });

  return response.text;
}

export async function generateSpeech(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}

export async function analyzeFinalScore(history: any[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      ...history,
      { role: "user", parts: [{ text: "Geef nu de definitieve beoordeling volgens de rubric in JSON formaat." }] }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scores: {
            type: Type.OBJECT,
            properties: {
              kennis: { type: Type.NUMBER },
              inzicht: { type: Type.NUMBER },
              partijen: { type: Type.NUMBER },
              gevolgen: { type: Type.NUMBER },
              vaardigheden: { type: Type.NUMBER },
              deelname: { type: Type.NUMBER },
            }
          },
          summary: { type: Type.STRING },
          tops: { type: Type.ARRAY, items: { type: Type.STRING } },
          tips: { type: Type.ARRAY, items: { type: Type.STRING } },
          finalGrade: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
