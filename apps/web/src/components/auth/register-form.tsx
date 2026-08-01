"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type RegisterRequest, registerRequestSchema } from "@chrysmec/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { ApiError } from "@/lib/api/client";
import { homeForRole } from "@/lib/auth/routes";

export function RegisterForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterRequest>({
    resolver: zodResolver(registerRequestSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "" },
  });

  // Watched so the strength meter updates as they type.
  const password = useWatch({ control, name: "password" }) ?? "";

  async function onSubmit(values: RegisterRequest): Promise<void> {
    setFormError(null);

    try {
      const user = await signUp(values);
      router.replace(homeForRole(user.role));
    } catch (error) {
      if (error instanceof ApiError && error.code === "CONFLICT") {
        setError("email", { message: error.message });
        return;
      }

      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        // The server is the authority on validation, so show what it said
        // against the field it named.
        for (const [field, message] of Object.entries(error.details)) {
          if (field === "fullName" || field === "email" || field === "phone" || field === "password") {
            setError(field, { message });
          }
        }
        setFormError(error.message);
        return;
      }

      setFormError(
        error instanceof ApiError
          ? error.message
          : "Could not create your account. Check your connection and try again.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError ? (
        <Alert tone="error" title="Could not create your account">
          {formError}
        </Alert>
      ) : null}

      {/* The placeholder used to be a demo account's name. */}
      <FormField id="fullName" label="Full name" error={errors.fullName?.message}>
        {(field) => (
          <Input
            {...field}
            {...register("fullName")}
            autoComplete="name"
            placeholder="Your full name"
          />
        )}
      </FormField>

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

      <FormField
        id="phone"
        label="Phone number"
        hint="We use this to reach you about your vehicle."
        error={errors.phone?.message}
      >
        {(field) => (
          <Input
            {...field}
            {...register("phone")}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+233 24 111 0004"
          />
        )}
      </FormField>

      <FormField id="password" label="Password" error={errors.password?.message}>
        {(field) => (
          <>
            <PasswordInput
              {...field}
              {...register("password")}
              autoComplete="new-password"
              aria-describedby={`${field["aria-describedby"] ?? ""} password-strength`.trim()}
            />
            <PasswordStrength id="password-strength" value={password} />
          </>
        )}
      </FormField>

      <Button
        type="submit"
        variant="accent"
        block
        isPending={isSubmitting}
        pendingLabel="Creating account"
      >
        Create account
      </Button>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
