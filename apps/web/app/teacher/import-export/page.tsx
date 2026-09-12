"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  CloudDownload,
  CloudUpload,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import {
  api,
  type ExportFormat,
  type ImportResult,
  type ImportVocabularyRow,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const EXPORT_BASE = {
  vocabulary: "vocabulary",
  students: "students",
  learning: "learning-states",
  assignments: "assignments",
  sessions: "sessions",
} as const;

interface DatasetDef {
  key: "vocabulary" | "students" | "learning" | "assignments" | "sessions";
  title: string;
  description: string;
}

const DATASETS: DatasetDef[] = [
  {
    key: "vocabulary",
    title: "Vocabulary catalog",
    description: "All senses with definitions, Polish translations and CEFR.",
  },
  {
    key: "students",
    title: "Students",
    description: "Your students with learning status and review totals.",
  },
  {
    key: "learning",
    title: "Learning states",
    description: "Per-student vocabulary progress (one row per learned sense).",
  },
  {
    key: "assignments",
    title: "Assignments",
    description: "Your assignments with item counts and mastery progress.",
  },
  {
    key: "sessions",
    title: "Activity sessions",
    description: "Session results including correctness and progress.",
  },
];

function ExportDatasetCard({ def }: { def: DatasetDef }) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [studentId, setStudentId] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsStudent = def.key === "learning" || def.key === "sessions";

  const studentsQuery = useQuery({
    queryKey: ["export-student-options"],
    queryFn: () => api.reportStudents({ limit: 500 }),
    enabled: needsStudent,
  });

  async function download() {
    setBusy(format);
    setError(null);
    try {
      await api.exportDataset(
        def.key,
        {
          format,
          studentId:
            needsStudent && studentId !== "all" ? Number(studentId) : undefined,
        },
        EXPORT_BASE[def.key],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4 text-muted-foreground" />
          {def.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{def.description}</p>
        <div className="flex flex-wrap items-center gap-2">
          {(["csv", "json", "xlsx"] as ExportFormat[]).map((f) => (
            <Button
              key={f}
              variant={format === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFormat(f)}
            >
              {f.toUpperCase()}
            </Button>
          ))}
        </div>
        {needsStudent && (
          <div className="w-full max-w-56">
            <Label className="text-xs">Student (optional)</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students</SelectItem>
                {(studentsQuery.data ?? []).map((s) => (
                  <SelectItem key={s.studentId} value={String(s.studentId)}>
                    {s.displayName}
                  </SelectItem>
                ))}
                {(studentsQuery.data ?? []).length === 0 && !studentsQuery.isLoading ? (
                  <SelectItem value="none-disabled" disabled>
                    No students yet
                  </SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={busy !== null} onClick={download}>
            {busy === format ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download {format.toUpperCase()}
          </Button>
          {error ? (
            <span className="text-xs text-destructive">{error}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ImportExportPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileInfo, setFileInfo] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyPreview(file: File, text: string, format: "json" | "csv" | "xlsx") {
    setBusy(true);
    setError(null);
    setResult(null);
    void (async () => {
      try {
        const res = await api.importVocabulary(
          format === "json"
            ? {
                format: "json",
                rows: JSON.parse(text) as ImportVocabularyRow[],
                dryRun: true,
              }
            : { format, content: text, dryRun: true },
        );
        setFileInfo(`${file.name} (${file.size} bytes)`);
        setResult(res);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not preview the file.",
        );
      } finally {
        setBusy(false);
      }
    })();
  }

  function applyImport(file: File, text: string, format: "json" | "csv" | "xlsx") {
    setBusy(true);
    setError(null);
    setResult(null);
    void (async () => {
      try {
        const payload: { format: "json" | "csv" | "xlsx"; rows?: ImportVocabularyRow[]; content?: string } =
          format === "json"
            ? { format: "json", rows: JSON.parse(text) as ImportVocabularyRow[] }
            : { format, content: text };
        const res = await api.importVocabulary(payload);
        setFileInfo(`${file.name} (${file.size} bytes)`);
        setResult(res);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not import the file.",
        );
      } finally {
        setBusy(false);
      }
    })();
  }

  function onFileSelected(file: File | undefined) {
    setFileInfo(null);
    setResult(null);
    setError(null);
    if (!file) return;
    const name = file.name.toLowerCase();
    const isCsv = name.endsWith(".csv");
    const isJson = name.endsWith(".json");
    const isXlsx = name.endsWith(".xlsx");
    if (!isCsv && !isJson && !isXlsx) {
      setError("Please choose a .csv, .json, or .xlsx vocabulary file.");
      return;
    }
    if (isXlsx) {
      void file.arrayBuffer().then((buf) => {
        const bytes = new Uint8Array(buf);
        let binary = "";
        bytes.forEach((b) => {
          binary += String.fromCharCode(b);
        });
        const content = btoa(binary);
        const run = dryRun ? applyPreview : applyImport;
        run(file, content, "xlsx");
      });
      return;
    }
    void file.text().then((text) => {
      if (!text.trim()) {
        setError("The file is empty.");
        return;
      }
      const format = isJson ? "json" : "csv";
      if (dryRun) applyPreview(file, text, format);
      else applyImport(file, text, format);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <CloudDownload className="size-6 text-muted-foreground" />
          Import / Export
        </h1>
        <p className="text-sm text-muted-foreground">
          Download your vocabulary and student data or upload your own words.
          Imports are non-destructive and teacher-only.
        </p>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-medium">
          <CloudDownload className="size-4 text-muted-foreground" />
          Exports
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DATASETS.map((def) => (
            <ExportDatasetCard key={def.key} def={def} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-medium">
          <CloudUpload className="size-4 text-muted-foreground" />
          Import vocabulary
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Upload a CSV or JSON file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Expected columns for CSV:{" "}
              <Badge variant="secondary">lemma</Badge>,{" "}
              <Badge variant="secondary">partOfSpeech</Badge>,{" "}
              <Badge variant="secondary">definition</Badge>, plus optional{" "}
              <Badge variant="secondary">translations</Badge> (;-separated
              Polish), <Badge variant="secondary">examples</Badge>,{" "}
              <Badge variant="secondary">cefrLevels</Badge>,{" "}
              <Badge variant="secondary">tags</Badge>,{" "}
              <Badge variant="secondary">senseIdHint</Badge>.
              <br />
              JSON should be an array of objects with the same fields. Existing
              senses are skipped, never overwritten. Max 5000 rows per import.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json,.xlsx,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0])}
              />
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                Choose file…
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                Preview first (dry run only)
              </label>
            </div>

            {busy ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Importing…
              </div>
            ) : error ? (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="size-4" />
                {error}
              </p>
            ) : fileInfo ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500" />
                {fileInfo}
              </p>
            ) : null}

            {result ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge>Rows: {result.totalRows}</Badge>
                  <Badge variant="secondary">
                    Valid: {result.validated}
                  </Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-600">
                    New: {result.created}
                  </Badge>
                  <Badge className="bg-amber-500/15 text-amber-600">
                    Skipped (exists): {result.skippedExisting}
                  </Badge>
                  {result.errors.length > 0 && (
                    <Badge variant="destructive">
                      Errors: {result.errors.length}
                    </Badge>
                  )}
                </div>

                {result.errors.length > 0 && (
                  <div className="rounded-md border border-destructive/50 p-3 text-sm">
                    <p className="font-medium text-destructive">
                      Invalid rows
                    </p>
                    <ul className="mt-1 max-h-40 space-y-1 overflow-auto">
                      {result.errors.map((e) => (
                        <li key={e.row} className="text-muted-foreground">
                          Row {e.row}: {e.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!result.dryRun && (
                  <p
                    className={
                      result.created > 0
                        ? "flex items-center gap-2 text-sm text-emerald-600"
                        : "flex items-center gap-2 text-sm text-muted-foreground"
                    }
                  >
                    <CheckCircle2 className="size-4" />
                    {result.created === 0
                      ? "Nothing new to import - all rows already exist."
                      : `Import complete: ${result.created} sense(s) added with a "teacher-import" tag.`}
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}