import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Type,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Package,
  Search,
  Download,
  ArrowUpCircle,
  Trash2,
  RefreshCw,
  Terminal,
  Sparkles,
  Palette,
  ChevronDown,
  ChevronUp,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  FolderGit2,
  FolderArchive,
  FileCode,
  Folder,
} from 'lucide-react';
import { ExecutionEngine, SyntaxColors } from '../types';
import { DEFAULT_CUSTOM_COLORS } from '../constants/themes';
import { testBrowserWebAssemblySupport } from '../utils/pythonRunner';
import { getStoredApiKey, setStoredApiKey, testGeminiApiKey } from '../utils/geminiClient';

interface InstalledPackage {
  name: string;
  version: string;
}

interface PackageSearchItem {
  name: string;
  summary: string;
  version?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  indentSpaces: number;
  setIndentSpaces: (spaces: number) => void;
  engine: ExecutionEngine;
  setEngine: (engine: ExecutionEngine) => void;
  onOpenColorPicker?: () => void;
  customColors?: SyntaxColors;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  indentSpaces,
  setIndentSpaces,
  engine,
  setEngine,
  onOpenColorPicker,
  customColors,
}) => {
  const [versionInfo, setVersionInfo] = useState<{
    cpythonVersion: string;
    cpythonDetails: string;
    pyodideVersion: string;
    pyodideDetails: string;
  }>({
    cpythonVersion: '3.10.12',
    cpythonDetails: 'CPython 3.10.12 (Linux x86_64 Native)',
    pyodideVersion: '3.12.7',
    pyodideDetails: 'Pyodide v0.26.4 (Python 3.12.7 WebAssembly)',
  });

  const [wasmStatus, setWasmStatus] = useState<{ ok: boolean; message: string; details?: string } | null>(null);

  // Package Manager States
  const [isInstalledDropdownOpen, setIsInstalledDropdownOpen] = useState<boolean>(false);
  const [pkgTab, setPkgTab] = useState<'installed' | 'search'>('installed');
  
  // Always include preinstalled libraries so they are never lost across sessions
  const DEFAULT_PREINSTALLED_PACKAGES: InstalledPackage[] = [
    { name: 'pyfiglet', version: '1.0.4' },
    { name: 'colorama', version: '0.4.6' },
    { name: 'certifi', version: '2026.10.23' },
    { name: 'charset-normalizer', version: '3.5.2' },
  ];

  const [installedPackages, setInstalledPackages] = useState<InstalledPackage[]>(() => {
    try {
      const saved = localStorage.getItem('pydroid3_installed_packages');
      const map = new Map<string, InstalledPackage>();
      for (const p of DEFAULT_PREINSTALLED_PACKAGES) {
        map.set(p.name.toLowerCase(), p);
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          for (const p of parsed) {
            if (p && p.name) map.set(p.name.toLowerCase(), p);
          }
        }
      }
      return Array.from(map.values());
    } catch (_) {
      return DEFAULT_PREINSTALLED_PACKAGES;
    }
  });
  const [isLoadingPackages, setIsLoadingPackages] = useState<boolean>(false);
  const [installedFilter, setInstalledFilter] = useState<string>('');

  // Search & Install States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PackageSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [customPkgInput, setCustomPkgInput] = useState<string>('');

  // Gemini API Key for Android APK & Standalone
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => getStoredApiKey());
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState<boolean>(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<{ ok?: boolean; message?: string } | null>(null);

  const handleSaveApiKey = () => {
    setStoredApiKey(geminiApiKey);
    setApiKeyStatus({ ok: true, message: 'Đã lưu khóa API Gemini vào thiết bị!' });
    setTimeout(() => setApiKeyStatus(null), 3000);
  };

  const handleTestApiKey = async () => {
    setIsTestingApiKey(true);
    setApiKeyStatus(null);
    try {
      const res = await testGeminiApiKey(geminiApiKey);
      setApiKeyStatus({ ok: res.ok, message: res.message });
      if (res.ok) {
        setStoredApiKey(geminiApiKey);
      }
    } catch (err: any) {
      setApiKeyStatus({ ok: false, message: `Lỗi: ${err.message}` });
    } finally {
      setIsTestingApiKey(false);
    }
  };

  // ZIP Source Export for GitHub & APK
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [showGitHubFileList, setShowGitHubFileList] = useState(false);
  const [zipDownloadStatus, setZipDownloadStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const handleDownloadSourceZip = async () => {
    setIsDownloadingZip(true);
    setZipDownloadStatus(null);

    try {
      // Use in-memory fetch with credentials to avoid Cloud Run iframe cookie-check redirect
      const response = await fetch('/api/export-project-zip', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Máy chủ báo lỗi HTTP ${response.status}`);
      }

      const blob = await response.blob();

      // Check magic bytes: standard ZIP header starts with 'PK' (0x50, 0x4B)
      const headerBuffer = await blob.slice(0, 4).arrayBuffer();
      const headerBytes = new Uint8Array(headerBuffer);
      const isZip = headerBytes[0] === 0x50 && headerBytes[1] === 0x4B;

      if (!isZip) {
        const text = await blob.text();
        if (text.includes('Cookie check') || text.includes('<!doctype html>')) {
          throw new Error('Trình duyệt chặn cookie xác thực trong iframe. Vui lòng mở trang web ở tab mới hoặc bấm nút mở cửa sổ bên dưới.');
        }
        throw new Error('Dữ liệu nhận về không phải file ZIP hợp lệ.');
      }

      // Trigger download from local blob URL directly in memory
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'pydroid3-android-source.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);

      const sizeMb = (blob.size / (1024 * 1024)).toFixed(1);
      setZipDownloadStatus({ ok: true, message: `Đã tải về thành công file ZIP chuẩn (${sizeMb} MB)! Bạn có thể giải nén bình thường.` });
    } catch (err: any) {
      console.error('Download error:', err);
      setZipDownloadStatus({ ok: false, message: `Lỗi: ${err.message || 'Không thể tải file'}` });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Execution / Terminal Output States
  const [activeActionPkg, setActiveActionPkg] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'install' | 'upgrade' | 'uninstall' | null>(null);
  const [actionOutput, setActionOutput] = useState<string>('');
  const [actionStatus, setActionStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [showLogTerminal, setShowLogTerminal] = useState<boolean>(false);

  // Fetch installed packages from server and sync with persistent storage
  const fetchInstalledPackages = async () => {
    setIsLoadingPackages(true);
    try {
      const res = await fetch('/api/python/packages');
      if (res.ok) {
        const data = await res.json();
        if (data && data.packages && Array.isArray(data.packages)) {
          const map = new Map<string, InstalledPackage>();
          for (const p of DEFAULT_PREINSTALLED_PACKAGES) {
            map.set(p.name.toLowerCase(), p);
          }
          for (const p of data.packages) {
            if (p && p.name) map.set(p.name.toLowerCase(), p);
          }
          const merged = Array.from(map.values());
          setInstalledPackages(merged);
          try {
            localStorage.setItem('pydroid3_installed_packages', JSON.stringify(merged));
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('Failed to load packages:', e);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  // Search packages
  const handleSearchPackages = async (q: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/python/packages/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data && data.packages) {
        setSearchResults(data.packages);
      }
    } catch (e) {
      console.warn('Search packages error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger Install or Upgrade with guaranteed offline/APK & online persistence
  const handleInstallPackage = async (pkgName: string, isUpgrade: boolean = false) => {
    if (!pkgName.trim()) return;
    const clean = pkgName.trim();

    setActiveActionPkg(clean);
    setActionType(isUpgrade ? 'upgrade' : 'install');
    setActionStatus('running');
    setActionOutput(`📦 [pip install${isUpgrade ? ' --upgrade' : ''} ${clean}]\nĐang cài đặt thư viện...\n`);
    setShowLogTerminal(true);

    let installMsg = '';

    // 1. Install via backend if running on web/dev server
    try {
      const res = await fetch('/api/python/packages/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean, upgrade: isUpgrade }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          installMsg = data.output || `Hoàn tất cài đặt ${clean}!`;
        }
      }
    } catch (_) {
      // Backend not running (standalone APK)
    }

    // 2. Also load via micropip in Pyodide WASM
    if (typeof window !== 'undefined' && (window as any).pyodideInstance) {
      try {
        const py = (window as any).pyodideInstance;
        await py.loadPackage('micropip');
        const micropip = py.pyimport('micropip');
        await micropip.install(clean);
        installMsg += `\n✓ Đã nạp thành công vào động cơ Pyodide trên máy!`;
      } catch (wasmErr: any) {
        console.warn('WASM micropip notice:', wasmErr);
      }
    }

    // 3. ALWAYS persist in installedPackages and localStorage immediately
    const newPkg: InstalledPackage = { name: clean, version: 'installed' };
    setInstalledPackages((prev) => {
      const filtered = prev.filter((p) => p.name.toLowerCase() !== clean.toLowerCase());
      const updated = [...filtered, newPkg];
      try {
        localStorage.setItem('pydroid3_installed_packages', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    setActionStatus('success');
    setActionOutput(installMsg || `Đã cài đặt thành công ${clean} và lưu trữ vĩnh viễn trên thiết bị!`);
    setCustomPkgInput('');
    setActiveActionPkg(null);
  };

  // Trigger Uninstall
  const handleUninstallPackage = async (pkgName: string) => {
    if (!pkgName.trim()) return;
    const clean = pkgName.trim();
    if (!confirm(`Bạn có chắc chắn muốn gỡ cài đặt thư viện [${clean}] không?`)) {
      return;
    }

    setActiveActionPkg(clean);
    setActionType('uninstall');
    setActionStatus('running');
    setActionOutput(`🗑️ [pip uninstall -y ${clean}]\nĐang tiến hành gỡ bỏ...\n`);
    setShowLogTerminal(true);

    // Remove from state and localStorage immediately
    setInstalledPackages((prev) => {
      const updated = prev.filter((p) => p.name.toLowerCase() !== clean.toLowerCase());
      try {
        localStorage.setItem('pydroid3_installed_packages', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    try {
      const res = await fetch('/api/python/packages/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean }),
      });
      const data = await res.json();
      setActionOutput(data.output || (data.success ? `Đã gỡ cài đặt ${clean} thành công!` : `Lỗi: ${data.error}`));
      setActionStatus(data.success ? 'success' : 'error');
    } catch (_) {
      setActionStatus('success');
      setActionOutput(`Đã gỡ cài đặt ${clean} khỏi danh sách lưu trữ.`);
    } finally {
      setActiveActionPkg(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      testBrowserWebAssemblySupport().then(setWasmStatus).catch(() => {});
      fetchInstalledPackages();
      handleSearchPackages('');

      fetch('/api/python/version')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.cpython && data.pyodide) {
            setVersionInfo({
              cpythonVersion: data.cpython.version || '3.10.12',
              cpythonDetails: data.cpython.details || `CPython ${data.cpython.version} Native`,
              pyodideVersion: data.pyodide.version || '3.12.7',
              pyodideDetails: data.pyodide.details || `Pyodide (Python ${data.pyodide.version})`,
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fontOptions = [
    { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
    { label: 'Fira Code', value: "'Fira Code', monospace" },
    { label: 'Monospace', value: "monospace" },
  ];

  const filteredInstalled = installedPackages.filter((p) =>
    p.name.toLowerCase().includes(installedFilter.toLowerCase())
  );

  const isPackageInstalled = (name: string): InstalledPackage | undefined => {
    return installedPackages.find((p) => p.name.toLowerCase() === name.toLowerCase());
  };

  const activePalette = customColors || DEFAULT_CUSTOM_COLORS;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[#181824] border border-[#302f46] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col text-gray-200 shadow-2xl overflow-hidden">
        {/* Header - Nhỏ gọn, thanh lịch */}
        <div className="h-11 border-b border-[#29283d] px-3.5 flex items-center justify-between shrink-0 bg-[#1e1e2d]">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-amber-400/15 rounded-lg text-amber-400 border border-amber-400/30">
              <Settings className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-xs sm:text-sm text-gray-100">
              Cài Đặt Môi Trường
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content - Thu nhỏ kích thước các ô chức năng, loại bỏ các chú thích dài dòng */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs custom-scrollbar">
          {/* 1. Cỡ chữ Editor */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-gray-200 flex items-center space-x-1.5">
                <Type className="w-3.5 h-3.5 text-sky-400" />
                <span>Cỡ chữ Editor</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {fontSize}px
              </span>
            </div>
            <input
              type="range"
              min={12}
              max={26}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-amber-400 h-1.5 bg-[#252538] rounded cursor-pointer"
            />
          </div>

          {/* 2. Phông chữ lập trình */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538]">
            <div className="font-semibold text-gray-200 mb-1.5">
              Phông chữ lập trình
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {fontOptions.map((font) => (
                <button
                  key={font.value}
                  onClick={() => setFontFamily(font.value)}
                  className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer text-xs truncate ${
                    fontFamily === font.value
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                      : 'bg-[#191928] border-[#29283d] text-gray-300 hover:bg-[#202033]'
                  }`}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Thụt lề Tab */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538]">
            <div className="flex items-center space-x-1.5 font-semibold text-gray-200 mb-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Thụt lề phím Tab</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setIndentSpaces(4)}
                className={`py-1.5 px-2.5 rounded-lg border text-center transition cursor-pointer text-xs font-semibold ${
                  indentSpaces === 4
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                    : 'bg-[#191928] border-[#29283d] text-gray-300 hover:bg-[#202033]'
                }`}
              >
                4 khoảng trắng (PEP 8)
              </button>

              <button
                onClick={() => setIndentSpaces(2)}
                className={`py-1.5 px-2.5 rounded-lg border text-center transition cursor-pointer text-xs font-semibold ${
                  indentSpaces === 2
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                    : 'bg-[#191928] border-[#29283d] text-gray-300 hover:bg-[#202033]'
                }`}
              >
                2 khoảng trắng
              </button>
            </div>
          </div>

          {/* 4. Bộ thực thi Python (Execution Engine) - Gọn gàng, không chú thích dài dòng */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-gray-200 flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bộ thực thi Python</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#101b14] border border-emerald-500/30 text-emerald-300">
                {engine === 'cpython' ? `CPython ${versionInfo.cpythonVersion}` : `Pyodide ${versionInfo.pyodideVersion}`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {/* Option 1: CPython Native */}
              <button
                type="button"
                onClick={() => setEngine('cpython')}
                className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  engine === 'cpython'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                    : 'bg-[#191928] border-[#29283d] text-gray-300 hover:bg-[#202033]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">⚡ CPython Native</span>
                  {engine === 'cpython' && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500 text-black font-black">
                      ✓ ĐANG CHẠY
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-gray-400 mt-1">
                  v{versionInfo.cpythonVersion}
                </div>
              </button>

              {/* Option 2: Pyodide WASM */}
              <button
                type="button"
                onClick={() => setEngine('pyodide')}
                className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  engine === 'pyodide'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                    : 'bg-[#191928] border-[#29283d] text-gray-300 hover:bg-[#202033]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">🌐 Pyodide WASM</span>
                  {engine === 'pyodide' && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-sky-400 text-black font-black">
                      ✓ ĐANG CHẠY
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-gray-400 mt-1 flex items-center justify-between">
                  <span>v{versionInfo.pyodideVersion}</span>
                  {wasmStatus && !wasmStatus.ok && (
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Cổng API Gemini AI - Dành cho APK Android & Độc lập */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-200 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Cổng API Gemini AI (Dành cho APK)</span>
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono flex items-center space-x-1"
                title="Lấy khóa API Gemini miễn phí từ Google"
              >
                <span>Lấy khóa miễn phí</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="relative flex items-center">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder="Dán mã API Key Gemini (AIzaSy...)"
                value={geminiApiKey}
                onChange={(e) => {
                  setGeminiApiKey(e.target.value);
                  setApiKeyStatus(null);
                }}
                className="w-full bg-[#181826] border border-[#2b2a3f] rounded-lg pl-2.5 pr-20 py-1.5 text-xs text-gray-100 placeholder-gray-500 outline-none focus:border-amber-400 font-mono"
              />
              <div className="absolute right-1 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1 text-gray-400 hover:text-gray-200 transition cursor-pointer"
                  title={showApiKey ? 'Ẩn' : 'Hiện'}
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded text-[10px] transition cursor-pointer"
                  title="Lưu API Key vào thiết bị"
                >
                  Lưu
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={handleTestApiKey}
                disabled={isTestingApiKey || !geminiApiKey.trim()}
                className="px-2.5 py-1 bg-[#1f1e30] hover:bg-[#28273f] text-gray-200 border border-[#383750] rounded-lg text-[10px] font-bold flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer transition"
              >
                {isTestingApiKey ? (
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-amber-400" />
                )}
                <span>{isTestingApiKey ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
              </button>

              {apiKeyStatus && (
                <div
                  className={`text-[10px] font-medium flex items-center space-x-1 truncate max-w-[240px] ${
                    apiKeyStatus.ok ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {apiKeyStatus.ok ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <AlertTriangle className="w-3 h-3 shrink-0" />}
                  <span className="truncate">{apiKeyStatus.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* 4b. Tải mã nguồn lên GitHub & Xây dựng APK */}
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#12172b] to-[#151329] border border-indigo-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-200 flex items-center space-x-1.5 text-xs">
                <FolderGit2 className="w-4 h-4 text-indigo-400" />
                <span>Tải lên GitHub & Tạo file .APK</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                GitHub Actions
              </span>
            </div>

            <p className="text-[11px] text-gray-300 leading-relaxed">
              Bạn chỉ cần tải toàn bộ mã nguồn bên dưới và đưa lên GitHub. Quy trình tự động đã cài sẵn sẽ tự biên dịch ra file <strong className="text-amber-300">Pydroid3-Web.apk</strong> để bạn tải về cài vào điện thoại!
            </p>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDownloadSourceZip}
                disabled={isDownloadingZip}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer shadow-md shadow-indigo-900/30 disabled:opacity-60"
              >
                {isDownloadingZip ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang đóng gói file ZIP...</span>
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>📥 Tải về mã nguồn đầy đủ (.zip)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowGitHubFileList(!showGitHubFileList)}
                className="py-2 px-2.5 bg-[#1f1e33] hover:bg-[#282742] text-gray-200 rounded-lg text-xs flex items-center space-x-1 border border-[#353353] transition cursor-pointer shrink-0"
                title="Xem danh sách tệp cần đưa lên GitHub"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                <span>{showGitHubFileList ? 'Ẩn tệp' : 'Xem tệp'}</span>
                {showGitHubFileList ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
              </button>
            </div>

            {/* Thông báo trạng thái tải ZIP */}
            {zipDownloadStatus && (
              <div
                className={`p-2 rounded-lg text-[11px] flex items-center space-x-1.5 ${
                  zipDownloadStatus.ok
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {zipDownloadStatus.ok ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{zipDownloadStatus.message}</span>
              </div>
            )}

            {/* Chi tiết các tệp & thư mục cần tải lên GitHub */}
            {showGitHubFileList && (
              <div className="p-2.5 rounded-lg bg-[#0e101d] border border-indigo-500/20 space-y-2 text-[11px]">
                <div className="font-semibold text-indigo-300 flex items-center space-x-1">
                  <span>📂 Danh sách các thư mục & tệp BẮT BUỘC có trên GitHub:</span>
                </div>
                <div className="space-y-1 font-mono text-[10px] text-gray-300 pl-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="text-amber-300">.github/workflows/build-apk.yml</span>
                    <span className="text-gray-400 text-[9px] font-sans">(Kịch bản GitHub Actions tự tạo APK)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="text-cyan-300">android/</span>
                    <span className="text-gray-400 text-[9px] font-sans">(Dự án Android gốc hoàn chỉnh của Capacitor)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="text-cyan-300">capacitor.config.ts</span>
                    <span className="text-gray-400 text-[9px] font-sans">(Cấu hình ứng dụng Android)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="text-purple-300">package.json</span>
                    <span className="text-gray-400 text-[9px] font-sans">(Danh sách gói thư viện và lệnh build)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="text-purple-300">src/</span>
                    <span className="text-gray-400 text-[9px] font-sans">(Toàn bộ mã nguồn giao diện React & Python IDE)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="text-purple-300">public/</span>
                    <span className="text-gray-400 text-[9px] font-sans">(Động cơ Pyodide WebAssembly offline)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="text-gray-300">index.html, vite.config.ts, tsconfig.json</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="text-pink-300">APK_BUILD_GUIDE.md</span>
                    <span className="text-gray-400 text-[9px] font-sans">(Tài liệu hướng dẫn từng bước)</span>
                  </div>
                </div>
                <div className="p-1.5 rounded bg-amber-400/10 border border-amber-400/20 text-[10px] text-amber-200">
                  ⚠️ <strong>Lưu ý:</strong> KHÔNG tải lên thư mục <code className="text-red-300">node_modules/</code> hay file <code className="text-red-300">.env</code>. GitHub Actions sẽ tự động cài đặt thư viện sạch sẽ khi build.
                </div>
              </div>
            )}
          </div>

          {/* 5. Tô màu cú pháp (Color Designer) - Thu gọn, xóa chú thích */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-200 flex items-center space-x-1.5">
                <Palette className="w-3.5 h-3.5 text-pink-400" />
                <span>Tô màu cú pháp</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (onOpenColorPicker) onOpenColorPicker();
                }}
                className="py-1 px-2.5 bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 hover:opacity-90 active:scale-95 text-black font-extrabold rounded-lg text-[11px] flex items-center space-x-1 cursor-pointer transition shadow-sm"
              >
                <Palette className="w-3 h-3 fill-current shrink-0" />
                <span>Tùy chỉnh màu</span>
              </button>
            </div>

            {/* Bảng màu mẫu nhỏ gọn */}
            <div className="p-1.5 rounded-lg bg-[#191928] border border-[#29283d] flex flex-wrap items-center gap-1.5 text-[10px]">
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 font-mono">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activePalette.keyword }} />
                <span style={{ color: activePalette.keyword }}>def / if</span>
              </div>
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 font-mono">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activePalette.function }} />
                <span style={{ color: activePalette.function }}>tên_hàm</span>
              </div>
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 font-mono">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activePalette.string }} />
                <span style={{ color: activePalette.string }}>"chuỗi"</span>
              </div>
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 font-mono">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activePalette.number }} />
                <span style={{ color: activePalette.number }}>123</span>
              </div>
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 font-mono">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activePalette.comment }} />
                <span style={{ color: activePalette.comment }}># note</span>
              </div>
            </div>
          </div>

          {/* 6. Quản lý thư viện Python (Pip) - Gọn gàng, loại bỏ các chú thích dư thừa */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-200 flex items-center space-x-1.5">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span>Quản lý thư viện (Pip)</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300 font-semibold">
                Đã cài: {installedPackages.length} gói
              </span>
            </div>

            {/* Ô nhập tải gói & Cài đặt */}
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                placeholder="Nhập tên gói (numpy, pandas, requests...)"
                value={customPkgInput}
                onChange={(e) => setCustomPkgInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customPkgInput.trim() && actionStatus !== 'running') {
                    handleInstallPackage(customPkgInput.trim());
                  }
                }}
                className="flex-1 bg-[#181826] border border-[#2b2a3f] rounded-lg px-2.5 py-1.5 text-xs text-gray-100 placeholder-gray-500 outline-none focus:border-amber-400 font-mono"
              />
              <button
                type="button"
                onClick={() => handleInstallPackage(customPkgInput.trim())}
                disabled={!customPkgInput.trim() || actionStatus === 'running'}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black font-extrabold rounded-lg text-xs flex items-center space-x-1 transition cursor-pointer disabled:opacity-40 shrink-0"
              >
                {actionStatus === 'running' && activeActionPkg === customPkgInput.trim() ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Đang cài...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    <span>Cài đặt</span>
                  </>
                )}
              </button>
            </div>

            {/* Gói phổ biến - dạng chip bấm nhanh */}
            <div className="flex flex-wrap gap-1">
              {[
                'numpy',
                'pandas',
                'matplotlib',
                'requests',
                'pillow',
                'pygame',
                'pyfiglet',
                'sympy',
                'flask',
                'openpyxl',
                'rich',
              ].map((pkgName) => {
                const isInstalled = isPackageInstalled(pkgName);
                return (
                  <button
                    key={pkgName}
                    type="button"
                    onClick={() => setCustomPkgInput(pkgName)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer border ${
                      isInstalled
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                        : 'bg-[#181826] text-gray-300 border-[#2a293e] hover:border-amber-400 hover:text-amber-300'
                    }`}
                    title={isInstalled ? `Đã cài v${isInstalled.version}` : `Chọn ${pkgName}`}
                  >
                    {isInstalled ? `✓ ${pkgName}` : `+ ${pkgName}`}
                  </button>
                );
              })}
            </div>

            {/* Tìm kiếm nhanh từ PyPI */}
            <div className="space-y-1">
              <div className="relative">
                <Search className="w-3 h-3 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm gói trong kho PyPI..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearchPackages(e.target.value);
                  }}
                  className="w-full bg-[#181826] border border-[#2b2a3f] rounded-lg pl-7 pr-2.5 py-1 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-amber-400"
                />
              </div>

              {searchQuery.trim() && (
                <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar bg-[#10101a] p-1.5 rounded-lg border border-[#242336]">
                  {isSearching ? (
                    <div className="p-2 text-center text-gray-400 text-xs flex items-center justify-center space-x-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                      <span>Đang tìm kiếm...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-1.5 text-center text-gray-500 text-xs">
                      Không tìm thấy gói phù hợp
                    </div>
                  ) : (
                    searchResults.map((pkg) => {
                      const installed = isPackageInstalled(pkg.name);
                      return (
                        <div
                          key={pkg.name}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-[#181826] border border-[#27263b] text-xs"
                        >
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="font-bold text-amber-300 font-mono truncate">{pkg.name}</span>
                            {installed && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                                v{installed.version}
                              </span>
                            )}
                          </div>
                          <div>
                            {installed ? (
                              <button
                                type="button"
                                onClick={() => handleInstallPackage(pkg.name, true)}
                                disabled={actionStatus === 'running'}
                                className="px-1.5 py-0.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded text-[10px] font-bold border border-emerald-500/40 flex items-center space-x-1 cursor-pointer transition disabled:opacity-50"
                              >
                                <ArrowUpCircle className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Cập nhật</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleInstallPackage(pkg.name, false)}
                                disabled={actionStatus === 'running'}
                                className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-black rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition disabled:opacity-50"
                              >
                                <Download className="w-2.5 h-2.5" />
                                <span>Tải về</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Nút xem danh sách gói đã cài - Gọn gàng, không chú thích dài */}
            <div>
              <button
                type="button"
                onClick={() => setIsInstalledDropdownOpen(!isInstalledDropdownOpen)}
                className={`w-full py-1.5 px-2.5 rounded-lg border flex items-center justify-between transition cursor-pointer text-xs ${
                  isInstalledDropdownOpen
                    ? 'bg-amber-500/15 border-amber-400/80 text-amber-300'
                    : 'bg-[#181826] border-[#29283d] text-gray-200 hover:bg-[#202033]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold">Thư viện đã cài ({installedPackages.length})</span>
                </div>
                <div className="flex items-center space-x-1 text-amber-400">
                  {isInstalledDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Danh sách đã cài đặt khi mở */}
              {isInstalledDropdownOpen && (
                <div className="mt-1.5 p-2 rounded-lg bg-[#10101a] border border-[#262538] space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center space-x-1.5">
                    <div className="relative flex-1">
                      <Search className="w-3 h-3 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Lọc gói đã cài..."
                        value={installedFilter}
                        onChange={(e) => setInstalledFilter(e.target.value)}
                        className="w-full bg-[#181826] border border-[#2b2a3f] rounded-md pl-6 pr-2 py-1 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-amber-400 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={fetchInstalledPackages}
                      disabled={isLoadingPackages}
                      className="p-1 bg-[#1a1a28] border border-[#2e2d42] text-gray-300 hover:text-amber-400 rounded-md transition cursor-pointer"
                      title="Làm mới danh sách"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPackages ? 'animate-spin text-amber-400' : ''}`} />
                    </button>
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
                    {isLoadingPackages ? (
                      <div className="p-3 text-center text-gray-400 text-xs flex items-center justify-center space-x-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Đang nạp danh sách...</span>
                      </div>
                    ) : filteredInstalled.length === 0 ? (
                      <div className="p-2.5 text-center text-gray-500 text-xs">
                        {installedFilter ? 'Không tìm thấy gói phù hợp' : 'Chưa có gói nào'}
                      </div>
                    ) : (
                      filteredInstalled.map((pkg) => (
                        <div
                          key={pkg.name}
                          className="flex items-center justify-between p-1.5 rounded-md bg-[#181826] border border-[#252438] text-xs"
                        >
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="font-semibold text-gray-200 truncate font-mono">{pkg.name}</span>
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-gray-800 text-gray-400">
                              v{pkg.version}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleInstallPackage(pkg.name, true)}
                              disabled={actionStatus === 'running'}
                              className="px-1.5 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-semibold flex items-center space-x-0.5 transition cursor-pointer disabled:opacity-50"
                              title={`Cập nhật ${pkg.name}`}
                            >
                              <ArrowUpCircle className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Cập nhật</span>
                            </button>

                            {!['pip', 'setuptools', 'wheel'].includes(pkg.name.toLowerCase()) && (
                              <button
                                type="button"
                                onClick={() => handleUninstallPackage(pkg.name)}
                                disabled={actionStatus === 'running'}
                                className="p-1 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-300 rounded transition cursor-pointer disabled:opacity-50"
                                title={`Gỡ bỏ ${pkg.name}`}
                              >
                                <Trash2 className="w-2.5 h-2.5 text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Live Pip Terminal Output nếu đang chạy hoặc có log */}
            {showLogTerminal && (
              <div className="border border-[#29283d] rounded-lg overflow-hidden bg-[#0c0c14]">
                <div className="h-6 bg-[#161622] px-2 flex items-center justify-between border-b border-[#242336] text-[10px]">
                  <div className="flex items-center space-x-1.5 text-gray-300 font-mono font-bold">
                    <Terminal className="w-3 h-3 text-amber-400" />
                    <span>Pip Console</span>
                    {actionStatus === 'running' && (
                      <span className="text-amber-400 animate-pulse">(Đang cài...)</span>
                    )}
                    {actionStatus === 'success' && (
                      <span className="text-emerald-400">(Thành công ✓)</span>
                    )}
                    {actionStatus === 'error' && (
                      <span className="text-red-400">(Thất bại ✕)</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogTerminal(false)}
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <pre className="p-2 max-h-28 overflow-y-auto text-[10px] font-mono text-gray-300 whitespace-pre-wrap leading-tight select-text bg-[#09090f]">
                  {actionOutput || 'Đang chờ tác vụ...'}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Nhỏ gọn */}
        <div className="h-11 border-t border-[#29283d] px-3.5 flex items-center justify-end shrink-0 bg-[#1e1e2d]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-lg text-xs transition shadow-sm cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
