"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { adminNav } from "@/lib/nav";
import {
  Plus, Trash2, ChevronDown, Phone, User, TrendingUp, X, Loader2, Search, UserPlus,
} from "lucide-react";

interface Lead {
  id: string;
  leadId: string;
  name: string;
  surname?: string;
  phone: string;
  gender?: string;
  birthDate?: string;
  guardianPhone?: string;
  guardianName?: string;
  guardianType?: string;
  preferredLang?: string;
  source: string | null;
  status: string;
  note: string | null;
  prepayment?: number;
  createdAt: string;
}

interface GroupOption {
  id: string;
  name: string;
  subject: string;
  _count: { students: number };
}

const STATUS_LABELS: Record<string, string> = {
  new: "Yangi Lid",
  contacted: "Bog'lanildi",
  trial: "Sinov",
  enrolled: "Ro'yxatdan o'tdi",
  rejected: "Rad etildi",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  trial: "bg-purple-100 text-purple-700",
  enrolled: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const COURSES = [
  "Matematika", "Fizika", "Kimyo", "Biologiya",
  "Dasturlash", "Tarix", "Geografiya",
  "Ona tili va adabiyot", "Ingliz tili", "Rus tili",
  "Turk tili", "SAT", "IT (Axborot texnologiyalari)",
];

const TABS = [
  { key: "all", label: "Hammasi" },
  { key: "new", label: "Yangi" },
  { key: "contacted", label: "Bog'lanildi" },
  { key: "trial", label: "Sinov" },
  { key: "enrolled", label: "Ro'yxatdan o'tdi" },
  { key: "rejected", label: "Rad etildi" },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const dropdownBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [modalStep, setModalStep] = useState(1);

  const [form, setForm] = useState({
    name: "", surname: "", phone: "", gender: "", birthDate: "",
    guardianPhone: "", guardianName: "", guardianType: "",
    preferredLang: "", source: "", note: "", prepayment: "",
  });

  // Enrollment modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollLead, setEnrollLead] = useState<Lead | null>(null);
  const [enrollForm, setEnrollForm] = useState({ login: "", password: "", subject: "" });
  const [enrollGroupId, setEnrollGroupId] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [groups, setGroups] = useState<GroupOption[]>([]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const query = activeTab !== "all" ? `?status=${activeTab}` : "";
      const res = await fetch(`/api/admin/leads${query}`);
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: `+998${phoneDigits(form.phone)}`,
          name: form.name.trim(),
          surname: form.surname.trim() || null,
          source: form.source || null,
          note: form.note.trim() || null,
          prepayment: form.prepayment || null,
        }),
      });
      setForm({ name: "", surname: "", phone: "", gender: "", birthDate: "",
        guardianPhone: "", guardianName: "", guardianType: "",
        preferredLang: "", source: "", note: "", prepayment: "" });
      setShowModal(false);
      setModalStep(1);
      fetchLeads();
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setOpenDropdown(null);
    await fetch("/api/admin/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchLeads();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Haqiqatan ham o'chirmoqchimisiz?")) return;
    await fetch("/api/admin/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchLeads();
  };

  const openEnrollModal = async (lead: Lead) => {
    setEnrollLead(lead);
    // Auto-generate numeric login and password
    const login = String(Math.floor(1000000 + Math.random() * 9000000));
    const password = String(Math.floor(10000 + Math.random() * 90000));
    setEnrollForm({ login, password, subject: "" });
    setEnrollGroupId("");
    setShowEnrollModal(true);
    // Fetch groups
    const res = await fetch("/api/admin/groups");
    if (res.ok) {
      const data = await res.json();
      setGroups(data);
    }
  };

  const handleEnroll = async () => {
    if (!enrollLead || !enrollForm.login || !enrollForm.password) return;
    setEnrolling(true);
    try {
      // 1. Create student user
      const fullName = enrollLead.surname
        ? `${enrollLead.name} ${enrollLead.surname}`
        : enrollLead.name;
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: enrollForm.login,
          password: enrollForm.password,
          name: fullName,
          phone: enrollLead.phone,
          role: "student",
          subject: enrollForm.subject || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Xatolik yuz berdi");
        setEnrolling(false);
        return;
      }

      const newUser = await res.json();

      // 2. Add to group if selected
      if (enrollGroupId) {
        await fetch("/api/admin/groups", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: enrollGroupId, addStudentId: newUser.id }),
        });
      }

      // 3. Create initial payment if lead had prepayment
      if (enrollLead.prepayment && enrollLead.prepayment > 0) {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        await fetch("/api/admin/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: newUser.id,
            amount: enrollLead.prepayment,
            month,
            method: "cash",
            note: "Liddan oldindan to'lov",
          }),
        });
      }

      // 4. Update lead status to enrolled
      await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: enrollLead.id, status: "enrolled" }),
      });

      setShowEnrollModal(false);
      setEnrollLead(null);
      fetchLeads();
    } finally {
      setEnrolling(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openDropdown) return;
    const handler = () => { setOpenDropdown(null); setDropdownPos(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openDropdown]);

  const filteredLeads = leads.filter(l =>
    !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone.includes(searchQuery) || (l.leadId && l.leadId.includes(searchQuery))
  );

  const totalLeads = leads.length;
  const enrolledLeads = leads.filter(l => l.status === "enrolled").length;
  const conversionRate = totalLeads > 0 ? ((enrolledLeads / totalLeads) * 100).toFixed(1) : "0";

  const inputClass = "w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-slate-400";

  // Phone formatting: "901234567" → "90 123 45 67"
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 9);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
  };
  const phoneDigits = (val: string) => val.replace(/\D/g, '');
  const isPhoneValid = (val: string) => phoneDigits(val).length === 9;

  return (
    <DashboardLayout navItems={adminNav} roleLabel="Admin" roleColor="bg-red-100 text-red-700">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Yangi lidlar</h1>
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg hover:bg-amber-600 transition-colors font-semibold text-sm">
            <Plus className="w-4 h-4" />
            Yangi qo&apos;shish
          </button>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Ism, telefon yoki LeadID bo'yicha qidirish"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <User className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Lidlar topilmadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Ism</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Telefon</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Fan</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Qo&apos;shilgan sana</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">LeadID</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase px-5 py-3">Status</th>
                    <th className="text-center text-xs font-medium text-slate-500 uppercase px-5 py-3">Davom etish</th>
                    <th className="text-center text-xs font-medium text-slate-500 uppercase px-5 py-3">O&apos;chirish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-900">
                        {lead.name}{lead.surname ? ` ${lead.surname}` : ''}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        <a href={`tel:${lead.phone}`} className="hover:text-[#2660A4] flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {lead.phone}
                        </a>
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        {lead.note ? (
                          <span className="text-slate-700">{lead.note.split('|')[0]?.replace('Fan:', '').trim() || '—'}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">
                        {new Date(lead.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, '.')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                          LeadID: {lead.leadId?.slice(0, 5) || lead.id.slice(0, 5)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[lead.status] || "bg-slate-100 text-slate-700"
                        }`}>
                          {STATUS_LABELS[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          ref={el => { dropdownBtnRefs.current[lead.id] = el; }}
                          onClick={e => {
                            e.stopPropagation();
                            if (openDropdown === lead.id) {
                              setOpenDropdown(null);
                              setDropdownPos(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setDropdownPos({ top: rect.top, left: rect.right });
                              setOpenDropdown(lead.id);
                            }
                          }}
                          className="text-sm text-amber-600 hover:text-amber-700 font-semibold">
                          Davom etish
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button onClick={() => handleDelete(lead.id)}
                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Multi-step Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowModal(false); setModalStep(1); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-lg font-bold text-slate-900">Yangi qo&apos;shish</h2>
              <button onClick={() => { setShowModal(false); setModalStep(1); }} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step tabs */}
            <div className="flex gap-0 px-5 mt-3">
              <button onClick={() => setModalStep(1)}
                className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  modalStep === 1 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
                }`}>
                Shahsiy ma&apos;lumotlar
              </button>
              <button onClick={() => setModalStep(2)}
                className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  modalStep === 2 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
                }`}>
                Oldindan to&apos;lov
              </button>
            </div>

            <div className="p-5">
              {modalStep === 1 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Ism *</label>
                      <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="Ism" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Familiya</label>
                      <input type="text" value={form.surname} onChange={e => setForm({ ...form, surname: e.target.value })}
                        placeholder="Familiya" className={inputClass} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Telefon raqami *</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 bg-blue-50 text-blue-600 text-sm font-semibold border border-r-0 border-slate-200 rounded-l-lg">+998</span>
                      <input type="tel" value={formatPhone(form.phone)}
                        onChange={e => setForm({ ...form, phone: phoneDigits(e.target.value) })}
                        placeholder="90 123 45 67" maxLength={12}
                        className={`flex-1 border rounded-r-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                          form.phone && !isPhoneValid(form.phone) ? 'border-red-300 focus:ring-red-500/30' : 'border-slate-200'
                        }`} />
                    </div>
                    {form.phone && !isPhoneValid(form.phone) && (
                      <p className="text-xs text-red-500 mt-1">9 ta raqam kiriting (masalan: 901234567)</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Jinsi</label>
                      <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                        className={`${inputClass} bg-white`}>
                        <option value="">Tanlang</option>
                        <option value="male">Erkak</option>
                        <option value="female">Ayol</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tug&apos;ilgan sana</label>
                      <input type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })}
                        className={inputClass} />
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Vakil raqami</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 bg-blue-50 text-blue-600 text-sm font-semibold border border-r-0 border-slate-200 rounded-l-lg">+998</span>
                        <input type="tel" value={formatPhone(form.guardianPhone)}
                          onChange={e => setForm({ ...form, guardianPhone: phoneDigits(e.target.value) })}
                          placeholder="90 123 45 67" maxLength={12}
                          className={`flex-1 border rounded-r-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                            form.guardianPhone && !isPhoneValid(form.guardianPhone) ? 'border-red-300 focus:ring-red-500/30' : 'border-slate-200'
                          }`} />
                      </div>
                      {form.guardianPhone && !isPhoneValid(form.guardianPhone) && (
                        <p className="text-xs text-red-500 mt-1">9 ta raqam kiriting</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Vakil ismi</label>
                      <input type="text" value={form.guardianName} onChange={e => setForm({ ...form, guardianName: e.target.value })}
                        placeholder="Vakil ismi" className={inputClass} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Qarindoshlik</label>
                      <select value={form.guardianType} onChange={e => setForm({ ...form, guardianType: e.target.value })}
                        className={`${inputClass} bg-white`}>
                        <option value="">Tanlang</option>
                        <option value="ota">Ota</option>
                        <option value="ona">Ona</option>
                        <option value="aka">Aka</option>
                        <option value="opa">Opa</option>
                        <option value="boshqa">Boshqa</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Afzal til</label>
                      <select value={form.preferredLang} onChange={e => setForm({ ...form, preferredLang: e.target.value })}
                        className={`${inputClass} bg-white`}>
                        <option value="">Tilni tanlang</option>
                        <option value="uz">O&apos;zbekcha</option>
                        <option value="ru">Ruscha</option>
                        <option value="en">Inglizcha</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Lid manbasi</label>
                    <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                      className={`${inputClass} bg-white`}>
                      <option value="">Tanlang</option>
                      <option value="Telegram">Telegram</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Do'stlar">Do&apos;stlar</option>
                      <option value="Boshqa">Boshqa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">O&apos;qituvchi uchun izoh</label>
                    <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                      placeholder="Izohni kiriting..." rows={2}
                      className={`${inputClass} resize-none`} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Oldindan to&apos;lov summasi</label>
                    <input type="number" value={form.prepayment} onChange={e => setForm({ ...form, prepayment: e.target.value })}
                      placeholder="0" className={inputClass} />
                    <p className="text-xs text-slate-400 mt-1">Ixtiyoriy. Agar lid oldindan to&apos;lov qilgan bo&apos;lsa kiriting.</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 mt-5">
                <button onClick={() => { setShowModal(false); setModalStep(1); }}
                  className="flex-1 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50">
                  Bekor qilish
                </button>
                <button onClick={handleCreate}
                  disabled={creating || !form.name.trim() || !isPhoneValid(form.phone)}
                  className="flex-1 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  + Yaratish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Enrollment Modal */}
      {showEnrollModal && enrollLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEnrollModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">O&apos;quvchiga aylantirish</h2>
                  <p className="text-sm text-slate-500">{enrollLead.name}{enrollLead.surname ? ` ${enrollLead.surname}` : ""}</p>
                </div>
              </div>
              <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">
              {/* Lead info summary */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Telefon</span>
                  <span className="font-medium text-slate-700">{enrollLead.phone}</span>
                </div>
                {enrollLead.source && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Manba</span>
                    <span className="font-medium text-slate-700">{enrollLead.source}</span>
                  </div>
                )}
                {enrollLead.prepayment && enrollLead.prepayment > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Oldindan to&apos;lov</span>
                    <span className="font-medium text-emerald-600">{enrollLead.prepayment.toLocaleString()} so&apos;m</span>
                  </div>
                )}
              </div>

              {/* Course selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kurs *</label>
                <select value={enrollForm.subject}
                  onChange={e => setEnrollForm({ ...enrollForm, subject: e.target.value })}
                  className={`${inputClass} bg-white`}>
                  <option value="">Kursni tanlang</option>
                  {COURSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Login & Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Login</label>
                  <input type="text" value={enrollForm.login}
                    onChange={e => setEnrollForm({ ...enrollForm, login: e.target.value })}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parol</label>
                  <input type="text" value={enrollForm.password}
                    onChange={e => setEnrollForm({ ...enrollForm, password: e.target.value })}
                    className={inputClass} />
                </div>
              </div>

              {/* Group selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Guruhga biriktirish (ixtiyoriy)</label>
                {groups.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">Hozircha guruhlar yo&apos;q. Keyinroq guruhlar sahifasidan biriktirishingiz mumkin.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2">
                    {groups.map(g => (
                      <button key={g.id} onClick={() => setEnrollGroupId(enrollGroupId === g.id ? "" : g.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                          enrollGroupId === g.id
                            ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/20"
                            : "border-transparent hover:bg-slate-50"
                        }`}>
                        <div className="font-medium text-sm text-slate-900">{g.name}</div>
                        <div className="text-xs text-slate-500">{g.subject} · {g._count.students} ta o&apos;quvchi</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEnrollModal(false)}
                  className="flex-1 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50">
                  Bekor qilish
                </button>
                <button onClick={handleEnroll}
                  disabled={enrolling || !enrollForm.login.trim() || !enrollForm.password.trim() || !enrollForm.subject}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {enrolling && <Loader2 className="w-4 h-4 animate-spin" />}
                  O&apos;quvchi qilish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Portal dropdown for status change */}
      {openDropdown && dropdownPos && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5"
          style={{
            top: Math.max(8, dropdownPos.top - 5 * 40 - 12),
            left: dropdownPos.left - 192,
          }}
          onClick={e => e.stopPropagation()}
        >
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const lead = filteredLeads.find(l => l.id === openDropdown);
            if (!lead) return null;
            return (
              <button key={key} onClick={() => {
                if (key === "enrolled" && lead.status !== "enrolled") {
                  setOpenDropdown(null);
                  setDropdownPos(null);
                  openEnrollModal(lead);
                } else {
                  handleStatusChange(lead.id, key);
                  setDropdownPos(null);
                }
              }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 transition-colors ${
                  lead.status === key ? "font-semibold text-slate-900 bg-slate-50" : "text-slate-600"
                }`}>
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[key]?.split(" ")[0] || "bg-slate-300"}`} />
                {label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </DashboardLayout>
  );
}
