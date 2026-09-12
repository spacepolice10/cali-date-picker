import {
  createNode,
  dateFromCivil,
  dateKey,
  defineElement,
  defineFormProperties,
  defineReactiveProperty,
  formatFormDate,
  haveSameTimestamp,
  initializeShadowRoot,
  isInteractionLocked,
  joinClassNames,
  monthInfo,
  syncFormState,
  toValidDate,
  withTime,
} from "./shared.js";

/* --- helpers --- */

function replaceView(element, next) {
  const root = element.shadowRoot.querySelector(`.${CLASS_NAMES.root}`);
  if (root) root.replaceWith(next);
  else element.shadowRoot.append(next);
}

/* --- dates --- */

function sameDay(a, b, options) {
  return dateKey(a, options) === dateKey(b, options);
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
    syncFormState(this, [[this.name, this.value]], this.required && !this.value);
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
