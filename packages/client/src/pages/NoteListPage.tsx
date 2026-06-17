import { useGetNotesQuery, useCreateNoteMutation } from "../store/redux/api";
import { NoteListSkeleton } from "../components/Skeleton";

export default function NoteListPage() {
  const { data: notes = [], isLoading: loading } = useGetNotesQuery();
  const [createNote] = useCreateNoteMutation();

  const handleCreate = async () => {
    await createNote({ title: "Untitled" });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">All Notes</h2>
        <button
          onClick={handleCreate}
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
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Create your first note
          </button>
        </div>
      )}

      <div className="grid gap-2">
        {notes.map((note) => (
          <a
            key={note.id}
            href={`/note/${note.id}`}
            className="block p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {note.title || "Untitled"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {note.content || "No content"}
            </p>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              {new Date(note.updatedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
