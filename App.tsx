import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  HardHat, 
  Package, 
  BrainCircuit, 
  Building2, 
  Plus, 
  Search, 
  Bell, 
  Settings, 
  ChevronRight,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  Printer,
  Wallet,
  Menu // Import Menu icon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Project, Material, ViewState, ProjectStatus, UserProfile, AppSettings } from './types';
import { INITIAL_PROJECTS, INITIAL_MATERIALS } from './constants';
import { StatsCard } from './components/StatsCard';
import { ProjectModal } from './components/ProjectModal';
import { PrintModal } from './components/PrintModal';
import { SettingsModal } from './components/SettingsModal';
import { AIAssistant } from './components/AIAssistant';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>('DASHBOARD');
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [materials, setMaterials] = useState<Material[]>(INITIAL_MATERIALS);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State untuk menu mobile
  
  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Admin Utama',
    email: 'admin@promaster.id',
    role: 'Administrator'
  });

  // App Branding State
  const [appSettings, setAppSettings] = useState<AppSettings>({
    appName: 'KONSTRUKSI',
    companyName: 'PRO MASTER'
  });

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [printingProject, setPrintingProject] = useState<Project | null>(null);

  // Helper untuk inisial nama
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Derived Statistics
  const stats = useMemo(() => {
    const totalBudget = projects.reduce((acc, curr) => acc + curr.budget, 0); // Dana Masuk
    const totalSpent = projects.reduce((acc, curr) => acc + curr.spent, 0); // Terpakai
    const totalBalance = totalBudget - totalSpent; // Sisa atau Kurang
    
    const activeProjects = projects.filter(p => p.status === ProjectStatus.ONGOING).length;
    const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
    const pendingProjects = projects.filter(p => p.status === ProjectStatus.PLANNING).length;
    
    return { totalBudget, totalSpent, totalBalance, activeProjects, completedProjects, pendingProjects };
  }, [projects]);

  const chartData = useMemo(() => {
    return projects.map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      'Dana Masuk': p.budget,
      'Terpakai': p.spent
    }));
  }, [projects]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const statusData = useMemo(() => {
    const counts = {
      [ProjectStatus.ONGOING]: 0,
      [ProjectStatus.COMPLETED]: 0,
      [ProjectStatus.PLANNING]: 0,
      [ProjectStatus.ON_HOLD]: 0,
    };
    projects.forEach(p => counts[p.status]++);
    return Object.keys(counts).map(key => ({ name: key, value: counts[key as ProjectStatus] }));
  }, [projects]);

  // CRUD Handlers
  const handleSaveProject = (project: Project) => {
    if (editingProject) {
      setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    } else {
      setProjects(prev => [...prev, project]);
    }
    setEditingProject(null);
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data proyek ini?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSaveSettings = (newProfile: UserProfile, newAppSettings: AppSettings) => {
    setUserProfile(newProfile);
    setAppSettings(newAppSettings);
    // Di aplikasi nyata, di sini kita akan mengirim data ke backend
  };

  const handleViewChange = (view: ViewState) => {
    setActiveView(view);
    setIsMobileMenuOpen(false); // Tutup menu saat pindah halaman di mobile
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const openGlobalPrint = () => {
    setPrintingProject(null);
    setIsPrintModalOpen(true);
  };

  const openSinglePrint = (project: Project) => {
    setPrintingProject(project);
    setIsPrintModalOpen(true);
  };

  // Helper to render currency
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const handleExportPDF = (customTitle: string) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(customTitle, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 30);
    doc.text(`Dicetak oleh: ${userProfile.name} (${userProfile.role})`, 14, 35); // Add printed by info

    if (printingProject) {
      // --- LOGIKA CETAK SATU PROYEK ---
      const p = printingProject;
      const balance = p.budget - p.spent;

      // Logic untuk menampilkan tanggal jika kosong
      let periodStr = '-';
      if (p.startDate && p.endDate) {
        periodStr = `${p.startDate} s/d ${p.endDate}`;
      } else if (p.startDate) {
        periodStr = `Mulai: ${p.startDate}`;
      } else if (p.endDate) {
        periodStr = `Target: ${p.endDate}`;
      }

      // Tabel Detail Proyek
      autoTable(doc, {
        startY: 40,
        head: [['Atribut', 'Detail Informasi']],
        body: [
            ['ID Proyek', p.id],
            ['Nama Proyek', p.name],
            ['Klien', p.client],
            ['Manajer Proyek', p.manager],
            ['Lokasi', p.location],
            ['Periode', periodStr],
            ['Status', p.status],
            ['Progress', `${p.progress}%`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }, // Blue 500
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [241, 245, 249] } }
      });

      // Ringkasan Keuangan
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("Ringkasan Keuangan", 14, finalY + 15);

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Kategori', 'Nominal', 'Keterangan']],
        body: [
            ['Total Dana Masuk', formatRupiah(p.budget), 'Anggaran Awal'],
            ['Total Dana Terpakai', formatRupiah(p.spent), 'Pengeluaran Real'],
            ['Sisa / (Kurang)', balance < 0 ? `(${formatRupiah(Math.abs(balance))})` : formatRupiah(balance), balance < 0 ? 'Defisit Anggaran' : 'Surplus Anggaran']
        ],
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] }, // Slate 800
        columnStyles: { 
            1: { fontStyle: 'bold' },
            2: { fontStyle: 'italic', textColor: balance < 0 ? [220, 38, 38] : [22, 163, 74] }
        }
      });

    } else {
      // --- LOGIKA CETAK SEMUA PROYEK (TABEL) ---
      const tableColumn = ["Nama Proyek", "Lokasi", "Dana Masuk", "Terpakai", "Sisa / (Kurang)", "Progress"];
      const tableRows = projects.map(project => {
        const balance = project.budget - project.spent;
        const balanceStr = balance < 0 ? `(${formatRupiah(Math.abs(balance))})` : formatRupiah(balance);
        return [
          project.name,
          project.location,
          formatRupiah(project.budget),
          formatRupiah(project.spent),
          balanceStr,
          `${project.progress}%`
        ]
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        headStyles: { 
          fillColor: [59, 130, 246], // Blue 500
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          font: 'helvetica'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Slate 50
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          4: { fontStyle: 'bold' } 
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
             const rawValue = data.cell.raw as string;
             if (rawValue.includes('(')) {
               data.cell.styles.textColor = [220, 38, 38]; // Red
             } else {
               data.cell.styles.textColor = [22, 163, 74]; // Green
             }
          }
        }
      });
    }

    // Generate filename based on title
    const filename = customTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.pdf';
    doc.save(filename);
    
    // Reset state
    setPrintingProject(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex overflow-hidden">
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Responsif (Fixed on mobile, Static on Desktop) */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-30 w-72 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Building2 size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight uppercase">{appSettings.appName}</h1>
              <span className="text-xs text-blue-400 font-medium tracking-widest uppercase">{appSettings.companyName}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
          <button 
            onClick={() => handleViewChange('DASHBOARD')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === 'DASHBOARD' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          
          <button 
            onClick={() => handleViewChange('PROJECTS')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === 'PROJECTS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <HardHat size={20} />
            <span className="font-medium">Data Proyek</span>
          </button>

          <button 
            onClick={() => handleViewChange('INVENTORY')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeView === 'INVENTORY' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Package size={20} />
            <span className="font-medium">Inventaris</span>
          </button>

          <div className="pt-4 mt-4 border-t border-slate-800">
            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Intelligence</p>
            <button 
              onClick={() => handleViewChange('AI_INSIGHTS')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${activeView === 'AI_INSIGHTS' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <BrainCircuit size={20} className={activeView === 'AI_INSIGHTS' ? 'text-white' : 'text-purple-400 group-hover:text-white'} />
              <span className="font-medium">AI Consultant</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300">
              {getInitials(userProfile.name)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{userProfile.name}</p>
              <p className="text-xs text-slate-400 truncate">{userProfile.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full relative">
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
             {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg lg:text-xl font-bold text-slate-800 truncate">
              {activeView === 'DASHBOARD' && 'Dashboard Overview'}
              {activeView === 'PROJECTS' && 'Manajemen Proyek'}
              {activeView === 'INVENTORY' && 'Stok Material'}
              {activeView === 'AI_INSIGHTS' && 'AI Intelligence'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Cari data..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48 lg:w-64"
              />
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full hover:text-blue-600 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic View Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          
          {/* DASHBOARD VIEW */}
          {activeView === 'DASHBOARD' && (
            <div className="space-y-6 lg:space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <StatsCard 
                  title="Total Dana Masuk" 
                  value={formatRupiah(stats.totalBudget)}
                  trend={12.5}
                  icon={<DollarSign className="w-6 h-6" />}
                  color="blue"
                />
                <StatsCard 
                  title="Dana Terpakai" 
                  value={formatRupiah(stats.totalSpent)}
                  trend={-2.4}
                  trendLabel="efisiensi"
                  icon={<TrendingUp className="w-6 h-6" />}
                  color="orange"
                />
                 <StatsCard 
                  title="Sisa Dana / (Kurang)" 
                  value={stats.totalBalance < 0 ? `(${formatRupiah(Math.abs(stats.totalBalance))})` : formatRupiah(stats.totalBalance)}
                  trend={0}
                  trendLabel="Balance"
                  icon={<Wallet className="w-6 h-6" />}
                  color={stats.totalBalance < 0 ? "red" : "green"}
                />
                 <StatsCard 
                  title="Proyek Aktif" 
                  value={stats.activeProjects.toString()}
                  trend={0}
                  icon={<HardHat className="w-6 h-6" />}
                  color="blue"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Financial Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Analisis Dana Proyek</h3>
                    <select className="text-sm border-slate-300 rounded-md bg-slate-50 px-3 py-1 text-slate-600 border outline-none">
                      <option>Tahun Ini</option>
                      <option>Bulan Ini</option>
                    </select>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `Rp${val/1000000000}M`} />
                        <Tooltip 
                          cursor={{fill: '#f1f5f9'}}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => formatRupiah(value)}
                        />
                        <Bar dataKey="Dana Masuk" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar dataKey="Terpakai" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Status Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Status Proyek</h3>
                  <div className="h-64 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                      <span className="text-3xl font-bold text-slate-800">{projects.length}</span>
                      <p className="text-xs text-slate-500">Total Proyek</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {statusData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span className="text-slate-600">{item.name}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROJECTS VIEW */}
          {activeView === 'PROJECTS' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-lg font-semibold text-slate-600">Daftar Semua Proyek</h3>
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    onClick={openGlobalPrint}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-all flex-1 md:flex-none"
                  >
                    <Printer size={18} />
                    <span className="hidden md:inline">Cetak Tabel</span>
                    <span className="md:hidden">Cetak</span>
                  </button>
                  <button 
                    onClick={openAddModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium shadow-lg shadow-blue-500/30 transition-all flex-1 md:flex-none"
                  >
                    <Plus size={18} />
                    <span>Tambah</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">Nama Proyek</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[150px]">Dana Masuk</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[150px]">Terpakai</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[150px]">Sisa / (Kurang)</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right min-w-[150px]">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projects.map((project) => {
                         const balance = project.budget - project.spent;
                         return (
                        <tr key={project.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800">{project.name}</div>
                            <div className="text-xs text-slate-500">{project.location}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded w-fit">
                              {formatRupiah(project.budget)}
                            </div>
                          </td>
                           <td className="px-6 py-4 text-sm text-slate-600">
                             {formatRupiah(project.spent)}
                          </td>
                          <td className="px-6 py-4">
                            <div className={`text-sm font-bold ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {balance < 0 ? `(${formatRupiah(Math.abs(balance))})` : formatRupiah(balance)}
                            </div>
                             <div className="text-xs text-slate-400 mt-0.5">
                              {balance < 0 ? 'Defisit' : 'Tersedia'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                              ${project.status === ProjectStatus.COMPLETED ? 'bg-green-100 text-green-800' : 
                                project.status === ProjectStatus.ONGOING ? 'bg-blue-100 text-blue-800' :
                                project.status === ProjectStatus.PLANNING ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-800'}`}>
                              {project.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => openSinglePrint(project)}
                                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Cetak Laporan Proyek Ini"
                              >
                                <Printer size={16} />
                              </button>
                              <button 
                                onClick={() => openEditModal(project)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Pencil size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteProject(project.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
                {projects.length === 0 && (
                   <div className="p-12 text-center text-slate-500">
                     Belum ada data proyek. Klik "Tambah Proyek" untuk memulai.
                   </div>
                )}
              </div>
            </div>
          )}

          {/* INVENTORY VIEW */}
          {activeView === 'INVENTORY' && (
             <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                 {materials.map(material => (
                   <div key={material.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                     <div className="flex justify-between items-start mb-4">
                       <div className="p-2 bg-slate-100 rounded-lg">
                         <Package className="w-6 h-6 text-slate-600" />
                       </div>
                       <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">
                         {material.category}
                       </span>
                     </div>
                     <h4 className="font-bold text-slate-800 mb-1">{material.name}</h4>
                     <p className="text-2xl font-bold text-blue-600">{material.quantity} <span className="text-sm text-slate-400 font-normal">{material.unit}</span></p>
                     <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                        <span className="text-slate-500">Harga Satuan</span>
                        <span className="font-medium">{formatRupiah(material.unitPrice)}</span>
                     </div>
                   </div>
                 ))}
               </div>
               
               <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                 <div className="text-center md:text-left">
                   <h4 className="font-bold text-blue-800">Butuh Material Tambahan?</h4>
                   <p className="text-blue-600 text-sm mt-1">Gunakan AI Consultant untuk memprediksi kebutuhan material bulan depan berdasarkan progress proyek.</p>
                 </div>
                 <button 
                   onClick={() => handleViewChange('AI_INSIGHTS')}
                   className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 w-full md:w-auto"
                 >
                   Tanya AI
                 </button>
               </div>
             </div>
          )}

          {/* AI INSIGHTS VIEW */}
          {activeView === 'AI_INSIGHTS' && (
            <AIAssistant projects={projects} materials={materials} />
          )}

        </div>
      </main>

      {/* Edit/Add Modal */}
      <ProjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProject}
        initialData={editingProject}
      />
      
      {/* Print Modal */}
      <PrintModal 
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        onPrint={handleExportPDF}
        initialTitle={printingProject ? `Laporan Proyek: ${printingProject.name}` : undefined}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        userProfile={userProfile}
        appSettings={appSettings}
        onSave={handleSaveSettings}
      />

    </div>
  );
};

export default App;