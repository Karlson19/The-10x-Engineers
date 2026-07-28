import type { Metadata } from "next";
import { JobQueue } from "@/components/jobs/job-queue";

export const metadata: Metadata = {
  title: "Job queue",
};

export default function StaffPage() {
  return <JobQueue />;
}
