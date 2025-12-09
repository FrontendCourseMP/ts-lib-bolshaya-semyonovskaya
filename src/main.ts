import * as fv from "./index.js";

// Получаем форму
const formElement = document.querySelector<HTMLFormElement>("form");
if (!formElement) {
  throw new Error("Форма не найдена");
}

// Создаем валидатор
const validator = fv.form(formElement);

// Настраиваем валидацию полей

// Текстовое поле - обязательное, минимум 2 символа
validator.field("name").string().required("Имя обязательно!").min(2, "Минимум 2 символа!");

// Email - обязательное поле с проверкой формата
validator.field("email").string().required("Email обязателен!").email("Неверный формат email!");

// Пароль - обязательное, минимум 8 символов
validator.field("password").string().required("Пароль обязателен!").min(8, "Пароль должен содержать минимум 8 символов!");

// Возраст - число от 18 до 100
validator.field("age").number().required("Возраст обязателен!").min(18, "Минимальный возраст 18 лет").max(100, "Максимальный возраст 100 лет");

// Количество - число, кратное 5
validator.field("quantity").number().step(5, "Количество должно быть кратно 5");

// Описание - текст максимум 100 символов
validator.field("description").string().max(100, "Максимум 100 символов!");

// Страна - обязательное поле (select)
validator.field("country").string().required("Выберите страну!");

// Интересы - массив чекбоксов, минимум 1, максимум 3
validator.field("interests").array().required("Выберите хотя бы один интерес!").min(1, "Выберите минимум 1 интерес").max(3, "Можно выбрать максимум 3 интереса");

// Пол - обязательное поле (radio)
validator.field("gender").string().required("Выберите пол!");

const resultContainer = document.getElementById("validation-result");
if (!resultContainer) {
  throw new Error("Контейнер для результатов не найден");
}

// Функция для отображения результатов валидации в HTML
const displayValidationResult = (result: fv.FormValidationResult) => {
  if (result.isValid) {
    resultContainer.className = "validation-result success";
    resultContainer.style.display = "block";
    resultContainer.innerHTML = `
      <h3>Форма успешно валидирована!</h3>
      <p>Все поля заполнены корректно. Форма готова к отправке.</p>
    `;
  } else {
    resultContainer.className = "validation-result error";
    resultContainer.style.display = "block";
    const errorsList = result.errors.map(
      (error) => `<li><strong>${error.field}:</strong> ${error.message}</li>`
    ).join("");
    resultContainer.innerHTML = `
      <h3>Обнаружены ошибки валидации</h3>
      <p>Пожалуйста, исправьте следующие ошибки:</p>
      <ul>
        ${errorsList}
      </ul>
    `;
  }
  
  resultContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

// Обработчик события submit формы
formElement.addEventListener("submit", (e) => {
  e.preventDefault();
  
  const result = validator.validate();
  displayValidationResult(result);
  
});
