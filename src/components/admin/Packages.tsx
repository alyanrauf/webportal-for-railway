import React, { useState, useEffect } from "react";
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, OperationType, handleFirestoreError, getDoc } from "../../services/firebase";
import { AdminLayout } from "./AdminLayout";
import { Plus, Trash2, Edit2, Save, X, Package, Search, Filter } from "lucide-react";

interface SalonPackage {
  id?: string;
  name: string;
  price: string;
  description: string;
  category: string;
}

export const Packages: React.FC = () => {
  const [packages, setPackages] = useState<SalonPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SalonPackage | null>(null);
  const [formData, setFormData] = useState<SalonPackage>({
    name: "",
    price: "",
    description: "",
    category: "Facials",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  const categories = ["All", "Facials", "Hair", "Makeup", "Nails", "Massage", "Other"];

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setIsLoading(true);
    try {
      // Get settings to check for wordpressUrl
      const settingsRef = doc(db, "settings", "salon");
      const settingsSnap = await getDoc(settingsRef);
      const settingsData = settingsSnap.exists() ? settingsSnap.data() : null;
      const wpUrl = settingsData?.wordpressUrl?.replace(/\/$/, "");

      if (wpUrl) {
        const res = await fetch(`${wpUrl}/wp-json/bcn/v1/packages`);
        if (res.ok) {
          const pkgs = await res.json();
          setPackages(pkgs);
          return;
        }
      }

      // Fallback to Firestore
      const querySnapshot = await getDocs(collection(db, "packages"));
      const pkgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalonPackage));
      setPackages(pkgs);
    } catch (error) {
      console.error("Error fetching packages:", error);
      handleFirestoreError(error, OperationType.GET, "packages");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPackage?.id) {
        await updateDoc(doc(db, "packages", editingPackage.id), formData as any);
      } else {
        await addDoc(collection(db, "packages"), formData);
      }
      setIsModalOpen(false);
      setEditingPackage(null);
      setFormData({ name: "", price: "", description: "", category: "Facials" });
      fetchPackages();
    } catch (error) {
      console.error("Error saving package:", error);
      handleFirestoreError(error, editingPackage?.id ? OperationType.UPDATE : OperationType.CREATE, "packages");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this package?")) {
      try {
        await deleteDoc(doc(db, "packages", id));
        fetchPackages();
      } catch (error) {
        console.error("Error deleting package:", error);
        handleFirestoreError(error, OperationType.DELETE, `packages/${id}`);
      }
    }
  };

  const openEditModal = (pkg: SalonPackage) => {
    setEditingPackage(pkg);
    setFormData({ ...pkg });
    setIsModalOpen(true);
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         pkg.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "All" || pkg.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#3A3A2A]">Salon Packages</h1>
          <p className="text-[#9A9A80] mt-1">Manage your services, prices, and descriptions.</p>
        </div>
        <button
          onClick={() => {
            setEditingPackage(null);
            setFormData({ name: "", price: "", description: "", category: "Facials" });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-[#5A5A40] text-white px-6 py-3 rounded-2xl font-semibold hover:bg-[#3A3A2A] transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
        >
          <Plus size={20} />
          <span>Add New Package</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A80]" size={18} />
          <input
            type="text"
            placeholder="Search packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-[#E5E5DF] rounded-2xl pl-12 pr-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9A80]" size={18} />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full bg-white border border-[#E5E5DF] rounded-2xl pl-12 pr-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans shadow-sm appearance-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Packages Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#5A5A40]/30 border-t-[#5A5A40] rounded-full animate-spin" />
        </div>
      ) : filteredPackages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => (
            <div key={pkg.id} className="bg-white p-6 rounded-[32px] border border-[#E5E5DF] shadow-sm hover:shadow-md transition-shadow flex flex-col group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center text-[#5A5A40]">
                  <Package size={24} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(pkg)}
                    className="p-2 text-[#5A5A40] hover:bg-[#5A5A40]/10 rounded-xl transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(pkg.id!)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9A9A80] mb-1 block">
                  {pkg.category}
                </span>
                <h3 className="text-xl font-bold text-[#3A3A2A] mb-2">{pkg.name}</h3>
                <p className="text-sm text-[#9A9A80] line-clamp-3 mb-4 leading-relaxed">
                  {pkg.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#F7F7F4] flex items-center justify-between mt-auto">
                <span className="text-2xl font-bold text-[#5A5A40]">{pkg.price}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-[#E5E5DF] p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-[#F7F7F4] rounded-full flex items-center justify-center mx-auto mb-4">
            <Package size={32} className="text-[#9A9A80]" />
          </div>
          <h3 className="text-xl font-bold text-[#3A3A2A] mb-2">No packages found</h3>
          <p className="text-[#9A9A80]">Try adjusting your search or add a new package to get started.</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border border-[#E5E5DF] flex flex-col max-h-[90vh]">
            <div className="bg-[#5A5A40] p-6 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold">{editingPackage ? "Edit Package" : "Add New Package"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#3A3A2A] mb-1.5 ml-1">Package Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                  placeholder="e.g. Signature Facial"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#3A3A2A] mb-1.5 ml-1">Price</label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans"
                    placeholder="e.g. Rs. 2,500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3A3A2A] mb-1.5 ml-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans appearance-none"
                    required
                  >
                    {categories.filter(c => c !== "All").map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A3A2A] mb-1.5 ml-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full bg-[#F7F7F4] border border-[#E5E5DF] rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 font-sans resize-none"
                  placeholder="What's included in this package?"
                  required
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-semibold border border-[#E5E5DF] text-[#3A3A2A] hover:bg-[#F7F7F4] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#5A5A40] text-white px-6 py-4 rounded-2xl font-semibold hover:bg-[#3A3A2A] transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                  {editingPackage ? "Update Package" : "Create Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
