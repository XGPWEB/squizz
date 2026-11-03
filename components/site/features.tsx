import { FEATURES, TYPE_DETAILS, TYPE_FAMILIES } from "@/lib/seo";
import { MomentTabs, TypeExplorer } from "./feature-explorer";

/** Every question type and slide step, by family, on one interactive stage. */
export function TypeShowcase() {
  const families = TYPE_FAMILIES.map((f) => ({
    id: f.id,
    label: f.label,
    tag: f.tag,
    hint: f.hint,
    types: f.types.map((t) => ({ id: t.id, label: t.label, detail: TYPE_DETAILS[t.id] })),
  }));
  // The reveal class goes on a wrapper: React owns the explorer's own className.
  return (
    <div data-reveal="up">
      <TypeExplorer families={families} />
    </div>
  );
}

/** What SQuizz does around the questions, one moment of a game at a time. */
export function FeatureGroups() {
  const moments = FEATURES.map((g) => ({
    id: g.id,
    label: g.label,
    items: g.items.map((i) => ({ icon: i.icon, title: i.title, text: i.text })),
  }));
  return (
    <div data-reveal="up">
      <MomentTabs moments={moments} />
    </div>
  );
}
