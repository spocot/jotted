import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetNotesQuery } from "../store/redux/api";
import { NoteListSkeleton } from "../components/Skeleton";
import NoteCard from "../components/NoteCard";
import CreateNoteModal from "../components/CreateNoteModal";

export default function NoteListPage() {
  const navigate = useNavigate();
  const { data: notes = [], isLoading: loading } = useGetNotesQuery();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Group notes by folder path
  const notesByFolder: Record<string, typeof notes> = {};
  for (const note of notes) {
    const path = note.path || "/Unsorted";
    if (!notesByFolder[path]) {
      notesByFolder[path] = [];
    }
    notesByFolder[path].push(note);
  }

  const folderPaths = Object.keys(notesByFolder).sort();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">All Notes</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          + New Note
        </button>
      </div>

      {loading && notes.length === 0 && <NoteListSkeleton />}

      {!loading && notes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 dark:text-gray-500 mb-4">
            No notes yet. Create your first note to get started.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Create your first note
          </button>
        </div>
      )}

      {folderPaths.map((path) => {
        const folderNotes = notesByFolder[path];
        const folderName = path.split("/").filter(Boolean).pop() || "Unsorted";

        return (
          <div key={path} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {folderName}
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ({folderNotes.length} note{folderNotes.length !== 1 ? "s" : ""})
              </span>
            </div>

            <div className="grid gap-2">
              {folderNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </div>
        );
      })}

      <CreateNoteModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(note) => {
          setShowCreateModal(false);
          navigate(`/note/${note.id}`);
        }}
        existingTitles={notes.map((n) => n.title)}
      />
    </div>
  );
}
