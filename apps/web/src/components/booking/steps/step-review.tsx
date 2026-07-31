"use client";

import {
  SECTION_LABELS,
  type Section,
  type ServiceCatalogItem,
  type SymptomAnswers,
  type Vehicle,
  assessUrgency,
  canAssessUrgency,
  describeSymptomAnswers,
  getSymptomCategory,
} from "@chrysmec/shared";
import { TriageCallout } from "@/components/booking/triage-callout";
import { formatCurrency, formatDate } from "@/lib/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3.5 sm:flex-row sm:items-baseline sm:gap-8">
      <dt className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase sm:w-40 sm:shrink-0">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-base text-foreground">{children}</dd>
    </div>
  );
}

export function StepReview({
  vehicle,
  section,
  symptomCategory,
  symptomDetails,
  services,
  preferredDate,
  preferredTime,
  locationText,
}: {
  vehicle: Vehicle | undefined;
  section: Section | null;
  symptomCategory: string | null;
  symptomDetails: SymptomAnswers;
  services: ServiceCatalogItem[];
  preferredDate: string;
  preferredTime: string;
  locationText: string;
}) {
  const category = symptomCategory ? getSymptomCategory(symptomCategory) : undefined;
  const answers = category ? describeSymptomAnswers(category, symptomDetails) : [];
  const total = services.reduce((sum, item) => sum + Number.parseFloat(item.basePrice), 0);
  const triage =
    symptomCategory && canAssessUrgency(symptomDetails)
      ? assessUrgency(symptomCategory, symptomDetails)
      : null;

  return (
    <div>
      <p className="mb-6 text-base text-muted-foreground">
        Check this over before you send it. You can still change a booking while it is waiting to be
        scheduled.
      </p>

      {/* Repeated here so an urgent reading is the last thing they see before
          sending, not something they scrolled past two steps ago. */}
      {triage ? (
        <div className="mb-7">
          <TriageCallout triage={triage} />
        </div>
      ) : null}

      <dl>
        <Row label="Vehicle">
          {vehicle ? (
            <>
              {vehicle.make} {vehicle.model}{" "}
              <span className="font-mono text-sm text-muted-foreground">
                {vehicle.registrationNo}
              </span>
            </>
          ) : (
            "Not chosen"
          )}
        </Row>

        <Row label="Section">
          {section ? SECTION_LABELS[section] : "Not chosen"}
          {category ? `, ${category.label.toLowerCase()}` : ""}
        </Row>

        <Row label="What you told us">
          {answers.length === 0 ? (
            "Nothing recorded"
          ) : (
            <ul className="space-y-1.5">
              {answers.map((line) => (
                <li key={line.question}>
                  <span className="text-muted-foreground">{line.question}</span>{" "}
                  <span className="text-foreground">{line.answer}</span>
                </li>
              ))}
            </ul>
          )}
        </Row>

        <Row label="Services">
          {services.length === 0 ? (
            "None chosen, we will advise on inspection"
          ) : (
            <ul className="space-y-1.5">
              {services.map((service) => (
                <li key={service.id} className="flex flex-wrap justify-between gap-x-4">
                  <span>{service.name}</span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {formatCurrency(service.basePrice)}
                  </span>
                </li>
              ))}
              <li className="flex flex-wrap justify-between gap-x-4 border-t border-border pt-1.5">
                <span className="text-muted-foreground">Indicative total</span>
                <span className="font-mono text-sm">{formatCurrency(total)}</span>
              </li>
            </ul>
          )}
        </Row>

        <Row label="When">
          {preferredDate ? `${formatDate(preferredDate)}, ${preferredTime}` : "Not chosen"}
        </Row>

        <Row label="Where">{locationText || "Not given"}</Row>
      </dl>
    </div>
  );
}
