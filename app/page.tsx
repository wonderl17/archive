import { ArchiveProvider } from "@/components/archive/archive-provider";
import { ArchivePageView } from "@/components/archive/archive-page-view";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <main className="container mx-auto px-4 py-8">
        <ArchiveProvider>
          <ArchivePageView />
        </ArchiveProvider>
      </main>
    </div>
  );
}
