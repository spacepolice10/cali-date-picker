const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toDt(value) {
  if (!value) return;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  )
    return;
  return date;
}

function toStrn(date) {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 101).slice(1),
    String(date.getDate() + 100).slice(1),
  ].join("-");
}

// Shared month formatter — allocated once, not per render.
const mf = new Intl.DateTimeFormat("en-US", { month: "long" });
function mfName(date) {
  return mf.format(date);
}

function butn(part, attr, name) {
  return `<button type="button" part="${part}"${attr}>${name}</button>`;
}

/**
 * @typedef {string} IsoDate ISO date `YYYY-MM-DD`. Empty string clears the property.
 */

/**
 * `<cali-calendar>` — one month at a time.
 *
 * @element cali-calendar
 * @attr {IsoDate} [value=""] Selected date. Paints the selected button, sets the form value.
 * @attr {IsoDate} [minval=""] Earliest selectable date. Earlier day buttons render disabled.
 * @attr {IsoDate} [maxval=""] Latest selectable date. Later day buttons render disabled.
 * @attr {string} [week-starts-on="su"] `"mo"` starts the week on Monday, anything else is Sunday.
 * @attr {boolean} [with-offset] Adds empty leading cells so the 1st lines up with its weekday.
 * @attr {boolean} [with-weekdays] Shows weekday labels in the first row.
 * @attr {boolean} [with-switcher] Shows prev/next plus month and year view switching.
 * @attr {number} [year-view] Initial visible year when there is no `value`. After connect use `.yearView`.
 * @attr {number} [months-view] Initial visible month (1-12) when there is no `value`. After connect use `.monthsView`.
 * @attr {string} [name] Form-associated name. Submits the ISO date; form reset clears `value`.
 * @attr {boolean} [required] Form validation: empty `value` fails with `valueMissing`.
 * @fires CustomEvent<{date: IsoDate}> beforechange Cancelable, dispatched before `value` changes.
 * @fires CustomEvent<{date: IsoDate}> change Dispatched after `value` changes.
 * @csspart switcher Period prev/next + month/year toggles.
 * @csspart prev Previous period.
 * @csspart next Next period.
 * @csspart months Month-view toggle. Also `selected` while open.
 * @csspart years Year-view toggle. Also `selected` while open.
 * @csspart calendar Day/month/year grid.
 * @csspart weekday Weekday label.
 * @csspart offset Leading empty cell.
 * @csspart date Day button. May also be `current`, `selected`, `disabled`.
 * @csspart mn-butn Month-grid button. May also be `selected`.
 * @csspart yr-butn Year-grid button. May also be `selected`.
 * @csspart selected Selected date, month, year, or open view toggle.
 * @csspart current Today.
 * @csspart disabled Out-of-range day.
 */
export class CaliCalendar extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = [
    "value",
    "week-starts-on",
    "with-offset",
    "with-weekdays",
    "with-switcher",
    "required",
  ];

  #internals;
  #view = "days";
  #Mo;
  #yr;
  #y0;
  #grid;
  #navi;
  #fdate;
  // Short single-letter shadow-DOM actions: s=select m=month y=year
  // v=view p=period. `data-a` + payload (`data-d/m/y/v/p`).
  #push(event) {
    const el = event.target.closest?.("[data-a]");
    if (!el) return;
    const d = el.dataset;
    switch (d.a) {
      case "s":
        this.#choose(d.d);
        break;
      case "m":
        this.#fromMon(+d.m);
        break;
      case "y":
        this.#fromYr(+d.y);
        break;
      case "v":
        this.#goto(d.v);
        break;
      case "p":
        this.#step(+d.p);
        break;
    }
  }

  // Roving tabindex: one tab stop per grid. Tab / Shift+Tab leave
  // naturally; arrows move inside. Never preventDefault Tab.
  #seen(event) {
    const el = event.target.closest?.("[data-a]");
    if (!el || !this.#grid?.contains(el)) return;
    if (el.dataset.a === "s") this.#fdate = el.dataset.d;
    this.#tabs(el);
  }

  #keys(event) {
    if (event.key === "Tab") return;
    const el = event.target.closest?.("[data-a]");
    if (!el || !this.#grid?.contains(el)) return;
    // Every grid is one ordered button list (offsets/weekdays are spans),
    // so arrows are index math: ±1 sideways, ±rw vertically, clamped.
    // Period changes belong to Prev/Next, never to arrows.
    const rw = this.#view === "months" ? 3 : this.#view === "year" ? 5 : 7;
    const buttons = [...this.#grid.querySelectorAll("button")];
    const at = buttons.indexOf(el);
    if (at < 0) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -rw, ArrowDown: rw }[event.key];
    let to;
    let walk;
    if (event.key === "Home") {
      to = 0;
      walk = 1;
    } else if (event.key === "End") {
      to = buttons.length - 1;
      walk = -1;
    } else if (step) {
      to = at + step;
      walk = Math.sign(step);
    } else {
      return;
    }
    event.preventDefault();
    while (to >= 0 && to < buttons.length && buttons[to].disabled) to += walk;
    if (to < 0 || to >= buttons.length || buttons[to] === el) return;
    if (buttons[to].dataset.a === "s") this.#fdate = buttons[to].dataset.d;
    this.#tabs(buttons[to]);
    buttons[to].focus();
  }

  #tabs(active) {
    for (const butn of this.#grid.querySelectorAll("[data-a]")) {
      if (butn.disabled) {
        butn.tabIndex = -1;
        continue;
      }
      butn.tabIndex = butn === active ? 0 : -1;
    }
  }

  #prime(dateList, min, max) {
    const inMonth = (iso) =>
      iso && dateList.includes(iso) && !this.#off(iso, min, max);
    if (inMonth(this.#fdate)) return this.#fdate;
    if (inMonth(this.value)) return this.value;
    const today = toStrn(new Date());
    if (inMonth(today)) return today;
    return dateList.find((iso) => !this.#off(iso, min, max)) ?? dateList[0];
  }

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.addEventListener("click", (event) =>
      this.#push(event)
    );
    this.shadowRoot.addEventListener("focusin", (event) =>
      this.#seen(event)
    );
    this.shadowRoot.addEventListener("keydown", (event) =>
      this.#keys(event)
    );
  }

  connectedCallback() {
    this.#ready();
    this.#valid();
    this.#show();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "value") this.#applyValue(newValue);
    if (this.isConnected) {
      // Upgrade path: attributes can change before connectedCallback
      // ran #ready, leaving #yr/#Mo undefined and
      // mfName(new Date(undefined, NaN, 1)) throwing RangeError.
      this.#ready();
      this.#valid();
      // required only affects validity, not the painted grid.
      if (name !== "required") this.#show();
    }
  }

  formResetCallback() {
    this.value = "";
  }

  get yearView() {
    return this.#yr;
  }
  /**
   * Visible year. Driven after connect; initial value comes from `year-view` or `value`.
   * @type {number}
   */
  set yearView(value) {
    this.#yr = +value;
    if (this.isConnected) this.#show();
  }
  get monthsView() {
    return this.#Mo;
  }
  /**
   * Visible month (1-12). Driven after connect; initial value comes from `months-view` or `value`.
   * @type {number}
   */
  set monthsView(value) {
    this.#Mo = +value;
    if (this.isConnected) this.#show();
  }
  get value() {
    return this.getAttribute("value") ?? "";
  }
  /**
   * Selected date. Empty string clears the selection.
   * @type {IsoDate}
   */
  set value(value) {
    this.setAttribute("value", value);
  }
  #lim(name) {
    const date = toDt(this.getAttribute(name));
    return date ? toStrn(date) : "";
  }
  #applyLimit(name, value) {
    if (value) this.setAttribute(name, value);
    else this.removeAttribute(name);
    if (this.isConnected) {
      this.#valid();
      this.#show();
    }
  }
  // Native form validity from current state: required needs a value,
  // minval/maxval bound it. No message — the browser supplies defaults.
  #valid() {
    const v = this.value;
    this.#internals.setValidity(
      !v && this.hasAttribute("required")
        ? { valueMissing: true }
        : v && this.#off(v)
          ? { rangeUnderflow: v < this.minval, rangeOverflow: v > this.maxval }
          : {}
    );
  }
  get minval() {
    return this.#lim("minval");
  }
  /**
   * Earliest selectable date. Day buttons before it are disabled; views stay navigable.
   * Predetermined — read on render, not observed.
   * @type {IsoDate}
   */
  set minval(value) {
    this.#applyLimit("minval", value);
  }
  get maxval() {
    return this.#lim("maxval");
  }
  /**
   * Latest selectable date. Day buttons after it are disabled; views stay navigable.
   * Predetermined — read on render, not observed.
   * @type {IsoDate}
   */
  set maxval(value) {
    this.#applyLimit("maxval", value);
  }

  #off(iso, min, max) {
    min ??= this.minval;
    max ??= this.maxval;
    return !!(iso && ((min && iso < min) || (max && iso > max)));
  }

  #fire(type, date, cancelable) {
    return this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        cancelable,
        detail: { date },
      })
    );
  }

  #choose(date) {
    if (this.#off(date)) return;
    if (!this.#fire("beforechange", date, true)) return;

    this.value = date;
    this.#fire("change", this.value);
  }

  #fromMon(month) {
    this.#view = "days";
    this.#Mo = month;
    this.#show();
  }

  #fromYr(year) {
    this.#view = "days";
    this.#yr = year;
    this.#y0 = year - 5;
    this.#show();
  }

  #goto(next) {
    this.#view = next === this.#view ? "days" : next;
    if (this.#view === "year")
      this.#y0 = this.#yr - 5;
    this.#show();
    // Move focus into the newly shown grid so arrows work immediately.
    // Fresh HTML already carries the right tabindex, so plain focus().
    const sel = {
      months: `[data-m="${this.#Mo}"]`,
      year: `[data-y="${this.#yr}"]`,
      days: '[tabindex="0"]',
    }[this.#view];
    this.#grid.querySelector(sel)?.focus();
  }

  #step(direction) {
    if (this.#view === "year") {
      this.#y0 ??= this.#yr - 5;
      this.#y0 += direction * 10;
      this.#show();
      return;
    }

    if (this.#view === "months") {
      this.#yr += direction;
    } else {
      const date = new Date(
        this.#yr,
        this.#Mo - 1 + direction,
        1
      );
      this.#yr = date.getFullYear();
      this.#Mo = date.getMonth() + 1;
    }
    this.#show();
  }

  #ready() {
    if (this.#yr && this.#Mo) return;

    const fromValue = toDt(this.value);
    if (fromValue) {
      this.#yr = fromValue.getFullYear();
      this.#Mo = fromValue.getMonth() + 1;
      return;
    }

    const currentDate = new Date();
    this.#yr =
      +this.getAttribute("year-view") || currentDate.getFullYear();
    this.#Mo =
      +this.getAttribute("months-view") || currentDate.getMonth() + 1;
  }

  #applyValue(rw) {
    const date = toDt(rw);
    if (!date) {
      if (rw) {
        this.setAttribute("value", "");
        return;
      }
      this.#internals.setFormValue("");
      return;
    }

    const normalized = toStrn(date);
    if (rw !== normalized) {
      this.setAttribute("value", normalized);
      return;
    }

    this.#yr = date.getFullYear();
    this.#Mo = date.getMonth() + 1;
    this.#internals.setFormValue(normalized);
  }

  #show() {
    // Re-rendering replaces innerHTML, destroying the focused button.
    // Capture it first so keyboard focus survives a selection.
    const prevActive = this.shadowRoot.activeElement;
    const prevA = prevActive?.dataset?.a;
    // A selector matching the same button, e.g. [data-a="s"][data-d="…"].
    const prevSel = prevActive?.dataset
      ? ["a", "d", "m", "y", "v", "p"]
          .filter((k) => prevActive.dataset[k])
          .map((k) => `[data-${k}="${prevActive.dataset[k]}"]`)
          .join("")
      : "";
    const inWrap = !!prevActive && !!this.#grid?.contains(prevActive);
    const inSwitcher = !!prevActive && !!this.#navi?.contains(prevActive);
    this.dataset.view = this.#view;
    this.#showNav();
    this.#showGrid();
    if (!prevSel || (!inWrap && !inSwitcher)) return;
    const scope =
      prevA === "v" || prevA === "p" ? this.shadowRoot : this.#grid;
    const butn = scope.querySelector(prevSel);
    if (butn && !butn.disabled) {
      butn.focus();
      return;
    }
    // View changed (e.g. month picked -> days): focus the roving stop.
    if (inWrap) this.#grid.querySelector('[tabindex="0"]')?.focus();
  }

  #showNav() {
    if (!this.hasAttribute("with-switcher")) {
      this.#navi?.remove();
      this.#navi = undefined;
      return;
    }

    if (!this.#navi) {
      this.#navi = document.createElement("div");
      this.#navi.part = "switcher";
      this.shadowRoot.prepend(this.#navi);
    }

    const viewDate = new Date(this.#yr, this.#Mo - 1, 1);
    const monthsOpen = this.#view === "months";
    const yearOpen = this.#view === "year";
    this.#navi.innerHTML =
      butn(
        "prev",
        ` data-a="p" data-p="-1" aria-label="Previous period"`,
        "Prev"
      ) +
      butn(
        `months${monthsOpen ? " selected" : ""}`,
        ` data-a="v" data-v="months" aria-pressed="${monthsOpen}"`,
        mfName(viewDate)
      ) +
      butn(
        `years${yearOpen ? " selected" : ""}`,
        ` data-a="v" data-v="year" aria-pressed="${yearOpen}"`,
        this.#yr
      ) +
      butn(
        "next",
        ` data-a="p" data-p="1" aria-label="Next period"`,
        "Next"
      );
  }

  #showGrid() {
    if (!this.#grid) {
      this.#grid = document.createElement("div");
      this.#grid.part = "calendar";
    }
    const view = this.#view;
    this.#grid.innerHTML =
      view === "months"
        ? this.#showMo()
        : view === "year"
          ? this.#showYr()
          : this.#showDays();
    if (this.#grid.parentNode !== this.shadowRoot) {
      this.shadowRoot.append(this.#grid);
    }
  }

  #showDays() {
    const pieces = [];
    const mo = this.getAttribute("week-starts-on") === "mo";
    const viewDate = new Date(this.#yr, this.#Mo - 1, 1);

    if (this.hasAttribute("with-weekdays")) {
      for (let i = 0; i < 7; i++) {
        pieces.push(`<span part="weekday">${WEEKDAYS[(i + mo) % 7]}</span>`);
      }
    }

    if (this.hasAttribute("with-offset")) {
      pieces.push(
        '<span part="offset" aria-hidden="true"></span>'.repeat(
          (viewDate.getDay() - mo + 7) % 7
        )
      );
    }

    const currentDate = toStrn(new Date());
    const min = this.minval;
    const max = this.maxval;
    const y = viewDate.getFullYear();
    // Padded once: month is fixed for the whole grid, year too.
    const yp = String(y).padStart(4, "0");
    const mp = ("0" + (viewDate.getMonth() + 1)).slice(-2);
    const monthsDays = new Date(y, viewDate.getMonth() + 1, 0).getDate();

    const dateList = Array.from(
      { length: monthsDays },
      (_, i) => `${yp}-${mp}-${(`0${i + 1}`).slice(-2)}`
    );
    const active = this.#prime(dateList, min, max);

    for (const date of dateList) {
      const isSelected = date === this.value;
      const isCurrent = date === currentDate;
      const isDisabled = this.#off(date, min, max);
      const tb = date === active && !isDisabled ? 0 : -1;
      pieces.push(
        butn(
          `date${isSelected ? " selected" : ""}${isCurrent ? " current" : ""}${isDisabled ? " disabled" : ""}`,
          ` tabindex="${tb}" aria-pressed="${isSelected}" data-a="s" data-d="${date}"${isDisabled ? " disabled" : ""}`,
          +date.slice(-2)
        )
      );
    }

    return pieces.join("");
  }

  // One list renderer for the months (12) and year (10) panels.
  #renderList(count, selected, part, key, getVal, label) {
    return Array.from({ length: count }, (_, i) => {
      const v = getVal(i);
      const on = v === selected;
      return butn(
        `${part}${on ? " selected" : ""}`,
        ` tabindex="${on ? 0 : -1}" aria-pressed="${on}" data-a="${key}" data-${key}="${v}"`,
        label(v)
      );
    }).join("");
  }

  #showMo() {
    return this.#renderList(
      12,
      this.#Mo,
      "mn-butn",
      "m",
      (i) => i + 1,
      (v) => mfName(new Date(this.#yr, v - 1, 1))
    );
  }

  #showYr() {
    this.#y0 ??= this.#yr - 5;
    return this.#renderList(
      10,
      this.#yr,
      "yr-butn",
      "y",
      (i) => this.#y0 + i,
      (v) => v
    );
  }
}

customElements.define("cali-calendar", CaliCalendar);
