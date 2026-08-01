"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateJob, CreateWorkLogEntry, UpdateJob } from "@chrysmec/shared";
import {
  type JobFilters,
  addWorkLogEntry,
  createJob,
  fetchJob,
  fetchJobs,
  fetchWorkLog,
  removeWorkLogEntry,
  updateJob,
} from "@/lib/api/jobs";

export const JOBS_KEY = ["jobs"] as const;

export function useJobs(filters: JobFilters = {}) {
  return useQuery({
    queryKey: [...JOBS_KEY, "list", filters] as const,
    queryFn: () => fetchJobs(filters),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: [...JOBS_KEY, "detail", id] as const,
    queryFn: () => fetchJob(id),
    enabled: id.length > 0,
  });
}

export function useWorkLog(jobId: string) {
  return useQuery({
    queryKey: [...JOBS_KEY, "worklog", jobId] as const,
    queryFn: () => fetchWorkLog(jobId),
    enabled: jobId.length > 0,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateJob) => createJob(input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["service-requests"] });
    },
  });
}

export function useUpdateJob(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateJob) => updateJob(jobId, input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: JOBS_KEY });
    },
  });
}

export function useAddWorkLogEntry(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkLogEntry) => addWorkLogEntry(jobId, input),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, "worklog", jobId] });
      void queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, "detail", jobId] });
      // A part line changes stock, so the inventory view is stale too.
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      // The customer reads their bill off these same lines.
      void queryClient.invalidateQueries({ queryKey: ["service-requests", "invoice"] });
    },
  });
}

export function useRemoveWorkLogEntry(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => removeWorkLogEntry(jobId, entryId),
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, "worklog", jobId] });
      void queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, "detail", jobId] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["service-requests", "invoice"] });
    },
  });
}
