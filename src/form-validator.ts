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

/**
 * Получить ValidityState из HTML элемента
 */
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
  
  // Возвращаем валидное состояние по умолчанию для элементов без validity
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

/**
 * Найти label для поля
 */
const findLabel = (field: HTMLElement): HTMLLabelElement | undefined => {
  // Проверяем связь через атрибут for
  if (field.id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${field.id}"]`);
    if (label) return label;
  }
  
  // Проверяем родительский label
  let parent = field.parentElement;
  while (parent) {
    if (parent.tagName === "LABEL") {
      return parent as HTMLLabelElement;
    }
    parent = parent.parentElement;
  }
  
  return undefined;
};

/**
 * Найти контейнер для ошибок (обычно следующий элемент с role="alert")
 */
const findErrorContainer = (field: HTMLElement): HTMLElement | undefined => {
  // Для чекбоксов и radio ищем контейнер в родительской группе
  if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
    // Ищем родительский контейнер группы
    let parent = field.parentElement;
    while (parent && parent !== document.body) {
      // Ищем следующий элемент после группы
      const nextSibling = parent.nextElementSibling;
      if (nextSibling && nextSibling.hasAttribute("role") && nextSibling.getAttribute("role") === "alert") {
        return nextSibling as HTMLElement;
      }
      // Или ищем родительский контейнер с data-error-container
      if (parent.hasAttribute("data-error-container")) {
        return parent;
      }
      parent = parent.parentElement;
    }
  }
  
  // Ищем следующий элемент с role="alert"
  let next = field.nextElementSibling;
  while (next) {
    if (next.hasAttribute("role") && next.getAttribute("role") === "alert") {
      return next as HTMLElement;
    }
    next = next.nextElementSibling;
  }
  
  // Ищем родительский контейнер с data-error-container
  let parent = field.parentElement;
  while (parent && parent !== document.body) {
    if (parent.hasAttribute("data-error-container")) {
      return parent;
    }
    parent = parent.parentElement;
  }
  
  return undefined;
};

/**
 * Получить значение поля
 */
const getFieldValue = (element: HTMLElement): string | number | string[] => {
  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox") {
      // Для чекбоксов возвращаем массив выбранных значений
      const form = element.form;
      if (!form) return [];
      const checkboxes = form.querySelectorAll<HTMLInputElement>(`input[name="${element.name}"][type="checkbox"]`);
      return Array.from(checkboxes)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value || "on");
    }
    if (element.type === "radio") {
      // Для radio возвращаем значение выбранной кнопки или пустую строку
      const form = element.form;
      if (!form) return "";
      const selected = form.querySelector<HTMLInputElement>(`input[name="${element.name}"][type="radio"]:checked`);
      return selected ? (selected.value || "") : "";
    }
    if (element.type === "number") {
      // Если поле пустое, возвращаем пустую строку для правильной валидации
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

/**
 * Создать валидатор формы
 */
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
  
  // Собираем все поля формы
  const formFields = formElement.querySelectorAll<HTMLElement>(
    "input, textarea, select"
  );
  
  const processedFields = new Set<string>();
  
  // Проверяем каждое поле
  for (const field of formFields) {
    const name = field.getAttribute("name");
    if (!name) continue;
    
    // Для чекбоксов и radio обрабатываем только первый элемент группы
    if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
      if (processedFields.has(name)) {
        continue; // Пропускаем остальные элементы группы
      }
      processedFields.add(name);
      
      // Для группы находим первый элемент и его контейнер
      const firstField = formElement.querySelector<HTMLInputElement>(`input[name="${name}"][type="${field.type}"]`);
      if (!firstField) continue;
      
      const label = findLabel(firstField);
      // Для групп ищем контейнер в родительском элементе группы
      let errorContainer = findErrorContainer(firstField);
      if (!errorContainer) {
        // Ищем контейнер после родительского элемента группы
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
      
      // Проверяем наличие обязательных элементов
      if (requireLabels && !label) {
        console.warn(`Поле "${name}" не имеет связанного label`);
      }
      
      if (requireErrorContainers && !errorContainer) {
        console.warn(`Поле "${name}" не имеет контейнера для ошибок`);
      }
      
      fields.set(name, {
        name,
        element: firstField, // Используем первый элемент группы
        label,
        errorContainer,
        customMessages: {},
        validationRules: [],
      });
    } else {
      // Обычные поля
      const label = findLabel(field);
      const errorContainer = findErrorContainer(field);
      
      // Проверяем наличие обязательных элементов
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
  
  // Создаем валидаторы для полей
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
  
  // Валидация правила для строки
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
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return rule.message || "Неверный формат email";
        }
        break;
    }
    return null;
  };
  
  // Валидация правила для числа
  const validateNumberRule = (
    rule: ValidationRule,
    value: number | string
  ): string | null => {
    // Если значение строка, пытаемся преобразовать в число
    let numValue: number;
    if (typeof value === "string") {
      if (value.trim() === "") {
        // Пустая строка для required проверяется отдельно
        if (rule.type === "required") {
          return rule.message || "Поле обязательно для заполнения";
        }
        return null; // Для других правил пустая строка не проверяется
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
        const step = rule.value as number;
        if (numValue % step !== 0) {
          return rule.message || `Значение должно быть кратно ${step}`;
        }
        break;
    }
    return null;
  };
  
  // Валидация правила для массива
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
  
  // Валидация формы
  const validate = (): FormValidationResult => {
    const errors: ValidationError[] = [];
    
    for (const [fieldName, config] of fields) {
      const element = config.element;
      const validity = getValidityState(element);
      const value = getFieldValue(element);
      let fieldErrors: string[] = [];
      
      // Сначала проверяем стандартные атрибуты Constraint Validation API
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
      
      // Затем проверяем кастомные правила валидации
      if (config.validationRules && config.validationRules.length > 0) {
        for (const rule of config.validationRules) {
          let ruleError: string | null = null;
          
          if (config.fieldType === "string") {
            const strValue = typeof value === "string" ? value : String(value || "");
            ruleError = validateStringRule(rule, strValue);
          } else if (config.fieldType === "number") {
            // Для чисел можем получить как строку, так и число
            const numericValue = typeof value === "number" || typeof value === "string" ? value : "";
            ruleError = validateNumberRule(rule, numericValue);
          } else if (config.fieldType === "array") {
            const arrValue = Array.isArray(value) ? value : [];
            ruleError = validateArrayRule(rule, arrValue);
          }
          
          if (ruleError) {
            fieldErrors.push(ruleError);
            break; // Останавливаемся на первой ошибке
          }
        }
      }
      
      // Добавляем ошибки в общий список
      if (fieldErrors.length > 0) {
        const firstError = fieldErrors[0];
        errors.push({
          field: fieldName,
          message: firstError,
        });
        
        // Выводим ошибку в контейнер
        if (config.errorContainer) {
          config.errorContainer.textContent = firstError;
          config.errorContainer.style.display = "block";
          config.errorContainer.style.visibility = "visible";
        }
        
        // Добавляем визуальную индикацию ошибки
        element.setAttribute("aria-invalid", "true");
      } else {
        // Очищаем ошибки если поле валидно
        if (config.errorContainer) {
          config.errorContainer.textContent = "";
          // Не скрываем контейнер полностью, чтобы не схлопывались отступы
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

