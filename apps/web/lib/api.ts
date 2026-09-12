export interface TeacherProfile {
  id: number;
  email: string;
  displayName: string;
  lastLoginAt: string | null;
}

export interface AuthMeResponse {
  teacher: TeacherProfile;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: string;
  teacher: TeacherProfile;
}

export interface Student {
  id: number;
  teacherId: number;
  firstName: string;
  displayName: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentAccessToken {
  id: number;
  studentId: number;
  tokenPrefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface PaginatedStudents {
  data: Student[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ResolvedStudent {
  id: number;
  displayName: string;
  firstName: string;
}

export interface ResolvedAccess {
  student: ResolvedStudent;
}

export interface CreateStudentRequest {
  firstName: string;
  displayName?: string;
  notes?: string;
  dateOfBirth?: string;
  school?: string;
  gradeLevel?: string;
  parentEmail?: string;
  parentName?: string;
}

export interface UpdateStudentRequest {
  firstName?: string;
  displayName?: string;
  notes?: string;
  dateOfBirth?: string;
  school?: string;
  gradeLevel?: string;
  parentEmail?: string;
  parentName?: string;
  isActive?: boolean;
}

export interface GenerateTokenResponse {
  id: number;
  rawToken: string;
  tokenPrefix: string;
  url: string;
  expiresAt: string | null;
}

export interface PolishTranslation {
  id: number;
  text: string;
  senseLabel: string | null;
  matchMethod: string | null;
  matchConfidence: string | null;
}

export interface VocabularyListItem {
  id: number;
  entryId: number;
  lemma: string;
  normalizedLemma: string;
  partOfSpeech: string;
  displayForm: string | null;
  position: number;
  definition: string;
  tags: string[];
  senseIdHint: string | null;
  translations: PolishTranslation[];
  cefrLevels: string[];
  frequencyRank: number | null;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedList {
  data: VocabularyListItem[];
  meta: PaginatedMeta;
}

export interface FrequencyRow {
  rank: number | null;
  sfi: number | null;
  frequencyPerMillion: number | null;
}

export interface ExampleSentence {
  id: number;
  text: string;
  source: string;
  verification: string | null;
}

export interface CefrEvidence {
  level: string;
  confidence: string;
  requiresReview: boolean;
  source: string | null;
}

export interface WordnetMatch {
  synsetId: string;
  definition: string;
  members: string[];
  confidence: string;
  score: number | null;
}

export interface Category {
  code: string;
  name: string;
}

export interface VocabularyDetailSense {
  id: number;
  position: number;
  lemma: string;
  normalizedLemma: string;
  partOfSpeech: string;
  definition: string;
  tags: string[];
  senseIdHint: string | null;
  wikidataQid: string | null;
  translations: PolishTranslation[];
  examples: ExampleSentence[];
  cefr: CefrEvidence[];
  wordnet: WordnetMatch[];
  categories: Category[];
}

export interface VocabularyDetailEntry {
  id: number;
  lemma: string;
  normalizedLemma: string;
  partOfSpeech: string;
  language: string;
  displayForm: string | null;
  wikidataQid: string | null;
  createdAt: string;
  updatedAt: string;
  frequency: FrequencyRow[];
  senses: VocabularyDetailSense[];
}

export type SortField = "lemma" | "position" | "frequency" | "id";
export type SortOrder = "asc" | "desc";

export interface VocabularyQuery {
  page?: number;
  limit?: number;
  search?: string;
  partOfSpeech?: string;
  cefr?: string;
  category?: string;
  hasPolishTranslation?: boolean;
  frequencyRank?: number;
  sort?: SortField;
  order?: SortOrder;
}

function buildQuery(query: VocabularyQuery): string {
  const params = new URLSearchParams();
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.partOfSpeech) params.set("partOfSpeech", query.partOfSpeech);
  if (query.cefr) params.set("cefr", query.cefr);
  if (query.category) params.set("category", query.category);
  if (query.hasPolishTranslation !== undefined) {
    params.set("hasPolishTranslation", String(query.hasPolishTranslation));
  }
  if (query.frequencyRank) params.set("frequencyRank", String(query.frequencyRank));
  if (query.sort) params.set("sort", query.sort);
  if (query.order) params.set("order", query.order);
  const raw = params.toString();
  return raw.length > 0 ? `?${raw}` : "";
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText} for ${path}`);
  }
  return (await res.json()) as T;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  return getJson<T>(path, {
    method: "POST",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  return getJson<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function deleteJson<T>(path: string): Promise<T> {
  return getJson<T>(path, { method: "DELETE" });
}

export const api = {
  health(): Promise<{
    status: string;
    database: string;
    latencyMs: number;
    tables: number;
    timestamp: string;
  }> {
    return getJson("/health");
  },

  me(): Promise<AuthMeResponse> {
    return getJson("/auth/me");
  },
  login(email: string, password: string): Promise<LoginResponse> {
    return postJson("/auth/login", { email, password });
  },
  logout(): Promise<{ ok: true }> {
    return postJson("/auth/logout");
  },

  listStudents(query: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: string;
    sort?: string;
    order?: string;
  }): Promise<PaginatedStudents> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search) params.set("search", query.search);
    if (query.isActive) params.set("isActive", query.isActive);
    if (query.sort) params.set("sort", query.sort);
    if (query.order) params.set("order", query.order);
    const qs = params.toString();
    return getJson(`/students${qs ? `?${qs}` : ""}`);
  },
  getStudent(id: number): Promise<Student> {
    return getJson(`/students/${id}`);
  },
  createStudent(data: CreateStudentRequest): Promise<Student> {
    return postJson("/students", data);
  },
  updateStudent(id: number, data: UpdateStudentRequest): Promise<Student> {
    return patchJson(`/students/${id}`, data);
  },
  deleteStudent(id: number): Promise<{ message: string }> {
    return deleteJson(`/students/${id}`);
  },

  generateAccessToken(studentId: number, expiresInSeconds?: number): Promise<GenerateTokenResponse> {
    return postJson(`/students/${studentId}/access-token`, { expiresInSeconds });
  },
  regenerateAccessToken(studentId: number): Promise<GenerateTokenResponse> {
    return postJson(`/students/${studentId}/access-token/regenerate`);
  },
  revokeAccessToken(studentId: number): Promise<{ message: string }> {
    return postJson(`/students/${studentId}/access-token/revoke`);
  },

  resolveAccessToken(token: string): Promise<ResolvedAccess> {
    return getJson(`/student-access/${token}`);
  },

  listVocabulary(query: VocabularyQuery, signal?: AbortSignal): Promise<PaginatedList> {
    return getJson(`/vocabulary${buildQuery(query)}`, { signal });
  },
  searchVocabulary(q: string, page: number, limit: number): Promise<PaginatedList> {
    return getJson(`/vocabulary/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`);
  },
  getVocabularyEntry(entryId: number): Promise<VocabularyDetailEntry> {
    return getJson(`/vocabulary/${entryId}`);
  },

  studentVocabularySummary(studentId: number): Promise<StudentStateSummary> {
    return getJson(`/students/${studentId}/vocabulary/summary`);
  },
  studentVocabulary(
    studentId: number,
    query: StudentVocabularyQuery,
  ): Promise<PaginatedStudentVocab> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.status) params.set("status", query.status);
    if (query.cefr) params.set("cefr", query.cefr);
    if (query.partOfSpeech) params.set("partOfSpeech", query.partOfSpeech);
    if (query.due !== undefined) params.set("due", String(query.due));
    if (query.search) params.set("search", query.search);
    const qs = params.toString();
    return getJson(`/students/${studentId}/vocabulary${qs ? `?${qs}` : ""}`);
  },
  studentVocabDetail(studentId: number, senseId: number): Promise<StudentVocabDetail> {
    return getJson(`/students/${studentId}/vocabulary/${senseId}`);
  },
  studentAssignSense(
    studentId: number,
    senseId: number,
    sourceType = "manual",
  ): Promise<StudentVocabState> {
    return postJson(`/students/${studentId}/vocabulary/${senseId}/assign`, { sourceType });
  },
  studentOverrideState(
    studentId: number,
    senseId: number,
    status: LearningStatus,
    forceDue?: boolean,
  ): Promise<StudentVocabState> {
    return patchJson(`/students/${studentId}/vocabulary/${senseId}/state`, {
      status,
      forceDue,
    });
  },
  studentUnassignSense(studentId: number, senseId: number): Promise<{ removed: boolean }> {
    return deleteJson(`/students/${studentId}/vocabulary/${senseId}`);
  },
  studentDistribution(studentId: number): Promise<StudentDistribution> {
    return getJson(`/students/${studentId}/vocabulary/distribution`);
  },
  listVocabularyCategories(): Promise<VocabularyCategory[]> {
    return getJson("/vocabulary/categories");
  },
  changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
    return postJson("/auth/change-password", { currentPassword, newPassword });
  },
  createActivityPlayLink(
    activityId: number,
    body: { linkType?: "PERMANENT" | "EXPIRING" | "SINGLE_USE"; expiresInSeconds?: number },
  ): Promise<ActivityPlayLink> {
    return postJson(`/activities/${activityId}/access-token`, body);
  },
  revokeActivityPlayLink(activityId: number): Promise<{ revoked: boolean }> {
    return postJson(`/activities/${activityId}/access-token/revoke`);
  },
  resolvePlayAccess(token: string): Promise<{
    access: {
      activityId: number;
      studentId: number;
      linkType: string;
      title: string;
      activityType: string;
      student: { id: number; displayName: string; firstName: string };
    };
    activity: ActivityDetail;
  }> {
    return getJson(`/play-access/${token}`);
  },
  playStart(token: string): Promise<{ session: ActivitySessionDetail; items: ActivityItem[] }> {
    return postJson(`/play-access/${token}/start`);
  },
  playSession(token: string, sessionId: number): Promise<ActivitySessionDetail> {
    return getJson(`/play-access/${token}/sessions/${sessionId}`);
  },
  playPause(token: string, sessionId: number): Promise<ActivitySessionDetail> {
    return postJson(`/play-access/${token}/sessions/${sessionId}/pause`);
  },
  playResume(token: string, sessionId: number): Promise<ActivitySessionDetail> {
    return postJson(`/play-access/${token}/sessions/${sessionId}/resume`);
  },
  playFinish(token: string, sessionId: number): Promise<ActivitySessionDetail> {
    return postJson(`/play-access/${token}/sessions/${sessionId}/finish`);
  },
  playRecordEvent(
    token: string,
    sessionId: number,
    body: CreateEventRequest,
  ): Promise<ActivitySessionDetail> {
    return postJson(`/play-access/${token}/sessions/${sessionId}/events`, body);
  },
  studentDueReviews(
    studentId: number,
    query: { page?: number; limit?: number },
  ): Promise<PaginatedStudentVocab> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return getJson(`/students/${studentId}/reviews/due${qs ? `?${qs}` : ""}`);
  },

  accessSummary(token: string): Promise<StudentStateSummary> {
    return getJson(`/student-access/${token}/vocabulary/summary`);
  },
  accessVocabulary(
    token: string,
    query: StudentVocabularyQuery,
  ): Promise<PaginatedStudentVocab> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.status) params.set("status", query.status);
    if (query.due !== undefined) params.set("due", String(query.due));
    const qs = params.toString();
    return getJson(`/student-access/${token}/vocabulary${qs ? `?${qs}` : ""}`);
  },
  accessDueReviews(token: string, query: { page?: number; limit?: number }): Promise<PaginatedStudentVocab> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return getJson(`/student-access/${token}/reviews/due${qs ? `?${qs}` : ""}`);
  },

  listVocabularySets(query: {
    search?: string;
    isActive?: string;
    page?: number;
    limit?: number;
    sort?: string;
    order?: string;
  }): Promise<PaginatedSets> {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.isActive) params.set("isActive", query.isActive);
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.sort) params.set("sort", query.sort);
    if (query.order) params.set("order", query.order);
    const qs = params.toString();
    return getJson(`/vocabulary-sets${qs ? `?${qs}` : ""}`);
  },
  createVocabularySet(data: {
    name: string;
    description?: string;
    senseIds?: number[];
  }): Promise<{ id: number }> {
    return postJson("/vocabulary-sets", data);
  },
  getVocabularySet(id: number): Promise<VocabularySetDetail> {
    return getJson(`/vocabulary-sets/${id}`);
  },
  updateVocabularySet(
    id: number,
    data: { name?: string; description?: string; isActive?: boolean },
  ): Promise<{ id: number }> {
    return patchJson(`/vocabulary-sets/${id}`, data);
  },
  deleteVocabularySet(id: number): Promise<{ id: number; deactivated: boolean }> {
    return deleteJson(`/vocabulary-sets/${id}`);
  },
  addSetItems(id: number, senseIds: number[]): Promise<{ itemCount: number }> {
    return postJson(`/vocabulary-sets/${id}/items`, { senseIds });
  },
  removeSetItem(id: number, senseId: number): Promise<{ itemCount: number }> {
    return deleteJson(`/vocabulary-sets/${id}/items/${senseId}`);
  },

  listAssignments(query: {
    studentId?: number;
    status?: AssignmentStatus;
    due?: "overdue" | "upcoming";
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedAssignments> {
    const params = new URLSearchParams();
    if (query.studentId) params.set("studentId", String(query.studentId));
    if (query.status) params.set("status", query.status);
    if (query.due) params.set("due", query.due);
    if (query.search) params.set("search", query.search);
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return getJson(`/assignments${qs ? `?${qs}` : ""}`);
  },
  createAssignment(data: {
    studentId: number;
    title: string;
    description?: string;
    dueAt?: string;
    senseIds?: number[];
    vocabularySetIds?: number[];
  }): Promise<AssignmentDetail> {
    return postJson("/assignments", data);
  },
  getAssignment(id: number): Promise<AssignmentDetail> {
    return getJson(`/assignments/${id}`);
  },
  updateAssignment(
    id: number,
    data: {
      title?: string;
      description?: string;
      dueAt?: string;
      status?: AssignmentStatus;
    },
  ): Promise<AssignmentDetail> {
    return patchJson(`/assignments/${id}`, data);
  },
  deleteAssignment(id: number): Promise<{ id: number; cancelled: boolean }> {
    return deleteJson(`/assignments/${id}`);
  },

  accessAssignments(token: string): Promise<StudentAssignment[]> {
    return getJson(`/student-access/${token}/assignments`);
  },
  accessAssignment(token: string, assignmentId: number): Promise<AssignmentDetail> {
    return getJson(`/student-access/${token}/assignments/${assignmentId}`);
  },

  listActivities(query: {
    studentId?: number;
    assignmentId?: number;
    activityType?: ActivityType;
    status?: ActivityStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedActivities> {
    const params = new URLSearchParams();
    if (query.studentId) params.set("studentId", String(query.studentId));
    if (query.assignmentId) params.set("assignmentId", String(query.assignmentId));
    if (query.activityType) params.set("activityType", query.activityType);
    if (query.status) params.set("status", query.status);
    if (query.search) params.set("search", query.search);
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return getJson(`/activities${qs ? `?${qs}` : ""}`);
  },
  getActivity(id: number): Promise<ActivityDetail> {
    return getJson(`/activities/${id}`);
  },
  createActivity(data: CreateActivityRequest): Promise<{ id: number }> {
    return postJson("/activities", data);
  },
  updateActivity(
    id: number,
    data: { title?: string; description?: string; settings?: Record<string, unknown>; status?: ActivityStatus },
  ): Promise<ActivityDetail> {
    return patchJson(`/activities/${id}`, data);
  },
  deleteActivity(id: number): Promise<{ id: number; cancelled: boolean }> {
    return deleteJson(`/activities/${id}`);
  },
  listActivitySessions(id: number): Promise<ActivitySessionListItem[]> {
    return getJson(`/activities/${id}/sessions`);
  },
  listStudentActivities(studentId: number): Promise<ActivityListItem[]> {
    return getJson(`/students/${studentId}/activities`);
  },
  getSession(sessionId: number): Promise<ActivitySessionDetail> {
    return getJson(`/activity-sessions/${sessionId}`);
  },
  sessionEvents(
    sessionId: number,
    query: { page?: number; limit?: number },
  ): Promise<PaginatedSessionEvents> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return getJson(`/activity-sessions/${sessionId}/events${qs ? `?${qs}` : ""}`);
  },

  accessActivities(token: string): Promise<ActivityListItem[]> {
    return getJson(`/student-access/${token}/activities`);
  },
  accessActivity(token: string, activityId: number): Promise<ActivityDetail> {
    return getJson(`/student-access/${token}/activities/${activityId}`);
  },
  accessStartActivity(
    token: string,
    activityId: number,
  ): Promise<{ session: ActivitySessionDetail; items: ActivityItem[] }> {
    return postJson(`/student-access/${token}/activities/${activityId}/start`);
  },
  accessSession(token: string, sessionId: number): Promise<ActivitySessionDetail> {
    return getJson(`/student-access/${token}/activity-sessions/${sessionId}`);
  },
  accessPauseSession(token: string, sessionId: number): Promise<ActivitySessionDetail> {
    return postJson(`/student-access/${token}/activity-sessions/${sessionId}/pause`);
  },
  accessResumeSession(token: string, sessionId: number): Promise<ActivitySessionDetail> {
    return postJson(`/student-access/${token}/activity-sessions/${sessionId}/resume`);
  },
  accessFinishSession(token: string, sessionId: number): Promise<ActivitySessionDetail> {
    return postJson(`/student-access/${token}/activity-sessions/${sessionId}/finish`);
  },
  accessRecordEvent(
    token: string,
    sessionId: number,
    body: CreateEventRequest,
  ): Promise<ActivitySessionDetail> {
    return postJson(`/student-access/${token}/activity-sessions/${sessionId}/events`, body);
  },

  realtimeLive(): Promise<LiveStudent[]> {
    return getJson("/realtime/live");
  },
  realtimeCredentials(): Promise<{ accessToken: string }> {
    return getJson("/realtime/credentials");
  },

  dashboardReports(): Promise<TeacherDashboard> {
    return getJson("/reports/dashboard");
  },
  reportStudents(query: {
    search?: string;
    limit?: number;
  }): Promise<ReportStudent[]> {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return getJson(`/reports/students${qs ? `?${qs}` : ""}`);
  },
  reportActivities(query: {
    studentId?: number;
    activityType?: string;
    from?: string;
    to?: string;
  }): Promise<ReportActivity[]> {
    const params = new URLSearchParams();
    if (query.studentId) params.set("studentId", String(query.studentId));
    if (query.activityType) params.set("activityType", query.activityType);
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
    const qs = params.toString();
    return getJson(`/reports/activities${qs ? `?${qs}` : ""}`);
  },
  reportReviewTrend(query: {
    studentId?: number;
    days?: number;
  }): Promise<ReviewTrendPoint[]> {
    const params = new URLSearchParams();
    if (query.studentId) params.set("studentId", String(query.studentId));
    if (query.days) params.set("days", String(query.days));
    const qs = params.toString();
    return getJson(`/reports/review-trend${qs ? `?${qs}` : ""}`);
  },
  reportRecentActivity(query: { limit?: number }): Promise<RecentActivityItem[]> {
    const params = new URLSearchParams();
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return getJson(`/reports/recent-activity${qs ? `?${qs}` : ""}`);
  },

  exportDataset(
    kind: "vocabulary" | "students" | "learning" | "assignments" | "sessions",
    params: Record<string, string | number | undefined>,
    filenameBase: string,
  ): Promise<void> {
    return downloadExport(kind, params, filenameBase);
  },

  importVocabulary(payload: {
    format: "json" | "csv" | "xlsx";
    rows?: ImportVocabularyRow[];
    content?: string;
    dryRun?: boolean;
  }): Promise<ImportResult> {
    return postJson("/imports/vocabulary", payload);
  },
};

export const LEARNING_STATUSES = [
  "ASSIGNED",
  "ENCOUNTERED",
  "LEARNING",
  "REVIEWING",
  "MASTERED",
] as const;

export type LearningStatus = (typeof LEARNING_STATUSES)[number];

export type ReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface StudentVocabState {
  id: number;
  studentId: number;
  senseId: number;
  status: LearningStatus;
  firstEncounteredAt: string | null;
  firstLearnedAt: string | null;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  difficulty: number | null;
  stability: number | null;
  retrievability: number | null;
  lapses: number;
  createdAt: string;
  updatedAt: string;
  isDue: boolean;
}

export interface StudentVocabSense {
  id: number;
  entryId: number;
  lemma: string;
  normalizedLemma: string;
  partOfSpeech: string;
  displayForm: string | null;
  position: number;
  definition: string;
  tags: string[];
  senseIdHint: string | null;
  cefrLevels: string[];
  frequencyRank: number | null;
  translations: PolishTranslation[];
}

export interface StudentVocabRow {
  state: StudentVocabState;
  sense: StudentVocabSense;
}

export interface PaginatedStudentVocab {
  data: StudentVocabRow[];
  meta: PaginatedMeta;
}

export interface ReviewHistoryRow {
  id: number;
  rating: ReviewRating | null;
  responseTimeMs: number | null;
  previousStatus: LearningStatus;
  newStatus: LearningStatus;
  previousDifficulty: number | null;
  newDifficulty: number | null;
  previousStability: number | null;
  newStability: number | null;
  previousNextReviewAt: string | null;
  nextReviewAt: string | null;
  sourceType: string;
  sourceId: number | null;
  reviewedAt: string;
  createdAt: string;
}

export interface StudentVocabDetail {
  state: StudentVocabState;
  sense: StudentVocabSense & {
    wikidataQid: string | null;
    examples: ExampleSentence[];
    cefr: CefrEvidence[];
    wordnet: WordnetMatch[];
    categories: Category[];
  };
  recentReviews: ReviewHistoryRow[];
}

export interface StudentStateSummary {
  assigned: number;
  encountered: number;
  learning: number;
  reviewing: number;
  mastered: number;
  dueNow: number;
  dueTomorrow?: number;
  difficult?: number;
  total: number;
}

export interface StudentDistribution {
  cefr: Array<{ level: string; count: number }>;
  categories: Array<{ code: string; name: string; count: number }>;
  difficult: Array<{
    senseId: number;
    lemma: string;
    partOfSpeech: string;
    incorrectCount: number;
    lapses: number;
    status: string;
  }>;
}

export interface VocabularyCategory {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
}

export interface ActivityPlayLink {
  activityId: number;
  rawToken: string;
  tokenPrefix: string;
  linkType: "PERMANENT" | "EXPIRING" | "SINGLE_USE";
  url: string;
  expiresAt: string | null;
}

export interface StudentVocabularyQuery {
  page?: number;
  limit?: number;
  status?: LearningStatus;
  cefr?: string;
  partOfSpeech?: string;
  due?: boolean;
  search?: string;
}

export const POS_OPTIONS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "proper noun",
  "determiner",
  "preposition",
  "conjunction",
  "interjection",
  "particle",
  "numeral",
  "article",
  "phrase",
  "abbreviation",
  "affix",
  "prefix",
  "suffix",
  "initialism",
  "idiomatic phrase",
] as const;

export const CEFR_OPTIONS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: "lemma", label: "Lemma (A-Z)" },
  { value: "position", label: "Sense position" },
  { value: "frequency", label: "Frequency rank" },
  { value: "id", label: "Database id" },
];

export interface VocabularySetListItem {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedSets {
  data: VocabularySetListItem[];
  meta: PaginatedMeta;
}

export interface SetSenseItem {
  senseId: number;
  entryId: number;
  lemma: string;
  normalizedLemma: string;
  partOfSpeech: string;
  displayForm: string | null;
  position: number;
  definition: string;
  cefrLevels: string[];
  frequencyRank: number | null;
  translations: PolishTranslation[];
  categories: Category[];
}

export interface VocabularySetDetail {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  items: SetSenseItem[];
}

export const ASSIGNMENT_STATUSES = [
  "DRAFT",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export interface AssignmentStudent {
  id: number;
  displayName: string;
  firstName: string;
  lastName: string | null;
}

export interface AssignmentListItem {
  id: number;
  studentId: number;
  title: string;
  description: string | null;
  status: AssignmentStatus;
  assignedAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  student: AssignmentStudent;
  itemCount: number;
  masteredCount: number;
  progress: number;
}

export interface PaginatedAssignments {
  data: AssignmentListItem[];
  meta: PaginatedMeta;
}

export interface AssignmentProgress {
  total: number;
  mastered: number;
  percent: number;
  countByStatus: Record<
    "assigned" | "encountered" | "learning" | "reviewing" | "mastered",
    number
  >;
}

export interface AssignmentItem {
  senseId: number;
  entryId: number;
  lemma: string;
  normalizedLemma: string;
  partOfSpeech: string;
  displayForm: string | null;
  position: number;
  definition: string;
  cefrLevels: string[];
  frequencyRank: number | null;
  translations: PolishTranslation[];
  categories: Category[];
  source: { type: "MANUAL" | "VOCABULARY_SET"; sourceSetId: number | null };
  learning: LearningStatus | null;
  reviewCount: number;
  nextReviewAt: string | null;
}

export interface AssignmentDetail {
  id: number;
  studentId: number;
  title: string;
  description: string | null;
  status: AssignmentStatus;
  assignedAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  student: AssignmentStudent & { isActive: boolean };
  totalItems: number;
  progress: AssignmentProgress;
  items: AssignmentItem[];
}

export interface StudentAssignment {
  id: number;
  title: string;
  description: string | null;
  status: AssignmentStatus;
  assignedAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  itemCount: number;
  masteredCount: number;
  progress: number;
}

export const ACTIVITY_TYPES = [
  "FLASHCARDS",
  "MEMORY",
  "QUIZ",
  "FILL_BLANK",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export const SESSION_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "FINISHED",
  "ABANDONED",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const ACTIVITY_EVENT_TYPES = [
  "ACTIVITY_STARTED",
  "CARD_SHOWN",
  "ANSWER_SUBMITTED",
  "ANSWER_CORRECT",
  "ANSWER_INCORRECT",
  "MATCH_FOUND",
  "MATCH_FAILED",
  "QUESTION_COMPLETED",
  "PAUSED",
  "RESUMED",
  "FINISHED",
] as const;
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export interface ActivityStudent {
  id: number;
  displayName: string;
  firstName: string;
}

export interface LatestSession {
  id: number;
  status: SessionStatus;
  startedAt: string;
  finishedAt: string | null;
  totalItems: number;
  corrected: number;
  incorrect: number;
  completed: number;
  percentComplete: number;
}

export interface ActivityListItem {
  id: number;
  studentId: number;
  assignmentId: number | null;
  title: string;
  description: string | null;
  activityType: ActivityType;
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
  student: ActivityStudent;
  assignment: { id: number; title: string; status: AssignmentStatus } | null;
  itemCount: number;
  latestSession: LatestSession | null;
}

export interface PaginatedActivities {
  data: ActivityListItem[];
  meta: PaginatedMeta;
}

export interface ActivityItem {
  senseId: number;
  entryId: number;
  lemma: string;
  normalizedLemma: string;
  partOfSpeech: string;
  displayForm: string | null;
  position: number;
  definition: string;
  cefrLevels: string[];
  frequencyRank: number | null;
  translations: PolishTranslation[];
  categories: Category[];
  /** Real example sentences for the sense, in id order. */
  examples: string[];
}

export interface ActivityDetail {
  id: number;
  studentId: number;
  assignmentId: number | null;
  title: string;
  description: string | null;
  activityType: ActivityType;
  status: ActivityStatus;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  student: ActivityStudent & { isActive: boolean };
  assignment: { id: number; title: string; status: AssignmentStatus } | null;
  itemCount: number;
  sessionCount: number;
  items: ActivityItem[];
}

export interface CreateActivityRequest {
  studentId: number;
  assignmentId?: number;
  activityType: ActivityType;
  title: string;
  description?: string;
  senseIds?: number[];
  itemCount?: number;
  settings?: Record<string, unknown>;
  selection?:
    | "manual"
    | "assignment"
    | "set"
    | "assigned"
    | "due"
    | "difficult"
    | "catalog";
  vocabularySetId?: number;
  cefr?: string;
  category?: string;
  partOfSpeech?: string;
}

export interface ActivitySessionListItem {
  id: number;
  status: SessionStatus;
  startedAt: string;
  lastActivityAt: string;
  finishedAt: string | null;
  pausedAt: string | null;
  currentItemIndex: number | null;
  totalItems: number;
  correctCount: number;
  incorrectCount: number;
  completedCount: number;
  percentComplete: number;
}

export interface ActivitySessionBrief {
  id: number;
  title: string;
  activityType: ActivityType;
  status: ActivityStatus;
}

export interface ActivitySessionDetail {
  id: number;
  activityId: number;
  studentId: number;
  status: SessionStatus;
  startedAt: string;
  lastActivityAt: string;
  finishedAt: string | null;
  pausedAt: string | null;
  currentItemIndex: number | null;
  totalItems: number;
  correctCount: number;
  incorrectCount: number;
  completedCount: number;
  percentComplete: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  activity: ActivitySessionBrief | null;
}

export interface SessionEventItem {
  id: number;
  eventType: ActivityEventType;
  direction: string | null;
  response: string | null;
  isCorrect: boolean | null;
  responseTimeMs: number | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  sense: { senseId: number; lemma: string; partOfSpeech: string } | null;
}

export interface PaginatedSessionEvents {
  data: SessionEventItem[];
  meta: PaginatedMeta;
}

export interface CreateEventRequest {
  eventType: Exclude<ActivityEventType, "ACTIVITY_STARTED" | "PAUSED" | "RESUMED" | "FINISHED">;
  direction?: string;
  response?: string;
  isCorrect?: boolean;
  responseTimeMs?: number;
  rating?: ReviewRating;
  metadata?: Record<string, unknown>;
  vocabularySenseId?: number;
}

export interface LiveStudent {
  studentId: number;
  displayName: string;
  firstName: string;
  lastName: string | null;
  online: boolean;
  sessionId: number | null;
  connectedAt: string | null;
  lastSeenAt: string | null;
}

export interface LiveEventPayload {
  kind: "event";
  studentId: number;
  sessionId: number | null;
  activityId: number | null;
  activityTitle: string | null;
  activityType: ActivityType | null;
  status: SessionStatus | null;
  eventType: ActivityEventType | string;
  itemIndex: number | null;
  totalItems: number;
  completedCount: number;
  correctCount: number;
  incorrectCount: number;
  progress: number;
  senseId: number | null;
  rating: ReviewRating | null;
  direction: string | null;
  response: string | null;
  liveState?: Record<string, unknown> | null;
  occurredAt: string;
}

export interface LivePresencePayload {
  studentId: number;
  online: boolean;
  sessionId: number | null;
  connectedAt: string | null;
  lastSeenAt: string | null;
}

export interface DashboardStudents {
  total: number;
  active: number;
}

export interface DashboardAssignments {
  total: number;
  active: number;
  overdue: number;
}

export interface DashboardActivities {
  total: number;
  active: number;
}

export interface DashboardLearning {
  assigned: number;
  encountered: number;
  learning: number;
  reviewing: number;
  mastered: number;
  dueNow: number;
  reviewsDone: number;
  totalAssignedSenses: number;
}

export interface DashboardRecentSession {
  sessionId: number;
  studentId: number;
  studentDisplayName: string;
  activityId: number;
  activityTitle: string;
  activityType: ActivityType;
  status: SessionStatus;
  startedAt: string;
  finishedAt: string | null;
  progress: number;
  correct: number;
  incorrect: number;
}

export interface ReviewTrendPoint {
  date: string;
  reviews: number;
  correct: number;
  incorrect: number;
  ambiguous: number;
}

export interface TeacherDashboard {
  students: DashboardStudents;
  assignments: DashboardAssignments;
  activities: DashboardActivities;
  learning: DashboardLearning;
  vocabulary: { catalogSenses: number };
  reviewTrend: ReviewTrendPoint[];
  recentSessions: DashboardRecentSession[];
}

export interface ReportStudent {
  studentId: number;
  displayName: string;
  isActive: boolean;
  createdAt: string;
  assigned: number;
  encountered: number;
  learning: number;
  reviewing: number;
  mastered: number;
  due: number;
  totalAssignedSenses: number;
  reviewsDone: number;
  lastActivityAt: string | null;
  sessionCount: number;
}

export interface ReportActivity {
  activityId: number;
  activityTitle: string;
  activityType: string;
  status: string;
  studentId: number;
  studentDisplayName: string;
  sessionCount: number;
  finishedCount: number;
  totalCorrect: number;
  totalIncorrect: number;
  avgPercentComplete: number;
  lastSessionAt: string | null;
}

export interface RecentActivityItem {
  id: number;
  eventType: string;
  occurredAt: string;
  studentId: number;
  studentDisplayName: string;
  activityTitle: string;
  activityType: string | null;
  lemma: string | null;
  response: string | null;
  isCorrect: boolean | null;
}

export interface ImportVocabularyRow {
  lemma: string;
  partOfSpeech: string;
  definition: string;
  translations?: string | string[];
  examples?: string | string[];
  cefrLevels?: string[] | string;
  tags?: string[];
  senseIdHint?: string;
}

export interface ImportResultRow {
  row: number;
  senseId: number;
  created: boolean;
}

export interface ImportError {
  row: number;
  reason: string;
}

export interface ImportResult {
  dryRun: boolean;
  totalRows: number;
  validated: number;
  created: number;
  skippedExisting: number;
  errors: ImportError[];
  rows: ImportResultRow[];
}

export type ExportFormat = "csv" | "json" | "xlsx";

async function downloadExport(
  kind: string,
  params: Record<string, string | number | undefined>,
  filenameBase: string,
): Promise<void> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  const res = await fetch(`/api/v1/exports/${kind}${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // fall through to generic message
    }
    throw new Error(message);
  }
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename =
    (match && match[1]) || `${filenameBase}-${new Date().toISOString().slice(0, 10)}.${params.format ?? "csv"}`;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
