interface TagPillProps {
  name: string;
  active?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

export default function TagPill({
  name,
  active = false,
  onClick,
  children,
}: TagPillProps) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40"
      }`}
    >
      {children ?? `#${name}`}
    </button>
  );
}
