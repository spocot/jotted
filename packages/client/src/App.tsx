import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import NoteListPage from "./pages/NoteListPage";
import NoteEditorPage from "./pages/NoteEditorPage";
import SearchPage from "./pages/SearchPage";
import GraphPage from "./pages/GraphPage";
import TagsPage from "./pages/TagsPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<NoteListPage />} />
        <Route path="/note/:id" element={<NoteEditorPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/tags" element={<TagsPage />} />
      </Routes>
    </Layout>
  );
}
