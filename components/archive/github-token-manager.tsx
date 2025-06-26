"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound } from "lucide-react";
import { useArchive } from "./archive-provider";

export function GitHubTokenManager() {
  const { token, setToken, handleTokenSave } = useArchive();

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <KeyRound className="mr-2 h-5 w-5" /> GitHub Configuration
      </h2>
      <div className="flex items-center gap-4">
        <Input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter your GitHub Personal Access Token"
          className="flex-grow"
        />
        <Button onClick={handleTokenSave} variant="outline">
          Save Token
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        The token is stored in your browser's local storage. It needs `repo`
        scope to upload files.
      </p>
    </div>
  );
} 