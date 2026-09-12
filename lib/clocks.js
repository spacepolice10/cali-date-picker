import {
  createNode,
  defineElement,
  defineFormProperties,
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
  root: "clocks",
  header: "clocks__header",
  name: "clocks__name",
  columns: "clocks__columns",
  hours: "clocks__hours",
  minutes: "clocks__minutes",
  seconds: "clocks__seconds",
  unit: "clocks__unit",
};

const columns = [
  ["hour", 24, "hours"],
  ["minute", 60, "minutes"],
  ["second", 60, "seconds"],
];

/* --- view components --- */

function createRoot(children) {
  return createNode(
    "div",
    { className: CLASS_NAMES.root, part: "clocks" },
    children
  );
}

function createName(clocks) {
  return createNode("p", {
    className: CLASS_NAMES.name,
    part: "name",
    text: timeLabel(clocks.date, clocks),
    attributes: { role: "heading", "aria-level": "2" },
  });
}

function createHeader(clocks) {
  return createNode("div", { className: CLASS_NAMES.header, part: "header" }, [
    createName(clocks),
  ]);
}

function createUnit(clocks, unit, value, selected) {
  const text = String(value).padStart(2, "0");
  return createNode("button", {
    className: joinClassNames(
      CLASS_NAMES.unit,
      selected && `${CLASS_NAMES.unit}--selected`
    ),
    part: joinClassNames("unit", selected && "selected"),
    type: "button",
    text,
    data: { unit, value },
    attributes: {
      "aria-label": `${unit} ${text}`,
      "aria-pressed": String(selected),
    },
    on: { click: () => selectTime(clocks, { [unit]: value }) },
  });
}

function createColumn(clocks, unit, count, current, columnClass) {
  return createNode(
    "div",
    {
      className: columnClass,
      part: unit,
      attributes: { role: "listbox", "aria-label": unit },
    },
    Array.from({ length: count }, (_, value) =>
      createUnit(clocks, unit, value, value === current)
    )
  );
}

function createColumns(clocks) {
  const current = {
    hour: clocks.date.getHours(),
    minute: clocks.date.getMinutes(),
    second: clocks.date.getSeconds(),
  };
  return createNode(
    "div",
    { className: CLASS_NAMES.columns, part: "columns" },
    columns.map(([unit, count, key]) =>
      createColumn(clocks, unit, count, current[unit], CLASS_NAMES[key])
    )
  );
}

/* --- behavior --- */

function selectTime(clocks, { hour, minute, second } = {}) {
  if (isInteractionLocked(clocks)) return;
  const next = new Date(clocks.date);
  next.setHours(
    hour ?? next.getHours(),
    minute ?? next.getMinutes(),
    second ?? next.getSeconds()
  );
  const changed = next.getTime() !== clocks.date.getTime();
  clocks.date = next;
  if (changed) clocks.emit(clocks.date);
}

function scrollSelected(column) {
  requestAnimationFrame(() => {
    const selected = column.querySelector(`.${CLASS_NAMES.unit}--selected`);
    if (!selected) return;
    column.scrollTop =
      selected.offsetTop - column.clientHeight / 2 + selected.offsetHeight / 2;
  });
}

function syncView(clocks) {
  const heading = clocks.shadowRoot.querySelector(`.${CLASS_NAMES.name}`);
  if (heading) heading.textContent = timeLabel(clocks.date, clocks);
  const current = {
    hour: clocks.date.getHours(),
    minute: clocks.date.getMinutes(),
    second: clocks.date.getSeconds(),
  };
  for (const [unit, value] of Object.entries(current)) {
    const column = clocks.shadowRoot.querySelector(`[aria-label="${unit}"]`);
    if (!column) continue;
    for (const button of column.querySelectorAll(`.${CLASS_NAMES.unit}`)) {
      const selected = Number(button.dataset.value) === value;
      button.classList.toggle(`${CLASS_NAMES.unit}--selected`, selected);
      button.part.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  }
  clocks.syncForm();
}

/* --- view --- */

function createView(clocks) {
  return createRoot([createHeader(clocks), createColumns(clocks)]);
}

/* --- custom element --- */

export class CaliClocks extends HTMLElement {
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
    const current = {
      hour: padNumber(this.date.getHours()),
      minute: padNumber(this.date.getMinutes()),
      second: padNumber(this.date.getSeconds()),
    };
    syncFormState(
      this,
      [
        [this.name, this.value],
        ...Object.entries(current).map(([unit, value]) => [
          this.name && `${this.name}-${unit}`,
          value,
        ]),
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
    for (const column of this.shadowRoot.querySelectorAll("[role='listbox']")) {
      scrollSelected(column);
    }
    this.syncForm();
  }
}

defineFormProperties(CaliClocks.prototype);
defineReactiveProperty(
  CaliClocks.prototype,
  "date",
  (value) => toValidDate(value) ?? new Date(),
  haveSameTimestamp
);
defineReactiveProperty(CaliClocks.prototype, "locale", (value) =>
  value ? String(value) : undefined
);
defineReactiveProperty(CaliClocks.prototype, "timezone", (value) =>
  value ? String(value) : undefined
);

export const defineClocks = (name = "cali-clocks") => {
  return defineElement(name, "cali-clocks", CaliClocks);
};

defineClocks();
