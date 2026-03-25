import React, { useState, useEffect } from "react";
import { db, collection, getDocs, query, orderBy, limit, OperationType, handleFirestoreError, doc, getDoc } from "../../services/firebase";
import { AdminLayout } from "./AdminLayout";
import { Calendar, Package, Users, TrendingUp, Clock, User, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface Stats {
  totalAppointments: number;
  totalPackages: number;
  todayAppointments: number;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalAppointments: 0,
    totalPackages: 0,
    todayAppointments: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Get settings to check for wordpressUrl
        const settingsRef = doc(db, "settings", "salon");
        const settingsSnap = await getDoc(settingsRef);
        const settings = settingsSnap.exists() ? settingsSnap.data() : null;
        const wpUrl = settings?.wordpressUrl?.replace(/\/$/, "");

        const apiEndpoint = wpUrl ? `${wpUrl}/wp-json/bcn/v1/appointments` : "/api/appointments";
        
        // Fetch all appointments from API
        const res = await fetch(apiEndpoint);
        if (!res.ok) throw new Error("Failed to fetch appointments");
        const allApps = await res.json();
        
        console.log("AI Receptionist Dashboard: Fetched appointments", { count: allApps.length, first: allApps[0] });
        
        const totalApps = allApps.length;
        
        // Get today's date in Karachi timezone (YYYY-MM-DD)
        const today = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Karachi' }).split(',')[0];
        console.log("AI Receptionist Dashboard: Today in Karachi is", today);

        const todayApps = allApps.filter((app: any) => {
          if (!app.startTime) return false;
          return app.startTime.startsWith(today);
        }).length;
        
        console.log("AI Receptionist Dashboard: Today's appointments count", todayApps);

        // Packages
        const pkgSnapshot = await getDocs(collection(db, "packages"));
        const totalPkgs = pkgSnapshot.size;

        // Recent Appointments (sort by startTime desc and take 5)
        const recent = [...allApps]
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
          .slice(0, 5);

        setStats({
          totalAppointments: totalApps,
          totalPackages: totalPkgs,
          todayAppointments: todayApps,
        });
        setRecentAppointments(recent);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        handleFirestoreError(error, OperationType.GET, "dashboard_data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const statCards = [
    { name: "Total Appointments", value: stats.totalAppointments, icon: Calendar, color: "bg-blue-500/10 text-blue-600" },
    { name: "Today's Bookings", value: stats.todayAppointments, icon: Clock, color: "bg-green-500/10 text-green-600" },
    { name: "Active Packages", value: stats.totalPackages, icon: Package, color: "bg-purple-500/10 text-purple-600" },
    { name: "Total Clients", value: stats.totalAppointments, icon: Users, color: "bg-orange-500/10 text-orange-600" },
  ];

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#3A3A2A]">Welcome Back! ✨</h1>
        <p className="text-[#9A9A80] mt-1">Here's what's happening at your salon today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-[32px] border border-[#E5E5DF] shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9A9A80] mb-0.5">{stat.name}</p>
                <p className="text-2xl font-bold text-[#3A3A2A]">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Appointments */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-[#E5E5DF] shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#F7F7F4] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#3A3A2A]">Recent Appointments</h2>
            <Link to="/admin/appointments" className="text-sm font-semibold text-[#5A5A40] hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-[#5A5A40]/30 border-t-[#5A5A40] rounded-full animate-spin" />
              </div>
            ) : recentAppointments.length > 0 ? (
              <div className="divide-y divide-[#F7F7F4]">
                {recentAppointments.map((app) => (
                  <div key={app.id} className="p-6 flex items-center justify-between hover:bg-[#F7F7F4]/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#5A5A40]/10 rounded-full flex items-center justify-center text-[#5A5A40]">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-[#3A3A2A]">{app.name}</p>
                        <p className="text-xs text-[#9A9A80]">{app.package_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#3A3A2A]">{formatTime(app.startTime)}</p>
                      <p className="text-[10px] text-[#9A9A80] uppercase tracking-widest">{formatDate(app.startTime)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-[#9A9A80]">No recent appointments found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-[#5A5A40] p-8 rounded-[32px] text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">AI Receptionist</h3>
              <p className="text-white/70 text-sm mb-6 leading-relaxed">
                Your AI is currently active and handling client inquiries and bookings.
              </p>
              <Link
                to="/admin/settings"
                className="inline-flex items-center gap-2 bg-white text-[#5A5A40] px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#F7F7F4] transition-all"
              >
                Configure AI <ArrowRight size={14} />
              </Link>
            </div>
            <Sparkles className="absolute -bottom-4 -right-4 text-white/5 w-32 h-32" />
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-[#E5E5DF] shadow-sm">
            <h3 className="text-lg font-bold text-[#3A3A2A] mb-4">Quick Links</h3>
            <div className="space-y-3">
              <Link to="/admin/packages" className="flex items-center justify-between p-4 bg-[#F7F7F4] rounded-2xl hover:bg-[#E5E5DF] transition-colors group">
                <span className="font-semibold text-[#3A3A2A]">Manage Packages</span>
                <ArrowRight size={16} className="text-[#9A9A80] group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/admin/settings" className="flex items-center justify-between p-4 bg-[#F7F7F4] rounded-2xl hover:bg-[#E5E5DF] transition-colors group">
                <span className="font-semibold text-[#3A3A2A]">Salon Details</span>
                <ArrowRight size={16} className="text-[#9A9A80] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
