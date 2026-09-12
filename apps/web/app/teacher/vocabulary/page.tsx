import { VocabularyExplorer } from "@/components/vocabulary/vocabulary-explorer";

export default async function VocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  return <VocabularyExplorer initialCategory={params.category ?? ""} />;
}
