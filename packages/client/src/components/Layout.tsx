import { useEffect, useState, type ReactNode } from "react";
import { IconMenu2, IconSettings, IconMoon } from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import SearchBar from "./SearchBar";
import ToastContainer from "./ToastContainer";
import CommandPalette from "./CommandPalette";
import NotePreviewPopover from "./NotePreviewPopover";
import SettingsModal from "./SettingsModal";
import { useAppDispatch, useAppSelector } from "../store/redux/hooks";
import {
  toggleSidebar,
  toggleDarkMode as toggleDarkModeAction,
  selectSidebarOpen,
  selectDarkMode,
} from "../store/redux/uiSlice";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [showSettings, setShowSettings] = useState(false);
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const darkMode = useAppSelector(selectDarkMode);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        navigate("/search");
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "t") {
        e.preventDefault();
        const today = new Date().toISOString().slice(0, 10);
        navigate(`/note/by-date/${today}`);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <IconMenu2 className="w-5 h-5" />
          </button>
          <Link to="/" className="text-lg font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Jotted
          </Link>
        </div>

        <nav className="flex items-center gap-4 text-sm">
          <SearchBar />
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">
            Notes
          </Link>
          <Link to="/graph" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">
            Graph
          </Link>
          <Link to="/tags" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">
            Tags
          </Link>
          <Link to="/projects" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">
            Projects
          </Link>
          <Link to="/canvas" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">
            Canvas
          </Link>
          <Link to="/templates" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">
            Templates
          </Link>
          <Link to="/calendar" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">
            Calendar
          </Link>
          <Link to="/journal" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">
            Journal
          </Link>
          <Link to="/inquiry" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0">
            Inquiry
          </Link>
          <button
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              navigate(`/note/by-date/${today}`);
            }}
            className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shrink-0"
            title="Open today's daily note (Ctrl+Shift+T)"
          >
            Today
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Settings"
          >
            <IconSettings className="w-5 h-5" />
          </button>
          <button
            onClick={() => dispatch(toggleDarkModeAction())}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Toggle dark mode"
          >
            <IconMoon className="w-5 h-5" />
          </button>
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <ToastContainer />
      <CommandPalette />
      <NotePreviewPopover />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
