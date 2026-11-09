"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, FileText, Plus, Search, Trash2 } from "lucide-react";

type Note = { id: string; title: string; body: string; updatedAt: string };
export function NotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState<{ id?: string; title: string; body: string } | null>(null);
  const [original, setOriginal] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dirty = draft !== null && JSON.stringify(draft) !== original;

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/notes");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn’t load notes.");
      setNotes(data.notes);
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t load notes."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function edit(note?: Note) {
    const next = note ? { id: note.id, title: note.title, body: note.body } : { title: "", body: "" };
    setDraft(next); setOriginal(JSON.stringify(next)); setError(""); setMessage("");
  }
  function back() {
    if (dirty && !window.confirm("Discard unsaved changes to this note?")) return;
    setDraft(null); setError("");
  }
  async function save() {
    if (!draft || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn’t save your note.");
      setNotes((current) => [data.note, ...current.filter((note) => note.id !== data.note.id)]);
      const next = { id: data.note.id, title: data.note.title, body: data.note.body };
      setDraft(next); setOriginal(JSON.stringify(next)); setMessage("Saved to your account");
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t save. Please try again."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!draft?.id || !window.confirm("Delete this note permanently?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/notes?id=${draft.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Couldn’t delete this note. Please try again.");
      setNotes((current) => current.filter((note) => note.id !== draft.id)); setDraft(null); setMessage("Note deleted");
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t delete note."); }
    finally { setBusy(false); }
  }

  const filtered = notes.filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="notes-page" aria-label="Notes">
    <div className="page-intro compact-intro"><p className="eyebrow">A SPACE TO THINK</p><div className="title-row"><h1>Your notes<span className="brand-dot">.</span></h1>{!draft && <button className="note-new" onClick={() => edit()}><Plus size={18} /> New note</button>}</div><p className="intro-description">Ideas, plans, and everything worth keeping. No deadlines.</p></div>
    {error && <div className="inline-notice error" role="alert">{error}{!draft && <button onClick={load}>Retry</button>}</div>}
    {message && !dirty && <p className="note-status" role="status"><Check size={14} />{message}</p>}
    {draft ? <div className="note-editor"><div className="note-toolbar"><button className="text-button" onClick={back} disabled={busy}><ArrowLeft size={16} /> All notes</button><span>{dirty ? "Unsaved changes" : draft.id ? "Saved" : "New note"}</span>{draft.id && <button className="icon-button" aria-label="Delete note" onClick={remove} disabled={busy}><Trash2 size={17} /></button>}<button className="note-new" onClick={save} disabled={busy || !draft.title.trim()}>{busy ? "Saving…" : "Save note"}</button></div>
      <label className="sr-only" htmlFor="note-title">Note title</label><input id="note-title" autoFocus placeholder="Give your thought a title" value={draft.title} maxLength={200} disabled={busy} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
      <label className="sr-only" htmlFor="note-body">Note content</label><textarea id="note-body" placeholder="Start writing. This space is yours…" value={draft.body} maxLength={50000} disabled={busy} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /><div className="note-editor-footer">{draft.body.length.toLocaleString()} / 50,000 characters</div>
    </div> : <>
      <label className="notes-search"><Search size={18} /><input aria-label="Search notes" placeholder="Find a thought…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      {loading ? <p className="note-status" role="status">Loading your notes…</p> : filtered.length ? <div className="notes-grid">{filtered.map((note) => <button className="note-card" key={note.id} onClick={() => edit(note)}><FileText size={20} /><strong>{note.title}</strong><p>{note.body || "An idea waiting to grow."}</p><span>Edited {new Date(note.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}</span></button>)}</div> : !error && <div className="empty-state"><FileText size={30} /><h3>{query ? "No matching notes" : "A fresh page awaits."}</h3><p>{query ? "Try a different word." : "Capture an idea, sketch a plan, or clear your mind."}</p>{!query && <button className="secondary-button" onClick={() => edit()}><Plus size={16} /> Write your first note</button>}</div>}
    </>}
  </section>;
}
