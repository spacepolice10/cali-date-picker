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
      element.dataset[name] = String(next);
    }
  }
  if (attributes) {
    for (const [name, next] of Object.entries(attributes)) {
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

function defineRangeProperty(target, key) {
  const priv = `_${key}`;
  Object.defineProperty(target, key, {
    get() {
      return this[priv];
    },
    set(value) {
      const next = toValidDate(value);
      if (haveSameTimestamp(this[priv], next)) return;
      this[priv] = next;
      this._hover = undefined;
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
  if (!date) return "";
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
  Object.defineProperty(target, "endName", {
    get() {
      const explicit = this.getAttribute("end-name");
      if (explicit != null && explicit !== "") return explicit;
      return this.name ? `${this.name}-end` : "";
    },
    set(value) {
      if (value == null || value === "") this.removeAttribute("end-name");
      else this.setAttribute("end-name", String(value));
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

function dateLabel(date, { locale, timezone } = {}) {
  return (toValidDate(date) ?? new Date()).toLocaleDateString(locale ?? "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...zoneOptions(timezone),
  });
}

function dayStamp(date, timezone) {
  const { yearNumber, monthsNumber, daysNumber } = civilDate(date, timezone);
  return Date.UTC(yearNumber, monthsNumber - 1, daysNumber);
}

function orderedStamps(a, b, timezone) {
  if (!a || !b) return;
  const start = dayStamp(a, timezone);
  const end = dayStamp(b, timezone);
  return start <= end ? [start, end] : [end, start];
}

function inRange(stamp, bounds) {
  return Boolean(bounds) && stamp >= bounds[0] && stamp <= bounds[1];
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
  "end-name",
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
  "starts-with-date": "startsWithDate",
  "ends-with-date": "endsWithDate",
  "months-number-to-draw": "monthsNumberToDraw",
};

const CLASS_NAMES = {
  root: "ranger-calendar",
  range: "ranger-calendar__range",
  month: "ranger-calendar__month",
  header: "ranger-calendar__header",
  name: "ranger-calendar__name",
  navigation: "ranger-calendar__navigation",
  previous: "ranger-calendar__previous",
  next: "ranger-calendar__next",
  weekdays: "ranger-calendar__weekdays",
  weekday: "ranger-calendar__weekday",
  days: "ranger-calendar__days",
  date: "ranger-calendar__date",
};

/* --- styles --- */

const STYLES = `
  :host([disabled]),
  :host([aria-disabled="true"]) { pointer-events: none; }
  .ranger-calendar { display: grid; gap: 1rem; }
  .ranger-calendar__range {
    margin: 0;
    color: var(--cali-subtle);
  }
  .ranger-calendar__month { display: grid; gap: 0.25rem; }
  .ranger-calendar__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .ranger-calendar__name,
  .ranger-calendar__weekday { margin: 0; }
  .ranger-calendar__navigation { display: flex; gap: 0.25rem; }
  .ranger-calendar__weekdays,
  .ranger-calendar__days { display: grid; grid-template-columns: repeat(7, 1fr); }
  .ranger-calendar__weekday { text-align: center; color: var(--cali-subtle); }
  .ranger-calendar__date { border-radius: var(--cali-radius); }
  .ranger-calendar__date:hover { background: var(--cali-hover-bg); }
  .ranger-calendar__date--active { background: var(--cali-active-bg); }
  .ranger-calendar__date--in-range { background: var(--cali-range-bg); }
  .ranger-calendar__date--preview { background: var(--cali-preview-bg); }
  .ranger-calendar__date--selected {
    background: var(--cali-selected-bg);
    color: var(--cali-selected-color);
  }
`;

/* --- view components --- */

function createRoot(children) {
  return createNode(
    "div",
    { className: CLASS_NAMES.root, part: "ranger-calendar" },
    children
  );
}

function createRange(ranger) {
  const start = ranger.startsWithDate;
  const end = ranger.endsWithDate;
  const text = [start, end]
    .filter(Boolean)
    .map((date) => dateLabel(date, ranger))
    .join(" – ");
  return createNode("p", {
    className: CLASS_NAMES.range,
    part: "range",
    text: text || "Select a start date",
  });
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
  ranger,
  { className, part, label, ariaLabel, delta }
) {
  return createNode("button", {
    className,
    part,
    type: "button",
    text: label,
    attributes: { "aria-label": ariaLabel },
    on: { click: () => shiftMonth(ranger, delta) },
  });
}

function createNavigation(ranger) {
  return createNode(
    "div",
    { className: CLASS_NAMES.navigation, part: "navigation" },
    [
      createNavigationButton(ranger, {
        className: CLASS_NAMES.previous,
        part: "previous",
        label: "Previous",
        ariaLabel: "Previous month",
        delta: -1,
      }),
      createNavigationButton(ranger, {
        className: CLASS_NAMES.next,
        part: "next",
        label: "Next",
        ariaLabel: "Next month",
        delta: 1,
      }),
    ]
  );
}

function createHeader(ranger, month, { withNavigation }) {
  return createNode("div", { className: CLASS_NAMES.header, part: "header" }, [
    createName(month),
    withNavigation && createNavigation(ranger),
  ]);
}

function createWeekday(label) {
  return createNode("p", {
    className: CLASS_NAMES.weekday,
    part: "weekday",
    text: label,
  });
}

function createWeekdays(ranger) {
  return createNode(
    "div",
    { className: CLASS_NAMES.weekdays, part: "weekdays" },
    weekdayLabels(ranger.locale).map(createWeekday)
  );
}

function createDate(ranger, month, day, ctx) {
  const cell = dateFromCivil({
    yearNumber: month.yearNumber,
    monthsNumber: month.monthsNumber,
    daysNumber: day,
    timezone: ctx.timezone,
  });
  const stamp = String(dayStamp(cell, ctx.timezone));
  const selected = ctx.starts === stamp || ctx.ends === stamp;
  const active = stamp === ctx.today;
  const ranged = inRange(Number(stamp), ctx.range);
  const preview = inRange(Number(stamp), ctx.preview);
  return createNode("button", {
    className: joinClassNames(
      CLASS_NAMES.date,
      active && `${CLASS_NAMES.date}--active`,
      ranged && `${CLASS_NAMES.date}--in-range`,
      preview && `${CLASS_NAMES.date}--preview`,
      selected && `${CLASS_NAMES.date}--selected`
    ),
    part: joinClassNames(
      "date",
      active && "active",
      ranged && "in-range",
      preview && "preview",
      selected && "selected"
    ),
    type: "button",
    text: String(day),
    data: { date: dateKey(cell, ctx), stamp },
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
    on: {
      click: () => selectDate(ranger, cell),
      mouseenter: () => hoverDate(ranger, cell),
    },
  });
}

function createDays(ranger, month, ctx) {
  return createNode(
    "div",
    {
      className: CLASS_NAMES.days,
      part: "days",
      attributes: { role: "grid" },
      on: { mouseleave: () => hoverDate(ranger) },
    },
    Array.from({ length: month.amountOfDaysInAMonth }, (_, index) =>
      createDate(ranger, month, index + 1, ctx)
    )
  );
}

function createMonth(ranger, month, ctx, index) {
  return createNode("div", { className: CLASS_NAMES.month, part: "month" }, [
    createHeader(ranger, month, { withNavigation: index === 0 }),
    createWeekdays(ranger),
    createDays(ranger, month, ctx),
  ]);
}

/* --- behavior --- */

function weekdayLabels(locale) {
  return Array.from({ length: 7 }, (_, index) =>
    new Date(2021, 0, 3 + index).toLocaleDateString(locale ?? "en-US", {
      weekday: "short",
    })
  );
}

function monthDate(ranger, date, delta = 0) {
  const origin = monthInfo(date, ranger);
  return dateFromCivil({
    yearNumber: origin.yearNumber,
    monthsNumber: origin.monthsNumber + delta,
    daysNumber: 1,
    timezone: ranger.timezone,
  });
}

function createMonths(ranger) {
  const start = ranger.startsFromDate ?? ranger.startsWithDate ?? new Date();
  return Array.from({ length: ranger.monthsNumberToDraw }, (_, index) =>
    monthInfo(monthDate(ranger, start, index), ranger)
  );
}

function shiftMonth(ranger, delta) {
  if (ranger.disabled) return;
  ranger.startsFromDate = monthDate(
    ranger,
    ranger.startsFromDate ?? ranger.startsWithDate ?? new Date(),
    delta
  );
}

function rangeBounds(ranger) {
  return orderedStamps(
    ranger.startsWithDate,
    ranger.endsWithDate,
    ranger.timezone
  );
}

function previewBounds(ranger) {
  if (ranger.endsWithDate || !ranger.startsWithDate || !ranger._hover) return;
  return orderedStamps(ranger.startsWithDate, ranger._hover, ranger.timezone);
}

function hoverDate(ranger, cell) {
  if (
    isInteractionLocked(ranger) ||
    ranger.endsWithDate ||
    !ranger.startsWithDate
  )
    return;
  const next = cell;
  const current = ranger._hover?.getTime();
  if (current === next?.getTime()) return;
  ranger._hover = next;
  syncPreview(ranger);
}

function syncPreview(ranger) {
  const preview = previewBounds(ranger);
  const range = rangeBounds(ranger);
  for (const button of ranger.shadowRoot.querySelectorAll(
    `.${CLASS_NAMES.date}`
  )) {
    const stamp = Number(button.dataset.stamp);
    button.classList.toggle(
      `${CLASS_NAMES.date}--preview`,
      inRange(stamp, preview)
    );
    button.classList.toggle(
      `${CLASS_NAMES.date}--in-range`,
      inRange(stamp, range)
    );
  }
}

function selectDate(ranger, next) {
  if (isInteractionLocked(ranger)) return;
  if (ranger._endsWithDate) {
    ranger._startsWithDate = next;
    ranger._endsWithDate = undefined;
  } else if (ranger._startsWithDate) {
    ranger._endsWithDate = next;
  } else {
    ranger._startsWithDate = next;
  }
  ranger._hover = undefined;
  ranger.render();
  ranger.emit({
    startsWithDate: ranger.startsWithDate,
    endsWithDate: ranger.endsWithDate,
  });
}

function context(ranger) {
  const timezone = ranger.timezone;
  return {
    today: String(dayStamp(new Date(), timezone)),
    starts: ranger.startsWithDate
      ? String(dayStamp(ranger.startsWithDate, timezone))
      : "",
    ends: ranger.endsWithDate
      ? String(dayStamp(ranger.endsWithDate, timezone))
      : "",
    range: rangeBounds(ranger),
    preview: previewBounds(ranger),
    locale: ranger.locale,
    timezone,
  };
}

/* --- view --- */

function createView(ranger) {
  const ctx = context(ranger);
  return createRoot([
    createRange(ranger),
    ...createMonths(ranger).map((month, index) =>
      createMonth(ranger, month, ctx, index)
    ),
  ]);
}

/* --- custom element --- */

export class CaliRangerCalendar extends HTMLElement {
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
    this._startsWithDate = undefined;
    this._endsWithDate = undefined;
    this._startsFromDate = undefined;
    this._hover = undefined;
    this._locale = undefined;
    this._timezone = undefined;
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
    this.startsWithDate = this.getAttribute("starts-with-date");
    this.endsWithDate = this.getAttribute("ends-with-date");
    if (this.defaultValue) this.value = this.defaultValue;
  }

  get type() {
    return "date";
  }

  get value() {
    const start = formatFormDate(this.startsWithDate, this.timezone);
    const end = formatFormDate(this.endsWithDate, this.timezone);
    if (!start && !end) return "";
    return [start, end].filter(Boolean).join(",");
  }

  set value(next) {
    if (next == null || next === "") {
      this.startsWithDate = undefined;
      this.endsWithDate = undefined;
      return;
    }
    const [start, end] = String(next).split(",");
    this.startsWithDate = toValidDate(start);
    this.endsWithDate = toValidDate(end);
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
    syncHiddenInput(
      this,
      "start",
      this.name,
      formatFormDate(this.startsWithDate, this.timezone)
    );
    syncHiddenInput(
      this,
      "end",
      this.endName,
      formatFormDate(this.endsWithDate, this.timezone)
    );
    this._internals.setFormValue(null);
    if (this.required && (!this.startsWithDate || !this.endsWithDate)) {
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

defineFormProperties(CaliRangerCalendar.prototype);

defineRangeProperty(CaliRangerCalendar.prototype, "startsWithDate");
defineRangeProperty(CaliRangerCalendar.prototype, "endsWithDate");
defineReactiveProperty(
  CaliRangerCalendar.prototype,
  "startsFromDate",
  toValidDate,
  haveSameTimestamp
);
defineReactiveProperty(CaliRangerCalendar.prototype, "locale", (value) =>
  value ? String(value) : undefined
);
defineReactiveProperty(CaliRangerCalendar.prototype, "timezone", (value) =>
  value ? String(value) : undefined
);
defineReactiveProperty(
  CaliRangerCalendar.prototype,
  "monthsNumberToDraw",
  (value) => {
    const parsed = Number(value);
    return Math.max(1, Number.isFinite(parsed) ? parsed : 1);
  }
);

export const defineRangerCalendar = (name = "cali-ranger-calendar") => {
  return defineElement(name, "cali-ranger-calendar", CaliRangerCalendar);
};

defineRangerCalendar();
