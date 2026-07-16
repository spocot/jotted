import { useState, useEffect } from "react";
import { IconX } from "@tabler/icons-react";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import { getServerUrl, setServerUrl } from "../lib/server-config";
import {
  useGetAtlassianStatusQuery,
  useConfigureAtlassianMutation,
  useDeleteAtlassianConfigMutation,
  useUnlockAtlassianMutation,
} from "../store/redux/api";

type SettingsTab = "connection" | "integrations";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>("connection");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Close"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setTab("connection")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === "connection"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Connection
          </button>
          <button
            onClick={() => setTab("integrations")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === "integrations"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Integrations
          </button>
        </div>

        {tab === "connection" && <ConnectionTab onClose={onClose} />}
        {tab === "integrations" && <IntegrationsTab />}
      </div>
    </div>
  );
}

function ConnectionTab({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState(getServerUrl());
  const [testing, setTesting] = useState(false);
  const dispatch = useAppDispatch();

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
    <>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Configure the URL of your local Jotted server. The client uses this to
        make API calls. Defaults to <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">http://localhost:3000</code>.
      </p>

      <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
        Server URL
      </label>
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
    </>
  );
}

function IntegrationsTab() {
  const { data: status } = useGetAtlassianStatusQuery();
  const [configure] = useConfigureAtlassianMutation();
  const [clearConfig] = useDeleteAtlassianConfigMutation();
  const [unlock] = useUnlockAtlassianMutation();
  const dispatch = useAppDispatch();

  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const needsUnlock = status?.hasPassword && !status?.unlocked;
  const hasConfig = status?.configured && status?.unlocked;

  const handleUnlock = async () => {
    if (!masterPassword) return;
    setUnlocking(true);
    try {
      const result = await unlock({ masterPassword }).unwrap();
      if (result.unlocked && result.hadConfig) {
        dispatch(addToast("Configuration unlocked", "success"));
      } else {
        dispatch(addToast("Password set, but no config exists yet", "info"));
      }
      setMasterPassword("");
    } catch (err) {
      dispatch(addToast(err instanceof Error ? err.message : "Failed to unlock", "error"));
    } finally {
      setUnlocking(false);
    }
  };

  const handleSave = async () => {
    if (!domain || !email || !apiToken) {
      dispatch(addToast("All fields are required", "error"));
      return;
    }
    setSaving(true);
    try {
      const payload: { domain: string; email: string; apiToken: string; masterPassword?: string } = {
        domain,
        email,
        apiToken,
      };
      if (masterPassword) {
        payload.masterPassword = masterPassword;
      }
      const result = await configure(payload).unwrap();
      const msg = result.encrypted
        ? "Configuration saved and encrypted. You'll need the master password after server restart."
        : "Integration configured successfully";
      dispatch(addToast(msg, "success"));
      setApiToken("");
      setMasterPassword("");
    } catch (err) {
      dispatch(addToast(err instanceof Error ? err.message : "Failed to save", "error"));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      await clearConfig().unwrap();
      dispatch(addToast("Integration config cleared", "success"));
      setDomain("");
      setEmail("");
      setApiToken("");
    } catch (err) {
      dispatch(addToast(err instanceof Error ? err.message : "Failed to clear", "error"));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Link your Atlassian account (Jira + Confluence). An API token can be
        generated from{" "}
        <a
          href="https://id.atlassian.com/manage-profile/security/api-tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          your Atlassian account settings
        </a>. No admin privileges required.
      </p>

      {/* Status section */}
      {needsUnlock && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
            Config is encrypted. Enter your master password to unlock.
          </p>
          <input
            type="password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            placeholder="Master password"
            className="w-full px-3 py-2 text-sm border border-amber-300 dark:border-amber-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-amber-400 mb-2"
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
          />
          <button
            onClick={handleUnlock}
            disabled={unlocking || !masterPassword}
            className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors disabled:opacity-50"
          >
            {unlocking ? "Unlocking..." : "Unlock"}
          </button>
        </div>
      )}

      {hasConfig && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
            Connected to: {status?.domain}
            {status?.hasPassword && (
              <span className="ml-1 text-xs font-normal text-green-600 dark:text-green-400">
                (encrypted)
              </span>
            )}
          </p>
          {status?.user && (
            <p className="text-xs text-green-600 dark:text-green-300 mt-0.5">
              Authenticated as {status.user.displayName} ({status.user.user})
            </p>
          )}
          {status?.connectionError && (
            <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
              {status.connectionError}
            </p>
          )}
        </div>
      )}

      {/* Connection error while configured but not locked */}
      {status?.configured && status?.connectionError && !needsUnlock && !hasConfig && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{status.connectionError}</p>
        </div>
      )}

      {/* Config form */}
      {!needsUnlock && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Atlassian Domain
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="your-company.atlassian.net"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400 dark:focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400 dark:focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              API Token
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Enter your Atlassian API token"
                className="w-full px-3 py-2 pr-16 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400 dark:focus:border-blue-500 font-mono"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                type="button"
              >
                {showToken ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Encryption Password{" "}
                <span className="text-gray-400">(optional — encrypts config on disk)</span>
              </label>
              <input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Set a master password"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400 dark:focus:border-blue-500"
              />
            </div>
          </div>
        </>
      )}

      {/* Action buttons */}
      {!needsUnlock && (
        <div className="flex items-center justify-between pt-1">
          {hasConfig && (
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              Clear
            </button>
          )}
          {!hasConfig && <div />}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !domain || !email || !apiToken}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
