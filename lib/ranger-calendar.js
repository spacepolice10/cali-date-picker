import {
  civilDate,
  createNode,
  dateFromCivil,
  dateKey,
  defineElement,
  defineFormProperties,
  defineRangeProperty,
  defineReactiveProperty,
  formatFormDate,
  haveSameTimestamp,
  initializeShadowRoot,
  isInteractionLocked,
  joinClassNames,
  monthInfo,
  syncFormState,
  toValidDate,
  zoneOptions,
} from "./shared.js";

/* --- helpers --- */

function replaceView(element, next) {
  const root = element.shadowRoot.querySelector(`.${CLASS_NAMES.root}`);
  if (root) root.replaceWith(next);
  else element.shadowRoot.append(next);
}

/* --- dates --- */

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
    syncFormState(
      this,
      [
        [this.name, formatFormDate(this.startsWithDate, this.timezone)],
        [this.endName, formatFormDate(this.endsWithDate, this.timezone)],
      ],
      this.required && (!this.startsWithDate || !this.endsWithDate)
    );
  }

  render() {
    replaceView(this, createView(this));
    this.syncForm();
  }
}

defineFormProperties(CaliRangerCalendar.prototype, { range: true });

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
