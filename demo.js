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

for (const widget of singleValueWidgets) {
  widget.addEventListener("change", ({ detail: date }) => {
    for (const otherWidget of singleValueWidgets) {
      if (otherWidget !== widget) otherWidget.date = date;
    }
  });
}

localeSelect.addEventListener("change", () => {
  for (const widget of document.querySelectorAll(widgetSelector))
    widget.locale = localeSelect.value;
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
