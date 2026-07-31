"use client";

import { useState } from "react";
import { UserPlus, Users } from "lucide-react";
import {
  type CreateUserRequest,
  type PublicUser,
  SECTION_LABELS,
  SECTIONS,
  type Section,
} from "@chrysmec/shared";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useJobs } from "@/hooks/use-jobs";
import { useCreateUser, useDeactivateUser, useUpdateUser, useUsers } from "@/hooks/use-users";
import { ApiError } from "@/lib/api/client";

type Draft = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  section: Section;
};

const EMPTY_DRAFT: Draft = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  section: "MECHANICAL",
};

/**
 * The workshop's people. Technicians are added here, moved between sections
 * here, and stood down here.
 *
 * Deactivating rather than deleting is deliberate and matches the API: a
 * technician's name stays on every job they ever did.
 */
export function StaffManager() {
  const staff = useUsers({ role: "STAFF" });
  // Every open job, so each technician's workload can be counted without a
  // request per person.
  const openJobs = useJobs({ status: "OPEN" });

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();
  const { showToast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingStandDown, setPendingStandDown] = useState<PublicUser | null>(null);

  function workloadFor(staffId: string): number {
    return (openJobs.data?.data ?? []).filter((job) => job.assignedStaff.id === staffId).length;
  }

  async function handleCreate(): Promise<void> {
    setFieldErrors({});
    setFormError(null);

    const input: CreateUserRequest = {
      fullName: draft.fullName.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      password: draft.password,
      role: "STAFF",
      section: draft.section,
    };

    try {
      await createUser.mutateAsync(input);
      setIsAdding(false);
      setDraft(EMPTY_DRAFT);
      showToast({
        tone: "success",
        title: "Technician added",
        body: `${input.fullName} can sign in with the password you set.`,
      });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.details).length > 0) {
        setFieldErrors(error.details);
        setFormError(error.message);
        return;
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Could not add that technician. Check your connection and try again.",
      );
    }
  }

  async function handleMove(person: PublicUser, section: Section): Promise<void> {
    try {
      await updateUser.mutateAsync({ id: person.id, input: { section } });
      showToast({
        tone: "success",
        title: "Section changed",
        body: `${person.fullName} now works in ${SECTION_LABELS[section].toLowerCase()}.`,
      });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Could not change the section",
        body:
          error instanceof ApiError
            ? error.message
            : "Check your connection and try again.",
      });
    }
  }

  async function handleStandDown(): Promise<void> {
    if (!pendingStandDown) {
      return;
    }

    try {
      await deactivateUser.mutateAsync(pendingStandDown.id);
      showToast({
        tone: "info",
        title: "Technician stood down",
        body: `${pendingStandDown.fullName} can no longer sign in. Their job history is kept.`,
      });
    } catch (error) {
      showToast({
        tone: "error",
        title: "Could not stand them down",
        body:
          error instanceof ApiError
            ? error.message
            : "Check your connection and try again.",
      });
    } finally {
      setPendingStandDown(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Management</p>
          <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">Technicians</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Who works here, which section they cover, and how much is on each of them right now.
          </p>
        </div>

        <Button variant="accent" onClick={() => setIsAdding(true)}>
          <UserPlus aria-hidden size={18} />
          Add a technician
        </Button>
      </div>

      <div className="mt-10">
        {staff.isPending ? (
          <div className="space-y-2" aria-busy="true">
            <span className="sr-only">Loading the technicians</span>
            {[0, 1, 2].map((row) => (
              <div key={row} className="border-b border-border py-5">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="mt-2 h-4 w-64" />
              </div>
            ))}
          </div>
        ) : staff.isError ? (
          <ErrorState
            body="We could not load the technicians. Check your connection and try again."
            onRetry={() => void staff.refetch()}
            isRetrying={staff.isRefetching}
          />
        ) : staff.data.data.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No technicians yet"
            body="Add the people who work on the vehicles, and bookings can be assigned to them."
            action={
              <Button variant="accent" onClick={() => setIsAdding(true)}>
                <UserPlus aria-hidden size={18} />
                Add a technician
              </Button>
            }
          />
        ) : (
          <ul>
            {staff.data.data.map((person) => {
              const workload = workloadFor(person.id);

              return (
                <li
                  key={person.id}
                  className="flex flex-col gap-4 border-b border-border py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <p className="text-lg font-medium text-foreground">{person.fullName}</p>
                      {person.isActive ? null : <Badge tone="stopped">Stood down</Badge>}
                    </div>
                    <p className="mt-1 font-mono text-sm text-muted-foreground">
                      {person.email} | {person.phone}
                    </p>
                    <p className="mt-1 text-base text-muted-foreground">
                      {openJobs.isPending
                        ? "Counting open jobs"
                        : workload === 0
                          ? "Nothing open right now"
                          : `${workload} open ${workload === 1 ? "job" : "jobs"}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <label className="sr-only" htmlFor={`section-${person.id}`}>
                      Section for {person.fullName}
                    </label>
                    <Select
                      id={`section-${person.id}`}
                      value={person.section ?? "MECHANICAL"}
                      disabled={!person.isActive || updateUser.isPending}
                      onChange={(event) => void handleMove(person, event.target.value as Section)}
                    >
                      {SECTIONS.map((section) => (
                        <option key={section} value={section}>
                          {SECTION_LABELS[section]}
                        </option>
                      ))}
                    </Select>

                    {person.isActive ? (
                      <Button variant="outline" onClick={() => setPendingStandDown(person)}>
                        Stand down
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog
        open={isAdding}
        onClose={() => setIsAdding(false)}
        title="Add a technician"
        description="They can sign in straight away with the password you set, and change it from their account page."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={() => void handleCreate()}
              isPending={createUser.isPending}
              pendingLabel="Adding"
            >
              Add technician
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? (
            <Alert tone="error" title="Could not add that technician">
              {formError}
            </Alert>
          ) : null}

          <FormField id="staffName" label="Full name" error={fieldErrors.fullName}>
            {(field) => (
              <Input
                {...field}
                value={draft.fullName}
                autoComplete="off"
                onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}
              />
            )}
          </FormField>

          <FormField id="staffEmail" label="Email address" error={fieldErrors.email}>
            {(field) => (
              <Input
                {...field}
                type="email"
                inputMode="email"
                autoComplete="off"
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              />
            )}
          </FormField>

          <FormField id="staffPhone" label="Phone number" error={fieldErrors.phone}>
            {(field) => (
              <Input
                {...field}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="0555695431"
                value={draft.phone}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              />
            )}
          </FormField>

          <FormField id="staffSection" label="Section" error={fieldErrors.section}>
            {(field) => (
              <Select
                {...field}
                value={draft.section}
                onChange={(event) =>
                  setDraft({ ...draft, section: event.target.value as Section })
                }
              >
                {SECTIONS.map((section) => (
                  <option key={section} value={section}>
                    {SECTION_LABELS[section]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField
            id="staffPassword"
            label="Starting password"
            error={fieldErrors.password}
            hint="Give this to them in person. They can change it from their account page."
          >
            {(field) => (
              <PasswordInput
                {...field}
                autoComplete="new-password"
                value={draft.password}
                onChange={(event) => setDraft({ ...draft, password: event.target.value })}
              />
            )}
          </FormField>
        </div>
      </Dialog>

      <ConfirmDialog
        open={pendingStandDown !== null}
        onClose={() => setPendingStandDown(null)}
        onConfirm={() => void handleStandDown()}
        title="Stand this technician down?"
        description={
          pendingStandDown
            ? `${pendingStandDown.fullName} will not be able to sign in, and no new work can be assigned to them. Everything they have already done stays on the record.`
            : ""
        }
        confirmLabel="Stand them down"
        isPending={deactivateUser.isPending}
        pendingLabel="Standing down"
      />
    </div>
  );
}
