import {
  type SymptomAnswers,
  type SymptomCategory,
  getSymptomCategory,
} from "./symptoms";

/**
 * Triage. The intake already asks how bad it is, when it happens and which
 * warning lights are on, so the app can say something useful about safety
 * instead of storing the answers and going quiet.
 *
 * This is deliberately conservative. It is a workshop telling a customer what
 * to do until a technician has actually looked at the vehicle, so where the
 * answers are ambiguous it rounds towards caution. It never diagnoses, and the
 * copy never promises what the fault is.
 *
 * It lives in the shared package because the booking wizard shows it live, the
 * review step repeats it, and a technician sees the same reading on the job.
 */

export type UrgencyLevel = "routine" | "soon" | "urgent";

export type TriageResult = {
  level: UrgencyLevel;
  /** One line, in the second person, shown to the customer. */
  headline: string;
  /** What to do between now and the appointment. */
  advice: string;
  /** Drives whether the workshop's phone number is put in front of them. */
  callTheWorkshop: boolean;
  /** Why it was rated this way, so the reading is never a black box. */
  reasons: readonly string[];
};

/** Answers that mean "do not keep driving this" whatever else was said. */
const URGENT_SIGNS: Readonly<Record<string, readonly string[]>> = {
  brakes: ["grinding", "soft-pedal"],
  cooling: ["steam"],
  engine: ["knocking"],
  transmission: ["slipping"],
  steering: ["pulling"],
};

/** Warning lights that mean stop, rather than book it in next week. */
const URGENT_LIGHTS: readonly string[] = ["oil", "temperature", "abs"];

function answerList(answers: SymptomAnswers, key: string): readonly string[] {
  const value = answers[key];

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return typeof value === "string" && value.length > 0 ? [value] : [];
}

function first(answers: SymptomAnswers, key: string): string | null {
  return answerList(answers, key)[0] ?? null;
}

/**
 * The sign question is named differently in every category, so find whichever
 * one this category actually asked rather than hard coding ten keys.
 */
function signValue(category: SymptomCategory, answers: SymptomAnswers): string | null {
  const question = category.questions.find(
    (candidate) => candidate.id.endsWith("Sign") || candidate.id.endsWith("Which"),
  );

  return question ? first(answers, question.id) : null;
}

export function assessUrgency(
  categoryId: string,
  answers: SymptomAnswers,
): TriageResult {
  const category = getSymptomCategory(categoryId);
  const reasons: string[] = [];

  const severity = first(answers, "severity");
  const lights = answerList(answers, "warningLights").filter((light) => light !== "none");
  const sign = category ? signValue(category, answers) : null;

  let level: UrgencyLevel = "routine";

  if (severity === "soon") {
    level = "soon";
    reasons.push("You said it needs attention soon.");
  }

  if (severity === "unsafe") {
    level = "urgent";
    reasons.push("You said it is not safe to drive.");
  }

  const urgentLights = lights.filter((light) => URGENT_LIGHTS.includes(light));
  if (urgentLights.length > 0) {
    level = "urgent";
    reasons.push("A warning light that should not be driven on is showing.");
  } else if (lights.length > 0 && level === "routine") {
    level = "soon";
    reasons.push("There is a warning light on the dashboard.");
  }

  if (category && sign && URGENT_SIGNS[category.id]?.includes(sign)) {
    level = "urgent";
    reasons.push("What you described can get worse quickly.");
  }

  // Topping coolant up repeatedly means it is going somewhere.
  if (first(answers, "coolantTopUp") === "yes-often" && level === "routine") {
    level = "soon";
    reasons.push("Coolant that needs topping up often is leaving the system somewhere.");
  }

  // Repeated jump starts point at charging rather than the battery itself.
  if (first(answers, "jumpStarts") === "several" && level === "routine") {
    level = "soon";
    reasons.push("Needing a jump start more than once points at the charging system.");
  }

  if (level === "urgent") {
    return {
      level,
      headline: "Please stop driving this vehicle",
      advice:
        "Park it somewhere safe and ring us before you drive it again. We will fit you in and can arrange to collect it if you cannot bring it to us.",
      callTheWorkshop: true,
      reasons,
    };
  }

  if (level === "soon") {
    return {
      level,
      headline: "Get this looked at within a few days",
      advice:
        "Short local trips are fine, but avoid long journeys until we have seen it. Pick the earliest slot that suits you on the next step.",
      callTheWorkshop: false,
      reasons,
    };
  }

  return {
    level,
    headline: "Safe to drive, book it in when it suits you",
    advice:
      "Nothing you have described needs the vehicle off the road today. Choose whichever slot is convenient and keep an eye on whether it changes.",
    callTheWorkshop: false,
    reasons,
  };
}

/**
 * Whether there is enough in the answers to say anything at all. The reading
 * appears only once the customer has said how bad it is, so it never flashes a
 * verdict at a half filled form.
 */
export function canAssessUrgency(answers: SymptomAnswers): boolean {
  return first(answers, "severity") !== null;
}

/**
 * Ranks catalogue services by how well they match what the customer described,
 * so the list they are shown starts with the work their answers point at.
 *
 * Keyword matching on purpose rather than a fixed mapping: the catalogue is
 * management's to edit, and a hard coded list of service ids would be wrong the
 * first time somebody renames one. Anything that does not match is still
 * offered, just further down.
 */
export function rankServicesForSymptom<T extends { name: string; description: string }>(
  categoryId: string,
  answers: SymptomAnswers,
  services: readonly T[],
): { suggested: T[]; others: T[] } {
  const category = getSymptomCategory(categoryId);

  if (!category) {
    return { suggested: [], others: [...services] };
  }

  const sign = signValue(category, answers);
  const signLabel = sign
    ? category.questions
        .flatMap((question) => question.options ?? [])
        .find((option) => option.value === sign)?.label
    : undefined;

  /*
    Trailing plurals are stripped before matching. The categories are named in
    the plural ("Brakes") and the catalogue in the singular ("Brake pad
    replacement"), so matching the words as typed found nothing at all.
  */
  const terms = [category.label, signLabel ?? ""]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((term) => term.length > 3)
    .map((term) => (term.endsWith("s") ? term.slice(0, -1) : term));

  if (terms.length === 0) {
    return { suggested: [], others: [...services] };
  }

  const suggested: T[] = [];
  const others: T[] = [];

  for (const service of services) {
    const haystack = `${service.name} ${service.description}`.toLowerCase();
    if (terms.some((term) => haystack.includes(term))) {
      suggested.push(service);
    } else {
      others.push(service);
    }
  }

  return { suggested, others };
}
