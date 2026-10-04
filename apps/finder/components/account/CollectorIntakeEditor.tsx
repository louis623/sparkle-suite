"use client";

import { Gem } from "lucide-react";
import { useFormStatus } from "react-dom";
import { updateCollectorIntakeAnswers } from "@/app/account/actions";
import type { CurrentSparkleFinderAccountState } from "@/lib/sparkle-finder/account-service";
import { finderIntakeFinePrint, type CollectorIntakeRecord } from "@/lib/sparkle-finder/collector-intake";
import { usStates } from "@/lib/us-states";

const inputClassName =
  "min-h-11 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white px-3 text-sm font-normal text-[var(--sparkle-ink)]";

const birthdayMonths = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const birthdayDays = Array.from({ length: 31 }, (_, index) => String(index + 1));

type CollectorIntakeEditorProps = {
  accountState: CurrentSparkleFinderAccountState & { status: "authenticated" };
  intake: CollectorIntakeRecord | null;
};

export function CollectorIntakeEditor({ accountState, intake }: CollectorIntakeEditorProps) {
  const customer = accountState.customer;

  return (
    <form
      action={updateCollectorIntakeAnswers}
      aria-label="Sparkle Finder jewelry profile"
      className="grid gap-4 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper)] p-5 shadow-[var(--sparkle-shadow-sm)]"
      data-suite-rep-record="collector-intake"
    >
      <div className="flex items-start gap-3">
        <Gem aria-hidden="true" className="mt-1 size-5 text-[var(--sparkle-coral)]" />
        <div>
          <h2 className="text-lg font-bold text-[var(--sparkle-plum-deep)]">Jewelry profile</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
            {intake
              ? "These answers stay on your profile. Saving them does not restart your Silver trial. A Suite rep sees this same record."
              : "Finish these answers to start 30 days of Silver. No card. Nothing is charged."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField defaultValue={intake?.firstName ?? ""} label="First name" name="firstName" />
        <TextField defaultValue={intake?.lastName ?? ""} label="Last name" name="lastName" />
      </div>
      <TextField defaultValue={intake?.email || accountState.email || ""} label="Email" name="email" type="email" />
      <TextField defaultValue={intake?.phone || customer?.phoneE164 || ""} label="Phone" name="phone" type="tel" />

      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        State
        <select className={inputClassName} defaultValue={intake?.state || customer?.state || ""} name="state" required>
          <option value="" disabled>
            Select your state
          </option>
          {usStates.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] p-3">
        <legend className="px-1 text-sm font-bold text-[var(--sparkle-plum-deep)]">Birthday</legend>
        <p className="text-xs font-semibold leading-5 text-[var(--sparkle-ink-muted)]">Month and day only. No year.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
            Month
            <select className={inputClassName} defaultValue={intake ? String(intake.birthdayMonth) : ""} name="birthdayMonth" required>
              <option value="" disabled>
                Month
              </option>
              {birthdayMonths.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
            Day
            <select className={inputClassName} defaultValue={intake ? String(intake.birthdayDay) : ""} name="birthdayDay" required>
              <option value="" disabled>
                Day
              </option>
              {birthdayDays.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <TextField defaultValue={intake?.favoriteStone ?? ""} label="Favorite stone" name="favoriteStone" />
      <TextField defaultValue={intake?.cut ?? ""} label="Cut" name="cut" />
      <TextField defaultValue={intake?.finish ?? ""} label="Finish" name="finish" />
      <TextField defaultValue={intake?.ringSize ?? ""} label="Ring size" name="ringSize" />
      <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
        Other jewelry notes
        <textarea className={inputClassName} defaultValue={intake?.jewelryNotes ?? ""} maxLength={500} name="jewelryNotes" rows={3} />
      </label>

      <label className="flex items-start gap-3 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
        <input className="mt-1" defaultChecked={Boolean(intake)} name="userAgreement" required type="checkbox" value="yes" />
        <span>I agree to the Sparkle Finder user agreement.</span>
      </label>
      <label className="flex items-start gap-3 text-sm leading-6 text-[var(--sparkle-ink-muted)]">
        <input className="mt-1" defaultChecked={Boolean(intake)} name="privacyAcknowledged" required type="checkbox" value="yes" />
        <span>I acknowledge the Sparkle Finder privacy terms.</span>
      </label>
      <p className="text-xs font-semibold leading-5 text-[var(--sparkle-ink-muted)]">{finderIntakeFinePrint}</p>
      <IntakeSaveButton />
    </form>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  type = "text",
}: {
  defaultValue: string;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[var(--sparkle-plum-deep)]">
      {label}
      <input className={inputClassName} defaultValue={defaultValue} name={name} required type={type} />
    </label>
  );
}

function IntakeSaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-11 w-fit items-center justify-center rounded-[var(--sparkle-radius-sm)] bg-[var(--sparkle-plum)] px-5 text-sm font-bold text-white disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving jewelry profile..." : "Save jewelry profile"}
    </button>
  );
}
