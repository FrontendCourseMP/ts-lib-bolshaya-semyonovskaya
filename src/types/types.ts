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

export type FormFieldWithMeta<V = FormValue> = FormField<V> & {
  meta: InputMeta;
};

export type FormResult = {
  values: FormValues;
  fields: Record<string, FormField>;
  isValid: boolean;
};

export type FormResultWithMeta = {
  values: FormValues;
  fields: Record<string, FormFieldWithMeta>;
  isValid: boolean;
};

export type FormFn = (form: HTMLFormElement) => FormResult | FormResultWithMeta;