"use client";

/** Labelled form control with an inline, screen-reader-linked error message. */
export default function Field({ id, label, error, hint, children }) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, name: id, "aria-invalid": error ? "true" : undefined, "aria-describedby": describedBy })}
      {hint && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="error">
          {error}
        </p>
      )}
    </div>
  );
}
