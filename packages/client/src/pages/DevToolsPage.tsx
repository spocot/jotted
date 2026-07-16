import { useState } from "react";
import { IconTrash, IconDatabase, IconRefresh, IconPlayerPlay, IconWand } from "@tabler/icons-react";
import {
  useGetDevStatsQuery,
  useResetDbMutation,
  useSeedDbMutation,
} from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import { useConfirm } from "../hooks/useConfirm";
import type { DevSeedConfig } from "../types";

interface Preset {
  label: string;
  config: DevSeedConfig;
}

const PRESETS: Preset[] = [
  {
    label: "Quick Test",
    config: { notes: 5, projects: 1, people: 3, canvases: 1, uploads: 2, linkDensity: 0.3, versionCount: 2, tagPoolSize: 6 },
  },
  {
    label: "Medium Dataset",
    config: { notes: 30, projects: 3, people: 8, canvases: 2, uploads: 5, linkDensity: 0.3, versionCount: 2, tagPoolSize: 8 },
  },
  {
    label: "Large Dataset",
    config: { notes: 150, projects: 10, people: 20, canvases: 5, uploads: 10, linkDensity: 0.2, versionCount: 3, tagPoolSize: 12 },
  },
  {
    label: "Link-Heavy",
    config: { notes: 20, projects: 1, people: 5, canvases: 1, uploads: 2, linkDensity: 0.8, versionCount: 2, tagPoolSize: 6 },
  },
  {
    label: "Project-Heavy",
    config: { notes: 5, projects: 8, people: 5, canvases: 0, uploads: 2, linkDensity: 0.1, versionCount: 1, tagPoolSize: 4 },
  },
];

export default function DevToolsPage() {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const [keepTemplates, setKeepTemplates] = useState(true);
  const [seedConfig, setSeedConfig] = useState<DevSeedConfig>(PRESETS[0].config);

  const { data: stats, isLoading: statsLoading } = useGetDevStatsQuery();
  const [resetDb, { isLoading: resetLoading }] = useResetDbMutation();
  const [seedDb, { isLoading: seedLoading }] = useSeedDbMutation();

  const handleReset = async () => {
    const ok = await confirm(
      "This will permanently delete ALL data in the database (notes, projects, canvases, people, tags, etc.). This cannot be undone. Are you sure?",
      { title: "Reset Database", confirmLabel: "Yes, Reset Everything", variant: "danger" },
    );
    if (!ok) return;

    try {
      await resetDb({ keepTemplates }).unwrap();
      dispatch(addToast("Database reset successfully", "success"));
    } catch {
      dispatch(addToast("Failed to reset database", "error"));
    }
  };

  const handleSeed = async () => {
    try {
      const result = await seedDb(seedConfig).unwrap();
      const counts = Object.entries(result.created)
        .map(([k, v]) => `${v} ${k}`)
        .join(", ");
      dispatch(addToast(`Generated: ${counts}`, "success"));
    } catch {
      dispatch(addToast("Failed to generate test data", "error"));
    }
  };

  const handlePreset = (preset: Preset) => {
    setSeedConfig({ ...preset.config });
  };

  const setField = (field: keyof DevSeedConfig, value: number) => {
    setSeedConfig((prev) => ({ ...prev, [field]: value }));
  };

  const isBusy = resetLoading || seedLoading;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <IconWand className="w-6 h-6" />
        Dev Tools
      </h1>

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <IconDatabase className="w-5 h-5" />
          Database Stats
        </h2>
        {statsLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Object.entries(stats).map(([table, count]) => (
              <div
                key={table}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
              >
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{count}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{table}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No data</p>
        )}
      </section>

      <section className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-2 text-red-800 dark:text-red-300 flex items-center gap-2">
          <IconTrash className="w-5 h-5" />
          Reset Database
        </h2>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          Deletes all data from every table. Built-in templates will be re-seeded after reset.
        </p>
        <label className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={keepTemplates}
            onChange={(e) => setKeepTemplates(e.target.checked)}
            className="rounded"
          />
          Re-seed built-in templates after reset
        </label>
        <button
          onClick={handleReset}
          disabled={resetLoading}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <IconTrash className="w-4 h-4" />
          {resetLoading ? "Resetting..." : "Reset All Data"}
        </button>
      </section>

      <section className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <IconRefresh className="w-5 h-5" />
          Generate Test Data
        </h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              disabled={isBusy}
              className="px-3 py-1 text-sm rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
          <SliderField label="Notes" value={seedConfig.notes ?? 0} onChange={(v) => setField("notes", v)} max={500} disabled={isBusy} />
          <SliderField label="Projects" value={seedConfig.projects ?? 0} onChange={(v) => setField("projects", v)} max={50} disabled={isBusy} />
          <SliderField label="People" value={seedConfig.people ?? 0} onChange={(v) => setField("people", v)} max={50} disabled={isBusy} />
          <SliderField label="Canvases" value={seedConfig.canvases ?? 0} onChange={(v) => setField("canvases", v)} max={20} disabled={isBusy} />
          <SliderField label="Uploads" value={seedConfig.uploads ?? 0} onChange={(v) => setField("uploads", v)} max={20} disabled={isBusy} />
          <SliderField label="Tag Pool" value={seedConfig.tagPoolSize ?? 0} onChange={(v) => setField("tagPoolSize", v)} max={20} disabled={isBusy} />
          <SliderField label="Link Density %" value={Math.round((seedConfig.linkDensity ?? 0) * 100)} onChange={(v) => setField("linkDensity", v / 100)} max={100} disabled={isBusy} />
          <SliderField label="Max Versions" value={seedConfig.versionCount ?? 0} onChange={(v) => setField("versionCount", v)} max={5} disabled={isBusy} />
        </div>

        <button
          onClick={handleSeed}
          disabled={isBusy}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <IconPlayerPlay className="w-4 h-4" />
          {seedLoading ? "Generating..." : "Generate Data"}
        </button>
      </section>
    </div>
  );
}

function SliderField({ label, value, onChange, max, disabled }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  disabled: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-blue-700 dark:text-blue-300">{label}</label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
          disabled={disabled}
          className="w-16 px-1 py-0.5 text-xs text-right rounded border border-blue-200 dark:border-blue-700 bg-white dark:bg-blue-900 text-blue-800 dark:text-blue-200 disabled:opacity-50"
        />
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full accent-blue-600 disabled:opacity-50"
      />
    </div>
  );
}
