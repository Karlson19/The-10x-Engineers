import type { Section } from "./enums";

/**
 * The guided symptom intake. This is the thing that replaces "my car has a
 * problem" with something a technician can act on before the vehicle arrives.
 *
 * It lives here rather than in the client because the API validates answers
 * against the same definition: a category has to belong to the section it was
 * booked under, required questions have to be answered, and a choice has to be
 * one of the options actually offered.
 */

export type SymptomQuestionType = "single" | "multi" | "text";

export type SymptomOption = {
  value: string;
  label: string;
};

export type SymptomQuestion = {
  id: string;
  label: string;
  type: SymptomQuestionType;
  /** Shown under the label to explain what we are asking for. */
  hint?: string;
  options?: readonly SymptomOption[];
  required?: boolean;
  /** Branching inside a category: only ask this when an earlier answer matches. */
  showIf?: { questionId: string; value: string };
};

export type SymptomCategory = {
  id: string;
  label: string;
  section: Section;
  /** One line describing the category, shown when choosing between them. */
  summary: string;
  questions: readonly SymptomQuestion[];
};

const SEVERITY: readonly SymptomOption[] = [
  { value: "drivable", label: "Still drivable" },
  { value: "soon", label: "Needs attention soon" },
  { value: "unsafe", label: "Not safe to drive" },
];

const WHEN: readonly SymptomOption[] = [
  { value: "always", label: "All the time" },
  { value: "cold-start", label: "When the engine is cold" },
  { value: "hot", label: "When the engine is hot" },
  { value: "accelerating", label: "When accelerating" },
  { value: "braking", label: "When braking" },
  { value: "idle", label: "When sitting in traffic" },
  { value: "intermittent", label: "Randomly, no pattern" },
];

const WARNING_LIGHTS: readonly SymptomOption[] = [
  { value: "check-engine", label: "Check engine" },
  { value: "battery", label: "Battery" },
  { value: "temperature", label: "Temperature" },
  { value: "oil", label: "Oil pressure" },
  { value: "abs", label: "ABS or brakes" },
  { value: "none", label: "No warning lights" },
];

/** Asked in every category, so a technician always gets the same baseline. */
function commonQuestions(): readonly SymptomQuestion[] {
  return [
    {
      id: "whenItHappens",
      label: "When does it happen?",
      type: "single",
      options: WHEN,
      required: true,
    },
    {
      id: "warningLights",
      label: "Any warning lights on the dashboard?",
      type: "multi",
      hint: "Choose all that apply.",
      options: WARNING_LIGHTS,
    },
    {
      id: "severity",
      label: "How bad is it?",
      type: "single",
      options: SEVERITY,
      required: true,
    },
    {
      id: "notes",
      label: "Anything else we should know?",
      type: "text",
      hint: "Optional. When it started, what you have already tried, anything unusual.",
    },
  ];
}

export const SYMPTOM_CATEGORIES: readonly SymptomCategory[] = [
  {
    id: "engine",
    label: "Engine",
    section: "MECHANICAL",
    summary: "Power loss, rough running, knocking, smoke or a check engine light.",
    questions: [
      {
        id: "engineSign",
        label: "What is the engine doing?",
        type: "single",
        options: [
          { value: "wont-start", label: "Will not start" },
          { value: "rough", label: "Running rough or misfiring" },
          { value: "power-loss", label: "Losing power" },
          { value: "noise", label: "Making an unusual noise" },
          { value: "smoke", label: "Producing smoke" },
        ],
        required: true,
      },
      {
        id: "engineNoise",
        label: "What does the noise sound like?",
        type: "single",
        showIf: { questionId: "engineSign", value: "noise" },
        options: [
          { value: "knocking", label: "Knocking or tapping" },
          { value: "whining", label: "Whining or squealing" },
          { value: "rattling", label: "Rattling" },
          { value: "grinding", label: "Grinding" },
        ],
      },
      {
        id: "smokeColour",
        label: "What colour is the smoke?",
        type: "single",
        showIf: { questionId: "engineSign", value: "smoke" },
        options: [
          { value: "white", label: "White" },
          { value: "blue", label: "Blue" },
          { value: "black", label: "Black" },
        ],
      },
      ...commonQuestions(),
    ],
  },
  {
    id: "brakes",
    label: "Brakes",
    section: "MECHANICAL",
    summary: "Grinding, squealing, a soft pedal or the car pulling to one side.",
    questions: [
      {
        id: "brakeSign",
        label: "What do you notice when braking?",
        type: "single",
        options: [
          { value: "grinding", label: "Grinding or metal on metal" },
          { value: "squealing", label: "Squealing" },
          { value: "soft-pedal", label: "The pedal feels soft or sinks" },
          { value: "pulling", label: "The car pulls to one side" },
          { value: "vibration", label: "The pedal or wheel vibrates" },
        ],
        required: true,
      },
      {
        id: "brakePosition",
        label: "Which end of the car?",
        type: "single",
        options: [
          { value: "front", label: "Front" },
          { value: "rear", label: "Rear" },
          { value: "unsure", label: "Not sure" },
        ],
      },
      ...commonQuestions(),
    ],
  },
  {
    id: "suspension",
    label: "Suspension and steering",
    section: "MECHANICAL",
    summary: "Knocking over bumps, leaning in corners, uneven tyre wear or vague steering.",
    questions: [
      {
        id: "suspensionSign",
        label: "What are you noticing?",
        type: "single",
        options: [
          { value: "knocking", label: "Knocking over bumps" },
          { value: "leaning", label: "Leaning or floating in corners" },
          { value: "vibration", label: "Vibration through the steering" },
          { value: "pulling", label: "Pulling to one side" },
          { value: "tyre-wear", label: "Uneven tyre wear" },
        ],
        required: true,
      },
      {
        id: "suspensionCorner",
        label: "Which corner does it come from?",
        type: "single",
        options: [
          { value: "front-left", label: "Front left" },
          { value: "front-right", label: "Front right" },
          { value: "rear-left", label: "Rear left" },
          { value: "rear-right", label: "Rear right" },
          { value: "unsure", label: "Not sure" },
        ],
      },
      ...commonQuestions(),
    ],
  },
  {
    id: "transmission",
    label: "Transmission and clutch",
    section: "MECHANICAL",
    summary: "Slipping, difficulty changing gear, or the car not pulling as it should.",
    questions: [
      {
        id: "transmissionType",
        label: "Is the vehicle manual or automatic?",
        type: "single",
        options: [
          { value: "manual", label: "Manual" },
          { value: "automatic", label: "Automatic" },
        ],
        required: true,
      },
      {
        id: "transmissionSign",
        label: "What is it doing?",
        type: "single",
        options: [
          { value: "slipping", label: "Revs climb but the car does not pull" },
          { value: "hard-shift", label: "Hard to change gear" },
          { value: "jerking", label: "Jerking between gears" },
          { value: "noise", label: "Noise in gear or in neutral" },
        ],
        required: true,
      },
      ...commonQuestions(),
    ],
  },
  {
    id: "cooling",
    label: "Cooling and overheating",
    section: "MECHANICAL",
    summary: "Temperature gauge climbing, coolant loss, steam or a sweet smell.",
    questions: [
      {
        id: "coolingSign",
        label: "What are you seeing?",
        type: "single",
        options: [
          { value: "gauge", label: "Temperature gauge climbing" },
          { value: "steam", label: "Steam from the bonnet" },
          { value: "leak", label: "Coolant on the ground" },
          { value: "heater", label: "Heater blowing cold" },
        ],
        required: true,
      },
      {
        id: "coolantTopUp",
        label: "Have you been topping up the coolant?",
        type: "single",
        options: [
          { value: "yes-often", label: "Yes, often" },
          { value: "yes-once", label: "Yes, once or twice" },
          { value: "no", label: "No" },
        ],
      },
      ...commonQuestions(),
    ],
  },
  {
    id: "battery-charging",
    label: "Battery and charging",
    section: "ELECTRICAL",
    summary: "Slow cranking, a flat battery in the morning, or a battery warning light.",
    questions: [
      {
        id: "chargingSign",
        label: "What is happening?",
        type: "single",
        options: [
          { value: "slow-crank", label: "Cranks slowly" },
          { value: "flat-overnight", label: "Flat by the next morning" },
          { value: "warning-light", label: "Battery light stays on" },
          { value: "dim-lights", label: "Lights dim at idle" },
        ],
        required: true,
      },
      {
        id: "jumpStarts",
        label: "How often have you jump started it recently?",
        type: "single",
        options: [
          { value: "never", label: "Never" },
          { value: "once", label: "Once" },
          { value: "several", label: "Several times" },
        ],
      },
      ...commonQuestions(),
    ],
  },
  {
    id: "starting",
    label: "Starting",
    section: "ELECTRICAL",
    summary: "Clicking, nothing at all when you turn the key, or a starter that sticks.",
    questions: [
      {
        id: "startingSign",
        label: "What happens when you turn the key?",
        type: "single",
        options: [
          { value: "single-click", label: "One click, then nothing" },
          { value: "rapid-click", label: "Rapid clicking" },
          { value: "nothing", label: "Nothing at all" },
          { value: "cranks-no-start", label: "Cranks but does not start" },
        ],
        required: true,
      },
      {
        id: "startingTemperature",
        label: "Is it worse hot or cold?",
        type: "single",
        options: [
          { value: "hot", label: "Worse when hot" },
          { value: "cold", label: "Worse when cold" },
          { value: "no-difference", label: "No difference" },
        ],
      },
      ...commonQuestions(),
    ],
  },
  {
    id: "lighting",
    label: "Lighting",
    section: "ELECTRICAL",
    summary: "Headlights, indicators or interior lights cutting out or flickering.",
    questions: [
      {
        id: "lightingWhich",
        label: "Which lights?",
        type: "multi",
        hint: "Choose all that apply.",
        options: [
          { value: "headlights", label: "Headlights" },
          { value: "indicators", label: "Indicators" },
          { value: "brake-lights", label: "Brake lights" },
          { value: "interior", label: "Interior lights" },
          { value: "dashboard", label: "Dashboard lights" },
        ],
        required: true,
      },
      {
        id: "lightingSign",
        label: "What are they doing?",
        type: "single",
        options: [
          { value: "not-working", label: "Not working at all" },
          { value: "flickering", label: "Flickering" },
          { value: "dim", label: "Dimmer than they should be" },
          { value: "intermittent", label: "Cutting out and coming back" },
        ],
        required: true,
      },
      ...commonQuestions(),
    ],
  },
  {
    id: "air-conditioning",
    label: "Air conditioning",
    section: "ELECTRICAL",
    summary: "Blowing warm, cutting in and out, or a click from the engine bay.",
    questions: [
      {
        id: "acSign",
        label: "What is the air conditioning doing?",
        type: "single",
        options: [
          { value: "warm", label: "Blowing warm" },
          { value: "intermittent", label: "Cold then warm then cold" },
          { value: "no-fan", label: "Fan not blowing" },
          { value: "noise", label: "Noise when it switches on" },
        ],
        required: true,
      },
      ...commonQuestions(),
    ],
  },
  {
    id: "wiring",
    label: "Wiring and fuses",
    section: "ELECTRICAL",
    summary: "Fuses blowing, windows or accessories dead, or a fault that moves around.",
    questions: [
      {
        id: "wiringSign",
        label: "What is affected?",
        type: "single",
        options: [
          { value: "fuse", label: "A fuse keeps blowing" },
          { value: "windows", label: "Electric windows" },
          { value: "accessories", label: "Radio, charger or accessories" },
          { value: "multiple", label: "Several things at once" },
        ],
        required: true,
      },
      {
        id: "recentWork",
        label: "Has anything been fitted or repaired recently?",
        type: "text",
        hint: "Optional. Alarms, radios and trackers are a common source.",
      },
      ...commonQuestions(),
    ],
  },
];

export function getSymptomCategory(id: string): SymptomCategory | undefined {
  return SYMPTOM_CATEGORIES.find((category) => category.id === id);
}

export function symptomCategoriesForSection(section: Section): readonly SymptomCategory[] {
  return SYMPTOM_CATEGORIES.filter((category) => category.section === section);
}

/** A question is only asked when its branching condition is satisfied. */
export function isQuestionVisible(
  question: SymptomQuestion,
  answers: Readonly<Record<string, string | string[] | undefined>>,
): boolean {
  if (!question.showIf) {
    return true;
  }

  const answer = answers[question.showIf.questionId];
  return Array.isArray(answer)
    ? answer.includes(question.showIf.value)
    : answer === question.showIf.value;
}

export type SymptomAnswers = Record<string, string | string[]>;

/**
 * Checks a set of answers against the category definition. Returns a map of
 * question id to message, empty when everything is in order. The API uses this
 * to build the details of a VALIDATION_ERROR and the wizard uses it to decide
 * whether the step can be left.
 */
export function validateSymptomAnswers(
  category: SymptomCategory,
  answers: Readonly<SymptomAnswers>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const question of category.questions) {
    if (!isQuestionVisible(question, answers)) {
      continue;
    }

    const answer = answers[question.id];
    const isEmpty =
      answer === undefined ||
      answer === "" ||
      (Array.isArray(answer) && answer.length === 0);

    if (question.required && isEmpty) {
      errors[question.id] = "Choose an answer to continue.";
      continue;
    }

    if (isEmpty || !question.options) {
      continue;
    }

    const allowed = new Set(question.options.map((option) => option.value));
    const given = Array.isArray(answer) ? answer : [answer];

    if (given.some((value) => !allowed.has(value))) {
      errors[question.id] = "That is not one of the available answers.";
      continue;
    }

    if (question.type === "single" && Array.isArray(answer)) {
      errors[question.id] = "Choose one answer.";
    }
  }

  return errors;
}

/** Turns stored answers back into readable lines for the job sheet. */
export function describeSymptomAnswers(
  category: SymptomCategory,
  answers: Readonly<SymptomAnswers>,
): Array<{ question: string; answer: string }> {
  const lines: Array<{ question: string; answer: string }> = [];

  for (const question of category.questions) {
    if (!isQuestionVisible(question, answers)) {
      continue;
    }

    const answer = answers[question.id];
    if (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0)) {
      continue;
    }

    const values = Array.isArray(answer) ? answer : [answer];
    const labels = values.map((value) => {
      const option = question.options?.find((candidate) => candidate.value === value);
      return option ? option.label : value;
    });

    lines.push({ question: question.label, answer: labels.join(", ") });
  }

  return lines;
}
