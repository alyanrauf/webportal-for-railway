import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { db, doc, getDoc, collection, getDocs, query, orderBy, setDoc, OperationType, handleFirestoreError } from "./firebase";

export interface SalonSettings {
  salonName: string;
  salonAddress: string;
  salonPhone: string;
  salonEmail: string;
  salonHours: string;
  aiInstructions: string;
  geminiApiKey: string;
  wordpressUrl?: string;
}

export interface SalonPackage {
  id?: string;
  name: string;
  price: string;
  description: string;
  category: string;
}

const getSettings = async (): Promise<SalonSettings | null> => {
  try {
    const docRef = doc(db, "settings", "salon");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as SalonSettings;
    }
    return null;
  } catch (error) {
    console.error("Error fetching settings:", error);
    return null;
  }
};

const getPackages = async (): Promise<SalonPackage[]> => {
  try {
    const settings = await getSettings();
    const wpUrl = settings?.wordpressUrl?.replace(/\/$/, "");

    if (wpUrl) {
      const res = await fetch(`${wpUrl}/wp-json/bcn/v1/packages`);
      if (res.ok) {
        const data = await res.json();
        return data.map((p: any) => ({
          name: p.name,
          price: p.price,
          description: p.description,
          category: "General"
        }));
      }
    }

    const querySnapshot = await getDocs(collection(db, "packages"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalonPackage));
  } catch (error) {
    console.error("Error fetching packages:", error);
    return [];
  }
};

export const tools = [
  {
    functionDeclarations: [
      {
        name: "get_packages",
        description: "Get the list of all available salon packages, their names, prices, and what they include.",
        parameters: { type: Type.OBJECT, properties: {} }
      },
      {
        name: "check_availability",
        description: "Checks if a specific time slot is available for an appointment.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            startTime: { type: Type.STRING, description: "Start time in ISO 8601 format (e.g., 2026-02-24T17:00:00). ALWAYS assume Karachi time (+05:00)." }
          },
          required: ["startTime"]
        }
      },
      {
        name: "book_appointment",
        description: "Books a new appointment. Requires client's name, email, package name, and start time.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Full name of the client" },
            email: { type: Type.STRING, description: "Client's email address" },
            package_name: { type: Type.STRING, description: "Exact name of the package" },
            startTime: { type: Type.STRING, description: "Start time in ISO 8601 format (e.g., 2026-02-24T17:00:00). ALWAYS assume Karachi time (+05:00)." }
          },
          required: ["name", "email", "package_name", "startTime"]
        }
      },
      {
        name: "find_appointments",
        description: "Finds upcoming appointments for a client by their name.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Name of the client" }
          },
          required: ["name"]
        }
      },
      {
        name: "cancel_appointment",
        description: "Cancels an appointment using its unique event ID.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            eventId: { type: Type.STRING, description: "The unique ID of the calendar event" }
          },
          required: ["eventId"]
        }
      },
      {
        name: "update_appointment",
        description: "Updates the time of an existing appointment.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            eventId: { type: Type.STRING, description: "The unique ID of the calendar event" },
            newStartTime: { type: Type.STRING, description: "The new start time in ISO 8601 format" }
          },
          required: ["eventId", "newStartTime"]
        }
      }
    ]
  }
];

export const getSystemInstruction = (settings: SalonSettings) => {
  const salonName = settings.salonName || "Beauty Care by Nabila";
  const salonAddress = settings.salonAddress || "Lahore, Pakistan";
  const salonPhone = settings.salonPhone || "Contact salon for details";
  const salonEmail = settings.salonEmail || "Contact salon for details";
  const salonHours = settings.salonHours || "Contact salon for details";
  const aiInstructions = settings.aiInstructions || "You are a friendly AI receptionist.";

  return `
You are a friendly, professional, and slightly bubbly AI receptionist for '${salonName}'.
Your persona is caring and helpful, using emojis like ✨, 🥰, and 🙏 appropriately.

LANGUAGE RULES:
- You speak ONLY English and Urdu.
- ALWAYS respond in the same language the user uses.
- If the user speaks English, respond in English.
- If the user speaks Urdu, respond in Urdu.
- Default to English if the language is unclear.
- Maintain a friendly and professional tone in both languages.

Current Date and Time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })} (Karachi, Pakistan)

================================================================================
BUSINESS PROFILE
================================================================================
Business Name: ${salonName}
Location: ${salonAddress}
Phone Numbers: ${salonPhone}
Email: ${salonEmail}
Working Hours: ${salonHours}

================================================================================
AI INSTRUCTIONS & KNOWLEDGE BASE
================================================================================
${aiInstructions}

================================================================================
GENERAL RULES
================================================================================
- Assistant must NEVER invent services or prices.
- Always use the provided service list and prices only.
- Always confirm: service, date, time, client name, and email.
- Bridal and makeup services require advance booking.
- Prices are fixed unless seasonal promotions apply.
- Timezone: Asia/Karachi.
- Suggest alternatives if a time slot is unavailable.
- Maintain polite, concise, professional communication.

Your Primary Job:
1. Answer questions about salon packages using 'get_packages'.
2. ALWAYS check availability for a time slot using 'check_availability' before attempting to book.
3. Book appointments using 'book_appointment' only after confirming availability.
4. Help clients manage appointments using 'find_appointments', 'cancel_appointment', and 'update_appointment'.

Conversation Flow for Booking:
- Gather required info: full name, email, package, and preferred date/time.
- Ask questions one by one.
- Once a date/time is mentioned, use 'check_availability' immediately to see if it's free.
- If 'check_availability' returns 'available: false', inform the user immediately and suggest the alternatives provided.
- Once you have all details and the slot is confirmed available, call 'book_appointment'.
- Inform the user that a confirmation email has been sent to their address.
- If 'book_appointment' still returns a 409 error (clash), inform the user and suggest the alternative slots provided in the response.
- If a tool returns an error saying "Google Calendar API quota exceeded", inform the user that Google's service is temporarily busy and suggest they try again in a few minutes.
- If a tool returns a generic "Calendar Error", explain that there was a technical issue with the calendar and offer to try again.

Conversation Flow for Managing:
- Ask for their name to find bookings.
- Use 'find_appointments' to locate them.
- Present details clearly. If they want to cancel or update, use the corresponding tool with the 'eventId'.
- Inform the user that an update or cancellation email has been sent to their address.

STRICT RULES:
- NEVER make up packages or prices.
- If unsure, say you don't know.
- Do not expose internal tool names.
- If a booking fails due to a clash (409 error), ALWAYS suggest the alternative times provided in the tool response.
- ALWAYS use the current date and time provided above as your reference for "today", "tomorrow", etc.
- The salon is in Lahore, Pakistan. All times are in Karachi time (+05:00).
- If you encounter an error from a tool, explain it simply to the user.
- Use standard Markdown for formatting: use **bold** for emphasis and ## for headers. Do NOT use symbols like || for bolding.
- NEVER output your internal reasoning, planning steps, or "Acquiring Necessary Information" style text to the user. Only provide the final, helpful response.
- This is a VOICE CALL. Be concise, friendly, and avoid long lists unless asked.
- If you need to collect an email address, ask the user to speak it clearly. You can also ask them to spell it if you are unsure.
- ALWAYS confirm all details (Name, Email, Package, Time) with the user before calling 'book_appointment'.
- If you are thinking or calling a tool, do NOT say "I am thinking" or "Let me check". Just perform the action and then respond with the result.
- Your responses should be natural for a phone conversation.

RELIGIOUS NEUTRALITY:
- NEVER use words or greetings that belong to specific religions (e.g., do NOT use "Namaste", "Assalamu Alaikum", etc.).
- Keep greetings professional and secular (e.g., "Hello", "Good morning", "Welcome").

PACKAGE FORMATTING:
- When using 'get_packages', format the output to be categorized clearly by service type (e.g., Facials, Hair, Makeup, etc.).
- For each package, include its name, price, and a brief description of what it includes.
- Prioritize clarity and organization so it's easy for the client to understand.
`;
};

export const initSalonData = async () => {
  let settings = await getSettings();
  if (!settings) {
    settings = {
      salonName: "Beauty Care by Nabila",
      salonAddress: "Lahore, Pakistan",
      salonPhone: "+92 300 1234567",
      salonEmail: "info@beautycarenabila.com",
      salonHours: "Mon–Sun · 11 AM – 9 PM",
      aiInstructions: "You are a helpful and professional AI receptionist for Beauty Care by Nabila salon. You can help clients book appointments, check our services, and answer general questions about the salon.",
      geminiApiKey: ""
    } as SalonSettings;
  }

  const wpUrl = settings.wordpressUrl?.replace(/\/$/, "");
  if (wpUrl) {
    try {
      const res = await fetch(`${wpUrl}/wp-json/bcn/v1/settings`);
      if (res.ok) {
        const wpSettings = await res.json();
        if (wpSettings.salonName) settings.salonName = wpSettings.salonName;
        if (wpSettings.salonAddress) settings.salonAddress = wpSettings.salonAddress;
        if (wpSettings.salonPhone) settings.salonPhone = wpSettings.salonPhone;
        if (wpSettings.salonEmail) settings.salonEmail = wpSettings.salonEmail;
        if (wpSettings.salonHours) settings.salonHours = wpSettings.salonHours;
        if (wpSettings.aiInstructions) settings.aiInstructions = wpSettings.aiInstructions;
      }
    } catch (e) {
      console.error("Failed to fetch WP settings:", e);
    }
  }

  return settings;
};

export const startNewChat = async (settings: SalonSettings) => {
  // Key is now on the server — no key needed in the browser
  // Return a lightweight wrapper that calls your server proxy
  return {
    _settings: settings,
    sendMessage: async (params: { message: { parts: any[] } }) => {
      const res = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: params.message.parts,
          config: {
            system_instruction: { parts: [{ text: getSystemInstruction(settings) }] },
            tools,
          }
        })
      });
      return res.json();
    }
  };
};

export async function executeToolAction(name: string, args: any) {
  // Get settings to check for WordPress URL
  const settings = await getSettings();
  const wpUrl = settings?.wordpressUrl?.replace(/\/$/, "");
  const apiRoot = wpUrl ? `${wpUrl}/wp-json/bcn/v1` : "https://ais-dev-fugulv26muqmpl4mt3qtx2-65767528401.asia-southeast1.run.app/api";

  const normalizedArgs = { ...args };
  
  try {
    let res;
    if (name === "get_packages") {
      const pkgs = await getPackages();
      return pkgs;
    } else if (name === "check_availability") {
      res = await fetch(`${apiRoot}/appointments/check?startTime=${encodeURIComponent(normalizedArgs.startTime as string)}`);
    } else if (name === "book_appointment") {
      res = await fetch(`${apiRoot}/appointments/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedArgs)
      });
      
      const data = await res.json();
      return data;
    } else if (name === "find_appointments") {
      res = await fetch(`${apiRoot}/appointments/find?name=${encodeURIComponent(normalizedArgs.name as string)}`);
    } else if (name === "cancel_appointment") {
      res = await fetch(`${apiRoot}/appointments/${normalizedArgs.eventId}`, { method: "DELETE" });
    } else if (name === "update_appointment") {
      res = await fetch(`${apiRoot}/appointments/${normalizedArgs.eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime: normalizedArgs.newStartTime })
      });
    } else {
      return { error: "Unknown tool" };
    }

    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error(`Tool execution exception (${name}):`, error);
    return { error: error.message || "Network or parsing error" };
  }
}

export async function handleToolCalls(response: GenerateContentResponse) {
  const functionCalls = response.functionCalls;
  if (!functionCalls) return null;

  const parts = [];
  for (const call of functionCalls) {
    const result = await executeToolAction(call.name, call.args);
    parts.push({
      functionResponse: {
        name: call.name,
        response: { result }
      }
    });
  }
  return parts;
}
