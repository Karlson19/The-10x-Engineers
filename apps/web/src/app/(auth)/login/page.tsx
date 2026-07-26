import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to book a service and follow the progress of your vehicle.",
};

function FormFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only">Loading the sign in form</span>
      <div className="h-[4.75rem] animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="h-[4.75rem] animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="h-11 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="rise-in">
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">Sign in</h1>
      <p className="mt-3 mb-8 text-lg text-muted-foreground">
        Use the email address you booked with.
      </p>

      {/* The form reads ?next= from the URL, so it renders inside Suspense. */}
      <Suspense fallback={<FormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
