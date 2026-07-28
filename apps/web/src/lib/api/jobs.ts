import { z } from "zod";
import {
  type CreateJob,
  type CreateWorkLogEntry,
  type Job,
  type JobListQuery,
  type JobListResponse,
  type UpdateJob,
  type WorkLogResponse,
  jobListResponseSchema,
  jobResponseSchema,
  moneySchema,
  workLogEntrySchema,
  workLogResponseSchema,
} from "@chrysmec/shared";
import { apiRequest } from "./client";

export type JobFilters = Partial<Pick<JobListQuery, "status" | "section" | "scheduledFor">>;

export function fetchJobs(filters: JobFilters = {}): Promise<JobListResponse> {
  const params = new URLSearchParams({ limit: "50" });

  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.section) {
    params.set("section", filters.section);
  }
  if (filters.scheduledFor) {
    params.set("scheduledFor", filters.scheduledFor);
  }

  return apiRequest(`/jobs?${params.toString()}`, jobListResponseSchema);
}

export async function fetchJob(id: string): Promise<Job> {
  return (await apiRequest(`/jobs/${id}`, jobResponseSchema)).job;
}

export async function createJob(input: CreateJob): Promise<Job> {
  return (await apiRequest("/jobs", jobResponseSchema, { method: "POST", body: input })).job;
}

export async function updateJob(id: string, input: UpdateJob): Promise<Job> {
  return (await apiRequest(`/jobs/${id}`, jobResponseSchema, { method: "PATCH", body: input })).job;
}

export function fetchWorkLog(jobId: string): Promise<WorkLogResponse> {
  return apiRequest(`/jobs/${jobId}/worklog`, workLogResponseSchema);
}

const addEntryResponseSchema = z.object({ entry: workLogEntrySchema, total: moneySchema });

export function addWorkLogEntry(jobId: string, input: CreateWorkLogEntry) {
  return apiRequest(`/jobs/${jobId}/worklog`, addEntryResponseSchema, {
    method: "POST",
    body: input,
  });
}

const totalOnlySchema = z.object({ total: moneySchema });

export function removeWorkLogEntry(jobId: string, entryId: string) {
  return apiRequest(`/jobs/${jobId}/worklog/${entryId}`, totalOnlySchema, { method: "DELETE" });
}
