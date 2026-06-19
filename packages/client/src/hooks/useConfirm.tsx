import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
import ConfirmDialog from "../components/ConfirmDialog";

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
}

interface ConfirmContextValue {
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Confirm");
  const [confirmLabel, setConfirmLabel] = useState("Confirm");
  const [cancelLabel, setCancelLabel] = useState("Cancel");
  const [variant, setVariant] = useState<"danger" | "default">("default");
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((msg: string, options?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setMessage(msg);
      setTitle(options?.title ?? "Confirm");
      setConfirmLabel(options?.confirmLabel ?? "Confirm");
      setCancelLabel(options?.cancelLabel ?? "Cancel");
      setVariant(options?.variant ?? "default");
      setOpen(true);
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolveRef.current?.(false);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        variant={variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx.confirm;
}
