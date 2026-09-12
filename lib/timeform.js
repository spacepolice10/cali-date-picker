import {
  createNode,
  defineElement,
  defineFormProperties,
  defineReactiveProperty,
  formatFormTime,
  haveSameTimestamp,
  initializeShadowRoot,
  isInteractionLocked,
  padNumber,
  parseFormTime,
  syncFormState,
  toValidDate,
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

function timeLabel(date, { locale, timezone } = {}) {
  return (toValidDate(date) ?? new Date()).toLocaleTimeString(locale ?? "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    ...(timezone ? { timeZone: timezone } : {}),
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
  root: "timeform",
  header: "timeform__header",
  name: "timeform__name",
  fields: "timeform__fields",
  field: "timeform__field",
  separator: "timeform__separator",
};

const fields = [
  ["hour", 2, 23],
  ["minute", 2, 59],
  ["second", 2, 59],
];

/* --- view components --- */

function createRoot(children) {
  return createNode(
    "form",
    { className: CLASS_NAMES.root, part: "timeform" },
    children
  );
}

function createName(form) {
  return createNode("p", {
    className: CLASS_NAMES.name,
    part: "name",
    text: timeLabel(form.date, form),
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
    text: ":",
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
        selectTime(form, { [unit]: next });
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

function valuesOf(form) {
  return {
    hour: form.date.getHours(),
    minute: form.date.getMinutes(),
    second: form.date.getSeconds(),
  };
}

function syncView(form) {
  const heading = form.shadowRoot.querySelector(`.${CLASS_NAMES.name}`);
  if (heading) heading.textContent = timeLabel(form.date, form);
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

function selectTime(form, { hour, minute, second } = {}) {
  if (isInteractionLocked(form)) return;
  const next = new Date(form.date);
  const current = valuesOf(form);
  const patch = { hour, minute, second };
  next.setHours(
    ...fields.map(([unit, , max]) => clamp(patch[unit] ?? current[unit], 0, max))
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

export class CaliTimeform extends HTMLElement {
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
    this.date = parseFormTime(this.date, this.defaultValue) ?? new Date();
  }

  get type() {
    return "time";
  }

  get value() {
    return formatFormTime(this.date);
  }

  set value(next) {
    const parsed = parseFormTime(this.date, next);
    if (!parsed) return;
    this.date = parsed;
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
        [this.name && `${this.name}-hour`, padNumber(values.hour)],
        [this.name && `${this.name}-minute`, padNumber(values.minute)],
        [this.name && `${this.name}-second`, padNumber(values.second)],
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

defineFormProperties(CaliTimeform.prototype);
defineReactiveProperty(
  CaliTimeform.prototype,
  "date",
  (value) => toValidDate(value) ?? new Date(),
  haveSameTimestamp
);
defineReactiveProperty(CaliTimeform.prototype, "locale", (value) =>
  value ? String(value) : undefined
);
defineReactiveProperty(CaliTimeform.prototype, "timezone", (value) =>
  value ? String(value) : undefined
);

export const defineTimeform = (name = "cali-timeform") => {
  return defineElement(name, "cali-timeform", CaliTimeform);
};

defineTimeform();
