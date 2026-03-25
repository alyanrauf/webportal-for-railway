import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { SALON_PACKAGES } from "./src/salon_data.ts";
import { getCalendar, checkAvailability, findAlternativeSlots, CALENDAR_ID } from "./src/services/calendar.ts";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- Health Check ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), env: process.env.NODE_ENV });
});

// --- Static Files (MUST be before other routes) ---
app.get("/widget.js", (req, res) => {
  const possiblePaths = [
    path.resolve(__dirname, "beauty-care-nabila-plugin", "assets", "widget.js"),
    path.resolve(__dirname, "public", "widget.js"),
    path.resolve(__dirname, "dist", "widget.js"),
    path.resolve(process.cwd(), "beauty-care-nabila-plugin", "assets", "widget.js"),
    path.resolve(process.cwd(), "public", "widget.js")
  ];

  let widgetPath = null;
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        widgetPath = p;
        break;
      }
    } catch (e) {
      // Ignore errors during existence check
    }
  }

  // Fallback if require('fs') is not available in ESM (it should be via import, but this is a quick check)
  if (!widgetPath) {
    widgetPath = process.env.NODE_ENV === "production" 
      ? path.resolve(__dirname, "beauty-care-nabila-plugin", "assets", "widget.js")
      : path.resolve(__dirname, "public", "widget.js");
  }

  console.log(`Serving widget.js from ${widgetPath} to:`, req.headers.origin || "unknown");
  
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Content-Type", "application/javascript");
  res.header("X-Content-Type-Options", "nosniff");
  
  res.sendFile(widgetPath, (err) => {
    if (err) {
      console.error("Error sending widget.js:", err);
      if (!res.headersSent) {
        res.status(404).send("widget.js not found on server");
      }
    }
  });
});

// --- API Routes ---

app.get("/api/appointments/check", async (req, res) => {
  const { startTime } = req.query;
  if (!startTime) return res.status(400).json({ error: "startTime is required" });

  let formattedStartTime = startTime as string;
  if (!formattedStartTime.includes("+") && !formattedStartTime.includes("Z") && !/-\d{2}:\d{2}$/.test(formattedStartTime)) {
    formattedStartTime = `${formattedStartTime}+05:00`;
  }

  const start = new Date(formattedStartTime);

  try {
    const calendar = await getCalendar();
    const isAvailable = await checkAvailability(calendar, start);
    
    if (isAvailable) {
      res.json({ available: true });
    } else {
      const alternatives = await findAlternativeSlots(calendar, start);
      res.json({ available: false, alternatives });
    }
  } catch (error: any) {
    console.error("Availability check error:", error);
    if (error.code === 429) {
      return res.status(429).json({ error: "Google Calendar API quota exceeded. Please try again in a few minutes." });
    }
    res.status(500).json({ error: `Calendar Error: ${error.message}` });
  }
});

app.get("/api/packages", (req, res) => {
  res.json(SALON_PACKAGES);
});

app.post("/api/appointments/book", async (req, res) => {
  const { name, email, package_name, startTime } = req.body;
  
  // Ensure the time is parsed as Karachi time (+05:00) if no offset is provided
  let formattedStartTime = startTime;
  if (!startTime.includes("+") && !startTime.includes("Z") && !/-\d{2}:\d{2}$/.test(startTime)) {
    formattedStartTime = `${startTime}+05:00`;
  }
  
  const start = new Date(formattedStartTime);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  try {
    const calendar = await getCalendar();
    
    const isAvailable = await checkAvailability(calendar, start);
    if (!isAvailable) {
      const alternatives = await findAlternativeSlots(calendar, start);
      return res.status(409).json({ 
        error: "Time slot unavailable", 
        alternatives 
      });
    }

    const event = {
      summary: `Booking: ${name} - ${package_name}`,
      description: `Package: ${package_name}\nClient: ${name} (${email})`,
      start: { dateTime: start.toISOString(), timeZone: "Asia/Karachi" },
      end: { dateTime: end.toISOString(), timeZone: "Asia/Karachi" },
      attendees: [], // Explicitly empty to avoid 403 error for service accounts
    };

    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: event,
      sendUpdates: 'none',
    });

    res.json({ 
      status: "success", 
      eventId: response.data.id,
      link: response.data.htmlLink 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/appointments", async (req, res) => {
  try {
    const calendar = await getCalendar();
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Show last 30 days too
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = (response.data.items || []).map(e => {
      const desc = e.description || "";
      const emailMatch = desc.match(/\((.*?)\)/);
      const packageMatch = desc.match(/Package: (.*)/);
      
      let name = "Unknown";
      let packageName = "Unknown";
      
      if (e.summary?.startsWith("Booking: ")) {
        const parts = e.summary.replace("Booking: ", "").split(" - ");
        name = parts[0] || "Unknown";
        packageName = parts[1] || "Unknown";
      }

      return {
        id: e.id,
        name: name,
        email: emailMatch ? emailMatch[1] : "Unknown",
        package_name: packageMatch ? packageMatch[1] : packageName,
        startTime: e.start?.dateTime || e.start?.date,
        eventId: e.id,
      };
    });

    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/appointments/find", async (req, res) => {
  const { name } = req.query;
  try {
    const calendar = await getCalendar();
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      q: name as string,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    const filtered = events.filter(e => 
      e.summary?.toLowerCase().includes((name as string).toLowerCase())
    ).map(e => ({
      id: e.id,
      summary: e.summary,
      start: e.start?.dateTime || e.start?.date,
    }));

    res.json(filtered);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/appointments/:id", async (req, res) => {
  try {
    const calendar = await getCalendar();
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: req.params.id,
    });
    res.json({ status: "success" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/appointments/:id", async (req, res) => {
  const { startTime } = req.body;
  
  // Ensure the time is parsed as Karachi time (+05:00) if no offset is provided
  let formattedStartTime = startTime;
  if (!startTime.includes("+") && !startTime.includes("Z") && !/-\d{2}:\d{2}$/.test(startTime)) {
    formattedStartTime = `${startTime}+05:00`;
  }

  const start = new Date(formattedStartTime);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  try {
    const calendar = await getCalendar();
    
    const isAvailable = await checkAvailability(calendar, start);
    if (!isAvailable) {
      const alternatives = await findAlternativeSlots(calendar, start);
      return res.status(409).json({ error: "Time slot unavailable", alternatives });
    }

    await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId: req.params.id,
      requestBody: {
        start: { dateTime: start.toISOString(), timeZone: "Asia/Karachi" },
        end: { dateTime: end.toISOString(), timeZone: "Asia/Karachi" },
      },
      sendUpdates: 'none',
    });
    res.json({ status: "success" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Static Files ---
// (Already handled at the top)

// --- Vite Integration ---

async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "beauty-care-nabila-plugin", "assets");
    app.use(express.static(distPath, {
      setHeaders: (res) => {
        res.set("Access-Control-Allow-Origin", "*");
      }
    }));
    
    // Explicitly handle /widget and other SPA routes
    app.get("/widget", (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.sendFile(path.resolve(distPath, "index.html"));
    });

    app.get("*", (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
