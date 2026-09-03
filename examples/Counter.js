const { html } = require("preact/htm");
const { useState } = require("preact/hooks");

function Counter({ start = 12, step = 1 }) {
  let { count, setCount } = useState(start);
  return html`<div class="Counter">
    <div class="result" style="font-size:2em">${count}</div>
    <button onclick=${() => setCount(count - step)}>-</button>
    <button onclick=${() => setCount(count + step)}>+</button>
  </div>`;
}

module.exports = { Counter };
