"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FilePenLine, FileText, Trash2 } from "lucide-react";
import { useArchive } from "./archive-provider";

export function ArchiveList() {
  const { archives, handleDelete } = useArchive();

  if (archives.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-md p-6 mt-8">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <FileText className="mr-2 h-5 w-5" /> Existing Archives
      </h2>
      <ul className="space-y-3">
        {archives.map((archive) => (
          <li
            key={archive.path}
            className="flex items-center justify-between gap-2"
          >
            <Link
              href={`/preview/${encodeURIComponent(
                archive.name
              )}?path=${encodeURIComponent(archive.path)}`}
              className="truncate pr-4 hover:underline"
            >
              {archive.name}
            </Link>
            <div className="flex-shrink-0 flex items-center gap-2">
              <Link
                href={`/edit/${archive.name}?path=${encodeURIComponent(
                  archive.path
                )}`}
              >
                <Button variant="outline" size="icon">
                  <FilePenLine className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleDelete(archive.path, archive.name)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 