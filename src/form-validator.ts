import type {
  FormValidator,
  FormValidatorFactory,
  FormValidatorOptions,
  FieldConfig,
  FieldValidator,
  StringValidator,
  NumberValidator,
  ArrayValidator,
  FormValidationResult,
  ValidationError,
  ValidityState,
  GetValidityState,
  ValidationRule,
} from "./types/types.js";

const getValidityState: GetValidityState = (element: HTMLElement): ValidityState => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return {
      valueMissing: element.validity.valueMissing,
      typeMismatch: element.validity.typeMismatch,
      patternMismatch: element.validity.patternMismatch,
      tooLong: element.validity.tooLong,
      tooShort: element.validity.tooShort,
      rangeUnderflow: element.validity.rangeUnderflow,
      rangeOverflow: element.validity.rangeOverflow,
      stepMismatch: element.validity.stepMismatch,
      badInput: element.validity.badInput,
      customError: element.validity.customError,
      valid: element.validity.valid,
    };
  }
  
  return {
    valueMissing: false,
    typeMismatch: false,
    patternMismatch: false,
    tooLong: false,
    tooShort: false,
    rangeUnderflow: false,
    rangeOverflow: false,
    stepMismatch: false,
    badInput: false,
    customError: false,
    valid: true,
  };
};

const findLabel = (field: HTMLElement): HTMLLabelElement | undefined => {
  if (field.id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${field.id}"]`);
    if (label) return label;
  }
  
  let parent = field.parentElement;
  while (parent) {
    if (parent.tagName === "LABEL") {
      return parent as HTMLLabelElement;
    }
    parent = parent.parentElement;
  }
  
  return undefined;
};

const findErrorContainer = (field: HTMLElement): HTMLElement | undefined => {
  if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
    let parent = field.parentElement;
    while (parent && parent !== document.body) {
      const nextSibling = parent.nextElementSibling;
      if (nextSibling && nextSibling.hasAttribute("role") && nextSibling.getAttribute("role") === "alert") {
        return nextSibling as HTMLElement;
      }
      if (parent.hasAttribute("data-error-container")) {
        return parent;
      }
      parent = parent.parentElement;
    }
  }
  
  let next = field.nextElementSibling;
  while (next) {
    if (next.hasAttribute("role") && next.getAttribute("role") === "alert") {
      return next as HTMLElement;
    }
    next = next.nextElementSibling;
  }
  
  let parent = field.parentElement;
  while (parent && parent !== document.body) {
    if (parent.hasAttribute("data-error-container")) {
      return parent;
    }
    parent = parent.parentElement;
  }
  
  return undefined;
};

const getFieldValue = (element: HTMLElement): string | number | string[] => {
  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox") {
      if (!element.form) return [];
      const checkboxes = element.form.querySelectorAll<HTMLInputElement>(`input[name="${element.name}"][type="checkbox"]`);
      return Array.from(checkboxes)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value || "on");
    }
    if (element.type === "radio") {
      if (!element.form) return "";
      const selected = element.form.querySelector<HTMLInputElement>(`input[name="${element.name}"][type="radio"]:checked`);
      return selected ? (selected.value || "") : "";
    }
    if (element.type === "number") {
      if (element.value === "") {
        return "";
      }
      return element.valueAsNumber;
    }
    return element.value;
  }
  
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return element.value;
  }
  
  return "";
};

export const form: FormValidatorFactory = (
  formElement: HTMLFormElement,
  options: FormValidatorOptions = {}
): FormValidator => {
  const {
    requireLabels = true,
    requireErrorContainers = true,
    defaultMessages = {},
  } = options;
  
  const fields = new Map<string, FieldConfig>();
  const fieldValidators = new Map<string, FieldValidator>();
  
  const formFields = formElement.querySelectorAll<HTMLElement>(
    "input, textarea, select"
  );
  
  const processedFields = new Set<string>();
  
  for (const field of formFields) {
    const name = field.getAttribute("name");
    if (!name) continue;
    
    if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
      if (processedFields.has(name)) {
        continue;
      }
      processedFields.add(name);
      
      const firstField = formElement.querySelector<HTMLInputElement>(`input[name="${name}"][type="${field.type}"]`);
      if (!firstField) continue;
      
      const label = findLabel(firstField);
      let errorContainer = findErrorContainer(firstField);
      if (!errorContainer) {
        let parent = firstField.parentElement;
        while (parent && parent !== formElement) {
          const next = parent.nextElementSibling;
          if (next && next.hasAttribute("role") && next.getAttribute("role") === "alert") {
            errorContainer = next as HTMLElement;
            break;
          }
          parent = parent.parentElement;
        }
      }
      
      if (requireLabels && !label) {
        console.warn(`Поле "${name}" не имеет связанного label`);
      }
      
      if (requireErrorContainers && !errorContainer) {
        console.warn(`Поле "${name}" не имеет контейнера для ошибок`);
      }
      
      fields.set(name, {
        name,
        element: firstField,
        label,
        errorContainer,
        customMessages: {},
        validationRules: [],
      });
    } else {
      const label = findLabel(field);
      const errorContainer = findErrorContainer(field);
      
      if (requireLabels && !label) {
        console.warn(`Поле "${name}" не имеет связанного label`);
      }
      
      if (requireErrorContainers && !errorContainer) {
        console.warn(`Поле "${name}" не имеет контейнера для ошибок`);
      }
      
      fields.set(name, {
        name,
        element: field,
        label,
        errorContainer,
        customMessages: {},
        validationRules: [],
      });
    }
  }
  
  const createFieldValidator = (fieldName: string): FieldValidator => {
    const config = fields.get(fieldName);
    if (!config) {
      throw new Error(`Поле "${fieldName}" не найдено в форме`);
    }
    
    const stringValidator = (): StringValidator => {
      config.fieldType = "string";
      if (!config.validationRules) {
        config.validationRules = [];
      }
      
      return {
        min: (length: number, message?: string) => {
          config.validationRules!.push({ 
            type: "min", 
            message, 
            value: length,
            fieldType: "string"
          });
          return stringValidator();
        },
        max: (length: number, message?: string) => {
          config.validationRules!.push({ 
            type: "max", 
            message, 
            value: length,
            fieldType: "string"
          });
          return stringValidator();
        },
        pattern: (pattern: RegExp, message?: string) => {
          config.validationRules!.push({ 
            type: "pattern", 
            message, 
            value: pattern,
            fieldType: "string"
          });
          return stringValidator();
        },
        email: (message?: string) => {
          config.validationRules!.push({ 
            type: "email", 
            message,
            fieldType: "string"
          });
          return stringValidator();
        },
        required: (message?: string) => {
          config.validationRules!.push({ 
            type: "required", 
            message,
            fieldType: "string"
          });
          return stringValidator();
        },
      };
    };
    
    const numberValidator = (): NumberValidator => {
      config.fieldType = "number";
      if (!config.validationRules) {
        config.validationRules = [];
      }
      
      return {
        min: (value: number, message?: string) => {
          config.validationRules!.push({ 
            type: "min", 
            message, 
            value,
            fieldType: "number"
          });
          return numberValidator();
        },
        max: (value: number, message?: string) => {
          config.validationRules!.push({ 
            type: "max", 
            message, 
            value,
            fieldType: "number"
          });
          return numberValidator();
        },
        step: (step: number, message?: string) => {
          config.validationRules!.push({ 
            type: "step", 
            message, 
            value: step,
            fieldType: "number"
          });
          return numberValidator();
        },
        required: (message?: string) => {
          config.validationRules!.push({ 
            type: "required", 
            message,
            fieldType: "number"
          });
          return numberValidator();
        },
      };
    };
    
    const arrayValidator = (): ArrayValidator => {
      config.fieldType = "array";
      if (!config.validationRules) {
        config.validationRules = [];
      }
      
      return {
        min: (count: number, message?: string) => {
          config.validationRules!.push({ 
            type: "min", 
            message, 
            value: count,
            fieldType: "array"
          });
          return arrayValidator();
        },
        max: (count: number, message?: string) => {
          config.validationRules!.push({ 
            type: "max", 
            message, 
            value: count,
            fieldType: "array"
          });
          return arrayValidator();
        },
        required: (message?: string) => {
          config.validationRules!.push({ 
            type: "required", 
            message,
            fieldType: "array"
          });
          return arrayValidator();
        },
      };
    };
    
    return {
      string: stringValidator,
      number: numberValidator,
      array: arrayValidator,
    };
  };
  
  const validateStringRule = (
    rule: ValidationRule,
    value: string
  ): string | null => {
    switch (rule.type) {
      case "required":
        if (!value || value.trim() === "") {
          return rule.message || "Поле обязательно для заполнения";
        }
        break;
      case "min":
        if (value.length < (rule.value as number)) {
          return rule.message || `Минимум ${rule.value} символов`;
        }
        break;
      case "max":
        if (value.length > (rule.value as number)) {
          return rule.message || `Максимум ${rule.value} символов`;
        }
        break;
      case "pattern":
        if (!(rule.value as RegExp).test(value)) {
          return rule.message || "Значение не соответствует шаблону";
        }
        break;
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return rule.message || "Неверный формат email";
        }
        break;
    }
    return null;
  };
  

  const validateNumberRule = (
    rule: ValidationRule,
    value: number | string
  ): string | null => {
    let numValue: number;
    if (typeof value === "string") {
      if (value.trim() === "") {
        if (rule.type === "required") {
          return rule.message || "Поле обязательно для заполнения";
        }
        return null;
      }
      numValue = parseFloat(value);
    } else {
      numValue = value;
    }
    
    if (isNaN(numValue)) {
      return "Значение должно быть числом";
    }
    
    switch (rule.type) {
      case "required":
        if (numValue === null || numValue === undefined || (typeof value === "string" && value.trim() === "")) {
          return rule.message || "Поле обязательно для заполнения";
        }
        break;
      case "min":
        if (numValue < (rule.value as number)) {
          return rule.message || `Минимальное значение: ${rule.value}`;
        }
        break;
      case "max":
        if (numValue > (rule.value as number)) {
          return rule.message || `Максимальное значение: ${rule.value}`;
        }
        break;
      case "step":
        if (numValue % (rule.value as number) !== 0) {
          return rule.message || `Значение должно быть кратно ${rule.value as number}`;
        }
        break;
    }
    return null;
  };
  
  const validateArrayRule = (
    rule: ValidationRule,
    value: string[]
  ): string | null => {
    switch (rule.type) {
      case "required":
        if (!value || value.length === 0) {
          return rule.message || "Необходимо выбрать хотя бы один вариант";
        }
        break;
      case "min":
        if (value.length < (rule.value as number)) {
          return rule.message || `Необходимо выбрать минимум ${rule.value} вариантов`;
        }
        break;
      case "max":
        if (value.length > (rule.value as number)) {
          return rule.message || `Можно выбрать максимум ${rule.value} вариантов`;
        }
        break;
    }
    return null;
  };
  
  const validate = (): FormValidationResult => {
    const errors: ValidationError[] = [];
    
    for (const [fieldName, config] of fields) {
      const element = config.element;
      const validity = getValidityState(element);
      const value = getFieldValue(element);
      let fieldErrors: string[] = [];
      
      if (!validity.valid) {
        let errorMessage = "";
        
        if (validity.valueMissing) {
          errorMessage = config.customMessages?.valueMissing || 
                        defaultMessages.valueMissing || 
                        element.getAttribute("data-error-value-missing") ||
                        "Поле обязательно для заполнения";
        } else if (validity.typeMismatch) {
          errorMessage = config.customMessages?.typeMismatch || 
                        defaultMessages.typeMismatch || 
                        element.getAttribute("data-error-type-mismatch") ||
                        "Неверный тип данных";
        } else if (validity.patternMismatch) {
          errorMessage = config.customMessages?.patternMismatch || 
                        defaultMessages.patternMismatch || 
                        element.getAttribute("data-error-pattern-mismatch") ||
                        "Значение не соответствует шаблону";
        } else if (validity.tooShort) {
          errorMessage = config.customMessages?.tooShort || 
                        defaultMessages.tooShort || 
                        element.getAttribute("data-error-too-short") ||
                        "Слишком мало символов";
        } else if (validity.tooLong) {
          errorMessage = config.customMessages?.tooLong || 
                        defaultMessages.tooLong || 
                        element.getAttribute("data-error-too-long") ||
                        "Слишком много символов";
        } else if (validity.rangeUnderflow) {
          errorMessage = config.customMessages?.rangeUnderflow || 
                        defaultMessages.rangeUnderflow || 
                        element.getAttribute("data-error-range-underflow") ||
                        "Значение слишком мало";
        } else if (validity.rangeOverflow) {
          errorMessage = config.customMessages?.rangeOverflow || 
                        defaultMessages.rangeOverflow || 
                        element.getAttribute("data-error-range-overflow") ||
                        "Значение слишком велико";
        } else if (validity.stepMismatch) {
          errorMessage = config.customMessages?.stepMismatch || 
                        defaultMessages.stepMismatch || 
                        element.getAttribute("data-error-step-mismatch") ||
                        "Значение не соответствует шагу";
        } else if (validity.customError) {
          if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement
          ) {
            errorMessage = element.validationMessage || "Произошла ошибка валидации";
          } else {
            errorMessage = "Произошла ошибка валидации";
          }
        }
        
        if (errorMessage) {
          fieldErrors.push(errorMessage);
        }
      }
      
      if (config.validationRules && config.validationRules.length > 0) {
        for (const rule of config.validationRules) {
          let ruleError: string | null = null;
          
          if (config.fieldType === "string") {
            const strValue = typeof value === "string" ? value : String(value || "");
            ruleError = validateStringRule(rule, strValue);
          } else if (config.fieldType === "number") {
            const numericValue = typeof value === "number" || typeof value === "string" ? value : "";
            ruleError = validateNumberRule(rule, numericValue);
          } else if (config.fieldType === "array") {
            const arrValue = Array.isArray(value) ? value : [];
            ruleError = validateArrayRule(rule, arrValue);
          }
          
          if (ruleError) {
            fieldErrors.push(ruleError);
            break;
          }
        }
      }
      
      if (fieldErrors.length > 0) {
        const firstError = fieldErrors[0];
        errors.push({
          field: fieldName,
          message: firstError,
        });
        
        if (config.errorContainer) {
          config.errorContainer.textContent = firstError;
          config.errorContainer.style.display = "block";
          config.errorContainer.style.visibility = "visible";
        }
        
        element.setAttribute("aria-invalid", "true");
      } else {
        if (config.errorContainer) {
          config.errorContainer.textContent = "";
          config.errorContainer.style.display = "block";
          config.errorContainer.style.visibility = "hidden";
        }
        element.removeAttribute("aria-invalid");
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };
  
  return {
    field: (fieldName: string) => {
      if (!fieldValidators.has(fieldName)) {
        fieldValidators.set(fieldName, createFieldValidator(fieldName));
      }
      return fieldValidators.get(fieldName)!;
    },
    validate,
    getFields: () => fields,
  };
};

