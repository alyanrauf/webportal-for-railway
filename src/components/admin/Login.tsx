import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, doc, getDoc, setDoc } from "../../services/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Sparkles, LogIn } from "lucide-react";

export const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if user is an admin
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      const adminEmail = "alyanraufarpk@gmail.com";
      
      if (userDoc.exists() && userDoc.data().role === "admin") {
        navigate("/admin");
      } else if (result.user.email === adminEmail) {
        // Create admin doc if it doesn't exist
        await setDoc(doc(db, "users", result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          role: "admin",
          createdAt: new Date().toISOString()
        });
        navigate("/admin");
      } else {
        await auth.signOut();
        setError("Access denied. You are not an authorized admin. 🙏");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F4] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-[#E5E5DF] p-10 text-center">
        <div className="w-16 h-16 bg-[#5A5A40]/10 rounded-full mx-auto flex items-center justify-center mb-6">
          <Sparkles size={32} className="text-[#5A5A40]" />
        </div>
        
        <h1 className="text-2xl font-bold text-[#3A3A2A] mb-2">Salon Admin Portal</h1>
        <p className="text-[#9A9A80] mb-8">Sign in to manage your salon settings, packages, and appointments.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-[#5A5A40] text-white py-4 rounded-2xl font-semibold hover:bg-[#3A3A2A] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98]"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn size={20} />
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        <p className="mt-8 text-[11px] text-[#9A9A80] uppercase tracking-widest">
          Secure Admin Access Only
        </p>
      </div>
    </div>
  );
};
