"use client";
import { useSyncExternalStore } from "react";
import { Check } from "lucide-react";

export const DEMO_TIMES = ["10 h", "14 h", "17 h"] as const;
export const MAX_DEMO_SLOTS = 3;
const DAYS = 8;
/** Fixed-date public holidays in France (day/month), skipped with the weekends. */
const HOLIDAYS = new Set(["1/1", "1/5", "8/5", "14/7", "15/8", "1/11", "11/11", "25/12"]);

/** The next working days, from tomorrow: the visio is confirmed by email, so never the same day. */
export function demoDays(today: Date, count = DAYS) {
  const days: Date[] = [];
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    if (!weekend && !HOLIDAYS.has(`${d.getDate()}/${d.getMonth() + 1}`)) days.push(new Date(d));
  }
  return days;
}

/** « mardi 1er décembre à 10 h »: French writes the first day of the month « 1er ». */
export const slotLabel = (day: Date, time: string) =>
  `${day
    .toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/ 1 /, " 1er ")} à ${time}`;

/**
 * Up to three slots among the next working days, three times a day (Paris time). Not a live calendar:
 * the request goes with the contact message and Pressweb confirms one slot by email with the visio link.
 * The days depend on today's date, so they are drawn in the browser only (no hydration mismatch).
 */
export function DemoSlots({ value, onChange }: { value: string[]; onChange: (slots: string[]) => void }) {
  const today = useSyncExternalStore(
    () => () => {},
    () => {
      const d = new Date();
      return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    },
    () => 0,
  );
  if (!today) return <div className="demo-slots demo-slots-loading" aria-hidden="true" />;
  const full = value.length >= MAX_DEMO_SLOTS;
  return (
    <fieldset className="demo-slots">
      <legend>
        Vos créneaux <small>(jusqu’à {MAX_DEMO_SLOTS}, heure de Paris)</small>
      </legend>
      <div className="demo-days">
        {demoDays(new Date(Math.floor(today / 10000), (Math.floor(today / 100) % 100) - 1, today % 100)).map(
          (day) => (
            <div className="demo-day" key={day.toISOString()}>
              <span className="demo-day-name">
                {day.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
                <b>{day.getDate()}</b>
                {day.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}
              </span>
              {DEMO_TIMES.map((time) => {
                const label = slotLabel(day, time);
                const on = value.includes(label);
                return (
                  <button
                    type="button"
                    key={time}
                    className={`demo-slot${on ? " on" : ""}`}
                    aria-pressed={on}
                    aria-label={label}
                    disabled={!on && full}
                    onClick={() => onChange(on ? value.filter((v) => v !== label) : [...value, label])}
                  >
                    {on && <Check size={14} aria-hidden />}
                    {time}
                  </button>
                );
              })}
            </div>
          ),
        )}
      </div>
    </fieldset>
  );
}
