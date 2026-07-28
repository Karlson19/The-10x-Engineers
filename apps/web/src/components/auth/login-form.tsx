"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type LoginRequest, loginRequestSchema } from "@chrysmec/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiError } from "@/lib/api/client";
import { homeForRole, safeRedirect } from "@/lib/auth/routes";

export function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginRequest): Promise<void> {
    setFormError(null);

    try {
      const user = await signIn(values);
      router.replace(safeRedirect(searchParams.get("next"), homeForRole(user.role)));
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Could not sign you in. Check your connection and try again.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError ? (
        <Alert tone="error" title="Could not sign in">
          {formError}
        </Alert>
      ) : null}

      <FormField id="email" label="Email address" error={errors.email?.message}>
        {(field) => (
          <Input
            {...field}
            {...register("email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
          />
        )}
      </FormField>

      <FormField id="password" label="Password" error={errors.password?.message}>
        {(field) => (
          <PasswordInput {...field} {...register("password")} autoComplete="current-password" />
        )}
      </FormField>

      <Button type="submit" variant="accent" block isPending={isSubmitting} pendingLabel="Signing in">
        Sign in
      </Button>

      <p className="text-sm text-muted-foreground">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
          Create one
        </Link>
      </p>
    </form>
  );
}
