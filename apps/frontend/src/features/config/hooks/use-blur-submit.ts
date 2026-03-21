import { useState, useCallback, useRef, useEffect } from "react";

// Variant for controlled components (inputs)
export function useBlurSubmitInput(
  value: string,
  onSubmit: (value: string) => void,
  validate?: (value: string) => boolean,
) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const originalValueRef = useRef(value);

  // Sync when external value changes and not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
      originalValueRef.current = value;
    }
  }, [value, isFocused]);

  const isDirty = localValue !== originalValueRef.current;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (isDirty && (validate ? validate(localValue) : true)) {
      onSubmit(localValue);
      originalValueRef.current = localValue;
    } else {
      setLocalValue(originalValueRef.current);
    }
  }, [localValue, isDirty, onSubmit, validate]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setLocalValue(originalValueRef.current);
        (e.target as HTMLInputElement).blur();
      } else if (e.key === "Enter") {
        if (validate ? validate(localValue) : true) {
          onSubmit(localValue);
          originalValueRef.current = localValue;
          (e.target as HTMLInputElement).blur();
        }
      }
    },
    [localValue, onSubmit, validate],
  );

  return {
    localValue,
    handleChange,
    handleBlur,
    handleFocus,
    handleKeyDown,
  };
}

// Variant for sliders that should submit on release (onValueCommit)
export function useBlurSubmitSlider(
  value: number,
  onSubmit: (value: number) => void,
  validate?: (value: number) => boolean,
) {
  const [localValue, setLocalValue] = useState(value);
  const originalValueRef = useRef(value);

  // Sync when external value changes
  useEffect(() => {
    setLocalValue(value);
    originalValueRef.current = value;
  }, [value]);

  const handleValueChange = useCallback((newValue: readonly number[] | number) => {
    const val = Array.isArray(newValue) ? newValue[0] : newValue;
    setLocalValue(val);
  }, []);

  const handleValueCommit = useCallback(
    (newValue: readonly number[] | number) => {
      const val = Array.isArray(newValue) ? newValue[0] : newValue;
      if (validate ? validate(val) : true) {
        onSubmit(val);
        originalValueRef.current = val;
        setLocalValue(val);
      } else {
        setLocalValue(originalValueRef.current);
      }
    },
    [onSubmit, validate],
  );

  return {
    localValue,
    handleValueChange,
    handleValueCommit,
  };
}
