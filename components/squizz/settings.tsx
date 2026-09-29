"use client";
import { Select as SelectPrimitive } from "radix-ui";
import { CheckIcon } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectTrigger, SelectValue } from "@/components/ui/select";

/** [value, label, description?, group?] — options sharing a group are listed under one heading. */
export type ChoiceOption = readonly [string, string, string?, string?];

export function Choice({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly ChoiceOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const groups: { name?: string; items: ChoiceOption[] }[] = [];
  for (const option of options) {
    const last = groups[groups.length - 1];
    if (last && last.name === option[3]) last.items.push(option);
    else groups.push({ name: option[3], items: [option] });
  }
  return (
    <div className="setting">
      <span>{label}</span>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="setting-trigger" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        {/* "popper" opens below the field and scrolls natively; "item-aligned" jumped around on wheel. */}
        <SelectContent className="setting-options" position="popper" sideOffset={6} align="start">
          {groups.map((group, i) => (
            <SelectGroup key={group.name ?? i}>
              {group.name && (
                <SelectPrimitive.Label className="setting-group">{group.name}</SelectPrimitive.Label>
              )}
              {group.items.map(([v, text, description]) => (
                <SelectPrimitive.Item key={v} value={v} className="setting-option">
                  <span className="setting-option-text">
                    <SelectPrimitive.ItemText>{text}</SelectPrimitive.ItemText>
                    {description && <small>{description}</small>}
                  </span>
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon size={18} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
