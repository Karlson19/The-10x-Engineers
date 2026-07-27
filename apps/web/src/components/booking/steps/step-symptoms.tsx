"use client";

import {
  SECTIONS,
  SECTION_LABELS,
  type Section,
  type SymptomAnswers,
  getSymptomCategory,
  isQuestionVisible,
  symptomCategoriesForSection,
} from "@chrysmec/shared";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SECTION_HINT: Record<Section, string> = {
  MECHANICAL: "Engine, brakes, suspension, transmission or cooling.",
  ELECTRICAL: "Battery, starting, lighting, air conditioning or wiring.",
};

/**
 * The guided intake. The section chooses the categories, the category chooses
 * the questions, and some answers open follow up questions. The same
 * definition validates it again on the server.
 */
export function StepSymptoms({
  section,
  symptomCategory,
  symptomDetails,
  errors,
  onChangeSection,
  onChangeCategory,
  onChangeAnswers,
}: {
  section: Section | null;
  symptomCategory: string | null;
  symptomDetails: SymptomAnswers;
  errors: Record<string, string>;
  onChangeSection: (section: Section) => void;
  onChangeCategory: (categoryId: string) => void;
  onChangeAnswers: (answers: SymptomAnswers) => void;
}) {
  const category = symptomCategory ? getSymptomCategory(symptomCategory) : undefined;

  function setAnswer(questionId: string, value: string | string[]): void {
    onChangeAnswers({ ...symptomDetails, [questionId]: value });
  }

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="font-display text-lg font-semibold text-foreground">
          Which part of the vehicle?
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SECTIONS.map((option) => {
            const isSelected = section === option;

            return (
              <label
                key={option}
                className={cn(
                  "flex cursor-pointer flex-col rounded-lg border px-4 py-4",
                  "transition-[border-color,background-color,transform] duration-150",
                  "hover:border-foreground/30 active:scale-[0.99]",
                  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                  "motion-reduce:transition-none motion-reduce:active:scale-100",
                  isSelected
                    ? "border-accent bg-accent-subtle dark:bg-accent/15"
                    : "border-input bg-card",
                  errors.section && !isSelected && "border-destructive/50",
                )}
              >
                <input
                  type="radio"
                  name="section"
                  className="sr-only"
                  checked={isSelected}
                  onChange={() => onChangeSection(option)}
                />
                <span className="font-display text-lg font-semibold text-foreground">
                  {SECTION_LABELS[option]}
                </span>
                <span className="mt-1 text-base text-muted-foreground">{SECTION_HINT[option]}</span>
              </label>
            );
          })}
        </div>
        <p aria-live="polite" className="mt-2 text-sm text-destructive empty:hidden">
          {errors.section ?? ""}
        </p>
      </fieldset>

      {section ? (
        <fieldset>
          <legend className="font-display text-lg font-semibold text-foreground">
            What does the problem relate to?
          </legend>
          <div className="mt-3 grid gap-2">
            {symptomCategoriesForSection(section).map((option) => {
              const isSelected = symptomCategory === option.id;

              return (
                <label
                  key={option.id}
                  className={cn(
                    "flex cursor-pointer flex-col rounded-lg border px-4 py-3.5",
                    "transition-[border-color,background-color,transform] duration-150",
                    "hover:border-foreground/30 active:scale-[0.99]",
                    "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                    "motion-reduce:transition-none motion-reduce:active:scale-100",
                    isSelected
                      ? "border-accent bg-accent-subtle dark:bg-accent/15"
                      : "border-input bg-card",
                    errors.symptomCategory && !isSelected && "border-destructive/50",
                  )}
                >
                  <input
                    type="radio"
                    name="symptomCategory"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => onChangeCategory(option.id)}
                  />
                  <span className="font-medium text-foreground">{option.label}</span>
                  <span className="mt-0.5 text-sm text-muted-foreground">{option.summary}</span>
                </label>
              );
            })}
          </div>
          <p aria-live="polite" className="mt-2 text-sm text-destructive empty:hidden">
            {errors.symptomCategory ?? ""}
          </p>
        </fieldset>
      ) : null}

      {category
        ? category.questions
            .filter((question) => isQuestionVisible(question, symptomDetails))
            .map((question) => {
              const errorId = `${question.id}-error`;
              const hintId = `${question.id}-hint`;
              const error = errors[question.id];
              const describedBy =
                [error ? errorId : null, question.hint ? hintId : null].filter(Boolean).join(" ") ||
                undefined;
              const answer = symptomDetails[question.id];

              return (
                <fieldset key={question.id}>
                  <legend className="font-display text-lg font-semibold text-foreground">
                    {question.label}
                    {question.required ? null : (
                      <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
                        Optional
                      </span>
                    )}
                  </legend>
                  {question.hint ? (
                    <p id={hintId} className="mt-1 text-sm text-muted-foreground">
                      {question.hint}
                    </p>
                  ) : null}

                  <div className="mt-3">
                    {question.type === "text" ? (
                      <Textarea
                        id={question.id}
                        aria-invalid={Boolean(error)}
                        aria-describedby={describedBy}
                        value={typeof answer === "string" ? answer : ""}
                        onChange={(event) => setAnswer(question.id, event.target.value)}
                        placeholder="Type anything that might help."
                      />
                    ) : (
                      <ChoiceGroup
                        name={question.id}
                        options={question.options ?? []}
                        value={answer}
                        multiple={question.type === "multi"}
                        invalid={Boolean(error)}
                        describedBy={describedBy}
                        onChange={(next) => setAnswer(question.id, next)}
                      />
                    )}
                  </div>

                  <p
                    id={errorId}
                    aria-live="polite"
                    className="mt-2 text-sm text-destructive empty:hidden"
                  >
                    {error ?? ""}
                  </p>
                </fieldset>
              );
            })
        : null}
    </div>
  );
}
