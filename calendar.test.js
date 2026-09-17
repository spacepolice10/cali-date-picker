import { describe, it, expect, afterEach } from "vitest";
import "./calendar.js";

const validitySeen = new WeakMap();
if (!Element.prototype.attachInternals) {
  Element.prototype.attachInternals = function () {
    const state = { value: "", flags: {} };
    validitySeen.set(this, state);
    return {
      setFormValue(v) {
        state.value = v;
      },
      setValidity(f) {
        state.flags = f ?? {};
      },
    };
  };
}

function validity(el) {
  return validitySeen.get(el)?.flags ?? {};
}

function mount(attrs = {}, parent = document.body) {
  const el = document.createElement("cali-calendar");
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  parent.appendChild(el);
  return el;
}

function days(el) {
  return [...el.shadowRoot.querySelectorAll('[data-a="s"]')];
}

function clickBtn(el, selector) {
  const btn = el.shadowRoot.querySelector(selector);
  expect(btn, selector).toBeTruthy();
  btn.click();
  return btn;
}

function isoToday() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

afterEach(() => {
  document.body.innerHTML = "";
});

// #bare — No attributes. Current month, day buttons only.
describe("demo: bare month", () => {
  it("renders current month with day buttons only", () => {
    const el = mount();
    const now = new Date();
    const expected = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    expect(days(el)).toHaveLength(expected);
    expect(
      el.shadowRoot.querySelectorAll('[part="weekday"]')
    ).toHaveLength(0);
    expect(
      el.shadowRoot.querySelectorAll('[part="offset"]')
    ).toHaveLength(0);
    expect(el.shadowRoot.querySelector('[part="period-switcher"]')).toBeNull();
    expect(el.shadowRoot.querySelector('[part="confirmation"]')).toBeNull();
  });
});

// #weekdays — Labels in the first row.
describe("demo: weekdays", () => {
  it("shows Sun-Sat labels in order", () => {
    const el = mount({
      "months-view": "12",
      "year-view": "2025",
      "with-weekdays": true,
    });
    const labels = [
      ...el.shadowRoot.querySelectorAll('[part="weekday"]'),
    ].map((n) => n.textContent);
    expect(labels).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    // Without offset, the 1st still starts in column one.
    expect(
      el.shadowRoot.querySelectorAll('[part="offset"]')
    ).toHaveLength(0);
  });
});

// #offset — Empty leading cells so the 1st lines up with its weekday.
describe("demo: offset cells", () => {
  it("lines up Sep 2026 (Tuesday) with 2 offsets", () => {
    const el = mount({
      "months-view": "9",
      "year-view": "2026",
      "with-weekdays": true,
      "with-offset": true,
    });
    expect(
      el.shadowRoot.querySelectorAll('[part="offset"]')
    ).toHaveLength(2);
  });
});

// #monday — Week starts on Monday.
describe("demo: monday first", () => {
  it("rotates weekday labels and shifts offset", () => {
    const su = mount({
      "months-view": "9",
      "year-view": "2026",
      "with-weekdays": true,
      "with-offset": true,
    });
    const mo = mount(
      {
        "months-view": "9",
        "year-view": "2026",
        "with-weekdays": true,
        "with-offset": true,
        "week-starts-on": "mo",
      },
      document.body
    );
    const moLabels = [
      ...mo.shadowRoot.querySelectorAll('[part="weekday"]'),
    ].map((n) => n.textContent);
    expect(moLabels[0]).toBe("Mon");
    expect(moLabels[6]).toBe("Sun");
    // Sep 1 2026 Tuesday: Sunday-start offset 2, Monday-start offset 1.
    expect(
      su.shadowRoot.querySelectorAll('[part="offset"]')
    ).toHaveLength(2);
    expect(
      mo.shadowRoot.querySelectorAll('[part="offset"]')
    ).toHaveLength(1);
  });

  it("treats any non-mo value as Sunday", () => {
    const el = mount({
      "months-view": "9",
      "year-view": "2026",
      "with-weekdays": true,
      "week-starts-on": "xx",
    });
    const labels = [
      ...el.shadowRoot.querySelectorAll('[part="weekday"]'),
    ].map((n) => n.textContent);
    expect(labels[0]).toBe("Sun");
  });
});

// #switcher — Prev/next + month/year view toggling.
describe("demo: period switcher", () => {
  it("renders switcher and toggles data-view with selected-view", () => {
    const el = mount({
      "months-view": "12",
      "year-view": "2025",
      "with-weekdays": true,
      "with-offset": true,
      "with-switcher": true,
    });
    expect(el.dataset.view).toBe("days");
    clickBtn(el, '[data-a="v"][data-v="months"]');
    expect(el.dataset.view).toBe("months");
    const viewBtn = el.shadowRoot.querySelector('[data-v="months"]');
    expect(viewBtn.getAttribute("part")).toContain("selected-view");
    // Toggling the open panel returns to days.
    viewBtn.click();
    expect(el.dataset.view).toBe("days");
  });

  it("month panel picks a month, year panel picks a year", () => {
    const el = mount({
      "months-view": "12",
      "year-view": "2025",
      "with-switcher": true,
    });
    clickBtn(el, '[data-a="v"][data-v="months"]');
    expect(
      el.shadowRoot.querySelectorAll('[data-a="m"]')
    ).toHaveLength(12);
    clickBtn(el, '[data-m="6"]');
    expect(el.monthsView).toBe(6);
    expect(el.dataset.view).toBe("days");

    clickBtn(el, '[data-a="v"][data-v="year"]');
    expect(
      el.shadowRoot.querySelectorAll('[data-a="y"]')
    ).toHaveLength(10);
    clickBtn(el, '[data-y="2027"]');
    expect(el.yearView).toBe(2027);
    expect(el.dataset.view).toBe("days");
  });

  it("prev/next move months, months-view moves years, year panel scrolls", () => {
    const el = mount({
      "months-view": "12",
      "year-view": "2025",
      "with-switcher": true,
    });
    clickBtn(el, '[data-a="p"][data-p="1"]');
    expect([el.yearView, el.monthsView]).toEqual([2026, 1]);
    clickBtn(el, '[data-a="p"][data-p="-1"]');
    expect([el.yearView, el.monthsView]).toEqual([2025, 12]);

    clickBtn(el, '[data-a="v"][data-v="months"]');
    clickBtn(el, '[data-a="p"][data-p="1"]');
    expect(el.yearView).toBe(2026);

    clickBtn(el, '[data-a="v"][data-v="year"]');
    const first = () =>
      el.shadowRoot.querySelector('[data-a="y"]').dataset.y;
    const before = first();
    clickBtn(el, '[data-a="p"][data-p="1"]');
    expect(Number(first()) - Number(before)).toBe(10);
  });
});

// Recipe: external confirm — veto in beforechange, commit from page JS.
describe("recipe: external confirm", () => {
  it("stages the pick outside, commits on external Confirm", () => {
    const el = mount({
      "months-view": "12",
      "year-view": "2025",
      "with-weekdays": true,
      "with-offset": true,
      "with-switcher": true,
    });
    let staged = "";
    el.addEventListener("beforechange", (event) => {
      event.preventDefault();
      staged = event.detail.date;
    });
    clickBtn(el, '[data-d="2025-12-24"]');
    expect(el.getAttribute("value") ?? "").toBe("");
    expect(staged).toBe("2025-12-24");
    el.value = staged; // external Confirm button
    expect(el.getAttribute("value")).toBe("2025-12-24");
  });

  it("ignores the removed with-confirmation attribute", () => {
    const el = mount({
      "months-view": "12",
      "year-view": "2025",
      "with-confirmation": true,
    });
    clickBtn(el, '[data-d="2025-12-24"]');
    expect(el.getAttribute("value")).toBe("2025-12-24");
    expect(el.shadowRoot.querySelector('[data-a="c"]')).toBeNull();
  });
});

// #selected — value paints selected, today keeps current marker.
describe("demo: selected vs today", () => {
  it("marks selected date and today independently", () => {
    const today = isoToday();
    const [y, m] = today.split("-").map(Number);
    const el = mount({
      value: today,
      "week-starts-on": "mo",
      "with-weekdays": true,
      "with-offset": true,
      "with-switcher": true,
    });
    expect(el.monthsView).toBe(m);
    expect(el.yearView).toBe(y);
    const selected = el.shadowRoot.querySelector(`[data-d="${today}"]`);
    expect(selected.getAttribute("part")).toContain("selected-date-button");
    expect(selected.getAttribute("part")).toContain("current-date-button");
  });

  it("keeps current marker when another date is selected", () => {
    const today = isoToday();
    const [y, m, d] = today.split("-").map(Number);
    const other = `${y}-${String(m).padStart(2, "0")}-${String(
      d === 1 ? 2 : 1
    ).padStart(2, "0")}`;
    const el = mount({
      "months-view": String(m),
      "year-view": String(y),
      value: other,
    });
    expect(
      el.shadowRoot.querySelector(`[data-d="${other}"]`).getAttribute("part")
    ).toContain("selected-date-button");
    expect(
      el.shadowRoot.querySelector(`[data-d="${today}"]`).getAttribute("part")
    ).toContain("current-date-button");
  });
});

// #range — minval/maxval gate day buttons only.
describe("demo: range", () => {
  it("disables outside days, keeps views navigable", () => {
    const el = mount({
      value: "2026-09-13",
      minval: "2026-09-10",
      maxval: "2026-09-20",
      "with-weekdays": true,
      "with-offset": true,
      "with-switcher": true,
    });
    expect(el.minval).toBe("2026-09-10");
    expect(el.maxval).toBe("2026-09-20");
    const early = el.shadowRoot.querySelector('[data-d="2026-09-09"]');
    const late = el.shadowRoot.querySelector('[data-d="2026-09-21"]');
    expect(early.disabled).toBe(true);
    expect(late.disabled).toBe(true);
    expect(early.getAttribute("part")).toContain("disabled-date-button");
    early.click();
    expect(el.getAttribute("value")).toBe("2026-09-13");
    // Views stay navigable despite the range.
    clickBtn(el, '[data-a="v"][data-v="months"]');
    expect(el.dataset.view).toBe("months");
  });
});

// #open — year-view/months-view set initial view without value.
describe("demo: open on a month", () => {
  it("opens on year-view/months-view", () => {
    const el = mount({
      "year-view": "2025",
      "months-view": "12",
      "with-weekdays": true,
      "with-offset": true,
      "with-switcher": true,
    });
    expect(el.yearView).toBe(2025);
    expect(el.monthsView).toBe(12);
    expect(days(el)).toHaveLength(31);
  });

  it("value wins over year-view/months-view", () => {
    const el = mount({
      value: "2026-09-13",
      "year-view": "2025",
      "months-view": "12",
    });
    expect(el.yearView).toBe(2026);
    expect(el.monthsView).toBe(9);
  });
});

// #form — Form-associated name; reset clears value.
describe("demo: form value", () => {
  it("resets value via formResetCallback", () => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    const el = mount(
      {
        name: "booking",
        "with-weekdays": true,
        "with-offset": true,
        value: "2026-09-13",
      },
      form
    );
    expect(el.getAttribute("name")).toBe("booking");
    el.formResetCallback();
    expect(el.getAttribute("value")).toBe("");
  });

  it("flags valueMissing when required and empty", () => {
    const el = mount({ required: true });
    expect(validity(el).valueMissing).toBe(true);
    el.value = "2026-09-13";
    expect(validity(el)).toEqual({});
  });

  it("flags range underflow/overflow outside minval/maxval", () => {
    const el = mount({
      value: "2026-09-13",
      minval: "2026-09-10",
      maxval: "2026-09-20",
    });
    expect(validity(el)).toEqual({});
    el.value = "2026-09-05";
    expect(validity(el).rangeUnderflow).toBe(true);
    el.value = "2026-09-25";
    expect(validity(el).rangeOverflow).toBe(true);
  });
});

// #events — change reports date; beforechange can veto (reject Sundays).
describe("demo: change / beforechange", () => {
  it("blocks Sundays like the demo guard", () => {
    const el = mount({
      "months-view": "9",
      "year-view": "2026",
      "week-starts-on": "mo",
      "with-weekdays": true,
      "with-offset": true,
    });
    const seen = [];
    el.addEventListener("beforechange", (event) => {
      const date = new Date(`${event.detail.date}T00:00`);
      if (date.getDay() === 0) event.preventDefault();
    });
    el.addEventListener("change", (e) => seen.push(e.detail.date));
    // 2026-09-13 is a Sunday, 2026-09-14 a Monday.
    clickBtn(el, '[data-d="2026-09-13"]');
    expect(el.getAttribute("value") ?? "").not.toBe("2026-09-13");
    clickBtn(el, '[data-d="2026-09-14"]');
    expect(el.getAttribute("value")).toBe("2026-09-14");
    expect(seen).toEqual(["2026-09-14"]);
  });
});

// #binding — Two-way sync between native input and calendar.
describe("demo: bind an input", () => {
  it("syncs change -> input and input -> calendar value", () => {
    const input = document.createElement("input");
    input.type = "date";
    input.value = "2026-09-13";
    document.body.appendChild(input);
    const el = mount({
      value: "2026-09-13",
      minval: "2026-09-10",
      maxval: "2026-09-20",
      "with-weekdays": true,
      "with-offset": true,
    });
    el.addEventListener("change", (event) => {
      input.value = event.detail.date;
    });
    input.addEventListener("change", () => {
      el.value = input.value;
    });
    clickBtn(el, '[data-d="2026-09-15"]');
    expect(input.value).toBe("2026-09-15");
    input.value = "";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(el.getAttribute("value")).toBe("");
  });
});

// #js — Drive visible period with .yearView/.monthsView after connect.
describe("demo: yearView / monthsView from JS", () => {
  it("re-renders when driven from JS", () => {
    const el = mount({
      "with-weekdays": true,
      "with-offset": true,
      "with-switcher": true,
    });
    el.yearView = 2025;
    el.monthsView = 12;
    expect(el.yearView).toBe(2025);
    expect(el.monthsView).toBe(12);
    expect(days(el)).toHaveLength(31);
  });
});

// #popover + #dialog — change payload drives trigger text and close.
describe("demo: popover / dialog wiring", () => {
  it("change detail can update a trigger", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Pick a date";
    document.body.appendChild(trigger);
    let closed = false;
    const el = mount({
      "with-weekdays": true,
      "with-offset": true,
      "with-switcher": true,
      "months-view": "12",
      "year-view": "2025",
    });
    el.addEventListener("change", (event) => {
      trigger.textContent = event.detail.date;
      closed = true;
    });
    clickBtn(el, '[data-d="2025-12-05"]');
    expect(trigger.textContent).toBe("2025-12-05");
    expect(closed).toBe(true);
  });

  it("dialog variant commits on day click", () => {
    const el = mount({
      "with-weekdays": true,
      "with-offset": true,
      "with-switcher": true,
      "months-view": "12",
      "year-view": "2025",
    });
    clickBtn(el, '[data-d="2025-12-05"]');
    expect(el.getAttribute("value")).toBe("2025-12-05");
  });
});

// #keyboard — Tab / Shift+Tab leave the grid, arrows move inside.
describe("keyboard: roving tabindex", () => {
  function tabbables(el, selector) {
    return [...el.shadowRoot.querySelectorAll(selector)].filter(
      (b) => !b.disabled && b.tabIndex !== -1
    );
  }

  it("days grid exposes a single tab stop", () => {
    const el = mount({
      value: "2026-09-13",
      "months-view": "9",
      "year-view": "2026",
    });
    expect(tabbables(el, '[data-a="s"]')).toHaveLength(1);
    expect(
      el.shadowRoot.querySelector('[data-d="2026-09-13"]').tabIndex
    ).toBe(0);
  });

  it("arrow keys move focus inside the days grid", () => {
    const el = mount({
      value: "2026-09-13",
      "months-view": "9",
      "year-view": "2026",
    });
    const start = el.shadowRoot.querySelector('[data-d="2026-09-13"]');
    start.focus();
    start.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(el.shadowRoot.activeElement?.dataset?.d).toBe("2026-09-14");
    expect(tabbables(el, '[data-a="s"]')).toHaveLength(1);
  });

  it("Tab is not trapped inside the grid", () => {
    const el = mount({
      value: "2026-09-13",
      "months-view": "9",
      "year-view": "2026",
    });
    const start = el.shadowRoot.querySelector('[data-d="2026-09-13"]');
    start.focus();
    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    start.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });

  it("keeps keyboard focus on the date after selecting it", () => {
    const el = mount({
      value: "2026-09-13",
      "months-view": "9",
      "year-view": "2026",
    });
    const next = el.shadowRoot.querySelector('[data-d="2026-09-14"]');
    next.focus();
    next.click();
    expect(el.getAttribute("value")).toBe("2026-09-14");
    expect(el.shadowRoot.activeElement?.dataset?.d).toBe("2026-09-14");
  });

  it("month view focuses the selected month on open", () => {
    const el = mount({
      "months-view": "12",
      "year-view": "2025",
      "with-switcher": true,
    });
    const viewBtn = el.shadowRoot.querySelector('[data-v="months"]');
    viewBtn.focus();
    viewBtn.click();
    expect(el.dataset.view).toBe("months");
    expect(el.shadowRoot.activeElement?.dataset?.m).toBe("12");
  });

  it("arrow keys move focus inside the months grid", () => {
    const el = mount({
      "months-view": "12",
      "year-view": "2025",
      "with-switcher": true,
    });
    clickBtn(el, '[data-a="v"][data-v="months"]');
    const june = el.shadowRoot.querySelector('[data-m="6"]');
    june.focus();
    june.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(el.shadowRoot.activeElement?.dataset?.m).toBe("7");
  });

  it("year view focuses the selected year and arrows move inside", () => {
    const el = mount({
      "months-view": "12",
      "year-view": "2025",
      "with-switcher": true,
    });
    const viewBtn = el.shadowRoot.querySelector('[data-v="year"]');
    viewBtn.focus();
    viewBtn.click();
    expect(el.dataset.view).toBe("year");
    expect(el.shadowRoot.activeElement?.dataset?.y).toBe("2025");
    el.shadowRoot.activeElement.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(el.shadowRoot.activeElement?.dataset?.y).toBe("2026");
  });

  it("Home/End jump to the edges of the visible range", () => {
    const el = mount({
      value: "2026-09-14",
      "months-view": "9",
      "year-view": "2026",
    });
    const mid = el.shadowRoot.querySelector('[data-d="2026-09-14"]');
    mid.focus();
    mid.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(el.shadowRoot.activeElement?.dataset?.d).toBe("2026-09-01");
    el.shadowRoot.activeElement.dispatchEvent(
      new KeyboardEvent("keydown", { key: "End", bubbles: true })
    );
    expect(el.shadowRoot.activeElement?.dataset?.d).toBe("2026-09-30");
    expect([el.yearView, el.monthsView]).toEqual([2026, 9]);
  });

  it("arrow keys do not leave the visible month", () => {
    const el = mount({
      value: "2026-09-30",
      "months-view": "9",
      "year-view": "2026",
    });
    const last = el.shadowRoot.querySelector('[data-d="2026-09-30"]');
    last.focus();
    last.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(el.shadowRoot.activeElement?.dataset?.d).toBe("2026-09-30");
    expect([el.yearView, el.monthsView]).toEqual([2026, 9]);

    const first = el.shadowRoot.querySelector('[data-d="2026-09-01"]');
    first.focus();
    first.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })
    );
    expect(el.shadowRoot.activeElement?.dataset?.d).toBe("2026-09-01");
    expect([el.yearView, el.monthsView]).toEqual([2026, 9]);
  });

  it("arrow keys do not leave the visible months and years", () => {
    const el = mount({
      "months-view": "12",
      "year-view": "2025",
      "with-switcher": true,
    });
    clickBtn(el, '[data-a="v"][data-v="months"]');
    const dec = el.shadowRoot.querySelector('[data-m="12"]');
    dec.focus();
    dec.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(el.shadowRoot.activeElement?.dataset?.m).toBe("12");
    expect(el.yearView).toBe(2025);

    clickBtn(el, '[data-a="v"][data-v="year"]');
    const lastYear = el.shadowRoot.querySelector('[data-y="2029"]');
    lastYear.focus();
    lastYear.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );
    expect(el.shadowRoot.activeElement?.dataset?.y).toBe("2029");
  });
});

describe("value hygiene", () => {
  it("clears invalid dates and normalizes padding", () => {
    const el = mount({ "months-view": "12", "year-view": "2025" });
    el.setAttribute("value", "2025-02-30");
    expect(el.getAttribute("value")).toBe("");
    el.setAttribute("value", "2025-1-5");
    expect(el.getAttribute("value")).toBe("2025-01-05");
  });

  it("attributeChangedCallback re-renders on week-starts-on", () => {
    const el = mount({
      "months-view": "9",
      "year-view": "2026",
      "with-weekdays": true,
      "with-offset": true,
    });
    expect(
      el.shadowRoot.querySelectorAll('[part="offset"]')
    ).toHaveLength(2);
    el.setAttribute("week-starts-on", "mo");
    expect(
      el.shadowRoot.querySelectorAll('[part="offset"]')
    ).toHaveLength(1);
  });
});
