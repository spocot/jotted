import { useState, useEffect } from "react";
import { IconSearch, IconUser, IconMail, IconPencil, IconTrash, IconNotes, IconBuilding } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import {
  useGetPeopleQuery,
  useGetPersonQuery,
  useGetPersonNotesQuery,
  useCreatePersonMutation,
  useUpdatePersonMutation,
  useDeletePersonMutation,
} from "../store/redux/api";
import type { Person } from "../types";
import { useConfirm } from "../hooks/useConfirm";

const ROLE_LABELS: Record<string, string> = {
  organizer: "Organizer",
  attendee: "Attendee",
  mentioned: "Mentioned",
};

const PAGE_SIZE = 20;

function nameToEmail(name: string, domain: string): string {
  const parts = name.trim().toLowerCase().split(/\s+/);
  return parts.join(".") + "@" + domain;
}

function getStoredDomain(): string {
  try { return localStorage.getItem("jotted_company_domain") ?? ""; } catch { return ""; }
}

function storeDomain(domain: string): void {
  try { localStorage.setItem("jotted_company_domain", domain); } catch { /* ignore */ }
}

type PersonDetailTab = "organizer" | "attendee" | "mentioned" | "all";

const TAB_CONFIG: { key: PersonDetailTab; label: string; role?: string }[] = [
  { key: "organizer", label: "Organized", role: "organizer" },
  { key: "attendee", label: "Attending", role: "attendee" },
  { key: "mentioned", label: "Mentioned", role: "mentioned" },
  { key: "all", label: "All" },
];

export default function PeoplePage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PersonDetailTab>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [useCompanyDomain, setUseCompanyDomain] = useState(true);
  const [companyDomain, setCompanyDomain] = useState(getStoredDomain);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const { data: people = [], isLoading } = useGetPeopleQuery(
    search ? { q: search } : undefined,
  );
  const [createPerson] = useCreatePersonMutation();
  const [updatePerson] = useUpdatePersonMutation();
  const [deletePerson] = useDeletePersonMutation();

  useEffect(() => {
    if (useCompanyDomain && companyDomain && newName.trim()) {
      setNewEmail(nameToEmail(newName, companyDomain));
    }
  }, [newName, useCompanyDomain, companyDomain]);

  const handleCreatePerson = async () => {
    if (!newName.trim()) return;
    try {
      await createPerson({ name: newName.trim(), email: newEmail.trim() || undefined }).unwrap();
      setNewName("");
      setNewEmail("");
      setShowAdd(false);
    } catch {
      // error handled by RTK
    }
  };

  const handleUpdatePerson = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updatePerson({ id, name: editName.trim(), email: editEmail.trim() || undefined }).unwrap();
      setEditingId(null);
    } catch {
      // error handled by RTK
    }
  };

  const handleDeletePerson = async (person: Person) => {
    if (!(await confirm(`Delete ${person.name}?`, { title: "Delete Person", confirmLabel: "Delete", variant: "danger" }))) return;
    try {
      await deletePerson(person.id).unwrap();
      if (expandedId === person.id) setExpandedId(null);
    } catch {
      // error handled by RTK
    }
  };

  const startEdit = (person: Person) => {
    setEditingId(person.id);
    setEditName(person.name);
    setEditEmail(person.email ?? "");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">People</h2>
        <button
          onClick={() => { setShowAdd(!showAdd); if (!showAdd) setUseCompanyDomain(true); }}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          {showAdd ? "Cancel" : "Add Person"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex items-center gap-2">
            <IconBuilding className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={companyDomain}
              onChange={(e) => {
                setCompanyDomain(e.target.value);
                storeDomain(e.target.value);
              }}
              placeholder="Company email domain (e.g. acmecorp.com)"
              className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
            />
            {companyDomain && (
              <span className="text-xs text-gray-400 dark:text-gray-500">@{companyDomain}</span>
            )}
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Person name"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreatePerson();
                }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  if (e.target.value && useCompanyDomain) setUseCompanyDomain(false);
                }}
                placeholder={useCompanyDomain && companyDomain ? nameToEmail("john doe", companyDomain) : "email@example.com"}
                readOnly={useCompanyDomain && !!companyDomain}
                className={`w-full px-3 py-1.5 text-sm border rounded bg-white dark:bg-gray-800 outline-none transition-colors ${
                  useCompanyDomain && companyDomain
                    ? "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-400"
                }`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreatePerson();
                }}
              />
            </div>
            <button
              onClick={handleCreatePerson}
              disabled={!newName.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded transition-colors"
            >
              Add
            </button>
          </div>
          {companyDomain && (
            <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={useCompanyDomain}
                onChange={(e) => {
                  setUseCompanyDomain(e.target.checked);
                  if (e.target.checked && companyDomain && newName.trim()) {
                    setNewEmail(nameToEmail(newName, companyDomain));
                  }
                }}
                className="rounded"
              />
              Use company default (@{companyDomain})
            </label>
          )}
        </div>
      )}

      <div className="relative mb-4">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 dark:focus:border-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="text-gray-400 dark:text-gray-500">Loading people...</div>
      ) : people.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          No people found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
          {people.map((person) => (
            <div
              key={person.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden"
            >
              {editingId === person.id ? (
                <div className="p-3 space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
                    placeholder="Name"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdatePerson(person.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
                    placeholder="Email"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdatePerson(person.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdatePerson(person.id)}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const nextId = expandedId === person.id ? null : person.id;
                      setExpandedId(nextId);
                      if (nextId) setActiveTab("all");
                    }}
                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                        <IconUser className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {person.name}
                        </div>
                        {person.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                            <IconMail className="w-3 h-3 shrink-0" />
                            {person.email}
                          </div>
                        )}
                      </div>
                      {person.noteCount !== undefined && person.noteCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                          <IconNotes className="w-3 h-3" />
                          {person.noteCount}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex justify-end gap-1 px-3 pb-2">
                    <button
                      onClick={() => startEdit(person)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Edit person"
                    >
                      <IconPencil className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    </button>
                    <button
                      onClick={() => handleDeletePerson(person)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Delete person"
                    >
                      <IconTrash className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </>
              )}

              {expandedId === person.id && (
                <PersonDetail
                  personId={person.id}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onNavigate={(noteId) => navigate(`/note/${noteId}`)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PersonDetailProps {
  personId: string;
  activeTab: PersonDetailTab;
  onTabChange: (tab: PersonDetailTab) => void;
  onNavigate: (noteId: string) => void;
}

function PersonDetail({ personId, activeTab, onTabChange, onNavigate }: PersonDetailProps) {
  const { data: person } = useGetPersonQuery(personId);
  const tabConfig = TAB_CONFIG.find((t) => t.key === activeTab);
  const { data: notesResult } = useGetPersonNotesQuery({
    personId,
    role: tabConfig?.role,
    limit: PAGE_SIZE,
    offset: 0,
  });

  const roleCounts = person?.roleCounts ?? [];

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <div className="flex gap-1 px-2 py-2 border-b border-gray-100 dark:border-gray-750">
        {TAB_CONFIG.map((tab) => {
          const count = tab.role
            ? roleCounts.find((rc) => rc.role === tab.role)?.count ?? 0
            : roleCounts.reduce((sum, rc) => sum + rc.count, 0);
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                activeTab === tab.key
                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
              {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>
      <div className="p-2 max-h-48 overflow-y-auto">
        {notesResult?.items.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
            No notes found.
          </p>
        ) : (
          notesResult?.items.map((note) => (
            <button
              key={note.id}
              onClick={() => onNavigate(note.id)}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                {note.title || "Untitled"}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {note.path && note.path !== "/" && `${note.path} · `}
                {ROLE_LABELS[note.role] || note.role}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
