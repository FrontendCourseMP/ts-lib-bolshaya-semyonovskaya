export type sum = (a: number, b: number) => number;

export type FormValue = string | number | boolean;

export type FormValues = Record<string, FormValue>;

export type FormField<V = FormValue> = {
  name: string;
  value: V;
  validity: ValidityState;
};

export type InputMeta =
  | {
      type: "text" | "email";
      required: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    }
  | {
      type: "number";
      required: boolean;
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      type: "checkbox";
      required: boolean;
    };
