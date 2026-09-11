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

function formatFormTime(date) {
  if (!date) return "";
  const resolved = toValidDate(date);
  if (!resolved) return "";
  return `${padNumber(resolved.getHours())}:${padNumber(
    resolved.getMinutes()
  )}:${padNumber(resolved.getSeconds())}`;
}

function parseFormTime(date, value) {
  const match = String(value ?? "").match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return toValidDate(value);
  const next = new Date(toValidDate(date) ?? new Date());
  next.setHours(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), 0);
  return next;
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

const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/* --- styles --- */

const STYLES = `
  :host([disabled]),
  :host([aria-disabled="true"]) { pointer-events: none; }
  .ranger-clocks { display: grid; gap: 0.5rem; }
  .ranger-clocks__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .ranger-clocks__name { margin: 0; }
  .ranger-clocks__range {
    margin: 0;
    color: var(--cali-subtle);
  }
  .ranger-clocks__navigation { display: flex; gap: 0.25rem; }
  .ranger-clocks__times {
    display: grid;
    gap: 0.125rem;
    height: var(--cali-list-height, 16rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }
  .ranger-clocks__slot {
    text-align: start;
    border-radius: var(--cali-radius);
  }
  .ranger-clocks__slot:hover { background: var(--cali-hover-bg); }
  .ranger-clocks__slot--active { background: var(--cali-active-bg); }
  .ranger-clocks__slot--in-range { background: var(--cali-range-bg); }
  .ranger-clocks__slot--preview { background: var(--cali-preview-bg); }
  .ranger-clocks__slot--selected {
    background: var(--cali-selected-bg);
    color: var(--cali-selected-color);
  }
`;

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
    for (const minute of minutes)
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

function nearestSlot(date) {
  const next = new Date(date);
  next.setMinutes(Math.floor(next.getMinutes() / 5) * 5, 0, 0);
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
    now: nearestSlot(new Date()),
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
    this.setAttribute("aria-disabled", String(this.disabled));
    this.toggleAttribute("aria-readonly", this.readOnly);
    syncHiddenInput(
      this,
      "start",
      this.name,
      formatFormTime(this.startsWithDate)
    );
    syncHiddenInput(this, "end", this.endName, formatFormTime(this.endsWithDate));
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
    scrollSelected(this);
    this.syncForm();
  }
}

defineFormProperties(CaliRangerClocks.prototype);

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

export const defineRangerClocks = (name = "cali-ranger-clocks") => {
  return defineElement(name, "cali-ranger-clocks", CaliRangerClocks);
};

defineRangerClocks();
