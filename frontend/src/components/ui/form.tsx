'use client';

import * as React from 'react';
import {
  useForm,
  UseFormReturn,
  UseFormRegisterReturn,
  FieldValues,
  SubmitHandler,
  Path,
  RegisterOptions,
  FieldError,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// Form context for sharing form state
interface FormContextType<T extends FieldValues> {
  form: UseFormReturn<T>;
}

const FormContext = React.createContext<FormContextType<any> | null>(null);

function useFormContext<T extends FieldValues>() {
  const context = React.useContext(FormContext);
  if (!context) {
    throw new Error('Form components must be used within a Form');
  }
  return context as FormContextType<T>;
}

// Main Form component
interface FormProps<T extends FieldValues> {
  schema: z.ZodType<T>;
  onSubmit: SubmitHandler<T>;
  defaultValues?: Partial<T>;
  children: React.ReactNode;
  className?: string;
}

export function Form<T extends FieldValues>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className,
}: FormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
  });

  return (
    <FormContext.Provider value={{ form }}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('space-y-4', className)}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

// Form field wrapper
interface FormFieldProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: (props: {
    field: UseFormRegisterReturn<Path<T>>;
    error?: FieldError;
    form: UseFormReturn<T>;
  }) => React.ReactNode;
}

export function FormField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  children,
}: FormFieldProps<T>) {
  const { form } = useFormContext<T>();
  const error = form.formState.errors[name] as FieldError | undefined;
  const field = form.register(name);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className={error ? 'text-destructive' : ''}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {children({ field, error, form })}
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  );
}

// Pre-built form fields for common use cases
interface InputFieldProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'url';
  required?: boolean;
  description?: string;
  className?: string;
}

export function InputField<T extends FieldValues>({
  name,
  label,
  placeholder,
  type = 'text',
  required,
  description,
  className,
}: InputFieldProps<T>) {
  return (
    <FormField<T>
      name={name}
      label={label}
      required={required}
      description={description}
      className={className}
    >
      {({ field, error }) => (
        <Input
          {...field}
          id={name}
          type={type}
          placeholder={placeholder}
          className={error ? 'border-destructive' : ''}
        />
      )}
    </FormField>
  );
}

interface TextareaFieldProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  description?: string;
  className?: string;
}

export function TextareaField<T extends FieldValues>({
  name,
  label,
  placeholder,
  rows = 3,
  required,
  description,
  className,
}: TextareaFieldProps<T>) {
  return (
    <FormField<T>
      name={name}
      label={label}
      required={required}
      description={description}
      className={className}
    >
      {({ field, error }) => (
        <Textarea
          {...field}
          id={name}
          placeholder={placeholder}
          rows={rows}
          className={error ? 'border-destructive' : ''}
        />
      )}
    </FormField>
  );
}

interface SelectFieldProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  required?: boolean;
  description?: string;
  className?: string;
}

export function SelectField<T extends FieldValues>({
  name,
  label,
  placeholder = 'Select an option',
  options,
  required,
  description,
  className,
}: SelectFieldProps<T>) {
  const { form } = useFormContext<T>();
  const error = form.formState.errors[name] as FieldError | undefined;
  const value = form.watch(name);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className={error ? 'text-destructive' : ''}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select
        value={value}
        onValueChange={(val) => form.setValue(name, val as any)}
      >
        <SelectTrigger className={error ? 'border-destructive' : ''}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && !error && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  );
}

interface SwitchFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
  className?: string;
}

export function SwitchField<T extends FieldValues>({
  name,
  label,
  description,
  className,
}: SwitchFieldProps<T>) {
  const { form } = useFormContext<T>();
  const value = form.watch(name);

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="space-y-0.5">
        <Label htmlFor={name}>{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch
        id={name}
        checked={value}
        onCheckedChange={(checked) => form.setValue(name, checked as any)}
      />
    </div>
  );
}

// Export zod for convenience
export { z };
