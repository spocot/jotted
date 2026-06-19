import { useState, useEffect } from "react";
import { IconX } from "@tabler/icons-react";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import { getServerUrl, setServerUrl } from "../lib/server-config";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [url, setUrl] = useState(getServerUrl());
  const [testing, setTesting] = useState(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${url.replace(/\/+$/, "")}/api/health`);
      if (res.ok) {
        dispatch(addToast("Connection successful", "success"));
      } else {
        dispatch(addToast("Server responded with an error", "error"));
      }
    } catch {
      dispatch(addToast("Could not reach server", "error"));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setServerUrl(url);
    dispatch(addToast("Server URL saved", "success"));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Connection Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Close"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Configure the URL of your local Jotted server. The client uses this to
          make API calls. Defaults to <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">http://localhost:3000</code>.
        </p>

        <label className="block text-sm font-medium mb-1">Server URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:3000"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 mb-4"
        />

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
