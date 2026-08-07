(async function () {
  var root = document.querySelector('.cwes-record-book');
  if (!root) return;
  var tbody = root.querySelector('#cwes-record-rows');
  var search = root.querySelector('#cwes-record-search');
  var count = root.querySelector('#cwes-record-count');
  var noResults = root.querySelector('#cwes-record-no-results');

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character];
    });
  }

  function recordMarkup(records) {
    if (!records.length) return '<span class="cwes-record-book__empty">Open</span>';
    return records.map(function (record) {
      var shared = record.shared ? ' <span class="cwes-record__shared">Shared</span>' : '';
      return '<span class="cwes-record"><span class="cwes-record__name">' + esc(record.name) + shared + '</span><span class="cwes-record__meta">' + esc(record.time) + ' · ' + esc(record.year) + '</span></span>';
    }).join('');
  }

  try {
    var response = await fetch('../data/record-book.json');
    if (!response.ok) throw new Error('Record-book data could not be loaded.');
    var data = await response.json();
    tbody.innerHTML = data.routes.map(function (route) {
      var routeName = esc(route.route);
      var routeCell = route.href
        ? '<a class="cwes-record-book__route" href="' + esc(route.href) + '">' + routeName + '</a>'
        : '<span class="cwes-record-book__route">' + routeName + '</span>';
      return '<tr data-record-row><td>' + routeCell + '</td><td data-label="Male FKT">' + recordMarkup(route.male) + '</td><td data-label="Female FKT">' + recordMarkup(route.female) + '</td></tr>';
    }).join('');
  } catch (error) {
    noResults.textContent = 'The record book is temporarily unavailable. Please refresh the page.';
    noResults.style.display = 'block';
    count.textContent = 'Record book unavailable';
    return;
  }

  var rows = Array.prototype.slice.call(root.querySelectorAll('[data-record-row]'));
  function filterRecords() {
    var query = search.value.toLowerCase().trim();
    var visible = 0;
    rows.forEach(function (row) {
      var match = !query || row.textContent.toLowerCase().indexOf(query) !== -1;
      row.style.display = match ? '' : 'none';
      if (match) visible += 1;
    });
    count.textContent = visible + (visible === 1 ? ' route shown' : ' routes shown');
    noResults.style.display = visible ? 'none' : 'block';
  }
  search.addEventListener('input', filterRecords);
  filterRecords();
}());
