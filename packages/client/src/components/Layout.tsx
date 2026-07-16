import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconMenu2, IconSettings, IconMoon, IconChevronDown } from "@tabler/icons-react";
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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const darkMode = useAppSelector(selectDarkMode);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

        <nav className="flex items-center gap-1 text-sm">
          <SearchBar />
          <NavLink to="/">Notes</NavLink>
          <NavLink to="/journal">Journal</NavLink>
          <NavLink to="/calendar">Calendar</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/graph">Graph</NavLink>
          <NavLink to="/canvas">Canvas</NavLink>

          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded transition-colors shrink-0 ${
                moreOpen
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  : "hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              More
              <IconChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <DropdownLink to="/tags" onClick={() => setMoreOpen(false)}>Tags</DropdownLink>
                <DropdownLink to="/people" onClick={() => setMoreOpen(false)}>People</DropdownLink>
                <DropdownLink to="/templates" onClick={() => setMoreOpen(false)}>Templates</DropdownLink>
                <DropdownLink to="/inquiry" onClick={() => setMoreOpen(false)}>Inquiry</DropdownLink>
                <DropdownLink to="/dev-tools" onClick={() => setMoreOpen(false)}>Dev Tools</DropdownLink>
              </div>
            )}
          </div>
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

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="px-2 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
    >
      {children}
    </Link>
  );
}

function DropdownLink({ to, onClick, children }: { to: string; onClick: () => void; children: ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      {children}
    </Link>
  );
}
