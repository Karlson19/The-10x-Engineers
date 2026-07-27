import {
  Calendar,
  CircleAlert,
  CircleCheck,
  CircleX,
  Inbox,
  type LucideIcon,
  Wrench,
} from "lucide-react";
import { REQUEST_STATUS_LABELS, type RequestStatus } from "@chrysmec/shared";

type StatusMeta = {
  label: string;
  icon: LucideIcon;
  /** What the customer should understand is happening right now. */
  description: string;
};

/**
 * Status is never carried by colour alone, so every one of these has a word and
 * an icon that travel with it.
 */
export const STATUS_META: Record<RequestStatus, StatusMeta> = {
  SUBMITTED: {
    label: REQUEST_STATUS_LABELS.SUBMITTED,
    icon: Inbox,
    description: "We have your booking and will confirm a slot.",
  },
  SCHEDULED: {
    label: REQUEST_STATUS_LABELS.SCHEDULED,
    icon: Calendar,
    description: "A slot is booked and a technician is assigned.",
  },
  IN_PROGRESS: {
    label: REQUEST_STATUS_LABELS.IN_PROGRESS,
    icon: Wrench,
    description: "The vehicle is with us and the work has started.",
  },
  AWAITING_APPROVAL: {
    label: REQUEST_STATUS_LABELS.AWAITING_APPROVAL,
    icon: CircleAlert,
    description: "We have sent an estimate and are waiting on your go ahead.",
  },
  COMPLETED: {
    label: REQUEST_STATUS_LABELS.COMPLETED,
    icon: CircleCheck,
    description: "The work is finished and the vehicle is ready.",
  },
  CANCELLED: {
    label: REQUEST_STATUS_LABELS.CANCELLED,
    icon: CircleX,
    description: "This booking was cancelled.",
  },
};

export function statusTone(status: RequestStatus): "neutral" | "current" | "done" | "stopped" {
  if (status === "COMPLETED") {
    return "done";
  }
  if (status === "CANCELLED") {
    return "stopped";
  }
  if (status === "SUBMITTED") {
    return "neutral";
  }
  return "current";
}
