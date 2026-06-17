import { useEffect } from "react";
import { Routes, Route, useParams, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import NoteListPage from "./pages/NoteListPage";
import NoteEditorPage from "./pages/NoteEditorPage";
import SearchPage from "./pages/SearchPage";
import GraphPage from "./pages/GraphPage";
import TagsPage from "./pages/TagsPage";
import CalendarPage from "./pages/CalendarPage";
import {
  useLazyGetNoteByTitleQuery,
  useCreateNoteMutation,
} from "./store/redux/api";

function NoteByDateRedirect() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [getNoteByTitle] = useLazyGetNoteByTitleQuery();
  const [createNote] = useCreateNoteMutation();

  useEffect(() => {
    if (!date) {
      navigate("/", { replace: true });
      return;
    }

    getNoteByTitle(date)
      .unwrap()
      .then((note) => {
        navigate(`/note/${note.id}`, { replace: true });
      })
      .catch(async () => {
        try {
          const note = await createNote({ title: date }).unwrap();
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
    <Layout>
      <Routes>
        <Route path="/" element={<NoteListPage />} />
        <Route path="/note/:id" element={<NoteEditorPage />} />
        <Route path="/note/by-date/:date" element={<NoteByDateRedirect />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
      </Routes>
    </Layout>
  );
}
