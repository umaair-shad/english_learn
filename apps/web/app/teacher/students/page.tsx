"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ListPagination } from "@/components/list-pagination";
import { usePageLimit } from "@/lib/use-page-limit";
import { api, type Student } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Plus,
  Search,
  Users,
  Pencil,
  Eye,
  UserX,
  UserCheck,
} from "lucide-react";

export default function StudentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const { limit, setLimit } = usePageLimit("students");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("true");

  const [createOpen, setCreateOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [form, setForm] = useState({ firstName: "", displayName: "", notes: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["students", { page, limit, search, isActive: isActiveFilter }],
    queryFn: () =>
      api.listStudents({
        page,
        limit,
        search: search || undefined,
        isActive: isActiveFilter,
        sort: "created_at",
        order: "desc",
      }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createStudent({
        firstName: form.firstName,
        displayName: form.displayName || form.firstName,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setCreateOpen(false);
      resetForm();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateStudent(editStudent!.id, {
        firstName: form.firstName,
        displayName: form.displayName || form.firstName,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditStudent(null);
      resetForm();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (s: Student) =>
      api.updateStudent(s.id, { isActive: !s.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });

  function resetForm() {
    setForm({ firstName: "", displayName: "", notes: "" });
    setFormError(null);
  }

  function openCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function openEdit(s: Student) {
    setForm({
      firstName: s.firstName,
      displayName: s.displayName,
      notes: s.notes ?? "",
    });
    setFormError(null);
    setEditStudent(s);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="size-6" />
            Students
          </h1>
          <p className="text-sm text-muted-foreground">
            {data?.meta.total ?? "—"} students registered
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Add Student
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
          />
        </div>
        <Select
          value={isActiveFilter}
          onValueChange={(v) => {
            setIsActiveFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Active only</SelectItem>
            <SelectItem value="false">Inactive only</SelectItem>
            <SelectItem value="">All students</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No students found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <p className="mb-2 px-4 pt-3 text-xs text-muted-foreground md:hidden">
              Swipe sideways to see every column.
            </p>
            <table className="w-full min-w-[44rem] table-fixed text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="w-[20%] px-4 py-3 font-medium">Name</th>
                  <th className="w-[28%] px-4 py-3 font-medium">Display Name</th>
                  <th className="w-[14%] px-4 py-3 font-medium">Status</th>
                  <th className="w-[14%] px-4 py-3 font-medium">Created</th>
                  <th className="w-[24%] px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 align-top font-medium wrap-break-word">{s.firstName}</td>
                    <td className="px-4 py-3 align-top text-muted-foreground wrap-break-word">
                      {s.displayName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {s.isActive ? (
                          <UserCheck className="size-3" />
                        ) : (
                          <UserX className="size-3" />
                        )}
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/teacher/students/${s.id}`)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate(s)}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {s.isActive ? (
                            <UserX className="size-4 text-muted-foreground" />
                          ) : (
                            <UserCheck className="size-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ListPagination
        page={data?.meta.page ?? page}
        limit={limit}
        total={data?.meta.total ?? 0}
        totalPages={data?.meta.totalPages ?? 0}
        hasNext={data?.meta.hasNext}
        hasPrev={data?.meta.hasPrev}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
          </DialogHeader>
          <DialogBody>
          <StudentForm
            form={form}
            setForm={setForm}
            error={formError}
          />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.firstName.trim() || createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editStudent}
        onOpenChange={(open) => {
          if (!open) setEditStudent(null);
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <DialogBody>
          <StudentForm
            form={form}
            setForm={setForm}
            error={formError}
          />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!form.firstName.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentForm({
  form,
  setForm,
  error,
}: {
  form: { firstName: string; displayName: string; notes: string };
  setForm: React.Dispatch<React.SetStateAction<{ firstName: string; displayName: string; notes: string }>>;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="firstName">First name *</Label>
        <Input
          id="firstName"
          value={form.firstName}
          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          placeholder="Jan"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={form.displayName}
          onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          placeholder="Defaults to first name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Optional notes"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
