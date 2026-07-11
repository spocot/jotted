import { useEffect, useRef } from "react";
import { Routes, Route, useParams, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import { ConfirmProvider } from "./hooks/useConfirm";
import NoteListPage from "./pages/NoteListPage";
import NoteEditorPage from "./pages/NoteEditorPage";
import SearchPage from "./pages/SearchPage";
import GraphPage from "./pages/GraphPage";
import TagsPage from "./pages/TagsPage";
import CalendarPage from "./pages/CalendarPage";
import DailyJournalPage from "./pages/DailyJournalPage";
import CanvasPage from "./pages/CanvasPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectOverviewPage from "./pages/ProjectOverviewPage";
import ProjectGroupPage from "./pages/ProjectGroupPage";
import ProjectAnalyticsPage from "./pages/ProjectAnalyticsPage";
import ProjectMilestonesPage from "./pages/ProjectMilestonesPage";
import ProjectTimelinePage from "./pages/ProjectTimelinePage";
import TemplatesPage from "./pages/TemplatesPage";
import InquiryPage from "./pages/InquiryPage";
import {
  useLazyGetNoteByTitleQuery,
  useCreateNoteMutation,
} from "./store/redux/api";

function getDailyTemplate(date: string): string {
  const d = new Date(date + "T12:00:00");
  const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "long" });
  return `# ${date} (${dayOfWeek})

## Tasks

- [ ]

## Notes

`;
}

function NoteByDateRedirect() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [getNoteByTitle] = useLazyGetNoteByTitleQuery();
  const [createNote] = useCreateNoteMutation();
  const initiatedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!date) {
      navigate("/", { replace: true });
      return;
    }

    if (initiatedRef.current === date) return;
    initiatedRef.current = date;

    getNoteByTitle(date)
      .unwrap()
      .then((note) => {
        navigate(`/note/${note.id}`, { replace: true });
      })
      .catch(async () => {
        try {
          const content = getDailyTemplate(date);
          const note = await createNote({ title: date, content }).unwrap();
          navigate(`/note/${note.id}`, { replace: true });
        } catch {
          navigate("/", { replace: true });
        }
      });
  }, [date, navigate, getNoteByTitle, createNote]);

  return null;
}

export default function App() {
  return (
    <ConfirmProvider>
      <Layout>
        <Routes>
        <Route path="/" element={<NoteListPage />} />
        <Route path="/note/:id" element={<NoteEditorPage />} />
        <Route path="/note/by-date/:date" element={<NoteByDateRedirect />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/canvas/:id" element={<CanvasPage />} />
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="/journal" element={<DailyJournalPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/project/:id" element={<ProjectOverviewPage />} />
        <Route path="/project/:id/group/:groupId" element={<ProjectGroupPage />} />
        <Route path="/project/:id/analytics" element={<ProjectAnalyticsPage />} />
        <Route path="/project/:id/timeline" element={<ProjectTimelinePage />} />
        <Route path="/project/:id/milestones" element={<ProjectMilestonesPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/inquiry" element={<InquiryPage />} />
        </Routes>
      </Layout>
    </ConfirmProvider>
  );
}
