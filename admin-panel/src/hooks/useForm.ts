import { useState, useCallback } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => void | Promise<void>;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
}

interface UseFormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate
}: UseFormOptions<T>) {
  const [state, setState] = useState<UseFormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false
  });

  const setFieldValue = useCallback(
    (field: keyof T, value: any) => {
      setState(prev => ({
        ...prev,
        values: { ...prev.values, [field]: value },
        touched: { ...prev.touched, [field]: true }
      }));
    },
    []
  );

  const setFieldTouched = useCallback(
    (field: keyof T, isTouched: boolean = true) => {
      setState(prev => ({
        ...prev,
        touched: { ...prev.touched, [field]: isTouched }
      }));
    },
    []
  );

  const validateForm = useCallback(() => {
    if (!validate) return {};
    return validate(state.values);
  }, [validate, state.values]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      const errors = validateForm();
      setState(prev => ({ ...prev, errors }));

      if (Object.keys(errors).length === 0) {
        setState(prev => ({ ...prev, isSubmitting: true }));
        try {
          await onSubmit(state.values);
        } finally {
          setState(prev => ({ ...prev, isSubmitting: false }));
        }
      }
    },
    [validateForm, onSubmit, state.values]
  );

  const resetForm = useCallback(() => {
    setState({
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false
    });
  }, [initialValues]);

  return {
    ...state,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
    resetForm
  };
} 