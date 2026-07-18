'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { GraduationCap, Menu, X, LogOut, ChevronDown, Settings, Search, Users, UserPlus, FolderOpen, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SessionUser {
  id: string;
  name: string;
  login: string;
  role: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  roleLabel: string;
  roleColor: string;
}

export default function DashboardLayout({ children, navItems, roleLabel, roleColor }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ students: any[]; teachers: any[]; groups: any[] } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hasSidebar = navItems.length > 0;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) setUser(data.user);
        else router.push('/login');
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (q.trim().length < 2) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setSearchOpen(true);
        }
      } catch { /* ignore */ }
    }, 300);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (!(e.target as HTMLElement).closest('[data-profile-dropdown]')) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-[#0b1120]' : 'bg-[#f8f9fb]'}`}>
      {/* ──── Sidebar - Desktop (only if navItems exist) ──── */}
      {hasSidebar && (
        <aside className={`hidden md:flex w-[88px] flex-col fixed inset-y-0 left-0 z-30 border-r ${
          theme === 'dark'
            ? 'bg-[#0f172a] border-[#1e293b]'
            : 'bg-white border-slate-200'
        }`}>
          {/* Logo */}
          <div className={`py-3 flex items-center justify-center border-b ${
            theme === 'dark' ? 'border-[#1e293b]' : 'border-slate-200'
          }`}>
            <Link href="/">
              <Image src="/logo-vertical.png" alt="Aka-Uka" width={60} height={60} className="object-contain" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 py-2.5 mx-1.5 rounded-xl text-center transition-all ${
                    isActive
                      ? theme === 'dark'
                        ? 'bg-[#2660A4] text-white'
                        : 'bg-[#2660A4] text-white'
                      : theme === 'dark'
                        ? 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
                        : 'text-[#2660A4] hover:bg-[#2660A4]/10'
                  }`}
                >
                  <item.icon className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Version & Status */}
          <div className={`py-3 px-2 border-t text-center ${
            theme === 'dark' ? 'border-[#1e293b]' : 'border-slate-200'
          }`}>
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 bg-[#22AA79] rounded-full animate-pulse" />
              <span className="text-[9px] font-medium text-[#22AA79]">Online</span>
            </div>
            <p className={`text-[9px] mb-2 ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>v1.0.0</p>
            <div className="flex items-center justify-center gap-1">
              <Image src="/zyron-mark.svg" alt="Zyron" width={14} height={14} />
              <span className={`text-[8px] font-medium ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>Zyron</span>
            </div>
          </div>
        </aside>
      )}

      {/* ──── Mobile sidebar overlay (only if navItems exist) ──── */}
      {hasSidebar && sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#0f1b2d] flex flex-col animate-slide-in">
            <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Image src="/logo-horizontal-white.png" alt="Aka-Uka" width={120} height={36} className="object-contain" />
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all relative ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-blue-500 rounded-r" />
                    )}
                    <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-blue-400' : ''}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ──── Main content ──── */}
      <div className={`flex-1 flex flex-col h-screen min-w-0 overflow-hidden ${hasSidebar ? 'md:ml-[88px]' : ''}`}>
        {/* Top bar */}
        <header className={`flex-shrink-0 z-20 h-14 flex items-center justify-between px-4 lg:px-6 ${
          theme === 'dark' ? 'bg-[#1a3a6a] border-b border-[#2660A4]/30' : 'bg-[#2660A4]'
        }`}>
          {/* Mobile menu (only if sidebar exists) */}
          {hasSidebar ? (
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Menu className="w-5 h-5 text-white" />
            </button>
          ) : (
            <Link href="/">
              <Image src="/logo-horizontal-white.png" alt="Aka-Uka" width={120} height={36} className="object-contain" />
            </Link>
          )}

          {/* Global search (admin only) */}
          {user.role === 'admin' && (
            <div ref={searchRef} className="hidden sm:block relative flex-1 max-w-md mx-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults && setSearchOpen(true)}
                placeholder="Qidirish... (o'quvchi, o'qituvchi, guruh)"
                className="w-full bg-white/10 text-white placeholder-white/50 text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-white/15 transition-colors"
              />
              {searchOpen && searchResults && (
                <div className={`absolute top-full mt-2 left-0 right-0 rounded-xl shadow-2xl border overflow-hidden z-50 max-h-[400px] overflow-y-auto ${
                  theme === 'dark' ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-slate-200'
                }`}>
                  {searchResults.students.length === 0 && searchResults.teachers.length === 0 && searchResults.groups.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Natija topilmadi</p>
                  ) : (
                    <>
                      {searchResults.students.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" /> O&apos;quvchilar
                            </p>
                          </div>
                          {searchResults.students.map((s: any) => (
                            <Link
                              key={s.id}
                              href="/dashboard/admin/students"
                              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors"
                            >
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-600">
                                  {s.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{s.name}</p>
                                <p className="text-xs text-slate-400">{s.login} {s.phone && `• ${s.phone}`}</p>
                              </div>
                              {s.status && (
                                <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  s.status === 'active' ? 'bg-green-100 text-green-700' :
                                  s.status === 'frozen' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {s.status === 'active' ? 'Faol' : s.status === 'frozen' ? 'Muzlatilgan' : 'Arxiv'}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchResults.teachers.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                              <UserPlus className="w-3.5 h-3.5" /> O&apos;qituvchilar
                            </p>
                          </div>
                          {searchResults.teachers.map((t: any) => (
                            <Link
                              key={t.id}
                              href="/dashboard/admin/teachers"
                              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors"
                            >
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-xs font-bold text-purple-600">
                                  {t.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{t.name}</p>
                                <p className="text-xs text-slate-400">{t.login} {t.phone && `• ${t.phone}`}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchResults.groups.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                              <FolderOpen className="w-3.5 h-3.5" /> Guruhlar
                            </p>
                          </div>
                          {searchResults.groups.map((g: any) => (
                            <Link
                              key={g.id}
                              href="/dashboard/admin/groups"
                              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors"
                            >
                              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                <FolderOpen className="w-4 h-4 text-amber-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{g.name}</p>
                                <p className="text-xs text-slate-400">{g.subject} • {g._count?.students ?? 0} o&apos;quvchi</p>
                              </div>
                              <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {g.status === 'active' ? 'Faol' : 'Arxiv'}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Left spacer on desktop (only with sidebar, no search) */}
          {hasSidebar && user.role !== 'admin' && <div className="hidden md:block flex-1" />}

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={theme === 'light' ? 'Tungi rejim' : 'Kunduzgi rejim'}
            >
              {theme === 'light' ? (
                <Moon className="w-4.5 h-4.5 text-white/70" />
              ) : (
                <Sun className="w-4.5 h-4.5 text-yellow-300" />
              )}
            </button>
            <span className={`px-2.5 py-1 rounded text-[11px] font-semibold ${roleColor}`}>
              {roleLabel}
            </span>

            <div className="relative" data-profile-dropdown>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 hover:bg-white/10 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <div className="w-8 h-8 bg-[#22AA79] rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{initials}</span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-white leading-tight">{user.name}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/50 hidden sm:block" />
              </button>

              {profileOpen && (
                <div className={`absolute right-0 top-full mt-2 w-52 rounded-lg shadow-xl border py-1.5 z-50 ${
                  theme === 'dark' ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-slate-200'
                }`}>
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.login}</p>
                  </div>
                  <Link
                    href={`/dashboard/${user.role}/settings`}
                    onClick={() => setProfileOpen(false)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" /> Sozlamalar
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Chiqish
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 min-h-0 overflow-auto p-4 lg:p-6 ${
          theme === 'dark' ? 'bg-[#0b1120]' : ''
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
}
