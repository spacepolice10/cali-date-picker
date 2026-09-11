import "./lib/calendar.js";
import "./lib/clocks.js";
import "./lib/dateform.js";
import "./lib/timeform.js";
import "./lib/ranger-calendar.js";
import "./lib/ranger-clocks.js";

const widgetSelector =
  "cali-calendar, cali-clocks, cali-dateform, cali-timeform, cali-ranger-calendar, cali-ranger-clocks";
const singleValueWidgets = [
  ...document.querySelectorAll(
    "cali-calendar, cali-clocks, cali-dateform, cali-timeform"
  ),
];
const localeSelect = document.querySelector("#locale");
const dateOutput = document.querySelector("#selected-date");
const timeOutput = document.querySelector("#selected-time");

function updateSummary(date) {
  dateOutput.value = date.toLocaleDateString(localeSelect.value, {
    dateStyle: "full",
  });
  timeOutput.value = date.toLocaleTimeString(localeSelect.value, {
    timeStyle: "medium",
  });
}

for (const widget of singleValueWidgets) {
  widget.addEventListener("change", ({ detail: date }) => {
    for (const otherWidget of singleValueWidgets) {
      if (otherWidget !== widget) otherWidget.date = date;
    }
    updateSummary(date);
  });
}

localeSelect.addEventListener("change", () => {
  for (const widget of document.querySelectorAll(widgetSelector))
    widget.locale = localeSelect.value;
  updateSummary(singleValueWidgets[0].date);
});

document.querySelector("#theme-toggle").addEventListener("click", () => {
  const root = document.documentElement;
  const isDark =
    root.dataset.theme === "dark" ||
    (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = isDark ? "light" : "dark";
});

document.querySelector("#demo-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  document.querySelector("#form-output").textContent = JSON.stringify(
    values,
    null,
    2
  );
});

for (const widget of document.querySelectorAll(widgetSelector))
  widget.locale = localeSelect.value;
updateSummary(singleValueWidgets[0].date);
