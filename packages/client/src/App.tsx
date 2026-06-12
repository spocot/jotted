import { Routes, Route, Link } from 'react-router-dom';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Jotted</h1>
        <nav className="flex gap-4 text-sm">
          <Link to="/" className="hover:underline">Notes</Link>
          <Link to="/search" className="hover:underline">Search</Link>
          <Link to="/graph" className="hover:underline">Graph</Link>
          <Link to="/tags" className="hover:underline">Tags</Link>
        </nav>
      </header>
      <main className="flex-1 p-4">
        <Routes>
          <Route path="/" element={<div className="text-gray-500">Note list coming soon</div>} />
          <Route path="/note/:id" element={<div className="text-gray-500">Note editor coming soon</div>} />
          <Route path="/search" element={<div className="text-gray-500">Search coming soon</div>} />
          <Route path="/graph" element={<div className="text-gray-500">Graph view coming soon</div>} />
          <Route path="/tags" element={<div className="text-gray-500">Tags coming soon</div>} />
        </Routes>
      </main>
    </div>
  );
}
