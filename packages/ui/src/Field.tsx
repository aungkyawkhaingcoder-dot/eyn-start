"use client";
import { TextField, Label, Input, TextArea, FieldError } from "@heroui/react";
export function Field({
  label,
  value,
  onChange,
  area = false,
  type = "text",
  required = false,
  maxLength,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
  type?: "text" | "number" | "url";
  required?: boolean;
  maxLength?: number;
  min?: number;
  step?: string;
}) {
  return (
    <TextField value={value} onChange={onChange} isRequired={required}>
      <Label>{label}</Label>
      {area ? (
        <TextArea rows={4} maxLength={maxLength} />
      ) : (
        <Input type={type} maxLength={maxLength} min={min} step={step} />
      )}
      <FieldError />
    </TextField>
  );
}
