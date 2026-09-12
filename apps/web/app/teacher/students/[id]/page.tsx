"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Student, type GenerateTokenResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  ArrowLeft,
  Key,
  Copy,
  CircleCheckBig,
  RotateCcw,
  Ban,
  ExternalLink,
  UserX,
  UserCheck,
  AlertCircle,
  Radio,
} from "lucide-react";
import { LearningSummaryCards } from "@/components/students/learning-summary";
import { StudentVocabularyTab } from "@/components/students/student-vocabulary-tab";
import { StudentDueTab } from "@/components/students/student-due-tab";
import { StudentAssignmentsTab } from "@/components/students/student-assignments-tab";

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const studentId = Number(params.id);

  const [tokenResult, setTokenResult] = useState<GenerateTokenResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>("");

  const { data: student, isLoading, error } = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => api.getStudent(studentId),
    enabled: !isNaN(studentId),
  });

  const generateTokenMutation = useMutation({
    mutationFn: () =>
      api.generateAccessToken(
        studentId,
        expiresIn ? parseInt(expiresIn, 10) * 60 : undefined,
      ),
    onSuccess: (result) => {
      setTokenResult(result);
      setCopied(false);
    },
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: () => api.regenerateAccessToken(studentId),
    onSuccess: (result) => {
      setTokenResult(result);
      setCopied(false);
    },
  });

  const revokeTokenMutation = useMutation({
    mutationFn: () => api.revokeAccessToken(studentId),
    onSuccess: () => {
      setTokenResult(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (s: Student) =>
      api.updateStudent(s.id, { isActive: !s.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", studentId] });
    },
  });

  async function copyToken() {
    if (!tokenResult?.rawToken) return;
    await navigator.clipboard.writeText(tokenResult.rawToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/teacher/students")}>
          <ArrowLeft className="mr-2 size-4" />
          Back to students
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 size-8 text-destructive" />
            <p className="font-medium">Student not found</p>
            <p className="text-sm text-muted-foreground">
              The student may have been deleted or the ID is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => router.push("/teacher/students")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Students
          </Button>
          <h1 className="text-2xl font-semibold">{student.displayName}</h1>
          <p className="text-sm text-muted-foreground">
            {student.firstName} · ID {student.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href={`/teacher/live-monitoring?focus=${student.id}`}>
              <Radio className="mr-2 size-4" />
              Watch Live
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => toggleActiveMutation.mutate(student)}
            disabled={toggleActiveMutation.isPending}
          >
            {student.isActive ? (
              <>
                <UserX className="mr-2 size-4" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="mr-2 size-4" />
                Activate
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="h-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vocabulary">Vocabulary</TabsTrigger>
          <TabsTrigger value="due">Due reviews</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">First name</span>
                  <span className="font-medium">{student.firstName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Display name</span>
                  <span className="font-medium">{student.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span
                    className={`font-medium ${student.isActive ? "text-green-600" : "text-red-600"}`}
                  >
                    {student.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {student.notes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground">Notes</span>
                    <p className="mt-1">{student.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="size-5" />
                  Access Token
                </CardTitle>
                <CardDescription>
                  Generate a private link for this student to access their learning
                  session. The raw token is shown only once.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expiresIn">Expires after (minutes, optional)</Label>
                  <Input
                    id="expiresIn"
                    type="number"
                    min="1"
                    placeholder="No expiry"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => generateTokenMutation.mutate()}
                    disabled={generateTokenMutation.isPending}
                  >
                    {generateTokenMutation.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Key className="mr-2 size-4" />
                    )}
                    Generate Token
                  </Button>
                  {tokenResult && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => regenerateTokenMutation.mutate()}
                        disabled={regenerateTokenMutation.isPending}
                      >
                        <RotateCcw className="mr-2 size-4" />
                        Regenerate
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => revokeTokenMutation.mutate()}
                        disabled={revokeTokenMutation.isPending}
                      >
                        <Ban className="mr-2 size-4" />
                        Revoke
                      </Button>
                    </>
                  )}
                </div>

                {tokenResult && (
                  <div className="rounded-md bg-muted p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Token:</span>
                      <code className="flex-1 truncate text-xs">
                        {tokenResult.rawToken}
                      </code>
                      <Button variant="ghost" size="sm" onClick={copyToken}>
                        {copied ? (
                          <CircleCheckBig className="size-4 text-green-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                    {tokenResult.expiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {new Date(tokenResult.expiresAt).toLocaleString()}
                      </p>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`/student/${tokenResult.rawToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 size-4" />
                        Open student view
                      </a>
                    </Button>
                  </div>
                )}

                {generateTokenMutation.isError && (
                  <p className="text-sm text-destructive">
                    Failed to generate token. Student may already have an active token —
                    try regenerating instead.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Learning progress</CardTitle>
              <CardDescription>
                Live counts from the student&apos;s spaced-repetition space.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LearningSummaryCards studentId={studentId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vocabulary" className="mt-4">
          <StudentVocabularyTab studentId={studentId} />
        </TabsContent>

        <TabsContent value="due" className="mt-4">
          <StudentDueTab studentId={studentId} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <StudentAssignmentsTab studentId={studentId} />
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <StudentDistributionTab studentId={studentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StudentDistributionTab({ studentId }: { studentId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["student-distribution", studentId],
    queryFn: () => api.studentDistribution(studentId),
  });
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No distribution yet.</p>;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CEFR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.cefr.length === 0 ? (
            <p className="text-muted-foreground">No CEFR data yet.</p>
          ) : (
            data.cefr.map((row) => (
              <div key={row.level} className="flex justify-between">
                <span>{row.level}</span>
                <span className="tabular-nums">{row.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.categories.length === 0 ? (
            <p className="text-muted-foreground">No category assignments yet.</p>
          ) : (
            data.categories.map((row) => (
              <div key={row.code} className="flex justify-between gap-3">
                <span className="truncate">{row.name}</span>
                <span className="tabular-nums">{row.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Difficult vocabulary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.difficult.length === 0 ? (
            <p className="text-muted-foreground">No difficult senses yet.</p>
          ) : (
            data.difficult.map((row) => (
              <div key={row.senseId} className="flex justify-between gap-3">
                <span>
                  {row.lemma}{" "}
                  <span className="text-muted-foreground">{row.partOfSpeech}</span>
                </span>
                <span className="tabular-nums">{row.incorrectCount} wrong</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}