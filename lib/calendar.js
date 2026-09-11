/* --- helpers --- */

function joinClassNames(...names) {
  return names.flat().filter(Boolean).join(" ");
}

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

function dateKey(date, { locale, timezone } = {}) {
  return (toValidDate(date) ?? new Date()).toLocaleDateString(
    locale ?? "en-US",
    zoneOptions(timezone)
  );
}

function sameDay(a, b, options) {
  return dateKey(a, options) === dateKey(b, options);
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

function monthInfo(date, { locale, timezone } = {}) {
  const resolved = toValidDate(date) ?? new Date();
  const civil = civilDate(resolved, timezone);
  const names = intlParts(resolved, locale ?? "en-US", {
    month: "long",
    ...zoneOptions(timezone),
  });
  return {
    monthsName: names.month ?? "",
    yearNumber: civil.yearNumber,
    monthsNumber: civil.monthsNumber,
    amountOfDaysInAMonth: new Date(
      civil.yearNumber,
      civil.monthsNumber,
      0
    ).getDate(),
    firstMonthDate: new Date(
      civil.yearNumber,
      civil.monthsNumber - 1,
      1
    ).getDay(),
  };
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
  "starts-from-date": "startsFromDate",
  "months-number-to-draw": "monthsNumberToDraw",
};

const CLASS_NAMES = {
  root: "calendar",
  header: "calendar__header",
  name: "calendar__name",
  navigation: "calendar__navigation",
  previous: "calendar__previous",
  next: "calendar__next",
  weekdays: "calendar__weekdays",
  weekday: "calendar__weekday",
  days: "calendar__days",
  date: "calendar__date",
};

/* --- styles --- */

const STYLES = `
  :host([disabled]),
  :host([aria-disabled="true"]) { pointer-events: none; }
  .calendar { display: grid; }
  .calendar__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .calendar__name,
  .calendar__weekday { margin: 0; }
  .calendar__navigation { display: flex; gap: 0.25rem; }
  .calendar__weekdays,
  .calendar__days { display: grid; grid-template-columns: repeat(7, 1fr); }
  .calendar__weekday { text-align: center; color: var(--cali-subtle); }
  .calendar__date { border-radius: var(--cali-radius); }
  .calendar__date:hover { background: var(--cali-hover-bg); }
  .calendar__date--active { background: var(--cali-active-bg); }
  .calendar__date--selected {
    background: var(--cali-selected-bg);
    color: var(--cali-selected-color);
  }
`;

/* --- view components --- */

function createRoot(children) {
  return createNode(
    "div",
    { className: CLASS_NAMES.root, part: "calendar" },
    children
  );
}

function createName(month) {
  return createNode("p", {
    className: CLASS_NAMES.name,
    part: "name",
    text: `${month.monthsName} ${month.yearNumber}`,
    attributes: { role: "heading", "aria-level": "2" },
  });
}

function createNavigationButton(
  calendar,
  { className, part, label, ariaLabel, delta }
) {
  return createNode("button", {
    className,
    part,
    type: "button",
    text: label,
    attributes: { "aria-label": ariaLabel },
    on: { click: () => shiftMonth(calendar, delta) },
  });
}

function createNavigation(calendar) {
  return createNode(
    "div",
    { className: CLASS_NAMES.navigation, part: "navigation" },
    [
      createNavigationButton(calendar, {
        className: CLASS_NAMES.previous,
        part: "previous",
        label: "Previous",
        ariaLabel: "Previous month",
        delta: -1,
      }),
      createNavigationButton(calendar, {
        className: CLASS_NAMES.next,
        part: "next",
        label: "Next",
        ariaLabel: "Next month",
        delta: 1,
      }),
    ]
  );
}

function createHeader(calendar, month, { withNavigation }) {
  return createNode("div", { className: CLASS_NAMES.header, part: "header" }, [
    createName(month),
    withNavigation && createNavigation(calendar),
  ]);
}

function createWeekday(label) {
  return createNode("p", {
    className: CLASS_NAMES.weekday,
    part: "weekday",
    text: label,
  });
}

function createWeekdays(calendar) {
  return createNode(
    "div",
    { className: CLASS_NAMES.weekdays, part: "weekdays" },
    weekdayLabels(calendar.locale).map(createWeekday)
  );
}

function createDate(calendar, month, day, ctx) {
  const cell = dateFromCivil({
    yearNumber: month.yearNumber,
    monthsNumber: month.monthsNumber,
    daysNumber: day,
    timezone: ctx.timezone,
  });
  const key = dateKey(cell, ctx);
  const selected = key === ctx.selected;
  const active = key === ctx.today;
  return createNode("button", {
    className: joinClassNames(
      CLASS_NAMES.date,
      active && `${CLASS_NAMES.date}--active`,
      selected && `${CLASS_NAMES.date}--selected`
    ),
    part: joinClassNames("date", active && "active", selected && "selected"),
    type: "button",
    text: String(day),
    data: { date: key, time: String(cell.getTime()) },
    attributes: {
      ...(day === 1
        ? { style: `grid-column-start: ${month.firstMonthDate + 1}` }
        : {}),
      "aria-label": cell.toLocaleDateString(ctx.locale ?? "en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        ...(ctx.timezone ? { timeZone: ctx.timezone } : {}),
      }),
      "aria-pressed": String(selected),
    },
    on: { click: () => selectDate(calendar, cell) },
  });
}

function createDays(calendar, month, ctx) {
  return createNode(
    "div",
    {
      className: CLASS_NAMES.days,
      part: "days",
      attributes: { role: "grid" },
    },
    Array.from({ length: month.amountOfDaysInAMonth }, (_, index) =>
      createDate(calendar, month, index + 1, ctx)
    )
  );
}

/* --- behavior --- */

function weekdayLabels(locale) {
  return Array.from({ length: 7 }, (_, index) =>
    new Date(2021, 0, 3 + index).toLocaleDateString(locale ?? "en-US", {
      weekday: "short",
    })
  );
}

function monthDate(calendar, date, delta = 0) {
  const origin = monthInfo(date, calendar);
  return dateFromCivil({
    yearNumber: origin.yearNumber,
    monthsNumber: origin.monthsNumber + delta,
    daysNumber: 1,
    timezone: calendar.timezone,
  });
}

function createMonths(calendar) {
  const start = calendar.startsFromDate ?? calendar.date;
  return Array.from({ length: calendar.monthsNumberToDraw }, (_, index) =>
    monthInfo(monthDate(calendar, start, index), calendar)
  );
}

function shiftMonth(calendar, delta) {
  if (calendar.disabled) return;
  calendar.startsFromDate = monthDate(
    calendar,
    calendar.startsFromDate ?? calendar.date,
    delta
  );
}

function selectDate(calendar, next) {
  if (isInteractionLocked(calendar)) return;
  const selected = withTime(next, calendar.date);
  const resolved = sameDay(selected, next, calendar) ? selected : next;
  const changed = !sameDay(calendar.date, resolved, calendar);
  calendar.date = resolved;
  if (changed) calendar.emit(calendar.date);
}

/* --- view --- */

function createView(calendar) {
  const ctx = {
    today: dateKey(new Date(), calendar),
    selected: dateKey(calendar.date, calendar),
    locale: calendar.locale,
    timezone: calendar.timezone,
  };
  return createRoot(
    createMonths(calendar).flatMap((month, index) => [
      createHeader(calendar, month, { withNavigation: index === 0 }),
      createWeekdays(calendar),
      createDays(calendar, month, ctx),
    ])
  );
}

/* --- custom element --- */

export class CaliCalendar extends HTMLElement {
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
    this._startsFromDate = undefined;
    this._monthsNumberToDraw = 1;
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
      this.syncForm();
      return;
    }
    const property = ATTRIBUTE_PROPERTIES[name];
    if (property) this[property] = newValue;
  }

  formDisabledCallback(disabled) {
    this._formDisabled = disabled;
    this.syncForm();
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

  get months() {
    return createMonths(this);
  }

  checkValidity() {
    return this._internals.checkValidity();
  }

  reportValidity() {
    return this._internals.reportValidity();
  }

  emit(detail) {
    this.dispatchEvent(
      new CustomEvent("change", { detail, bubbles: true, composed: true })
    );
  }

  syncForm() {
    this.setAttribute("aria-disabled", String(this.disabled));
    this.toggleAttribute("aria-readonly", this.readOnly);
    syncHiddenInput(this, "value", this.name, this.value);
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
    replaceView(this, createView(this));
    this.syncForm();
  }
}

defineFormProperties(CaliCalendar.prototype);
defineReactiveProperty(
  CaliCalendar.prototype,
  "date",
  (value) => toValidDate(value) ?? new Date(),
  haveSameTimestamp
);
defineReactiveProperty(CaliCalendar.prototype, "locale", (value) =>
  value ? String(value) : undefined
);
defineReactiveProperty(CaliCalendar.prototype, "timezone", (value) =>
  value ? String(value) : undefined
);
defineReactiveProperty(
  CaliCalendar.prototype,
  "startsFromDate",
  toValidDate,
  haveSameTimestamp
);
defineReactiveProperty(CaliCalendar.prototype, "monthsNumberToDraw", (value) => {
  const parsed = Number(value);
  return Math.max(1, Number.isFinite(parsed) ? parsed : 1);
});

export const defineCalendar = (name = "cali-calendar") => {
  return defineElement(name, "cali-calendar", CaliCalendar);
};

defineCalendar();
