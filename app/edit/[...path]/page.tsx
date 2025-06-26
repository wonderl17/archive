"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getArchiveForEditing, updateArchive } from "@/lib/github";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EditPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const filePath = searchParams.get("path");
  const name = params.path?.[params.path.length - 1] as string;

  const [token, setToken] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sha, setSha] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isTokenNeeded, setIsTokenNeeded] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("github_token");
    if (storedToken) {
      setToken(storedToken);
    } else {
      setIsTokenNeeded(true);
      setLoading(false);
    }
  }, []);

  const fetchContent = async (tokenToUse: string) => {
    if (!filePath) {
      setError("File path is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { title, description, sha } = await getArchiveForEditing(
        tokenToUse,
        filePath
      );
      setTitle(title);
      setDescription(description);
      setSha(sha);
    } catch (err: any) {
      setError(`Failed to load archive for editing: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && filePath) {
      fetchContent(token);
    }
  }, [token, filePath]);

  const handleSave = async () => {
    if (!filePath || !sha) {
      setError("File information is missing. Cannot save.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await updateArchive(token, filePath, sha, title, description);
      router.push("/");
    } catch (err: any) {
      setError(`Failed to save changes: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTokenSubmit = () => {
    localStorage.setItem("github_token", token);
    setIsTokenNeeded(false);
    if (filePath) {
      fetchContent(token);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <main className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <Link href="/" className="text-blue-500 hover:underline mb-4 block">
            &larr; Back to Uploader
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-white">
            Edit Archive
          </h1>
          <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">
            {name && decodeURIComponent(name)}
          </p>
        </header>

        {isTokenNeeded && (
           <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800/50 rounded-lg shadow-md p-6 mb-8">
           <h2 className="text-xl font-semibold mb-4 flex items-center">
             <KeyRound className="mr-2 h-5 w-5" /> GitHub Token Required
           </h2>
           <div className="flex items-center gap-4">
             <Input
               type="password"
               value={token}
               onChange={(e) => setToken(e.target.value)}
               placeholder="Enter your GitHub Personal Access Token"
               className="flex-grow"
             />
             <Button onClick={handleTokenSubmit}>Set Token</Button>
           </div>
         </div>
        )}

        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800/50 rounded-lg shadow-md p-6">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-red-500 text-center py-10">{error}</p>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="title" className="font-semibold">Title</label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="font-semibold">Description</label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                />
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 