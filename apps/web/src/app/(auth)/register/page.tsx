import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a Chrysmec account to book a service and follow the work on your vehicle.",
};

export default function RegisterPage() {
  return (
    <div className="rise-in">
      <p className="eyebrow">New here</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">
        Create an account
      </h1>
      <p className="mt-3 mb-8 text-lg text-muted-foreground">
        It takes a minute, and you only do it once.
      </p>

      <RegisterForm />
    </div>
  );
}
