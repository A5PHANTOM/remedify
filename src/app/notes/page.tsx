"use client";
import { Brand } from "@/components/brand";
import { NotesView } from "@/components/notes-view";
import { ArrowLeft } from "lucide-react";
export default function NotesPage() {
  return <div className="app-shell"><header className="app-header"><Brand /><a href="/" className="text-button"><ArrowLeft size={16} /> Back to tasks</a></header><main className="app-content"><NotesView /></main></div>;
}
