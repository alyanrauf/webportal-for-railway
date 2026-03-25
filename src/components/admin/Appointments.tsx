import React, { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import { Calendar, Trash2, Search, Filter, Clock, User, Mail, Package } from "lucide-react";
import { db, doc, getDoc } from "../../services/firebase";

interface Appointment {
  id: string;
  name: string;
  email: string;
  package_name: string;
  startTime: string;
  eventId: string;
  createdAt: any;
}

export const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("All");

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      // Get settings to check for wordpressUrl
      const settingsRef = doc(db, "settings", "salon");
      const settingsSnap = await getDoc(settingsRef);
      const settings = settingsSnap.exists() ? settingsSnap.data() : null;
      const wpUrl = settings?.wordpressUrl?.replace(/\/$/, "");

      const apiEndpoint = wpUrl ? `${wpUrl}/wp-json/bcn/v1/appointments` : "/api/appointments";
      
      const res = await fetch(apiEndpoint);
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const apps = await res.json();
      setAppointments(apps);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to cancel this appointment in Google Calendar?")) {
      try {
        const settingsRef = doc(db, "settings", "salon");
        const settingsSnap = await getDoc(settingsRef);
        const settings = settingsSnap.exists() ? settingsSnap.data() : null;
        const wpUrl = settings?.wordpressUrl?.replace(/\/$/, "");

        const apiEndpoint = wpUrl ? `${wpUrl}/wp-json/bcn/v1/appointments/${id}` : `/api/appointments/${id}`;

        const res = await fetch(apiEndpoint, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete appointment");
        fetchAppointments();
      } catch (error) {
        console.error("Error deleting appointment:", error);
      }
    }
  };

  const filteredAppointments = appointments.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         app.package_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterDate === "Today") {
      const today = new Date().toISOString().split('T')[0];
      return matchesSearch && app.startTime.startsWith(today);
    }
    
    return matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#3A3A2A]">Appointments</h1>
          <p className="text-[#9A9A80] mt-1">View and manage client bookings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAppointments}
            className="flex items-center justify-center gap-2 bg-white border border-[#E5E5DF] text-[#3A3A2A] px-6 py-3 rounded-2xl font-semibold hover:bg-[#F7F7F4] transition-all shadow-sm active:scale-[0.98]"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A80]" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or package..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-[#E5E5DF] rounded-2xl pl-12 pr-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A80]" size={18} />
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full bg-white border border-[#E5E5DF] rounded-2xl pl-12 pr-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans shadow-sm appearance-none"
          >
            <option value="All">All Time</option>
            <option value="Today">Today Only</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#5A5A40]/30 border-t-[#5A5A40] rounded-full animate-spin" />
        </div>
      ) : filteredAppointments.length > 0 ? (
        <div className="bg-white rounded-[32px] border border-[#E5E5DF] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F7F4] border-b border-[#E5E5DF]">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#9A9A80]">Client</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#9A9A80]">Package</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#9A9A80]">Date & Time</th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[#9A9A80]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F7F4]">
                {filteredAppointments.map((app) => (
                  <tr key={app.id} className="hover:bg-[#F7F7F4]/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#5A5A40]/10 rounded-full flex items-center justify-center text-[#5A5A40]">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-[#3A3A2A]">{app.name}</p>
                          <p className="text-xs text-[#9A9A80] flex items-center gap-1">
                            <Mail size={10} /> {app.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-[#9A9A80]" />
                        <span className="text-sm font-medium text-[#3A3A2A]">{app.package_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-[#3A3A2A] font-medium">
                          <Calendar size={14} className="text-[#5A5A40]" />
                          {formatDate(app.startTime)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#9A9A80]">
                          <Clock size={14} />
                          {formatTime(app.startTime)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="p-2 text-[#9A9A80] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Delete record"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-[#E5E5DF] p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-[#F7F7F4] rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-[#9A9A80]" />
          </div>
          <h3 className="text-xl font-bold text-[#3A3A2A] mb-2">No appointments found</h3>
          <p className="text-[#9A9A80]">Try adjusting your search or check back later for new bookings.</p>
        </div>
      )}
    </AdminLayout>
  );
};
