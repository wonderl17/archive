"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, File as FileIcon, FileText } from "lucide-react";
import { useArchive } from "./archive-provider";

export function ArchiveUploader() {
  const {
    title,
    setTitle,
    description,
    setDescription,
    files,
    handleFileChange,
    handleUpload,
    isUploading,
    status,
    archiveUrl,
  } = useArchive();

  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Upload className="mr-2 h-5 w-5" /> Upload Files
      </h2>

      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Title for your archive"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full"
          required
        />
        <Textarea
          placeholder="Add a description for this archive..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full"
          rows={3}
        />
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <label htmlFor="file-upload" className="cursor-pointer">
            <FileIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Drag and drop your files here or click to select files.
            </p>
            <Input
              id="file-upload"
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <ul className="space-y-4">
            {files.map(({ file, progress, error }, index) => (
              <li
                key={index}
                className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate pr-4">{file.name}</span>
                  {error ? (
                    <span className="text-red-500 text-sm">{error}</span>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {progress}%
                    </span>
                  )}
                </div>
                <div className="relative pt-1 mt-2">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-200 dark:bg-blue-900">
                    <div
                      style={{ width: `${progress}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
                    ></div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full mt-6"
          >
            {isUploading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {status}
              </span>
            ) : (
              "Upload and Create Archive"
            )}
          </Button>
          {status && !isUploading && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
              {status}
            </p>
          )}
          {archiveUrl && (
            <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/50 rounded-lg text-center">
              <a
                href={archiveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-green-700 dark:text-green-300 hover:underline flex items-center justify-center"
              >
                <FileText className="mr-2 h-5 w-5" /> View Markdown Archive
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 