import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useDeleteProjectMutation,
} from "../store/redux/api";
import {
  IconFolder,
  IconDots,
} from "@tabler/icons-react";
import TemplatePickerModal from "../components/TemplatePickerModal";

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  archived: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects } = useGetProjectsQuery();
  const [createProject] = useCreateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-project-menu]")) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id).unwrap();
      setMenuOpen(null);
    } catch {
      // error handled by RTK
    }
  };

  const handleTemplateApplied = (result: unknown) => {
    const proj = result as { id?: string };
    if (proj?.id) {
      navigate(`/project/${proj.id}`);
    } else {
      navigate("/projects");
    }
  };

  const handleCreateBlankProject = async () => {
    const project = await createProject({ title: "Untitled Project" }).unwrap();
    return project;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Projects</h1>
        <button
          onClick={() => setShowTemplatePicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          New Project
        </button>
      </div>

      {projects && projects.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <IconFolder className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No projects yet. Create one to start planning.</p>
        </div>
      )}

      <div className="grid gap-3">
        {projects?.map((project) => (
          <div
            key={project.id}
            onClick={() => navigate(`/project/${project.id}`)}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors group"
          >
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <IconFolder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {project.title}
              </h3>
              {project.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                  {project.description}
                </p>
              )}
            </div>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                STATUS_COLORS[project.status] ?? ""
              }`}
            >
              {STATUS_LABELS[project.status] ?? project.status}
            </span>
            <div className="relative shrink-0" data-project-menu>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(menuOpen === project.id ? null : project.id);
                }}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
              >
                <IconDots className="w-4 h-4 text-gray-400" />
              </button>
              {menuOpen === project.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project.id);
                  }}
                  className="absolute right-0 top-full mt-1 whitespace-nowrap px-2 py-1 text-xs rounded bg-white dark:bg-gray-800 shadow-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors z-10"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showTemplatePicker && (
        <TemplatePickerModal
          target="project"
          onClose={() => setShowTemplatePicker(false)}
          onApplied={handleTemplateApplied}
          onCreateBlank={handleCreateBlankProject}
        />
      )}
    </div>
  );
}
