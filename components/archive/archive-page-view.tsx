"use client";

import { GitHubTokenManager } from "./github-token-manager";
import { ArchiveUploader } from "./archive-uploader";
import { ArchiveList } from "./archive-list";

export function ArchivePageView() {
  return (
    <>
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-gray-800 dark:text-white">
          Archive to GitHub
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Upload files directly to your GitHub repository and create a markdown
          preview.
        </p>
      </header>

      <div className="max-w-2xl mx-auto">
        <GitHubTokenManager />
        <ArchiveUploader />
        <ArchiveList />
      </div>
    </>
  );
} 