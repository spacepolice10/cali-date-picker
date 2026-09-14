const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const YEAR_LIST_LENGTH = 10;
const YEAR_LIST_OFFSET = 5;

function toDate(value) {
  if (!value) return;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
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

function monthName(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
}

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

  get year() {
    return this.#yearView;
  }
  set year(value) {
    this.#yearView = Number(value);
    if (this.isConnected) this.#renderView();
  }
  get month() {
    return this.#monthsView;
  }
  set month(value) {
    this.#monthsView = Number(value);
    if (this.isConnected) this.#renderView();
  }
  get value() {
    return this.getAttribute("value") ?? "";
  }
  set value(value) {
    this.setAttribute("value", value);
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

  #catchClick(event) {
    const el = event.target.closest?.("[data-action]");
    this.#actions[el?.dataset.action]?.(el);
  }

  #selectDate(date) {
    if (this.#withConfirmation) {
      this.#preview = date;
      this.#renderView();
      return;
    }

    this.#commitDate(date);
  }

  #confirmDate() {
    if (!this.#preview || this.#preview === this.value) return;
    this.#commitDate(this.#preview);
  }

  #commitDate(date) {
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
      Number(this.getAttribute("year")) || currentDate.getFullYear();
    this.#monthsView =
      Number(this.getAttribute("month")) || currentDate.getMonth() + 1;
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
      <button type="button" part="view-months${monthsOpen ? " selected-view" : ""}" data-action="switchView" data-view="months" aria-pressed="${monthsOpen}">${monthName(viewDate)}</button>
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
    const confirmable = Boolean(this.#preview && this.#preview !== this.value);
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
      const parts = [
        "date-button",
        ...(isSelected ? ["selected-date-button"] : []),
        ...(isCurrent ? ["current-date-button"] : []),
      ].join(" ");
      pieces.push(`
        <button
          type="button"
          part="${parts}"
          aria-pressed="${isSelected}"
          data-action="selectDate"
          data-date="${date}"
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
          >${monthName(new Date(this.#yearView, index, 1))}</button>
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
