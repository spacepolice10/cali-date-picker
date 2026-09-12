import {
  civilDate,
  createNode,
  dateFromCivil,
  defineElement,
  defineFormProperties,
  defineReactiveProperty,
  formatFormDate,
  haveSameTimestamp,
  initializeShadowRoot,
  isInteractionLocked,
  padNumber,
  syncFormState,
  toValidDate,
  withTime,
  zoneOptions,
} from "./shared.js";

/* --- helpers --- */

function replaceView(element, next) {
  const root = element.shadowRoot.querySelector(`.${CLASS_NAMES.root}`);
  if (root) root.replaceWith(next);
  else element.shadowRoot.append(next);
}

/* --- dates --- */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function dateLabel(date, { locale, timezone } = {}) {
  return (toValidDate(date) ?? new Date()).toLocaleDateString(locale ?? "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...zoneOptions(timezone),
  });
}

/* --- configuration --- */

const FORM_ATTRIBUTES = [
  "name",
  "disabled",
  "required",
  "readonly",
  "form",
  "autocomplete",
];

const ATTRIBUTE_PROPERTIES = {
  locale: "locale",
  timezone: "timezone",
};

const CLASS_NAMES = {
  root: "dateform",
  header: "dateform__header",
  name: "dateform__name",
  fields: "dateform__fields",
  field: "dateform__field",
  separator: "dateform__separator",
};

const fields = [
  ["year", 4],
  ["month", 2],
  ["day", 2],
];

/* --- view components --- */

function createRoot(children) {
  return createNode(
    "form",
    { className: CLASS_NAMES.root, part: "dateform" },
    children
  );
}

function createName(form) {
  return createNode("p", {
    className: CLASS_NAMES.name,
    part: "name",
    text: dateLabel(form.date, form),
    attributes: { role: "heading", "aria-level": "2" },
  });
}

function createHeader(form) {
  return createNode("div", { className: CLASS_NAMES.header, part: "header" }, [
    createName(form),
  ]);
}

function createSeparator() {
  return createNode("span", {
    className: CLASS_NAMES.separator,
    part: "separator",
    text: "/",
  });
}

function createField(form, unit, value, maxLength) {
  return createNode("input", {
    className: CLASS_NAMES.field,
    part: "field",
    type: "text",
    data: { unit },
    value: String(value),
    attributes: {
      size: String(maxLength),
      maxlength: String(maxLength),
      inputmode: "numeric",
      autocomplete: "off",
      spellcheck: "false",
      "aria-label": unit,
      ...(form.disabled ? { disabled: "" } : {}),
      ...(form.readOnly ? { readonly: "" } : {}),
    },
    on: {
      input: (event) => {
        if (isInteractionLocked(form) || event.target.value === "") return;
        const next = Number(event.target.value);
        if (!Number.isFinite(next)) return;
        changeDate(form, { [unit]: next });
      },
    },
  });
}

function createFields(form) {
  const values = valuesOf(form);
  return createNode(
    "div",
    { className: CLASS_NAMES.fields, part: "fields" },
    fields.flatMap(([unit, maxLength], index) => [
      index > 0 && createSeparator(),
      createField(form, unit, values[unit], maxLength),
    ])
  );
}

/* --- behavior --- */

function civil(form) {
  return civilDate(form.date, form.timezone);
}

function valuesOf(form) {
  const date = civil(form);
  return {
    year: date.yearNumber,
    month: date.monthsNumber,
    day: date.daysNumber,
  };
}

function syncView(form) {
  const heading = form.shadowRoot.querySelector(`.${CLASS_NAMES.name}`);
  if (heading) heading.textContent = dateLabel(form.date, form);
  const focused = form.shadowRoot.activeElement;
  const values = valuesOf(form);
  for (const [unit, value] of Object.entries(values)) {
    const input = form.shadowRoot.querySelector(`[data-unit="${unit}"]`);
    if (!input) continue;
    input.disabled = form.disabled;
    input.readOnly = form.readOnly;
    if (input === focused && Number(input.value) === value) continue;
    input.value = String(value);
  }
  form.syncForm();
}

function changeDate(form, { year, month, day } = {}) {
  if (isInteractionLocked(form)) return;
  const current = civil(form);
  const yearNumber = clamp(year ?? current.yearNumber, 1, 9999);
  const monthsNumber = clamp(month ?? current.monthsNumber, 1, 12);
  const daysMax = new Date(yearNumber, monthsNumber, 0).getDate();
  const daysNumber = clamp(day ?? current.daysNumber, 1, daysMax);
  const next = withTime(
    dateFromCivil({
      yearNumber,
      monthsNumber,
      daysNumber,
      timezone: form.timezone,
    }),
    form.date
  );
  const changed = next.getTime() !== form.date.getTime();
  form._date = next;
  syncView(form);
  if (changed) form.emit(form.date);
}

/* --- view --- */

function createView(form) {
  return createRoot([createHeader(form), createFields(form)]);
}

/* --- custom element --- */

export class CaliDateform extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = [
    "value",
    ...FORM_ATTRIBUTES,
    ...Object.keys(ATTRIBUTE_PROPERTIES),
  ];

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._formDisabled = false;
    this._date = new Date();
    this._locale = undefined;
    this._timezone = undefined;
    initializeShadowRoot(this);
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "value") {
      this.value = newValue;
      return;
    }
    if (FORM_ATTRIBUTES.includes(name)) {
      this.render();
      return;
    }
    const property = ATTRIBUTE_PROPERTIES[name];
    if (property) this[property] = newValue;
  }

  formDisabledCallback(disabled) {
    this._formDisabled = disabled;
    this.render();
  }

  formResetCallback() {
    this.date = toValidDate(this.defaultValue) ?? new Date();
  }

  get type() {
    return "date";
  }

  get value() {
    return formatFormDate(this.date, this.timezone);
  }

  set value(next) {
    const parsed = toValidDate(next);
    if (!parsed) return;
    this.date = withTime(parsed, this.date);
  }

  emit(detail) {
    this.dispatchEvent(
      new CustomEvent("change", { detail, bubbles: true, composed: true })
    );
  }

  checkValidity() {
    return this._internals.checkValidity();
  }

  reportValidity() {
    return this._internals.reportValidity();
  }

  syncForm() {
    const values = valuesOf(this);
    syncFormState(
      this,
      [
        [this.name, this.value],
        [this.name && `${this.name}-year`, padNumber(values.year, 4)],
        [this.name && `${this.name}-month`, padNumber(values.month)],
        [this.name && `${this.name}-day`, padNumber(values.day)],
      ],
      this.required && !this.value
    );
  }

  render() {
    if (this.shadowRoot.querySelector(`.${CLASS_NAMES.root}`)) {
      syncView(this);
      return;
    }
    replaceView(this, createView(this));
    this.shadowRoot.addEventListener("submit", (event) => event.preventDefault());
    this.syncForm();
  }
}

defineFormProperties(CaliDateform.prototype);
defineReactiveProperty(
  CaliDateform.prototype,
  "date",
  (value) => toValidDate(value) ?? new Date(),
  haveSameTimestamp
);
defineReactiveProperty(CaliDateform.prototype, "locale", (value) =>
  value ? String(value) : undefined
);
defineReactiveProperty(CaliDateform.prototype, "timezone", (value) =>
  value ? String(value) : undefined
);

export const defineDateform = (name = "cali-dateform") => {
  return defineElement(name, "cali-dateform", CaliDateform);
};

defineDateform();
