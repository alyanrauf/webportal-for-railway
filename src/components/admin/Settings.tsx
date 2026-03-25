import React, { useState, useEffect } from "react";
import { db, doc, getDoc, setDoc, OperationType, handleFirestoreError } from "../../services/firebase";
import { AdminLayout } from "./AdminLayout";
import { Save, CheckCircle2, AlertCircle, Sparkles, Info } from "lucide-react";

interface SalonSettings {
  salonName: string;
  salonAddress: string;
  salonPhone: string;
  salonEmail: string;
  salonHours: string;
  aiInstructions: string;
  geminiApiKey: string;
  wordpressUrl?: string;
}

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SalonSettings>({
    salonName: "",
    salonAddress: "",
    salonPhone: "",
    salonEmail: "",
    salonHours: "",
    aiInstructions: "",
    geminiApiKey: "",
    wordpressUrl: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "salon");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as SalonSettings);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        handleFirestoreError(error, OperationType.GET, "settings/salon");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, "settings", "salon"), settings);
      setMessage({ type: "success", text: "Settings saved successfully! ✨" });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: `Failed to save settings: ${error.message}` });
      handleFirestoreError(error, OperationType.WRITE, "settings/salon");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#5A5A40]/30 border-t-[#5A5A40] rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#3A3A2A]">Salon Settings</h1>
          <p className="text-[#9A9A80] mt-1">Configure your salon details and AI behavior.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-[#5A5A40] text-white px-6 py-3 rounded-2xl font-semibold hover:bg-[#3A3A2A] transition-all disabled:opacity-50 shadow-lg hover:shadow-xl active:scale-[0.98]"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save size={20} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {message && (
        <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 border ${
          message.type === "success" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
        }`}>
          {message.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Info */}
        <div className="bg-white p-8 rounded-[32px] border border-[#E5E5DF] shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#5A5A40]/10 rounded-full flex items-center justify-center">
              <Sparkles size={20} className="text-[#5A5A40]" />
            </div>
            <h2 className="text-xl font-bold text-[#3A3A2A]">Basic Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#3A3A2A] mb-1.5 ml-1">Salon Name</label>
              <input
                type="text"
                value={settings.salonName}
                onChange={(e) => setSettings({ ...settings, salonName: e.target.value })}
                className="w-full bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                placeholder="e.g. Beauty Care by Nabila"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3A3A2A] mb-1.5 ml-1">Address</label>
              <input
                type="text"
                value={settings.salonAddress}
                onChange={(e) => setSettings({ ...settings, salonAddress: e.target.value })}
                className="w-full bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                placeholder="e.g. Lahore, Pakistan"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#3A3A2A] mb-1.5 ml-1">Phone Number</label>
                <input
                  type="text"
                  value={settings.salonPhone}
                  onChange={(e) => setSettings({ ...settings, salonPhone: e.target.value })}
                  className="w-full bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                  placeholder="e.g. +92 300 1234567"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#3A3A2A] mb-1.5 ml-1">Email Address</label>
                <input
                  type="email"
                  value={settings.salonEmail}
                  onChange={(e) => setSettings({ ...settings, salonEmail: e.target.value })}
                  className="w-full bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                  placeholder="e.g. info@salon.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3A3A2A] mb-1.5 ml-1">Working Hours</label>
              <input
                type="text"
                value={settings.salonHours}
                onChange={(e) => setSettings({ ...settings, salonHours: e.target.value })}
                className="w-full bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                placeholder="e.g. Mon-Sun: 11 AM - 9 PM"
                required
              />
            </div>
          </div>
        </div>

        {/* AI Config */}
        <div className="bg-white p-8 rounded-[32px] border border-[#E5E5DF] shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#5A5A40]/10 rounded-full flex items-center justify-center">
              <Info size={20} className="text-[#5A5A40]" />
            </div>
            <h2 className="text-xl font-bold text-[#3A3A2A]">AI Configuration</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#3A3A2A] mb-1.5 ml-1">Gemini API Key</label>
              <input
                type="password"
                value={settings.geminiApiKey}
                onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                className="w-full bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                placeholder="Enter your Gemini API Key"
                required
              />
              <p className="text-[11px] text-[#9A9A80] mt-2 ml-1">
                Your API key is stored securely and used only for your AI receptionist.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3A3A2A] mb-1.5 ml-1">WordPress Site URL (Optional)</label>
              <input
                type="url"
                value={settings.wordpressUrl || ""}
                onChange={(e) => setSettings({ ...settings, wordpressUrl: e.target.value })}
                className="w-full bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                placeholder="e.g. https://your-wordpress-site.com"
              />
              <p className="text-[11px] text-[#9A9A80] mt-2 ml-1 leading-relaxed">
                If provided, the AI will use your WordPress site's API for appointments and bookings. Leave empty to use the standalone backend.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3A3A2A] mb-1.5 ml-1">Custom AI Instructions</label>
              <textarea
                value={settings.aiInstructions}
                onChange={(e) => setSettings({ ...settings, aiInstructions: e.target.value })}
                rows={8}
                className="w-full bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans resize-none"
                placeholder="e.g. You are a specialist in bridal makeup. Always mention our current 20% discount on facials."
                required
              />
              <p className="text-[11px] text-[#9A9A80] mt-2 ml-1 leading-relaxed">
                These instructions guide how the AI interacts with your clients. You can specify your salon's unique personality, special rules, or current promotions.
              </p>
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
};
