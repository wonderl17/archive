import { Octokit } from "@octokit/rest";
import { withRetry, NetworkError } from "./retryUtils";

// 从localStorage获取仓库配置，如果不存在则使用默认值
const getRepoConfig = () => {
  const owner = localStorage.getItem("repo_owner") || "wonderl17";
  const name = localStorage.getItem("repo_name") || "archive-store";
  return { owner, name };
};

// 创建Octokit实例
const createOctokit = (token: string) => {
  return new Octokit({
    auth: token,
  });
};

interface DiaryEntry {
  date: string;
  title: string;
  content?: string;
}

// 将File转换为base64编码的字符串
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // 移除data:image/jpeg;base64,前缀，只保留base64内容
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

function getSubdirectoryForFileType(file: File): string {
  const type = file.type;
  if (type.startsWith("image/")) {
    return "images";
  }
  if (type.startsWith("video/")) {
    return "videos";
  }
  if (type.startsWith("audio/")) {
    return "audios";
  }
  if (type === "application/pdf") {
    return "pdfs";
  }
  return "attachments";
}

// 生成唯一的文件名
function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split(".").pop() || "jpg";
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  // 清理文件名，移除特殊字符
  const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_");
  return `${timestamp}_${randomString}_${cleanName}.${extension}`;
}

// 上传文件到GitHub
export async function uploadFileToGitHub(
  token: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  return withRetry(
    async () => {
      const { owner, name } = getRepoConfig();
      const octokit = createOctokit(token);

      // 生成唯一文件名
      const fileName = generateUniqueFileName(file.name);
      const subdirectory = getSubdirectoryForFileType(file);
      const filePath = `diaries/${subdirectory}/${fileName}`;

      // 模拟上传进度
      if (onProgress) {
        onProgress(10);
      }

      // 将文件转换为base64
      const base64Content = await fileToBase64(file);

      if (onProgress) {
        onProgress(50);
      }

      // 检查文件是否已存在（理论上不应该存在，因为文件名是唯一的）
      let sha: string | undefined;
      try {
        const { data: existingFile } = await octokit.rest.repos.getContent({
          owner,
          repo: name,
          path: filePath,
        });
        sha = (existingFile as any).sha;
      } catch (error: any) {
        console.log("error", error);
        // 文件不存在，这是正常情况
      }

      if (onProgress) {
        onProgress(70);
      }

      // 上传文件到GitHub
      const params: any = {
        owner,
        repo: name,
        path: filePath,
        message: `Add file: ${fileName}`,
        content: base64Content,
      };

      if (sha) {
        params.sha = sha;
      }

      await octokit.rest.repos.createOrUpdateFileContents(params);

      if (onProgress) {
        onProgress(90);
      }

      if (onProgress) {
        onProgress(100);
      }

      // 返回文件在仓库中的完整路径
      return filePath;
    },
    {
      maxAttempts: 3,
      onRetry: (attempt, error) => {
        console.log(`上传文件重试 ${attempt}/3:`, error.message);
      },
    }
  );
}

// 创建包含文件的Markdown归档文件
export async function createArchiveMarkdown(
  token: string,
  uploadedFiles: { file: File; path: string }[],
  title: string,
  description: string
): Promise<string> {
  const { owner, name: repo } = getRepoConfig();
  const octokit = createOctokit(token);

  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');

  const sanitizedTitle = slugify(title);
  const markdownFileName = `${day}-${sanitizedTitle}.md`;
  const markdownFilePath = `diaries/${year}/${month}/${markdownFileName}`;

  // 生成Markdown内容
  let markdownContent = `# ${title}\n\n`;
  if (description) {
    markdownContent += `${description}\n\n`;
  }
  markdownContent += `*Archived on: ${now.toUTCString()}*\n\n---\n\n`;

  const defaultBranch = "main"; // Assuming 'main' is the default branch

  uploadedFiles.forEach(({ file, path }) => {
    // 从diaries/archive.md到diaries/images/image.png的相对路径是images/image.png
    const relativePath = path.replace(/^diaries\//, "");
    markdownContent += `## ${file.name}\n\n`;

    if (file.type.startsWith("image/")) {
      const imageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${path}`;
      markdownContent += `![${file.name}](${imageUrl})\n\n`;
    } else if (file.type.startsWith("video/")) {
      const fileUrl = `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${path}`;
      markdownContent += `[Watch video: ${file.name}](${fileUrl})\n\n`;
    } else if (file.type.startsWith("audio/")) {
      const fileUrl = `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${path}`;
      markdownContent += `[Listen to audio: ${file.name}](${fileUrl})\n\n`;
    } else {
      const fileUrl = `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${path}`;
      markdownContent += `[View file on GitHub: ${file.name}](${fileUrl})\n\n`;
    }
  });


  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: markdownFilePath,
    message: `Create archive: ${title}`,
    content: Buffer.from(markdownContent).toString("base64"),
  });

  return (
    (data as any).html_url ||
    `https://github.com/${owner}/${repo}/blob/main/${markdownFilePath}`
  );
}

// 列出所有归档文件
export async function listArchives(
  token: string
): Promise<{ name: string; path: string }[]> {
  const { owner, name: repo } = getRepoConfig();
  const octokit = createOctokit(token);
  const allArchives: { name: string; path: string }[] = [];

  async function fetchFromDirectory(directoryPath: string) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: directoryPath,
      });

      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.type === "dir") {
            await fetchFromDirectory(item.path); // Recurse into subdirectory
          } else if (item.name.endsWith(".md")) {
            allArchives.push({ name: item.name, path: item.path });
          }
        }
      }
    } catch (error: any) {
      if (error.status === 404) {
        // Directory doesn't exist, which is fine.
        return;
      }
      console.error(`Error listing archives in ${directoryPath}:`, error);
      throw error;
    }
  }

  await fetchFromDirectory("diaries");
  // Sort by path descending to show newest first
  allArchives.sort((a, b) => b.path.localeCompare(a.path));
  return allArchives;
}

// 获取归档文件的内容
export async function getArchiveContent(
  token: string,
  filePath: string
): Promise<string> {
  const { owner, name: repo } = getRepoConfig();
  const octokit = createOctokit(token);

  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: filePath,
    mediaType: {
      format: "raw",
    },
  });

  if (typeof data === "string") {
    return data;
  }

  // @ts-ignore
  return Buffer.from(data.content, "base64").toString("utf-8");
}

export async function deleteArchive(
  token: string,
  filePath: string,
  fileName: string
): Promise<void> {
  const { owner, name: repo } = getRepoConfig();
  const octokit = createOctokit(token);

  // To delete a file, we need its SHA
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: filePath,
  });

  if (Array.isArray(data) || !("sha" in data)) {
    throw new Error("Path is a directory or invalid.");
  }

  await octokit.rest.repos.deleteFile({
    owner,
    repo,
    path: filePath,
    message: `Delete archive: ${fileName}`,
    sha: data.sha,
  });
}

export async function getArchiveForEditing(
  token: string,
  filePath: string
): Promise<{ title: string; description: string; sha: string }> {
  const { owner, name: repo } = getRepoConfig();
  const octokit = createOctokit(token);

  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: filePath,
  });

  if (Array.isArray(data) || !("content" in data) || !("sha" in data)) {
    throw new Error("Invalid archive file path.");
  }

  const content = Buffer.from(data.content, "base64").toString("utf-8");
  const sha = data.sha;

  // Parse title and description
  const lines = content.split('\\n');
  const title = lines[0].replace(/^# /, "").trim();

  const descriptionLines = [];
  let i = 2; // start after title and blank line
  while (i < lines.length && !lines[i].startsWith("*Archived on:")) {
    descriptionLines.push(lines[i]);
    i++;
  }
  const description = descriptionLines.join('\\n').trim();

  return { title, description, sha };
}

export async function updateArchive(
  token: string,
  filePath: string,
  sha: string,
  newTitle: string,
  newDescription: string
): Promise<string> {
  const { owner, name: repo } = getRepoConfig();
  const octokit = createOctokit(token);

  const oldContent = await getArchiveContent(token, filePath);
  const contentParts = oldContent.split('\\n---\\n');
  const filesContent = contentParts.length > 1 ? contentParts[1] : "";

  const headerParts = contentParts[0].split('\\n');
  const archivedOnLine = headerParts.find((line) =>
    line.startsWith("*Archived on:")
  );

  let newHeader = `# ${newTitle}\\n\\n`;
  if (newDescription) {
    newHeader += `${newDescription}\\n\\n`;
  }
  if (archivedOnLine) {
    newHeader += `${archivedOnLine}\\n`;
  }

  const newContent = `${newHeader}\\n---\\n${filesContent}`;

  const { data: updateData } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `Update archive: ${newTitle}`,
    content: Buffer.from(newContent).toString("base64"),
    sha,
  });

  return (
    (updateData as any).content.html_url ||
    `https://github.com/${owner}/${repo}/blob/main/${filePath}`
  );
}
