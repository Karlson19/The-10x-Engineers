import { Suspense } from "react";
import type { Metadata } from "next";
import { RequestDetail } from "@/components/requests/request-detail";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Booking",
};

function DetailFallback() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-5 py-10 sm:px-8 sm:py-14" aria-busy="true">
      <span className="sr-only">Loading this booking</span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-64" />
    </div>
  );
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // The component reads ?booked=1 from the URL, so it renders inside Suspense.
  return (
    <Suspense fallback={<DetailFallback />}>
      <RequestDetail id={id} />
    </Suspense>
  );
}
