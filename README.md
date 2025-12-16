# Pamg

Pamg — это TypeScript библиотека для валидации HTML форм с декларативным API и поддержкой всех типов полей ввода.

**Авторы:** Погудин Артём (Catzomm), Гришин Максим (MMarker007)

## Установка

```bash
npm install pamg
```

## Требования

- TypeScript 5.9+ / Браузер с поддержкой ES6+
- Все поля формы должны иметь атрибут `name`
- Для отображения ошибок требуется элемент с `role="alert"` или `data-error-container`
- Рекомендуется использовать `label` для каждого поля (связь через `for` или вложенность)

## Быстрый старт

```typescript
import { form } from 'pamg';

const formElement = document.querySelector<HTMLFormElement>('form');
const validator = form(formElement);

// Настраиваем валидацию
validator.field('email').string().required().email();
validator.field('age').number().min(18).max(100);

// Валидируем
const result = validator.validate();
if (result.isValid) {
  console.log('Форма валидна!');
} else {
  console.log('Ошибки:', result.errors);
}
```

## HTML структура

```html
<form novalidate>
  <div class="field-group">
    <label for="name">Имя *</label>
    <input type="text" id="name" name="name" required />
    <span role="alert" aria-live="assertive"></span>
  </div>
  <button type="submit">Отправить</button>
</form>
```

**Требования:** Поле должно иметь `name`, `label` связан через `for` или вложенность, контейнер ошибок с `role="alert"`, форма с атрибутом `novalidate`.

## API

### `form(formElement, options?)`

Создает валидатор для HTML формы.

```typescript
const validator = form(formElement, {
  requireLabels: true,
  requireErrorContainers: true,
  defaultMessages: {
    valueMissing: 'Поле обязательно'
  }
});
```

### Типы валидаторов

#### StringValidator

```typescript
validator
  .field('name')
  .string()
  .required('Имя обязательно')
  .min(2, 'Минимум 2 символа')
  .max(50, 'Максимум 50 символов')
  .email('Неверный формат email')
  .pattern(/\+7-\d{3}-\d{3}-\d{2}-\d{2}/, 'Неверный формат');
```

**Методы:** `.required(message?)`, `.min(length, message?)`, `.max(length, message?)`, `.email(message?)`, `.pattern(regex, message?)`

#### NumberValidator

```typescript
validator
  .field('age')
  .number()
  .required('Возраст обязателен')
  .min(18, 'Минимум 18')
  .max(100, 'Максимум 100')
  .step(5, 'Должно быть кратно 5');
```

**Методы:** `.required(message?)`, `.min(value, message?)`, `.max(value, message?)`, `.step(step, message?)`

#### ArrayValidator

```typescript
validator
  .field('interests')
  .array()
  .required('Выберите интересы')
  .min(1, 'Минимум 1 вариант')
  .max(3, 'Максимум 3 варианта');
```

**Методы:** `.required(message?)`, `.min(count, message?)`, `.max(count, message?)`

### `validator.validate()`

Выполняет валидацию всех полей формы.

```typescript
interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
}
```

### `validator.getFields()`

Возвращает Map со всеми полями формы и их конфигурацией.

```typescript
const fields = validator.getFields();
console.log(Array.from(fields.keys())); 
```

## Примеры использования

### Валидация строк

```typescript
validator.field('name').string().required().min(2).max(50);
validator.field('email').string().required().email();
validator.field('phone').string().pattern(/\+7-\d{3}-\d{3}-\d{2}-\d{2}/);
```

### Валидация чисел

```typescript
validator.field('age').number().required().min(18).max(100);
validator.field('quantity').number().min(1).step(5);
```

### Валидация чекбоксов и radio

```typescript
validator.field('interests').array().required().min(1).max(3);
validator.field('gender').string().required();
```

## Полный пример

```typescript
import { form } from 'pamg';

const formElement = document.querySelector<HTMLFormElement>('#myForm');
const validator = form(formElement);

// Настраиваем валидацию
validator.field('name').string().required().min(2).max(50);
validator.field('email').string().required().email();
validator.field('password').string().required().min(8);
validator.field('age').number().required().min(18).max(100);
validator.field('phone').string().required().pattern(/\+7-\d{3}-\d{3}-\d{2}-\d{2}/);

// Обработка отправки
formElement.addEventListener('submit', (e) => {
  e.preventDefault();
  const result = validator.validate();
  
  if (result.isValid) {
    console.log('Форма валидна!');
    // Отправка данных
  } else {
    console.log('Ошибки:', result.errors);
  }
});
```

## Опции конфигурации

```typescript
interface FormValidatorOptions {
  requireLabels?: boolean;
  requireErrorContainers?: boolean;
  defaultMessages?: {
    valueMissing?: string;
    typeMismatch?: string;
    patternMismatch?: string;
    tooShort?: string;
    tooLong?: string;
    rangeUnderflow?: string;
    rangeOverflow?: string;
    stepMismatch?: string;
  };
}
```

## Совместимость

Поддерживает все стандартные HTML5 типы полей ввода, работает с Constraint Validation API браузера, автоматически обрабатывает чекбоксы и radio-кнопки, поддерживает `textarea` и `select`. Совместим с TypeScript и JavaScript.
