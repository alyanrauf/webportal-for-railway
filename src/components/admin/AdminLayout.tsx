import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings, Package, Calendar, LogOut, Sparkles } from "lucide-react";
import { auth } from "../../services/firebase";
import { signOut } from "firebase/auth";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Appointments", path: "/admin/appointments", icon: Calendar },
    { name: "Packages", path: "/admin/packages", icon: Package },
    { name: "Settings", path: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F4] flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#5A5A40] text-white flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
            <Sparkles size={18} className="text-[#D4AF37]" />
          </div>
          <span className="font-semibold tracking-wide">Salon Admin</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="px-4 py-2 mb-2">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Logged in as</p>
            <p className="text-xs text-white/80 truncate font-medium">{auth.currentUser?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
