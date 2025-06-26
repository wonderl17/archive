"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import {
  uploadFileToGitHub,
  createArchiveMarkdown,
  listArchives,
  deleteArchive,
} from "@/lib/github";

// Define interfaces
export interface UploadedFile {
  file: File;
  progress: number;
  path?: string;
  error?: string;
}

export interface ArchiveFile {
  name: string;
  path: string;
}

// Define context shape
interface ArchiveContextType {
  token: string;
  setToken: (token: string) => void;
  handleTokenSave: () => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  files: UploadedFile[];
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => void;
  isUploading: boolean;
  status: string;
  archiveUrl: string;
  archives: ArchiveFile[];
  handleDelete: (filePath: string, fileName: string) => Promise<void>;
}

// Create context
const ArchiveContext = createContext<ArchiveContextType | undefined>(undefined);

// Create provider component
export function ArchiveProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [archiveUrl, setArchiveUrl] = useState("");
  const [status, setStatus] = useState("");
  const [archives, setArchives] = useState<ArchiveFile[]>([]);

  useEffect(() => {
    const storedToken = localStorage.getItem("github_token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const fetchArchives = useCallback(async (token: string) => {
    try {
      const archiveFiles = await listArchives(token);
      setArchives(archiveFiles);
    } catch (err) {
      console.error("Failed to fetch archives:", err);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchArchives(token);
    }
  }, [token, fetchArchives]);

  const handleTokenSave = () => {
    localStorage.setItem("github_token", token);
    alert("Token saved to local storage!");
    if (archives.length === 0) {
      fetchArchives(token);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        progress: 0,
      }));
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      setArchiveUrl("");
    }
  };

  const handleDelete = async (filePath: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }
    try {
      await deleteArchive(token, filePath, fileName);
      setArchives((prev) => prev.filter((a) => a.path !== filePath));
    } catch (err: any) {
      alert(`Failed to delete archive: ${err.message}`);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!token) {
      alert("Please enter your GitHub token.");
      return;
    }
    if (!title) {
      alert("Please enter a title for the archive.");
      return;
    }
    const filesToUpload = files.filter((f) => !f.path);
    if (filesToUpload.length === 0) {
      alert("Please select new files to upload.");
      return;
    }

    setIsUploading(true);
    setArchiveUrl("");
    setStatus("Uploading files...");

    const uploadedFiles: { file: File; path: string }[] = [];

    const uploadPromises = files.map(async (uploadedFile, index) => {
      if (uploadedFile.path) {
        uploadedFiles.push({
          file: uploadedFile.file,
          path: uploadedFile.path,
        });
        return;
      }

      try {
        const onProgress = (progress: number) => {
          setFiles((prevFiles) =>
            prevFiles.map((f, i) => (i === index ? { ...f, progress } : f))
          );
        };

        const path = await uploadFileToGitHub(
          token,
          uploadedFile.file,
          onProgress
        );
        uploadedFiles.push({ file: uploadedFile.file, path });

        setFiles((prevFiles) =>
          prevFiles.map((f, i) =>
            i === index ? { ...f, path, progress: 100 } : f
          )
        );
      } catch (error: any) {
        setFiles((prevFiles) =>
          prevFiles.map((f, i) =>
            i === index ? { ...f, error: error.message } : f
          )
        );
      }
    });

    await Promise.all(uploadPromises);

    const successfulUploads = uploadedFiles.filter((img) =>
      files.find((f) => f.file === img.file && !f.error)
    );

    if (successfulUploads.length > 0) {
      setStatus("Creating Markdown archive...");
      try {
        const url = await createArchiveMarkdown(
          token,
          successfulUploads,
          title,
          description
        );
        setArchiveUrl(url);
        setStatus("Archive created successfully!");
        fetchArchives(token);
      } catch (error: any) {
        setStatus(`Failed to create archive: ${error.message}`);
      }
    } else {
      setStatus("No files were uploaded successfully.");
    }

    setIsUploading(false);
  }, [token, files, title, description, fetchArchives]);

  const value = {
    token,
    setToken,
    handleTokenSave,
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
    archives,
    handleDelete,
  };

  return (
    <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>
  );
}

// Create custom hook
export function useArchive() {
  const context = useContext(ArchiveContext);
  if (context === undefined) {
    throw new Error("useArchive must be used within an ArchiveProvider");
  }
  return context;
} 