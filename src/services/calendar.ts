import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";

export function getAuthClient() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error("Missing Google Service Account credentials (GOOGLE_PRIVATE_KEY or GOOGLE_SERVICE_ACCOUNT_EMAIL)");
  }

  // Handle common formatting issues:
  // 1. Remove wrapping quotes if they exist
  privateKey = privateKey.trim();
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
    privateKey = privateKey.slice(1, -1);
  }

  // 2. Replace escaped newlines with actual newlines
  // We do this globally and handle both literal \n and already parsed newlines
  privateKey = privateKey.replace(/\\n/g, '\n');

  // 3. Ensure the key has the correct headers and is not just a single line of base64
  // If it doesn't start with the header, it's definitely malformed for Node's crypto
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error("Warning: GOOGLE_PRIVATE_KEY does not contain '-----BEGIN PRIVATE KEY-----'");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES
  });
}

export async function getCalendar() {
  const auth = getAuthClient();
  return google.calendar({ version: "v3", auth });
}

export async function checkAvailability(calendar: any, startTime: Date, durationHours: number = 2) {
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
  
  const response = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: startTime.toISOString(),
    timeMax: endTime.toISOString(),
    singleEvents: true,
  });

  return (response.data.items || []).length === 0;
}

export async function findAlternativeSlots(calendar: any, requestedTime: Date) {
  const hourOffsets = [1, 2, 3, -1, -2, 24, 25, 26];
  
  const checkSlot = async (offset: number) => {
    const testTime = new Date(requestedTime.getTime() + offset * 60 * 60 * 1000);
    const hour = testTime.getHours();
    
    if (testTime > new Date() && hour >= 11 && hour < 20) {
      try {
        const isAvailable = await checkAvailability(calendar, testTime);
        if (isAvailable) {
          return testTime.toLocaleString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit',
            timeZone: 'Asia/Karachi'
          });
        }
      } catch (e) {
        console.error("Error checking availability for alternative:", e);
      }
    }
    return null;
  };

  const results = await Promise.all(hourOffsets.map(checkSlot));
  return results.filter((res): res is string => res !== null).slice(0, 3);
}

export { SCOPES, CALENDAR_ID };
