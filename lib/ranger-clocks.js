import {
  createNode,
  defineElement,
  defineFormProperties,
  defineRangeProperty,
  defineReactiveProperty,
  formatFormTime,
  haveSameTimestamp,
  initializeShadowRoot,
  isInteractionLocked,
  joinClassNames,
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

function dateLabel(date, { locale, timezone } = {}) {
  return (toValidDate(date) ?? new Date()).toLocaleDateString(locale ?? "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(timezone ? { timeZone: timezone } : {}),
  });
}

function timeLabel(date, { locale, timezone } = {}) {
  return (toValidDate(date) ?? new Date()).toLocaleTimeString(locale ?? "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(timezone ? { timeZone: timezone } : {}),
  });
}

function orderedTimes(a, b) {
  if (!a || !b) return;
  const start = a.getTime();
  const end = b.getTime();
  return start <= end ? [start, end] : [end, start];
}

function inRange(time, bounds) {
  return Boolean(bounds) && time >= bounds[0] && time <= bounds[1];
}

function slotDate(ranger, hour, minute) {
  const origin = toValidDate(ranger.startsFromDate) ?? new Date();
  return new Date(
    origin.getFullYear(),
    origin.getMonth(),
    origin.getDate(),
    hour,
    minute
  );
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
  "minutes-step": "minutesStep",
};

const CLASS_NAMES = {
  root: "ranger-clocks",
  header: "ranger-clocks__header",
  name: "ranger-clocks__name",
  range: "ranger-clocks__range",
  navigation: "ranger-clocks__navigation",
  previous: "ranger-clocks__previous",
  next: "ranger-clocks__next",
  times: "ranger-clocks__times",
  slot: "ranger-clocks__slot",
};

const DEFAULT_MINUTES_STEP = 5;

function minuteValues(step) {
  return Array.from({ length: Math.ceil(60 / step) }, (_, index) => index * step);
}

/* --- view components --- */

function createRoot(children) {
  return createNode(
    "div",
    { className: CLASS_NAMES.root, part: "ranger-clocks" },
    children
  );
}

function createName(ranger) {
  return createNode("p", {
    className: CLASS_NAMES.name,
    part: "name",
    text: dateLabel(ranger.startsFromDate ?? new Date(), ranger),
    attributes: { role: "heading", "aria-level": "2" },
  });
}

function createRange(ranger) {
  const text = [ranger.startsWithDate, ranger.endsWithDate]
    .filter(Boolean)
    .map((date) => timeLabel(date, ranger))
    .sort()
    .join(" – ");
  return createNode("p", {
    className: CLASS_NAMES.range,
    part: "range",
    text: text || "Select a start time",
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
    on: { click: () => shiftDay(ranger, delta) },
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
        ariaLabel: "Previous day",
        delta: -1,
      }),
      createNavigationButton(ranger, {
        className: CLASS_NAMES.next,
        part: "next",
        label: "Next",
        ariaLabel: "Next day",
        delta: 1,
      }),
    ]
  );
}

function createHeader(ranger) {
  return createNode("div", { className: CLASS_NAMES.header, part: "header" }, [
    createName(ranger),
    createNavigation(ranger),
  ]);
}

function createSlot(ranger, hour, minute, ctx) {
  const date = slotDate(ranger, hour, minute);
  const time = date.getTime();
  const selected = time === ctx.starts || time === ctx.ends;
  const active = time === ctx.now;
  const ranged = inRange(time, ctx.range);
  const preview = inRange(time, ctx.preview);
  const text = timeLabel(date, ranger);
  return createNode("button", {
    className: joinClassNames(
      CLASS_NAMES.slot,
      active && `${CLASS_NAMES.slot}--active`,
      ranged && `${CLASS_NAMES.slot}--in-range`,
      preview && `${CLASS_NAMES.slot}--preview`,
      selected && `${CLASS_NAMES.slot}--selected`
    ),
    part: joinClassNames(
      "slot",
      active && "active",
      ranged && "in-range",
      preview && "preview",
      selected && "selected"
    ),
    type: "button",
    text,
    data: { time },
    attributes: {
      "aria-label": text,
      "aria-pressed": String(selected),
    },
    on: {
      click: () => selectTime(ranger, date),
      mouseenter: () => hoverTime(ranger, date),
    },
  });
}

function createTimes(ranger, ctx) {
  const slots = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of minuteValues(ranger.minutesStep))
      slots.push(createSlot(ranger, hour, minute, ctx));
  }
  return createNode(
    "div",
    {
      className: CLASS_NAMES.times,
      part: "times",
      attributes: { role: "listbox", "aria-label": "time" },
      on: { mouseleave: () => hoverTime(ranger) },
    },
    slots
  );
}

/* --- behavior --- */

function shiftDay(ranger, delta) {
  if (ranger.disabled) return;
  const origin = toValidDate(ranger.startsFromDate) ?? new Date();
  const next = new Date(origin);
  next.setDate(origin.getDate() + delta);
  ranger.startsFromDate = next;
}

function rangeBounds(ranger) {
  return orderedTimes(ranger.startsWithDate, ranger.endsWithDate);
}

function previewBounds(ranger) {
  if (ranger.endsWithDate || !ranger.startsWithDate || !ranger._hover) return;
  return orderedTimes(ranger.startsWithDate, ranger._hover);
}

function nearestSlot(date, minutesStep) {
  const next = new Date(date);
  next.setMinutes(
    Math.floor(next.getMinutes() / minutesStep) * minutesStep,
    0,
    0
  );
  return next.getTime();
}

function hoverTime(ranger, date) {
  if (
    isInteractionLocked(ranger) ||
    ranger.endsWithDate ||
    !ranger.startsWithDate
  )
    return;
  const next = date;
  if (ranger._hover?.getTime() === next?.getTime()) return;
  ranger._hover = next;
  syncPreview(ranger);
}

function syncPreview(ranger) {
  const preview = previewBounds(ranger);
  const range = rangeBounds(ranger);
  for (const button of ranger.shadowRoot.querySelectorAll(
    `.${CLASS_NAMES.slot}`
  )) {
    const time = Number(button.dataset.time);
    button.classList.toggle(
      `${CLASS_NAMES.slot}--preview`,
      inRange(time, preview)
    );
    button.classList.toggle(
      `${CLASS_NAMES.slot}--in-range`,
      inRange(time, range)
    );
  }
}

function syncView(ranger) {
  const heading = ranger.shadowRoot.querySelector(`.${CLASS_NAMES.name}`);
  if (heading)
    heading.textContent = dateLabel(ranger.startsFromDate ?? new Date(), ranger);
  const rangeLabel = ranger.shadowRoot.querySelector(`.${CLASS_NAMES.range}`);
  if (rangeLabel) rangeLabel.textContent = createRange(ranger).textContent;
  const ctx = context(ranger);
  for (const button of ranger.shadowRoot.querySelectorAll(
    `.${CLASS_NAMES.slot}`
  )) {
    const time = Number(button.dataset.time);
    const selected = time === ctx.starts || time === ctx.ends;
    const active = time === ctx.now;
    const ranged = inRange(time, ctx.range);
    const preview = inRange(time, ctx.preview);
    button.classList.toggle(`${CLASS_NAMES.slot}--selected`, selected);
    button.classList.toggle(`${CLASS_NAMES.slot}--active`, active);
    button.classList.toggle(`${CLASS_NAMES.slot}--in-range`, ranged);
    button.classList.toggle(`${CLASS_NAMES.slot}--preview`, preview);
    button.part.toggle("selected", selected);
    button.part.toggle("active", active);
    button.part.toggle("in-range", ranged);
    button.part.toggle("preview", preview);
    button.setAttribute("aria-pressed", String(selected));
  }
  ranger.syncForm();
}

function selectTime(ranger, next) {
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
  return {
    now: nearestSlot(new Date(), ranger.minutesStep),
    starts: ranger.startsWithDate?.getTime(),
    ends: ranger.endsWithDate?.getTime(),
    range: rangeBounds(ranger),
    preview: previewBounds(ranger),
  };
}

function scrollSelected(ranger) {
  requestAnimationFrame(() => {
    const selected = ranger.shadowRoot.querySelector(
      `.${CLASS_NAMES.slot}--selected`
    );
    const list = ranger.shadowRoot.querySelector(`.${CLASS_NAMES.times}`);
    if (!selected || !list) return;
    list.scrollTop =
      selected.offsetTop - list.clientHeight / 2 + selected.offsetHeight / 2;
  });
}

/* --- view --- */

function createView(ranger) {
  const ctx = context(ranger);
  return createRoot([
    createHeader(ranger),
    createRange(ranger),
    createTimes(ranger, ctx),
  ]);
}

/* --- custom element --- */

export class CaliRangerClocks extends HTMLElement {
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
    this._minutesStep = DEFAULT_MINUTES_STEP;
    this._viewKey = undefined;
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
    return "time";
  }

  get value() {
    const start = formatFormTime(this.startsWithDate);
    const end = formatFormTime(this.endsWithDate);
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
    this.startsWithDate =
      parseFormTime(this.startsWithDate, start) ?? toValidDate(start);
    this.endsWithDate = parseFormTime(this.endsWithDate, end) ?? toValidDate(end);
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
        [this.name, formatFormTime(this.startsWithDate)],
        [this.endName, formatFormTime(this.endsWithDate)],
      ],
      this.required && (!this.startsWithDate || !this.endsWithDate)
    );
  }

  render() {
    const origin = toValidDate(this.startsFromDate) ?? new Date();
    const viewKey = `${origin.getFullYear()}-${origin.getMonth()}-${origin.getDate()}-${
      this.locale ?? ""
    }-${this.timezone ?? ""}-${this.minutesStep}`;
    if (
      this._viewKey === viewKey &&
      this.shadowRoot.querySelector(`.${CLASS_NAMES.root}`)
    ) {
      syncView(this);
      return;
    }
    this._viewKey = viewKey;
    replaceView(this, createView(this));
    scrollSelected(this);
    this.syncForm();
  }
}

defineFormProperties(CaliRangerClocks.prototype, { range: true });

defineRangeProperty(CaliRangerClocks.prototype, "startsWithDate");
defineRangeProperty(CaliRangerClocks.prototype, "endsWithDate");
defineReactiveProperty(
  CaliRangerClocks.prototype,
  "startsFromDate",
  toValidDate,
  haveSameTimestamp
);
defineReactiveProperty(CaliRangerClocks.prototype, "locale", (value) =>
  value ? String(value) : undefined
);
defineReactiveProperty(CaliRangerClocks.prototype, "timezone", (value) =>
  value ? String(value) : undefined
);
defineReactiveProperty(CaliRangerClocks.prototype, "minutesStep", (value) => {
  const step = Math.trunc(Number(value));
  return step >= 1 && step <= 60 ? step : DEFAULT_MINUTES_STEP;
});

export const defineRangerClocks = (name = "cali-ranger-clocks") => {
  return defineElement(name, "cali-ranger-clocks", CaliRangerClocks);
};

defineRangerClocks();
