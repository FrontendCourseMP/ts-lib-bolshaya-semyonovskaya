export type ValidityState = {
  valueMissing: boolean;
  typeMismatch: boolean;
  patternMismatch: boolean;
  tooLong: boolean;
  tooShort: boolean;
  rangeUnderflow: boolean;
  rangeOverflow: boolean;
  stepMismatch: boolean;
  badInput: boolean;
  customError: boolean;
  valid: boolean;
};

export type GetValidityState = (element: HTMLElement) => ValidityState;

export type ValidationError = {
  message: string;
  field: string;
};

export type FieldValidationResult = {
  isValid: boolean;
  errors: string[];
};

export type FormValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
};

export type ValidationRule = {
  type: string;
  message?: string;
  value?: any;
  fieldType?: "string" | "number" | "array";
};

export type FieldConfig = {
  name: string;
  element: HTMLElement;
  label?: HTMLLabelElement;
  errorContainer?: HTMLElement;
  customMessages?: Partial<Record<keyof ValidityState, string>>;
  validationRules?: ValidationRule[];
  fieldType?: "string" | "number" | "array";
};

export type StringValidator = {
  min: (length: number, message?: string) => StringValidator;
  max: (length: number, message?: string) => StringValidator;
  pattern: (pattern: RegExp, message?: string) => StringValidator;
  email: (message?: string) => StringValidator;
  required: (message?: string) => StringValidator;
};

export type NumberValidator = {
  min: (value: number, message?: string) => NumberValidator;
  max: (value: number, message?: string) => NumberValidator;
  step: (step: number, message?: string) => NumberValidator;
  required: (message?: string) => NumberValidator;
};

export type ArrayValidator = {
  min: (count: number, message?: string) => ArrayValidator;
  max: (count: number, message?: string) => ArrayValidator;
  required: (message?: string) => ArrayValidator;
};

export type FieldValidator = {
  string: () => StringValidator;
  number: () => NumberValidator;
  array: () => ArrayValidator;
};

export type FormValidator = {

  field: (fieldName: string) => FieldValidator;
  
  validate: () => FormValidationResult;
  
  getFields: () => Map<string, FieldConfig>;
};

export type FormValidatorFactory = (form: HTMLFormElement) => FormValidator;

export type FormValidatorOptions = {
  requireLabels?: boolean;
  
  requireErrorContainers?: boolean;

  defaultMessages?: Partial<Record<keyof ValidityState, string>>;
};
