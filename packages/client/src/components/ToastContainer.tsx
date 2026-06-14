import { useToastStore } from "../store/useToastStore";

const TYPE_STYLES = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-gray-800 dark:bg-gray-700 text-white",
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-3 animate-in slide-in-from-right ${
            TYPE_STYLES[toast.type]
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="opacity-70 hover:opacity-100 transition-opacity shrink-0"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
