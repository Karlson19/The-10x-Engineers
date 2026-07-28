import { z } from "zod";

export const RATING_MIN = 1;
export const RATING_MAX = 5;

export const createFeedbackSchema = z.object({
  rating: z
    .number()
    .int()
    .min(RATING_MIN, "Choose a rating from 1 to 5.")
    .max(RATING_MAX, "Choose a rating from 1 to 5."),
  comment: z.string().trim().max(1000, "Keep it under 1000 characters.").optional(),
});
export type CreateFeedback = z.infer<typeof createFeedbackSchema>;

export const feedbackSchema = z.object({
  id: z.uuid(),
  serviceRequestId: z.uuid(),
  rating: z.number().int(),
  comment: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type Feedback = z.infer<typeof feedbackSchema>;

export const feedbackResponseSchema = z.object({ feedback: feedbackSchema });

export const RATING_LABELS: Readonly<Record<number, string>> = {
  1: "Poor",
  2: "Not great",
  3: "Fine",
  4: "Good",
  5: "Excellent",
};
