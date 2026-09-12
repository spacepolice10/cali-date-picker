/* --- shared infrastructure --- */

export function joinClassNames(...names) {
  return names.flat().filter(Boolean).join(" ");
}

export function createNode(tag, options = {}, children = []) {
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

export function initializeShadowRoot(element) {
  element.attachShadow({ mode: "open" });
}

export function defineElement(name, defaultName, ElementClass) {
  if (typeof customElements === "undefined") return ElementClass;
  if (!customElements.get(name)) {
    const RegisteredClass =
      name === defaultName ? ElementClass : class extends ElementClass {};
    customElements.define(name, RegisteredClass);
  }
  return customElements.get(name);
}

export function haveSameTimestamp(a, b) {
  return a?.getTime() === b?.getTime();
}

export function defineReactiveProperty(target, key, coerce, equal = Object.is) {
  const privateKey = `_${key}`;
  Object.defineProperty(target, key, {
    get() {
      return this[privateKey];
    },
    set(value) {
      const next = coerce(value);
      if (equal(this[privateKey], next)) return;
      this[privateKey] = next;
      this.render();
    },
  });
}

export function defineRangeProperty(target, key) {
  const privateKey = `_${key}`;
  Object.defineProperty(target, key, {
    get() {
      return this[privateKey];
    },
    set(value) {
      const next = toValidDate(value);
      if (haveSameTimestamp(this[privateKey], next)) return;
      this[privateKey] = next;
      this._hover = undefined;
      this.render();
    },
  });
}

export function defineFormProperties(target, { range = false } = {}) {
  const attributeProperty = (property, attribute = property) =>
    Object.defineProperty(target, property, {
      get() {
        return this.getAttribute(attribute) ?? "";
      },
      set(value) {
        if (value == null || value === "") this.removeAttribute(attribute);
        else this.setAttribute(attribute, String(value));
      },
    });
  const booleanProperty = (property, attribute = property) =>
    Object.defineProperty(target, property, {
      get() {
        return this.hasAttribute(attribute);
      },
      set(value) {
        this.toggleAttribute(attribute, Boolean(value));
      },
    });

  attributeProperty("name");
  attributeProperty("autocomplete");
  attributeProperty("defaultValue", "value");
  booleanProperty("required");
  booleanProperty("readOnly", "readonly");
  Object.defineProperty(target, "disabled", {
    get() {
      return this.hasAttribute("disabled") || Boolean(this._formDisabled);
    },
    set(value) {
      this.toggleAttribute("disabled", Boolean(value));
    },
  });
  if (range) {
    Object.defineProperty(target, "endName", {
      get() {
        return this.getAttribute("end-name") || (this.name && `${this.name}-end`);
      },
      set(value) {
        if (value == null || value === "") this.removeAttribute("end-name");
        else this.setAttribute("end-name", String(value));
      },
    });
  }
  for (const property of [
    "form",
    "willValidate",
    "validity",
    "validationMessage",
    "labels",
  ]) {
    Object.defineProperty(target, property, {
      get() {
        return this._internals[property] ?? null;
      },
    });
  }
}

export function isInteractionLocked(element) {
  return element.disabled || element.readOnly;
}

export function padNumber(value, size = 2) {
  return String(value).padStart(size, "0");
}

export function syncFormState(element, entries, valueMissing = false) {
  element.setAttribute("aria-disabled", String(element.disabled));
  element.toggleAttribute("aria-readonly", element.readOnly);

  const formValue = new FormData();
  let hasValue = false;
  for (const [name, value] of entries) {
    if (!name) continue;
    formValue.append(name, value ?? "");
    hasValue = true;
  }
  element._internals.setFormValue(hasValue ? formValue : null);
  if (valueMissing) {
    element._internals.setValidity(
      { valueMissing: true },
      "Please fill out this field",
      element
    );
  } else {
    element._internals.setValidity({});
  }
}

export function toValidDate(value) {
  if (value == null || value === "") return undefined;
  const resolved = value instanceof Date ? value : new Date(value);
  return Number.isNaN(resolved.getTime()) ? undefined : resolved;
}

export function zoneOptions(timezone) {
  return timezone ? { timeZone: timezone } : {};
}

export function intlParts(date, locale, options) {
  const parts = {};
  for (const { type, value } of new Intl.DateTimeFormat(
    locale,
    options
  ).formatToParts(date)) {
    if (type !== "literal") parts[type] = value;
  }
  return parts;
}

export function civilDate(date, timezone) {
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

export function dateFromCivil({
  yearNumber,
  monthsNumber,
  daysNumber,
  timezone,
} = {}) {
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

export function formatFormDate(date, timezone) {
  if (!date) return "";
  const { yearNumber, monthsNumber, daysNumber } = civilDate(date, timezone);
  return `${padNumber(yearNumber, 4)}-${padNumber(monthsNumber)}-${padNumber(
    daysNumber
  )}`;
}

export function dateKey(date, { locale, timezone } = {}) {
  return (toValidDate(date) ?? new Date()).toLocaleDateString(
    locale ?? "en-US",
    zoneOptions(timezone)
  );
}

export function withTime(date, time) {
  const next = new Date(date);
  next.setHours(
    time.getHours(),
    time.getMinutes(),
    time.getSeconds(),
    time.getMilliseconds()
  );
  return next;
}

export function monthInfo(date, { locale, timezone } = {}) {
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

export function formatFormTime(date) {
  const resolved = toValidDate(date);
  if (!resolved) return "";
  return `${padNumber(resolved.getHours())}:${padNumber(
    resolved.getMinutes()
  )}:${padNumber(resolved.getSeconds())}`;
}

export function parseFormTime(date, value) {
  const match = String(value ?? "").match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return toValidDate(value);
  const next = new Date(toValidDate(date) ?? new Date());
  next.setHours(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), 0);
  return next;
}
