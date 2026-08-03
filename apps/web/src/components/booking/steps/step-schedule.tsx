"use client";

import { BUSINESS } from "@chrysmec/shared";
import { PinLocation } from "@/components/booking/pin-location";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/** Half hour slots across the workshop's opening hours. */
const TIME_SLOTS = Array.from({ length: 21 }, (_, index) => {
  const minutes = 7 * 60 + 30 + index * 30;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function StepSchedule({
  preferredDate,
  preferredTime,
  locationText,
  latitude,
  longitude,
  errors,
  onChange,
}: {
  preferredDate: string;
  preferredTime: string;
  locationText: string;
  latitude: number | null;
  longitude: number | null;
  errors: Record<string, string>;
  onChange: (patch: {
    preferredDate?: string;
    preferredTime?: string;
    locationText?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) => void;
}) {
  const workshopAddress = `Chrysmec workshop, ${BUSINESS.city}`;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="preferredDate" label="Preferred date" error={errors.preferredDate}>
          {(field) => (
            <Input
              {...field}
              type="date"
              min={today()}
              value={preferredDate}
              onChange={(event) => onChange({ preferredDate: event.target.value })}
            />
          )}
        </FormField>

        <FormField id="preferredTime" label="Preferred time" error={errors.preferredTime}>
          {(field) => (
            <Select
              {...field}
              value={preferredTime}
              onChange={(event) => onChange({ preferredTime: event.target.value })}
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>

      <FormField
        id="locationText"
        label="Where is the vehicle?"
        hint="Bring it to us, or tell us where to collect it from."
        error={errors.locationText}
      >
        {(field) => (
          <Input
            {...field}
            value={locationText}
            onChange={(event) => onChange({ locationText: event.target.value })}
            placeholder={workshopAddress}
          />
        )}
      </FormField>

      <PinLocation
        latitude={latitude}
        longitude={longitude}
        onChange={(coordinates) =>
          onChange({
            latitude: coordinates?.latitude ?? null,
            longitude: coordinates?.longitude ?? null,
          })
        }
      />

      <Button
        variant="ghost"
        size="sm"
        className="px-3"
        onClick={() =>
          // Bringing it in means the workshop's address, and no reason to keep
          // wherever they happened to be standing when they booked.
          onChange({ locationText: workshopAddress, latitude: null, longitude: null })
        }
      >
        I will bring it to the workshop
      </Button>

      <p className="text-sm text-muted-foreground">
        We open {BUSINESS.openingHours[0]?.hours ?? "07:30 to 18:00"} on weekdays. We will confirm
        the exact slot before you travel.
      </p>
    </div>
  );
}
