/* global document */
const panels = [...document.querySelectorAll('[data-panel]')];
const tabs = [...document.querySelectorAll('[data-view]')];
const filters = [...document.querySelectorAll('[data-filter]')];
let view = 'files';
function update() {
  const values = Object.fromEntries(
    filters.map((element) => [element.dataset.filter, element.value]),
  );
  for (const panel of panels) {
    panel.hidden = panel.dataset.panel !== view;
    const cases = [
      ...panel.querySelectorAll(':scope > .case, :scope > .cards > .card'),
    ];
    for (const row of cases) {
      const category =
        values.category === 'all' || row.dataset.category === values.category;
      const origin =
        values.origin === 'all' || row.dataset.origin === values.origin;
      const status =
        values.status === 'all' ||
        ['grouping', 'rights'].includes(values.status) ||
        (values.status === 'title'
          ? row.dataset.titleReview === 'true'
          : (row.dataset.duplicates ?? row.dataset.duplicate)
              .split('|')
              .includes(values.status));
      row.hidden = !(category && origin && status);
    }
    panel.querySelector('[data-panel-count]').textContent =
      `${cases.filter((row) => !row.hidden).length}件を表示 / ${cases.length}件`;
  }
  for (const tab of tabs)
    tab.setAttribute('aria-pressed', String(tab.dataset.view === view));
}
for (const tab of tabs)
  tab.addEventListener('click', () => {
    view = tab.dataset.view;
    update();
  });
for (const filter of filters) filter.addEventListener('change', update);
document.querySelector('[data-reset]').addEventListener('click', () => {
  filters.forEach((filter) => {
    filter.value = 'all';
  });
  update();
});
update();
