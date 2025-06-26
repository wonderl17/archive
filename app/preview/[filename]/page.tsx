"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getArchiveContent } from "@/lib/github";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { KeyRound, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const filename = params.filename as string;
  const filePath = searchParams.get("path");

  const [token, setToken] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
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
      const markdownContent = await getArchiveContent(tokenToUse, filePath);
      setContent(markdownContent);
    } catch (err: any) {
      setError(`Failed to load archive: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && filePath) {
      fetchContent(token);
    }
  }, [token, filePath]);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
  };

  const handleFetchWithNewToken = () => {
    localStorage.setItem("github_token", token);
    setIsTokenNeeded(false);
    fetchContent(token);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <main className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <Link href="/" className="text-blue-500 hover:underline mb-4 block">
            &larr; Back to Uploader
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-white">
            Archive Preview
          </h1>
          <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">
            {filename && decodeURIComponent(filename)}
          </p>
        </header>

        {isTokenNeeded && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800/50 rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <KeyRound className="mr-2 h-5 w-5" /> GitHub Token Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              A GitHub token is required to view private repository content.
            </p>
            <div className="flex items-center gap-4">
              <Input
                type="password"
                value={token}
                onChange={handleTokenChange}
                placeholder="Enter your GitHub Personal Access Token"
                className="flex-grow"
              />
              <Button onClick={handleFetchWithNewToken}>Fetch Content</Button>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800/50 rounded-lg shadow-md p-6 lg:p-12">
          {loading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="ml-4 text-lg">Loading content...</p>
            </div>
          )}
          {error && <p className="text-red-500 text-center py-10">{error}</p>}
          {!loading && !error && !isTokenNeeded && (
            <article className="prose dark:prose-invert lg:prose-xl max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </article>
          )}
        </div>
      </main>
    </div>
  );
} 