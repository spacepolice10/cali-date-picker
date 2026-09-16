const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDate(value) {
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

function toDateString(date) {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 101).slice(1),
    String(date.getDate() + 100).slice(1),
  ].join("-");
}

// Shared month formatter — allocated once, not per render.
const mf = new Intl.DateTimeFormat("en-US", { month: "long" });
function monthLabel(date) {
  return mf.format(date);
}

function butn(part, attrs, label) {
  return `<button type="button" part="${part}"${attrs}>${label}</button>`;
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
 * @fires CustomEvent<{date: IsoDate}> beforechange Cancelable, dispatched before `value` changes.
 * @fires CustomEvent<{date: IsoDate}> change Dispatched after `value` changes.
 */
export class CaliCalendar extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = [
    "value",
    "week-starts-on",
    "with-offset",
    "with-weekdays",
    "with-switcher",
  ];

  #internals;
  #currentView = "days";
  #monthsView;
  #yearView;
  #yearListStart;
  #wrap;
  #switcher;
  // Short single-letter shadow-DOM actions: s=select m=month y=year
  // v=view p=period. `data-a` + payload (`data-d/m/y/v/p`).
  #catchClick(event) {
    const el = event.target.closest?.("[data-a]");
    if (!el) return;
    const d = el.dataset;
    switch (d.a) {
      case "s":
        this.#commitDate(d.d);
        break;
      case "m":
        this.#switchFromMonths(+d.m);
        break;
      case "y":
        this.#switchFromYear(+d.y);
        break;
      case "v":
        this.#switchView(d.v);
        break;
      case "p":
        this.#switchPeriod(+d.p);
        break;
    }
  }

  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.addEventListener("click", (event) =>
      this.#catchClick(event)
    );
  }

  connectedCallback() {
    this.#ensureView();
    this.#renderView();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "value") this.#applyValue(newValue);
    if (this.isConnected) this.#renderView();
  }

  formResetCallback() {
    this.value = "";
  }

  get yearView() {
    return this.#yearView;
  }
  /**
   * Visible year. Driven after connect; initial value comes from `year-view` or `value`.
   * @type {number}
   */
  set yearView(value) {
    this.#yearView = +value;
    if (this.isConnected) this.#renderView();
  }
  get monthsView() {
    return this.#monthsView;
  }
  /**
   * Visible month (1-12). Driven after connect; initial value comes from `months-view` or `value`.
   * @type {number}
   */
  set monthsView(value) {
    this.#monthsView = +value;
    if (this.isConnected) this.#renderView();
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
  #limit(name) {
    const date = toDate(this.getAttribute(name));
    return date ? toDateString(date) : "";
  }
  #applyLimit(name, value) {
    if (value) this.setAttribute(name, value);
    else this.removeAttribute(name);
    if (this.isConnected) this.#renderView();
  }
  get minval() {
    return this.#limit("minval");
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
    return this.#limit("maxval");
  }
  /**
   * Latest selectable date. Day buttons after it are disabled; views stay navigable.
   * Predetermined — read on render, not observed.
   * @type {IsoDate}
   */
  set maxval(value) {
    this.#applyLimit("maxval", value);
  }
  get #weekStartsOn() {
    return this.getAttribute("week-starts-on") === "mo" ? "mo" : "su";
  }

  #isDisabled(iso) {
    const min = this.minval;
    const max = this.maxval;
    return !!(
      iso &&
      ((min && iso < min) || (max && iso > max))
    );
  }

  #emit(type, date, cancelable) {
    return this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        cancelable,
        detail: { date },
      })
    );
  }

  #commitDate(date) {
    if (this.#isDisabled(date)) return;
    if (!this.#emit("beforechange", date, true)) return;

    this.value = date;
    this.#emit("change", this.value);
  }

  #switchFromMonths(month) {
    this.#currentView = "days";
    this.#monthsView = month;
    this.#renderView();
  }

  #switchFromYear(year) {
    this.#currentView = "days";
    this.#yearView = year;
    this.#yearListStart = year - 5;
    this.#renderView();
  }

  #switchView(next) {
    this.#currentView = next === this.#currentView ? "days" : next;
    if (this.#currentView === "year")
      this.#yearListStart = this.#yearView - 5;
    this.#renderView();
  }

  #switchPeriod(direction) {
    if (this.#currentView === "year") {
      this.#yearListStart ??= this.#yearView - 5;
      this.#yearListStart += direction * 10;
      this.#renderView();
      return;
    }

    if (this.#currentView === "months") {
      this.#yearView += direction;
    } else {
      const date = new Date(
        this.#yearView,
        this.#monthsView - 1 + direction,
        1
      );
      this.#yearView = date.getFullYear();
      this.#monthsView = date.getMonth() + 1;
    }
    this.#renderView();
  }

  #ensureView() {
    if (this.#yearView && this.#monthsView) return;

    const fromValue = toDate(this.value);
    if (fromValue) {
      this.#yearView = fromValue.getFullYear();
      this.#monthsView = fromValue.getMonth() + 1;
      return;
    }

    const currentDate = new Date();
    this.#yearView =
      +this.getAttribute("year-view") || currentDate.getFullYear();
    this.#monthsView =
      +this.getAttribute("months-view") || currentDate.getMonth() + 1;
  }

  #applyValue(raw) {
    const date = toDate(raw);
    if (!date) {
      if (raw) {
        this.setAttribute("value", "");
        return;
      }
      this.#internals.setFormValue("");
      return;
    }

    const normalized = toDateString(date);
    if (raw !== normalized) {
      this.setAttribute("value", normalized);
      return;
    }

    this.#yearView = date.getFullYear();
    this.#monthsView = date.getMonth() + 1;
    this.#internals.setFormValue(normalized);
  }

  #renderView() {
    this.dataset.view = this.#currentView;
    this.#renderSwitcher();
    this.#renderCalendarWrap();
  }

  #renderSwitcher() {
    if (!this.hasAttribute("with-switcher")) {
      this.#switcher?.remove();
      this.#switcher = undefined;
      return;
    }

    if (!this.#switcher) {
      this.#switcher = document.createElement("div");
      this.#switcher.part = "period-switcher";
      this.shadowRoot.prepend(this.#switcher);
    }

    const viewDate = new Date(this.#yearView, this.#monthsView - 1, 1);
    const monthsOpen = this.#currentView === "months";
    const yearOpen = this.#currentView === "year";
    this.#switcher.innerHTML =
      butn(
        "previous",
        ` data-a="p" data-p="-1" aria-label="Previous period"`,
        "Previous"
      ) +
      butn(
        `view-months${monthsOpen ? " selected-view" : ""}`,
        ` data-a="v" data-v="months" aria-pressed="${monthsOpen}"`,
        monthLabel(viewDate)
      ) +
      butn(
        `view-year${yearOpen ? " selected-view" : ""}`,
        ` data-a="v" data-v="year" aria-pressed="${yearOpen}"`,
        this.#yearView
      ) +
      butn(
        "next",
        ` data-a="p" data-p="1" aria-label="Next period"`,
        "Next"
      );
  }

  #renderCalendarWrap() {
    if (!this.#wrap) {
      this.#wrap = document.createElement("div");
      this.#wrap.part = "calendar";
    }
    const view = this.#currentView;
    this.#wrap.innerHTML =
      view === "months"
        ? this.#renderMonthsCalendar()
        : view === "year"
          ? this.#renderYearCalendar()
          : this.#renderDaysCalendar();
    if (this.#wrap.parentNode !== this.shadowRoot) {
      this.shadowRoot.append(this.#wrap);
    }
  }

  #renderDaysCalendar() {
    const pieces = [];
    const startsWithMonday = this.#weekStartsOn === "mo";
    const viewDate = new Date(this.#yearView, this.#monthsView - 1, 1);

    if (this.hasAttribute("with-weekdays")) {
      const weekdays = startsWithMonday
        ? [...WEEKDAYS.slice(1), WEEKDAYS[0]]
        : WEEKDAYS;
      for (const weekdayName of weekdays) {
        pieces.push(`<span part="weekday">${weekdayName}</span>`);
      }
    }

    if (this.hasAttribute("with-offset")) {
      const offsetNumber =
        (viewDate.getDay() - (startsWithMonday ? 1 : 0) + 7) % 7;
      for (let index = 0; index < offsetNumber; index += 1) {
        pieces.push('<span part="offset" aria-hidden="true"></span>');
      }
    }

    const currentDate = toDateString(new Date());
    const y = viewDate.getFullYear();
    // Padded once: month is fixed for the whole grid, year too.
    const yp = String(y).padStart(4, "0");
    const mp = ("0" + (viewDate.getMonth() + 1)).slice(-2);
    const monthsDays = new Date(y, viewDate.getMonth() + 1, 0).getDate();

    for (let dayNumber = 1; dayNumber <= monthsDays; dayNumber += 1) {
      const date = `${yp}-${mp}-${("0" + dayNumber).slice(-2)}`;
      const isSelected = date === this.value;
      const isCurrent = date === currentDate;
      const isDisabled = this.#isDisabled(date);
      const parts = [
        "date-button",
        ...(isSelected ? ["selected-date-button"] : []),
        ...(isCurrent ? ["current-date-button"] : []),
        ...(isDisabled ? ["disabled-date-button"] : []),
      ].join(" ");
      pieces.push(
        butn(
          parts,
          ` aria-pressed="${isSelected}" aria-disabled="${isDisabled}" data-a="s" data-d="${date}"${isDisabled ? " disabled" : ""}`,
          dayNumber
        )
      );
    }

    return pieces.join("");
  }

  #renderMonthsCalendar() {
    return Array.from({ length: 12 }, (_, index) => {
        const monthIndex = index + 1;
        const isSelected = monthIndex === this.#monthsView;
        const parts = [
          "months-button",
          ...(isSelected ? ["selected-months-button"] : []),
        ].join(" ");
        return butn(
          parts,
          ` aria-pressed="${isSelected}" data-a="m" data-m="${monthIndex}"`,
          monthLabel(new Date(this.#yearView, index, 1))
        );
      }).join("");
  }

  #renderYearCalendar() {
    this.#yearListStart ??= this.#yearView - 5;
    return Array.from({ length: 10 }, (_, offset) => {
        const year = this.#yearListStart + offset;
        const isSelected = year === this.#yearView;
        const parts = [
          "year-button",
          ...(isSelected ? ["selected-year-button"] : []),
        ].join(" ");
        return butn(
          parts,
          ` aria-pressed="${isSelected}" data-a="y" data-y="${year}"`,
          year
        );
      }).join("");
  }
}

customElements.define("cali-calendar", CaliCalendar);
