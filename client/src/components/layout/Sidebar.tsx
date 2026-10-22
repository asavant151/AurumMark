import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Sparkles,
  LayoutDashboard,
  FolderKanban,
  Images,
  UploadCloud,
  Stamp,
  Sliders,
  Cpu,
  History,
  Download,
  Users,
  MailPlus,
  ShieldCheck,
  HardDrive,
  FileText,
  Settings,
  Eye,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onClose }) => {
  const { role, permissions, company } = useAuthStore();

  const companyNav = [
    {
      category: 'Overview',
      items: [
        { name: 'Dashboard', to: '/company/dashboard', icon: LayoutDashboard },
        { name: 'Company Profile', to: '/company/profile', icon: Settings },
      ],
    },
    {
      category: 'Jewellery Assets',
      items: [
        { name: 'Projects & Collections', to: '/company/projects', icon: FolderKanban },
        { name: 'Design Gallery', to: '/company/gallery', icon: Images },
        { name: 'Upload Center', to: '/company/upload', icon: UploadCloud },
      ],
    },
    {
      category: 'Watermarking Studio',
      items: [
        { name: 'Watermark Editor', to: '/company/editor', icon: Stamp },
        { name: 'Watermark Templates', to: '/company/templates', icon: Sliders },
        { name: 'Bulk Processing', to: '/company/processing', icon: Cpu },
        { name: 'Processing History', to: '/company/history', icon: History },
        { name: 'Download History', to: '/company/downloads', icon: Download },
      ],
    },
    {
      category: 'Workspace Admin',
      items: [
        { name: 'Team Members', to: '/company/members', icon: Users },
        { name: 'Invitations', to: '/company/invitations', icon: MailPlus },
        { name: 'Role & Permissions', to: '/company/permissions', icon: ShieldCheck },
        { name: 'Storage Usage', to: '/company/storage', icon: HardDrive },
        { name: 'Activity Logs', to: '/company/activity', icon: FileText },
      ],
    },
    {
      category: 'Preferences',
      items: [{ name: 'Account Settings', to: '/settings/account', icon: Settings }],
    },
  ];

  // Designer Navigation with strict permission gating
  const designerNav = [
    {
      category: 'Overview',
      items: [{ name: 'Designer Dashboard', to: '/designer/dashboard', icon: LayoutDashboard }],
    },
    {
      category: 'Jewellery Assets',
      items: [
        { name: 'Projects', to: '/designer/projects', icon: FolderKanban },
        { name: 'Design Gallery', to: '/designer/gallery', icon: Images },
        ...(permissions?.canUpload !== false
          ? [{ name: 'Upload Images', to: '/designer/upload', icon: UploadCloud }]
          : []),
      ],
    },
    {
      category: 'Watermarking Studio',
      items: [
        ...(permissions?.canCreateTemplate !== false || permissions?.canEditTemplate !== false
          ? [{ name: 'Watermark Editor', to: '/designer/editor', icon: Stamp }]
          : []),
        { name: 'Saved Templates', to: '/designer/templates', icon: Sliders },
        ...(permissions?.canProcess !== false
          ? [{ name: 'Bulk Processing', to: '/designer/processing', icon: Cpu }]
          : []),
        ...(permissions?.canExportZip !== false
          ? [{ name: 'Download History', to: '/designer/downloads', icon: Download }]
          : []),
      ],
    },
    {
      category: 'Preferences',
      items: [{ name: 'Account Settings', to: '/settings/account', icon: Settings }],
    },
  ].filter((sec) => sec.items.length > 0);

  // Viewer Navigation: strictly read-only catalog, no studio/templates
  const allowViewerDownloads =
    company?.settings?.allowViewerDownload !== false ||
    company?.settings?.allowViewerZipDownload === true;

  const viewerNav = [
    {
      category: 'Overview',
      items: [{ name: 'Viewer Dashboard', to: '/viewer/dashboard', icon: LayoutDashboard }],
    },
    {
      category: 'Jewellery Catalogue',
      items: [
        { name: 'Collections', to: '/viewer/projects', icon: FolderKanban },
        { name: 'Design Gallery', to: '/viewer/gallery', icon: Images },
        { name: 'High-Res Preview', to: '/viewer/preview', icon: Eye },
      ],
    },
    {
      category: 'Operations',
      items: [
        { name: 'Processing Status', to: '/viewer/status', icon: History },
        ...(allowViewerDownloads
          ? [{ name: 'Download History', to: '/viewer/downloads', icon: Download }]
          : []),
      ],
    },
    {
      category: 'Preferences',
      items: [{ name: 'Account Settings', to: '/settings/account', icon: Settings }],
    },
  ].filter((sec) => sec.items.length > 0);

  const sections =
    role === 'Company' ? companyNav : role === 'Designer' ? designerNav : viewerNav;

  const renderSidebarContent = (isMobile: boolean = false) => (
    <div className="flex flex-col h-full bg-white">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#B8860B] flex items-center justify-center text-white shadow-sm shadow-[#7C3AED]/20">
            <Sparkles className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-[#1E293B] font-heading block leading-none">
              Aurum<span className="text-[#7C3AED]">Mark</span>
            </span>
            <span className="text-[10px] font-medium text-[#64748B] tracking-wider uppercase">
              Jewellery SaaS
            </span>
          </div>
        </div>

        {isMobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        {sections.map((section, idx) => (
          <div key={idx}>
            <div className="px-3 text-[10px] sm:text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1 font-heading">
              {section.category}
            </div>
            <nav className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    if (isMobile && onClose) onClose();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-[#7C3AED]/10 text-[#7C3AED] border-l-3 border-[#7C3AED]'
                        : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F8FAFC]'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Branding Badge */}
      <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC]/50">
        <div className="p-2.5 rounded-lg border border-[#E2E8F0] bg-white flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          <span className="text-[11px] font-medium text-[#64748B]">
            {role === 'Company' ? 'Owner Workspace' : `${role} Mode`}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop / Laptop Persistent Sidebar */}
      <aside className="hidden md:flex w-60 lg:w-64 bg-white border-r border-[#E2E8F0] flex-col flex-shrink-0 min-h-screen">
        {renderSidebarContent(false)}
      </aside>

      {/* Tablet / Mobile Slide-out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          {/* Drawer Panel */}
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10 min-h-screen animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
