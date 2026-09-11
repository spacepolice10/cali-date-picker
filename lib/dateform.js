/* --- helpers --- */

function createNode(tag, options = {}, children = []) {
  const { className, part, data, on, text, type, value, attributes } = options;
  const element = document.createElement(tag);
  if (type) element.type = type;
  if (className) element.className = className;
  if (part) element.setAttribute("part", part);
  if (text != null) element.textContent = text;
  if (value != null) element.value = String(value);
  if (data) {
    for (const [name, next] of Object.entries(data)) {
      if (next == null || next === false) delete element.dataset[name];
      else element.dataset[name] = String(next);
    }
  }
  if (attributes) {
    for (const [name, next] of Object.entries(attributes)) {
      if (next == null || next === false) continue;
      element.setAttribute(name, String(next));
    }
  }
  if (on) {
    for (const [eventName, handler] of Object.entries(on)) {
      element.addEventListener(eventName, handler);
    }
  }
  element.append(...[children].flat().filter(Boolean));
  return element;
}

function replaceView(element, next) {
  const root = element.shadowRoot.querySelector(`.${CLASS_NAMES.root}`);
  if (root) root.replaceWith(next);
  else element.shadowRoot.append(next);
}

function initializeShadowRoot(element, stylesheet) {
  const root = element.attachShadow({ mode: "open" });
  root.append(createNode("style", { text: stylesheet }));
}

function defineElement(name, defaultName, ElementClass) {
  if (typeof customElements === "undefined") return ElementClass;
  if (!customElements.get(name)) {
    const RegisteredClass =
      name === defaultName ? ElementClass : class extends ElementClass {};
    customElements.define(name, RegisteredClass);
  }
  return customElements.get(name);
}

function haveSameTimestamp(a, b) {
  return a?.getTime() === b?.getTime();
}

function defineReactiveProperty(target, key, coerce, equal = Object.is) {
  const priv = `_${key}`;
  Object.defineProperty(target, key, {
    get() {
      return this[priv];
    },
    set(value) {
      const next = coerce(value);
      if (equal(this[priv], next)) return;
      this[priv] = next;
      this.render();
    },
  });
}

function isInteractionLocked(element) {
  return element.disabled || element.readOnly;
}

function padNumber(value, size = 2) {
  return String(value).padStart(size, "0");
}

function formatFormDate(date, timezone) {
  const { yearNumber, monthsNumber, daysNumber } = civilDate(date, timezone);
  return `${padNumber(yearNumber, 4)}-${padNumber(monthsNumber)}-${padNumber(
    daysNumber
  )}`;
}

function syncHiddenInput(host, key, name, value) {
  let input = host.querySelector(`input[data-cali="${key}"]`);
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.dataset.cali = key;
    host.append(input);
  }
  if (name) input.name = name;
  else input.removeAttribute("name");
  input.value = value ?? "";
  input.disabled = host.disabled;
  input.readOnly = host.readOnly;
  input.required = host.required;
  const form = host.getAttribute("form");
  if (form) input.setAttribute("form", form);
  else input.removeAttribute("form");
  const autocomplete = host.getAttribute("autocomplete");
  if (autocomplete) input.setAttribute("autocomplete", autocomplete);
  else input.removeAttribute("autocomplete");
}

function defineFormProperties(target) {
  Object.defineProperty(target, "name", {
    get() {
      return this.getAttribute("name") ?? "";
    },
    set(value) {
      if (value == null || value === "") this.removeAttribute("name");
      else this.setAttribute("name", String(value));
    },
  });
  Object.defineProperty(target, "disabled", {
    get() {
      return this.hasAttribute("disabled") || Boolean(this._formDisabled);
    },
    set(value) {
      this.toggleAttribute("disabled", Boolean(value));
    },
  });
  Object.defineProperty(target, "required", {
    get() {
      return this.hasAttribute("required");
    },
    set(value) {
      this.toggleAttribute("required", Boolean(value));
    },
  });
  Object.defineProperty(target, "readOnly", {
    get() {
      return this.hasAttribute("readonly");
    },
    set(value) {
      this.toggleAttribute("readonly", Boolean(value));
    },
  });
  Object.defineProperty(target, "autocomplete", {
    get() {
      return this.getAttribute("autocomplete") ?? "";
    },
    set(value) {
      if (value == null || value === "") this.removeAttribute("autocomplete");
      else this.setAttribute("autocomplete", String(value));
    },
  });
  Object.defineProperty(target, "defaultValue", {
    get() {
      return this.getAttribute("value") ?? "";
    },
    set(value) {
      if (value == null) this.removeAttribute("value");
      else this.setAttribute("value", String(value));
    },
  });
  Object.defineProperty(target, "form", {
    get() {
      return this._internals?.form ?? null;
    },
  });
  Object.defineProperty(target, "willValidate", {
    get() {
      return this._internals.willValidate;
    },
  });
  Object.defineProperty(target, "validity", {
    get() {
      return this._internals.validity;
    },
  });
  Object.defineProperty(target, "validationMessage", {
    get() {
      return this._internals.validationMessage;
    },
  });
  Object.defineProperty(target, "labels", {
    get() {
      return this._internals.labels;
    },
  });
}

/* --- dates --- */

function toValidDate(value) {
  if (value == null || value === "") return undefined;
  const resolved = value instanceof Date ? value : new Date(value);
  return Number.isNaN(resolved.getTime()) ? undefined : resolved;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function zoneOptions(timezone) {
  return timezone ? { timeZone: timezone } : {};
}

function intlParts(date, locale, options) {
  const parts = {};
  for (const { type, value } of new Intl.DateTimeFormat(
    locale,
    options
  ).formatToParts(date)) {
    if (type !== "literal") parts[type] = value;
  }
  return parts;
}

function civilDate(date, timezone) {
  const resolved = toValidDate(date) ?? new Date();
  const parts = intlParts(resolved, "en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    ...zoneOptions(timezone),
  });
  return {
    yearNumber: Number(parts.year),
    monthsNumber: Number(parts.month),
    daysNumber: Number(parts.day),
  };
}

function dateFromCivil({ yearNumber, monthsNumber, daysNumber, timezone } = {}) {
  if (!timezone) return new Date(yearNumber, monthsNumber - 1, daysNumber);
  const target = Date.UTC(yearNumber, monthsNumber - 1, daysNumber);
  let utc = Date.UTC(yearNumber, monthsNumber - 1, daysNumber, 12);
  for (let index = 0; index < 3; index += 1) {
    const seen = civilDate(new Date(utc), timezone);
    const delta =
      target - Date.UTC(seen.yearNumber, seen.monthsNumber - 1, seen.daysNumber);
    if (delta === 0) break;
    utc += delta;
  }
  return new Date(utc);
}

function dateLabel(date, { locale, timezone } = {}) {
  return (toValidDate(date) ?? new Date()).toLocaleDateString(locale ?? "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...zoneOptions(timezone),
  });
}

function withTime(date, time) {
  const next = new Date(date);
  next.setHours(
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds()
  );
  return next;
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

/* --- styles --- */

const STYLES = `
  :host([disabled]),
  :host([aria-disabled="true"]) { pointer-events: none; }
  .dateform { display: grid; gap: 0.5rem; }
  .dateform__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .dateform__name {
    margin: 0;
  }
  .dateform__fields { display: flex; align-items: center; gap: 0.25rem; }
  .dateform__field {
    text-align: center;
    border-radius: var(--cali-radius);
  }
  .dateform__field:hover,
  .dateform__field:focus { background: var(--cali-hover-bg); }
  .dateform__separator { color: var(--cali-subtle); user-select: none; }
`;

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
    initializeShadowRoot(this, STYLES);
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
    this.setAttribute("aria-disabled", String(this.disabled));
    this.toggleAttribute("aria-readonly", this.readOnly);
    syncHiddenInput(this, "value", this.name, this.value);
    const values = valuesOf(this);
    syncHiddenInput(
      this,
      "year",
      this.name && `${this.name}-year`,
      padNumber(values.year, 4)
    );
    syncHiddenInput(
      this,
      "month",
      this.name && `${this.name}-month`,
      padNumber(values.month)
    );
    syncHiddenInput(
      this,
      "day",
      this.name && `${this.name}-day`,
      padNumber(values.day)
    );
    this._internals.setFormValue(null);
    if (this.required && !this.value) {
      this._internals.setValidity(
        { valueMissing: true },
        "Please fill out this field",
        this
      );
    } else {
      this._internals.setValidity({});
    }
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
