// @vitest-environment jsdom

import { describe, test, expect, vi } from "vitest";
import { form } from "../form-validator.js";

function setupValidForm(value) {
  document.body.innerHTML = `
    <form>
      <label for="name">Имя</label>
      <input
        id="name"
        name="name"
        placeholder="Введите имя"
        value="${value}"
      />
      <span role="alert" aria-live="assertive"></span>
    </form>
  `;

  return document.querySelector("form");
}

describe("form()", () => {
  test("если форма не передана — выбрасывается ошибка", () => {
    expect(() => form()).toThrow(Error);
  });

  test("валидная форма — validate выполняется без ошибки", () => {
    const formElement = setupValidForm("Anna");
    const f = form(formElement);

    expect(() => {
      f.validate();
    }).not.toThrow();
  });

  test("пустое поле инпут — validate выполняется без падения", () => {
    const formElement = setupValidForm("");
    const f = form(formElement);

    expect(() => {
      f.validate();
    }).not.toThrow();
  });

  // Happy path
  test("валидное имя проходит валидацию", () => {
    const formElement = setupValidForm("Anna");
    const f = form(formElement);
    f.field("name").string().required().min(2);
    const result = f.validate();
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("валидный email проходит валидацию", () => {
    document.body.innerHTML = `<form><label for="email">Email</label><input id="email" name="email" type="email" value="test@example.com" /><span role="alert"></span></form>`;
    const f = form(document.querySelector("form"));
    f.field("email").string().required().email();
    expect(f.validate().isValid).toBe(true);
  });

  test("валидное число проходит валидацию", () => {
    document.body.innerHTML = `<form><input name="age" type="number" value="25" min="18" max="100" required /><span role="alert"></span></form>`;
    const f = form(document.querySelector("form"));
    f.field("age").number().required().min(18).max(100);
    expect(f.validate().isValid).toBe(true);
  });

  // Злые тесты
  test("пустое обязательное поле возвращает ошибку", () => {
    const formElement = setupValidForm("");
    const f = form(formElement);
    f.field("name").string().required("Поле обязательно!");
    const result = f.validate();
    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toBe("Поле обязательно!");
  });

  test("строка короче min возвращает ошибку", () => {
    const formElement = setupValidForm("A");
    const f = form(formElement);
    f.field("name").string().min(2, "Минимум 2 символа!");
    expect(f.validate().isValid).toBe(false);
  });

  test("невалидный email возвращает ошибку", () => {
    document.body.innerHTML = `<form><input name="email" type="email" value="not-an-email" /><span role="alert"></span></form>`;
    const f = form(document.querySelector("form"));
    f.field("email").string().email("Неверный формат email!");
    expect(f.validate().isValid).toBe(false);
  });

  test("число меньше min возвращает ошибку", () => {
    document.body.innerHTML = `<form><input name="age" type="number" value="17" min="18" required /><span role="alert"></span></form>`;
    const f = form(document.querySelector("form"));
    f.field("age").number().min(18, "Минимум 18!");
    expect(f.validate().isValid).toBe(false);
  });

  test("поле не найдено — выбрасывается ошибка", () => {
    const formElement = setupValidForm("Test");
    const f = form(formElement);
    expect(() => f.field("nonexistent")).toThrow('Поле "nonexistent" не найдено в форме');
  });

  // Проверка всех веток if-else
  test("label находится через атрибут for", () => {
    const formElement = setupValidForm("Test");
    const f = form(formElement);
    expect(f.getFields().get("name").label).toBeDefined();
  });

  test("label находится в родительском элементе", () => {
    document.body.innerHTML = `<form><label>Имя<input name="name" type="text" value="Test" /></label><span role="alert"></span></form>`;
    const f = form(document.querySelector("form"));
    expect(f.getFields().get("name").label).toBeDefined();
  });

  test("label не найден — выводится предупреждение", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML = `<form><input name="name" type="text" value="Test" /><span role="alert"></span></form>`;
    form(document.querySelector("form"));
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("errorContainer не найден — выводится предупреждение", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML = `<form><input name="name" type="text" value="Test" /></form>`;
    form(document.querySelector("form"));
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test("чекбоксы возвращают массив значений", () => {
    document.body.innerHTML = `<form><label><input type="checkbox" name="interests" value="sports" checked /> Спорт</label><label><input type="checkbox" name="interests" value="music" checked /> Музыка</label><span role="alert"></span></form>`;
    const f = form(document.querySelector("form"));
    f.field("interests").array().required().min(1);
    expect(f.validate().isValid).toBe(true);
  });

  test("radio возвращает выбранное значение", () => {
    document.body.innerHTML = `<form><label><input type="radio" name="gender" value="male" checked /> Мужской</label><label><input type="radio" name="gender" value="female" /> Женский</label><span role="alert"></span></form>`;
    const f = form(document.querySelector("form"));
    f.field("gender").string().required();
    expect(f.validate().isValid).toBe(true);
  });

  test("элемент без validity возвращает валидное состояние", () => {
    document.body.innerHTML = `<form><div name="test"></div></form>`;
    expect(() => form(document.querySelector("form"))).not.toThrow();
  });
});
