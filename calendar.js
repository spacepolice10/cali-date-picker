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

function pair(v) {
  if (!v) return ["", ""];
  const i = v.indexOf("/");
  if (i < 0) {
    const a = toDt(v);
    return a ? [toStrn(a), ""] : ["", ""];
  }
  const a = toDt(v.slice(0, i));
  const b = toDt(v.slice(i + 1));
  if (!a || !b) return ["", ""];
  let s = toStrn(a);
  let e = toStrn(b);
  if (s > e) [s, e] = [e, s];
  return [s, e];
}

// Shared month formatter — allocated once, not per render.
const mf = new Intl.DateTimeFormat("en-US", { month: "long" });
const mfName = mf.format.bind(mf);

function butn(part, attr, name) {
  return `<button type="button" part="${part}"${attr}>${name}</button>`;
}

// Part list for one day button. `s`/`e` are the two range ends in any
// order; with `preview` set, `e` is the hover/focus endpoint still being
// picked, so it paints `preselected` instead of `selected`.
function daysPart(d, s, e, preview, today, disabled) {
  const [lo, hi] = s && e && s > e ? [e, s] : [s, e];
  return (
    "date" +
    (d === s || (!preview && d === e) ? " selected" : "") +
    (preview && d === e && d !== s ? " preselected" : "") +
    (lo && hi && d > lo && d < hi ? " in-ranges" : "") +
    (d === today ? " current" : "") +
    (disabled ? " disabled" : "")
  );
}

/**
 * @typedef {string} IsoDate ISO date `YYYY-MM-DD`. Empty string clears the property.
 */

/**
 * `<cali-calendar>` — one or more months; optional two-date range.
 *
 * @element cali-calendar
 * @attr {string} [value=""] Selected date `YYYY-MM-DD`, or `YYYY-MM-DD/YYYY-MM-DD` when `with-range`.
 * @attr {IsoDate} [minval=""] Earliest selectable date. Earlier day buttons render disabled.
 * @attr {IsoDate} [maxval=""] Latest selectable date. Later day buttons render disabled.
 * @attr {string} [week-starts-on="su"] `"mo"` starts the week on Monday, anything else is Sunday.
 * @attr {boolean} [with-offset] Adds empty leading cells so the 1st lines up with its weekday.
 * @attr {boolean} [with-weekdays] Shows weekday labels in the first row.
 * @attr {boolean} [with-switcher] Shows prev/next plus month and year view switching.
 * @attr {boolean} [with-range] Two-date picking. `value` becomes `start/end`.
 * @attr {number} [months="1"] Visible month panes (1–12). After connect, changing it re-renders.
 * @attr {number} [year-view] Initial visible year when there is no `value`. After connect use `.yearView`.
 * @attr {number} [months-view] Initial visible month (1-12) when there is no `value`. After connect use `.monthsView`.
 * @attr {string} [name] Form-associated name. Submits the ISO date or `start/end`; form reset clears `value`.
 * @attr {boolean} [required] Form validation: empty `value` (or incomplete range) fails with `valueMissing`.
 * @fires CustomEvent<{date: string, starts: IsoDate, ends: IsoDate}> beforechange Cancelable, dispatched before `value` changes.
 * @fires CustomEvent<{date: string, starts: IsoDate, ends: IsoDate}> change Dispatched after `value` changes.
 * @csspart switcher Period prev/next + month and year toggles.
 * @csspart prev Previous period.
 * @csspart next Next period.
 * @csspart months Month-view toggle. Also `selected` while open.
 * @csspart years Year-view toggle. Also `selected` while open.
 * @csspart calendar Wrapper for day panes, or the months/year overlay grid.
 * @csspart pane One month grid.
 * @csspart caption Month name, when more than one pane is shown.
 * @csspart weekday Weekday label.
 * @csspart offset Leading empty cell.
 * @csspart date Day button. May also be `current`, `selected`, `disabled`, `in-ranges`, `preselected`.
 * @csspart mn-butn Month-grid button. May also be `selected`.
 * @csspart yr-butn Year-grid button. May also be `selected`.
 * @csspart selected Selected date, month, year, or open view toggle.
 * @csspart current Today.
 * @csspart disabled Out-of-range day.
 * @csspart in-ranges Day strictly between the two range ends.
 * @csspart preselected Hover/focus endpoint while picking the second date.
 */
export class CaliCalendar extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = [
    "value",
    "week-starts-on",
    "with-offset",
    "with-weekdays",
    "with-switcher",
    "with-range",
    "months",
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
  #a;
  #hov;
  // Short single-letter shadow-DOM actions: s=select m=month y=year
  // v=view p=period. `data-a` + payload (`data-d/m/y/v/p`).
  #push(event) {
    const d = event.target.closest("[data-a]")?.dataset;
    if (!d) return;
    switch (d.a) {
      case "s":
        this.#choose(d.d);
        break;
      case "m":
        this.#fromMo(+d.m);
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

  // The event's action element, only when it lives inside the grid.
  #hits(e, s = "[data-a]") {
    const el = e.target.closest(s);
    return el && this.#grid?.contains(el) ? el : null;
  }

  // Roving tabindex: one tab stop per grid. Tab / Shift+Tab leave
  // naturally; arrows move inside. Never preventDefault Tab.
  #seen(event) {
    const el = this.#hits(event);
    if (!el) return;
    if (el.dataset.a === "s") {
      this.#fdate = el.dataset.d;
      if (this.#a) {
        this.#hov = el.dataset.d;
        this.#paint();
      }
    }
    this.#tabs(el);
  }

  #keys(event) {
    if (event.key === "Tab") return;
    const el = this.#hits(event);
    if (!el) return;
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

  #prim(dateList, min, max) {
    const inMo = (iso) =>
      iso && dateList.includes(iso) && !this.#off(iso, min, max);
    if (inMo(this.#fdate)) return this.#fdate;
    const starts = pair(this.value)[0];
    if (inMo(starts)) return starts;
    const current = toStrn(new Date());
    if (inMo(current)) return current;
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
    this.shadowRoot.addEventListener("pointerover", (event) =>
      this.#over(event)
    );
    this.shadowRoot.addEventListener("pointerout", (event) =>
      this.#out(event)
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
    const [s, e] = pair(v);
    const missing =
      this.hasAttribute("required") &&
      (this.hasAttribute("with-range") ? !s || !e : !v);
    // `pair` sorts, so only the start can underflow and only the end
    // (or the lone start) can overflow.
    const lo = this.minval;
    const hi = this.maxval;
    const under = !!(lo && s && s < lo);
    const over = !!(hi && s && (e || s) > hi);
    this.#internals.setValidity(
      missing
        ? { valueMissing: true }
        : under || over
          ? { rangeUnderflow: under, rangeOverflow: over }
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

  get #n() {
    const n = Math.trunc(+this.getAttribute("months"));
    return n > 12 ? 12 : n > 1 ? n : 1;
  }

  #fire(type, date, cancelable) {
    const [starts, ends] = pair(date);
    return this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        cancelable,
        detail: {
          date,
          starts,
          ends: this.hasAttribute("with-range") ? ends : starts,
        },
      })
    );
  }

  #choose(date) {
    if (this.#off(date)) return;
    const range = this.hasAttribute("with-range");
    const prevA = this.#a;
    const next =
      range && prevA
        ? prevA < date
          ? `${prevA}/${date}`
          : `${date}/${prevA}`
        : date;
    if (!this.#fire("beforechange", next, true)) return;
    if (range) {
      this.#a = prevA ? "" : date;
      this.#hov = "";
    }
    this.value = next;
    this.#fire("change", this.value);
  }

  #over(event) {
    if (!this.#a) return;
    const el = this.#hits(event, '[data-a="s"]');
    if (!el || el.disabled || this.#hov === el.dataset.d) return;
    this.#hov = el.dataset.d;
    this.#paint();
  }

  #out(event) {
    if (!this.#a || !this.#hov) return;
    if (this.#grid?.contains(event.relatedTarget)) return;
    this.#hov = "";
    this.#paint();
  }

  // Repaint day parts in place for the range preview (no re-render, so
  // focus survives). While anchored, the hovered day previews as the end.
  #paint() {
    const [vs, ve] = pair(this.value);
    const s = this.#a || vs;
    const e = this.#a ? this.#hov : ve;
    const today = toStrn(new Date());
    for (const btn of this.#grid.querySelectorAll('[data-a="s"]')) {
      btn.setAttribute(
        "part",
        daysPart(btn.dataset.d, s, e, !!this.#a, today, btn.disabled)
      );
    }
  }

  #fromMo(m) {
    this.#view = "days";
    this.#Mo = m;
    this.#show();
  }

  #fromYr(y) {
    this.#view = "days";
    this.#yr = y;
    this.#show();
  }

  #goto(next) {
    this.#view = next === this.#view ? "days" : next;
    // Only entry into the year view, so #y0 is always set while it is open.
    if (this.#view === "year") this.#y0 = this.#yr - 5;
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
    if (this.#view === "year") this.#y0 += direction * 10;
    else if (this.#view === "months") this.#yr += direction;
    else this.#at(new Date(this.#yr, this.#Mo - 1 + direction * this.#n, 1));
    this.#show();
  }

  // Point the visible period at `date`'s month.
  #at(date) {
    this.#yr = date.getFullYear();
    this.#Mo = date.getMonth() + 1;
  }

  #ready() {
    if (this.#yr && this.#Mo) return;
    const start = toDt(pair(this.value)[0]);
    if (start) return this.#at(start);
    const now = new Date();
    this.#yr = +this.getAttribute("year-view") || now.getFullYear();
    this.#Mo = +this.getAttribute("months-view") || now.getMonth() + 1;
  }

  #applyValue(rw) {
    if (!rw) {
      this.#a = "";
      this.#hov = "";
      this.#internals.setFormValue("");
      return;
    }

    const [s, e] = pair(rw);
    if (!s) {
      this.setAttribute("value", "");
      return;
    }

    const normalized = e ? `${s}/${e}` : s;
    if (rw !== normalized) {
      this.setAttribute("value", normalized);
      return;
    }

    // Open on the start month only when it is not already on screen, so
    // picking in a later pane does not yank the window.
    const date = toDt(s);
    const lo = this.#yr && new Date(this.#yr, this.#Mo - 1, 1);
    const hi = this.#yr && new Date(this.#yr, this.#Mo - 1 + this.#n, 1);
    if (!lo || date < lo || date >= hi) this.#at(date);
    this.#a = this.hasAttribute("with-range") && !e ? s : "";
    this.#hov = "";
    this.#internals.setFormValue(normalized);
  }

  #show() {
    // Re-rendering replaces innerHTML, destroying the focused button.
    // Rebuild a selector from its dataset (e.g. [data-a="s"][data-d="…"])
    // — action payloads are unique across switcher and grid — and refocus
    // the fresh copy; otherwise (view changed, button now disabled) fall
    // back to the grid's roving stop.
    const prev = this.shadowRoot.activeElement;
    const sel = prev
      ? Object.entries(prev.dataset)
        .map(([k, v]) => `[data-${k}="${v}"]`)
        .join("")
      : "";
    this.dataset.view = this.#view;
    this.#showNavi();
    this.#showGrid();
    if (!sel) return;
    const butn = this.shadowRoot.querySelector(sel);
    if (butn && !butn.disabled) butn.focus();
    else this.#grid.querySelector('[tabindex="0"]')?.focus();
  }

  #showNavi() {
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
      // #showNavi prepends the switcher, so appending once keeps order.
      this.#grid = document.createElement("div");
      this.#grid.part = "calendar";
      this.shadowRoot.append(this.#grid);
    }
    const view = this.#view;
    this.#grid.innerHTML =
      view === "months"
        ? this.#showMo()
        : view === "year"
          ? this.#showYr()
          : this.#showDays();
  }

  #showDays() {
    const n = this.#n;
    const min = this.minval;
    const max = this.maxval;
    const today = toStrn(new Date());
    const [s, e] = pair(this.value);
    const months = [];
    const dateList = [];
    for (let i = 0; i < n; i++) {
      const viewDate = new Date(this.#yr, this.#Mo - 1 + i, 1);
      // "YYYY-MM-" prefix; day 0 of the next month is this month's length.
      const ym = toStrn(viewDate).slice(0, -2);
      const last = new Date(
        viewDate.getFullYear(),
        viewDate.getMonth() + 1,
        0
      ).getDate();
      const list = Array.from(
        { length: last },
        (_, j) => ym + String(j + 101).slice(1)
      );
      dateList.push(...list);
      months.push({ viewDate, list });
    }
    const active = this.#prim(dateList, min, max);
    return months
      .map((m) => this.#pane(m, n > 1, today, min, max, s, e, active))
      .join("");
  }

  #pane({ viewDate, list }, named, today, min, max, s, e, active) {
    const pieces = ['<div part="pane">'];
    if (named) pieces.push(`<div part="caption">${mfName(viewDate)}</div>`);
    const mo = this.getAttribute("week-starts-on") === "mo";
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
    for (const date of list) {
      const on = date === s || date === e;
      const dis = this.#off(date, min, max);
      pieces.push(
        butn(
          daysPart(date, s, e, false, today, dis),
          ` tabindex="${date === active && !dis ? 0 : -1}" aria-pressed="${on}" data-a="s" data-d="${date}"${dis ? " disabled" : ""}`,
          +date.slice(-2)
        )
      );
    }
    pieces.push("</div>");
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
