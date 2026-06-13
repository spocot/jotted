import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import fs from "node:fs";
import http from "node:http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use a fresh test db
const DATA_DIR = resolve(__dirname, "../../data");
const TEST_DB = resolve(DATA_DIR, "test-rename.db");
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
// Clean up wal/shm too
try { fs.unlinkSync(TEST_DB + "-wal"); } catch {}
try { fs.unlinkSync(TEST_DB + "-shm"); } catch {}

// Override DB path before importing the app
process.env.DB_PATH = TEST_DB;

const { app } = await import("./index.js");

const server = app.listen(3123, async () => {
  try {
    // Step 1: Create a note with #tagtest
    const createRes = await fetch("http://localhost:3123/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Rename Test", content: "This note has #tagtest in it" }),
    });
    const note = await createRes.json();
    console.log("1. Created note:", note.id, "tags:", note.tags.map(t => t.name));

    // Step 2: Verify tag exists
    const tagsRes = await fetch("http://localhost:3123/api/tags");
    const tags = await tagsRes.json();
    console.log("2. Tags:", tags.map(t => `${t.name} (${t.noteCount})`));

    // Step 3: Rename tagtest -> renamedtag
    const renameRes = await fetch("http://localhost:3123/api/tags/tagtest", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "renamedtag" }),
    });
    const renamed = await renameRes.json();
    console.log("3. Renamed:", renamed.name);

    // Step 4: Fetch the note and verify content was rewritten
    const noteRes = await fetch(`http://localhost:3123/api/notes/${note.id}`);
    const updatedNote = await noteRes.json();
    console.log("4. Note content after rename:", updatedNote.content);
    console.log("   Note tags:", updatedNote.tags.map(t => t.name));
    const contentOk = updatedNote.content === "This note has #renamedtag in it";
    console.log("   Content rewritten:", contentOk ? "PASS" : "FAIL");

    // Step 5: Re-save the note and verify tag isn't re-created
    const saveRes = await fetch(`http://localhost:3123/api/notes/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: updatedNote.content }),
    });
    const savedNote = await saveRes.json();
    const tagsAfterSaveRes = await fetch("http://localhost:3123/api/tags");
    const tagsAfterSave = await tagsAfterSaveRes.json();
    console.log("5. Tags after re-save:", tagsAfterSave.map(t => `${t.name} (${t.noteCount})`));
    const noOldTag = !tagsAfterSave.find(t => t.name === "tagtest");
    console.log("   Old tag not re-created:", noOldTag ? "PASS" : "FAIL");

    const allPass = contentOk && noOldTag;
    console.log("\n" + (allPass ? "ALL TESTS PASSED" : "SOME TESTS FAILED"));

    server.close(() => process.exit(allPass ? 0 : 1));
  } catch (err) {
    console.error("Test error:", err);
    server.close(() => process.exit(1));
  }
});
