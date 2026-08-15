"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateJob,
  CreateWorkLogEntry,
  UpdateJob,
  WorkLogResponse,
} from "@chrysmec/shared";
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
    meta: { inlineError: true },
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
    meta: { inlineError: true },
    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: JOBS_KEY });
    },
  });
}

export function useAddWorkLogEntry(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkLogEntry) => addWorkLogEntry(jobId, input),
    meta: { inlineError: true },
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
  const workLogKey = [...JOBS_KEY, "worklog", jobId] as const;

  return useMutation({
    mutationFn: (entryId: string) => removeWorkLogEntry(jobId, entryId),
    meta: { inlineError: true },

    /*
      The line goes the moment it is confirmed, and the running total with it.
      Removing something and watching it sit there while the request travels is
      the moment a technician presses the button again.
    */
    async onMutate(entryId) {
      await queryClient.cancelQueries({ queryKey: workLogKey });
      const previous = queryClient.getQueryData<WorkLogResponse>(workLogKey);

      if (previous) {
        const remaining = previous.data.filter((entry) => entry.id !== entryId);
        queryClient.setQueryData<WorkLogResponse>(workLogKey, {
          ...previous,
          data: remaining,
          total: remaining
            .reduce((sum, entry) => sum + Number.parseFloat(entry.lineTotal), 0)
            .toFixed(2),
        });
      }

      return { previous };
    },

    onError(_error, _entryId, context) {
      if (context?.previous) {
        queryClient.setQueryData(workLogKey, context.previous);
      }
    },

    onSuccess() {
      void queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, "worklog", jobId] });
      void queryClient.invalidateQueries({ queryKey: [...JOBS_KEY, "detail", jobId] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["service-requests", "invoice"] });
    },
  });
}
