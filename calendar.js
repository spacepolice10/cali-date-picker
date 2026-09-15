const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const YEAR_LIST_LENGTH = 10;
const YEAR_LIST_OFFSET = 5;

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
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function monthLabel(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
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
 * @attr {boolean} [with-confirmation] Stages the pick; `value`/`change` wait for Confirm.
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
    "with-confirmation",
  ];

  #internals;
  #currentView = "days";
  #monthsView;
  #yearView;
  #yearListStart;
  #wrap;
  #switcher;
  #confirmation;
  #preview;
  #actions = {
    selectDate: (el) => this.#selectDate(el.dataset.date),
    confirmDate: () => this.#confirmDate(),
    switchMonthsView: (el) => this.#switchMonthsView(Number(el.dataset.month)),
    switchYearView: (el) => this.#switchYearView(Number(el.dataset.year)),
    switchView: (el) => this.#switchView(el.dataset.view),
    switchPeriod: (el) => this.#switchPeriod(Number(el.dataset.direction)),
  };
  #calendars = {
    days: () => this.#renderDaysCalendar(),
    months: () => this.#renderMonthsCalendar(),
    year: () => this.#renderYearCalendar(),
  };

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
    this.#yearView = Number(value);
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
    this.#monthsView = Number(value);
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
  get minval() {
    const date = toDate(this.getAttribute("minval"));
    return date ? toDateString(date) : "";
  }
  /**
   * Earliest selectable date. Day buttons before it are disabled; views stay navigable.
   * Predetermined — read on render, not observed.
   * @type {IsoDate}
   */
  set minval(value) {
    if (value) this.setAttribute("minval", value);
    else this.removeAttribute("minval");
    if (this.#preview && this.#isDisabled(this.#preview)) {
      this.#preview = undefined;
    }
    if (this.isConnected) this.#renderView();
  }
  get maxval() {
    const date = toDate(this.getAttribute("maxval"));
    return date ? toDateString(date) : "";
  }
  /**
   * Latest selectable date. Day buttons after it are disabled; views stay navigable.
   * Predetermined — read on render, not observed.
   * @type {IsoDate}
   */
  set maxval(value) {
    if (value) this.setAttribute("maxval", value);
    else this.removeAttribute("maxval");
    if (this.#preview && this.#isDisabled(this.#preview)) {
      this.#preview = undefined;
    }
    if (this.isConnected) this.#renderView();
  }
  get #weekStartsOn() {
    return this.getAttribute("week-starts-on") === "mo" ? "mo" : "su";
  }
  get #withOffset() {
    return this.hasAttribute("with-offset");
  }
  get #withWeekdays() {
    return this.hasAttribute("with-weekdays");
  }
  get #withSwitcher() {
    return this.hasAttribute("with-switcher");
  }
  get #withConfirmation() {
    return this.hasAttribute("with-confirmation");
  }

  #isDisabled(iso) {
    if (!iso) return false;
    const min = this.minval;
    const max = this.maxval;
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }

  #catchClick(event) {
    const el = event.target.closest?.("[data-action]");
    this.#actions[el?.dataset.action]?.(el);
  }

  #selectDate(date) {
    if (this.#isDisabled(date)) return;
    if (this.#withConfirmation) {
      this.#preview = date;
      this.#renderView();
      return;
    }

    this.#commitDate(date);
  }

  #confirmDate() {
    if (!this.#preview || this.#preview === this.value) return;
    if (this.#isDisabled(this.#preview)) return;
    this.#commitDate(this.#preview);
  }

  #commitDate(date) {
    if (this.#isDisabled(date)) return;
    const allowed = this.dispatchEvent(
      new CustomEvent("beforechange", {
        bubbles: true,
        cancelable: true,
        detail: { date },
      })
    );
    if (!allowed) return;

    this.value = date;
    this.#emitChange();
  }

  #switchMonthsView(month) {
    this.#currentView = "days";
    this.#monthsView = month;
    this.#renderView();
  }

  #switchYearView(year) {
    this.#currentView = "days";
    this.#yearView = year;
    this.#snapYearList();
    this.#renderView();
  }

  #switchView(next) {
    this.#currentView = next === this.#currentView ? "days" : next;
    if (this.#currentView === "year") this.#snapYearList();
    this.#renderView();
  }

  #switchPeriod(direction) {
    if (this.#currentView === "year") {
      this.#scrollYearList(direction);
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

  #scrollYearList(direction) {
    this.#yearListStart ??= this.#yearView - YEAR_LIST_OFFSET;
    this.#yearListStart += direction * YEAR_LIST_LENGTH;
  }

  #snapYearList() {
    this.#yearListStart = this.#yearView - YEAR_LIST_OFFSET;
  }

  #emitChange() {
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        detail: { date: this.value },
      })
    );
  }

  #viewDate() {
    return new Date(this.#yearView, this.#monthsView - 1, 1);
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
      Number(this.getAttribute("year-view")) || currentDate.getFullYear();
    this.#monthsView =
      Number(this.getAttribute("months-view")) || currentDate.getMonth() + 1;
  }

  #applyValue(raw) {
    const date = toDate(raw);
    if (!date) {
      this.#preview = undefined;
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

    this.#preview = normalized;
    this.#yearView = date.getFullYear();
    this.#monthsView = date.getMonth() + 1;
    this.#internals.setFormValue(normalized);
  }

  #fragment(html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content;
  }

  #renderView() {
    this.dataset.view = this.#currentView;
    this.#renderSwitcher();
    this.#renderCalendarWrap();
    this.#renderConfirmation();
  }

  #renderSwitcher() {
    if (!this.#withSwitcher) {
      this.#switcher?.remove();
      this.#switcher = undefined;
      return;
    }

    if (!this.#switcher) {
      this.#switcher = document.createElement("div");
      this.#switcher.part = "period-switcher";
      this.shadowRoot.prepend(this.#switcher);
    }

    const viewDate = this.#viewDate();
    const monthsOpen = this.#currentView === "months";
    const yearOpen = this.#currentView === "year";
    this.#switcher.innerHTML = `
      <button type="button" part="previous" data-action="switchPeriod" data-direction="-1" aria-label="Previous period">Previous</button>
      <button type="button" part="view-months${monthsOpen ? " selected-view" : ""}" data-action="switchView" data-view="months" aria-pressed="${monthsOpen}">${monthLabel(viewDate)}</button>
      <button type="button" part="view-year${yearOpen ? " selected-view" : ""}" data-action="switchView" data-view="year" aria-pressed="${yearOpen}">${this.#yearView}</button>
      <button type="button" part="next" data-action="switchPeriod" data-direction="1" aria-label="Next period">Next</button>
    `;
  }

  #renderConfirmation() {
    if (!this.#withConfirmation) {
      this.#confirmation?.remove();
      this.#confirmation = undefined;
      return;
    }

    if (!this.#confirmation) {
      this.#confirmation = document.createElement("div");
      this.#confirmation.part = "confirmation";
    }

    const preview = this.#preview || this.value;
    const confirmable = Boolean(
      this.#preview &&
        this.#preview !== this.value &&
        !this.#isDisabled(this.#preview)
    );
    this.#confirmation.innerHTML = `
      <span part="preview">${preview}</span>
      <button type="button" part="confirm" data-action="confirmDate" ${confirmable ? "" : "disabled"}>Confirm</button>
    `;
    if (this.#confirmation.parentNode !== this.shadowRoot) {
      this.shadowRoot.append(this.#confirmation);
    }
  }

  #renderCalendarWrap() {
    if (!this.#wrap) {
      this.#wrap = document.createElement("div");
      this.#wrap.part = "calendar";
    }
    this.#wrap.replaceChildren(this.#calendars[this.#currentView]());
    if (this.#wrap.parentNode !== this.shadowRoot) {
      this.shadowRoot.append(this.#wrap);
    }
  }

  #renderDaysCalendar() {
    const pieces = [];
    const startsWithMonday = this.#weekStartsOn === "mo";
    const viewDate = this.#viewDate();

    if (this.#withWeekdays) {
      const weekdays = startsWithMonday
        ? [...WEEKDAYS.slice(1), WEEKDAYS[0]]
        : WEEKDAYS;
      for (const weekdayName of weekdays) {
        pieces.push(`<span part="weekday">${weekdayName}</span>`);
      }
    }

    if (this.#withOffset) {
      const offsetNumber =
        (viewDate.getDay() - (startsWithMonday ? 1 : 0) + 7) % 7;
      for (let index = 0; index < offsetNumber; index += 1) {
        pieces.push('<span part="offset" aria-hidden="true"></span>');
      }
    }

    const currentDate = toDateString(new Date());
    const monthsDays = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() + 1,
      0
    ).getDate();

    for (let dayNumber = 1; dayNumber <= monthsDays; dayNumber += 1) {
      const date = toDateString(
        new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNumber)
      );
      const isSelected = date === (this.#preview || this.value);
      const isCurrent = date === currentDate;
      const isDisabled = this.#isDisabled(date);
      const parts = [
        "date-button",
        ...(isSelected ? ["selected-date-button"] : []),
        ...(isCurrent ? ["current-date-button"] : []),
        ...(isDisabled ? ["disabled-date-button"] : []),
      ].join(" ");
      pieces.push(`
        <button
          type="button"
          part="${parts}"
          aria-pressed="${isSelected}"
          aria-disabled="${isDisabled}"
          data-action="selectDate"
          data-date="${date}"
          ${isDisabled ? "disabled" : ""}
        >${dayNumber}</button>
      `);
    }

    return this.#fragment(pieces.join(""));
  }

  #renderMonthsCalendar() {
    return this.#fragment(
      Array.from({ length: 12 }, (_, index) => {
        const monthIndex = index + 1;
        const isSelected = monthIndex === this.#monthsView;
        const parts = [
          "months-button",
          ...(isSelected ? ["selected-months-button"] : []),
        ].join(" ");
        return `
          <button
            type="button"
            part="${parts}"
            aria-pressed="${isSelected}"
            data-action="switchMonthsView"
            data-month="${monthIndex}"
          >${monthLabel(new Date(this.#yearView, index, 1))}</button>
        `;
      }).join("")
    );
  }

  #renderYearCalendar() {
    this.#yearListStart ??= this.#yearView - YEAR_LIST_OFFSET;
    return this.#fragment(
      Array.from({ length: YEAR_LIST_LENGTH }, (_, offset) => {
        const year = this.#yearListStart + offset;
        const isSelected = year === this.#yearView;
        const parts = [
          "year-button",
          ...(isSelected ? ["selected-year-button"] : []),
        ].join(" ");
        return `
          <button
            type="button"
            part="${parts}"
            aria-pressed="${isSelected}"
            data-action="switchYearView"
            data-year="${year}"
          >${year}</button>
        `;
      }).join("")
    );
  }
}

customElements.define("cali-calendar", CaliCalendar);
