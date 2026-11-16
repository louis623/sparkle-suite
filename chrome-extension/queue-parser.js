// Sparkle Suite Live Queue v2: read-only, fail-closed Bomb Party parser.
(function (root) {
  "use strict";
  const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/;
  const HEADER_ALIASES = {partyid:'PartyID','party id':'PartyID',orderid:'OrderID','order id':'OrderID',firstname:'FirstName','first name':'FirstName',lastname:'LastName','last name':'LastName',orderdate:'OrderDate','order date':'OrderDate',isrevealed:'IsRevealed',revealed:'IsRevealed'};
  function headerKey(cell) {
    const sort = cell.getAttribute('data-sort-by');
    if (sort) {
      const key = sort.trim().toLowerCase();
      return Object.hasOwn(HEADER_ALIASES, key) ? HEADER_ALIASES[key] : sort;
    }
    const label = cell.querySelector?.('.header-content span, .header-content');
    return HEADER_ALIASES[String(label?.textContent || cell.textContent || '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim().toLowerCase()] || null;
  }
  function identityText(value, kind) {
    const text = String(value || '').replace(/\u00a0/g,' ').trim();
    if (ID.test(text)) return text;
    const labelled = text.match(new RegExp('^' + kind + '(?:\\s+ID)?(?:\\s*[:#]\\s*|\\s+)([A-Za-z0-9][A-Za-z0-9_-]{0,60})$', 'i'));
    return labelled ? labelled[1] : '';
  }
  function readIdentity(row, cells, attribute, column, kind) {
    const rawAttribute = String(row.getAttribute(attribute) || '').trim();
    const fromAttribute = ID.test(rawAttribute) ? rawAttribute : '';
    const cell = Number.isInteger(column) ? cells[column] : null;
    const link = cell?.querySelector?.('a');
    const rawCell = String(cell?.textContent || '').replace(/\u00a0/g, ' ').trim();
    const rawLink = String(link?.textContent || '').replace(/\u00a0/g, ' ').trim();
    const fromCell = identityText(rawCell, kind);
    const fromLink = identityText(rawLink, kind);
    // A fallback must agree with every available piece of identity evidence.
    if (rawAttribute && !fromAttribute || rawCell && !fromCell || rawLink && !fromLink
      || fromAttribute && fromCell && fromAttribute !== fromCell
      || fromLink && fromCell && fromLink !== fromCell || fromAttribute && fromLink && fromAttribute !== fromLink) return '';
    return fromAttribute || fromCell || fromLink;
  }
  // Diagnostic shapes never contain the underlying text or a reversible identifier.
  function valueShape(raw, parsed) {
    const text = String(raw || '');
    const characters = [];
    if (/[A-Za-z]/.test(text)) characters.push('ascii_letters');
    if (/[0-9]/.test(text)) characters.push('digits');
    if (/\s/.test(text)) characters.push('whitespace');
    if (/[:#_-]/.test(text)) characters.push('separator');
    if (/[^\x00-\x7f]/.test(text)) characters.push('non_ascii');
    if (/[^A-Za-z0-9\s:#_\-\x00-\x1f\x7f-\uffff]/.test(text)) characters.push('other');
    if (/[\x00-\x1f\x7f]/.test(text)) characters.push('control');
    return {format:!text.trim()?'missing':!parsed?'unsupported':ID.test(text.trim())?'plain':'labelled',
      length:text.length===0?'0':text.length<=10?'1-10':text.length<=100?'11-100':text.length<=1000?'101-1000':'1001+',characters};
  }
  function identityEvidence(row, cells, attribute, column, kind) {
    const attributeRaw = String(row.getAttribute(attribute) || '');
    const cell = Number.isInteger(column) ? cells[column] : null;
    const cellRaw = String(cell?.textContent || '');
    const linkRaw = String(cell?.querySelector?.('a')?.textContent || '');
    const attributeText = attributeRaw.trim(), cellText = cellRaw.replace(/\u00a0/g,' ').trim(), linkText = linkRaw.replace(/\u00a0/g,' ').trim();
    const a = ID.test(attributeText) ? attributeText : '', c = identityText(cellText,kind), l = identityText(linkText,kind);
    const compare = (left,right) => !left || !right ? 'unavailable' : left === right ? 'match' : 'mismatch';
    const comparisons = {attributeCell:compare(a,c),attributeLink:compare(a,l),cellLink:compare(c,l)};
    const unsupported = Boolean(attributeText&&!a || cellText&&!c || linkText&&!l);
    return {problem:unsupported?'unsupported_format':Object.values(comparisons).includes('mismatch')?'conflict':a||c||l?'none':'missing',
      attribute:valueShape(attributeRaw,a),cell:valueShape(cellRaw,c),link:valueShape(linkRaw,l),comparisons};
  }
  const FAILURE_STAGES = {invalid_scope:'scope',columns_changed:'columns',duplicate_columns:'columns',
    missing_order_identity:'identity',duplicate_order_identity:'identity',invalid_order_time:'date',
    invalid_first_name:'name',row_incomplete:'row',reveal_state_missing:'reveal',capacity_exceeded:'capacity',scan_capacity_exceeded:'capacity',selected_party_not_visible:'scope'};
  const failureContext = (reason,rowIndex=null,cellCount=null) => ({version:1,stage:FAILURE_STAGES[reason]||'table',rowIndex,cellCount});
  const unavailable = (parserState, reason, failure) => ({parserState, reason, entries: [], revealedIds: [], revealedEntries: [],...(failure?{failure}:{})});
  const CANONICAL_COLUMNS = new Set(['PartyID','OrderID','FirstName','LastName','OrderDate','IsRevealed']);
  const bucket = count => count === 0 ? '0' : count <= 10 ? '1-10' : count <= 100 ? '11-100' : count <= 1000 ? '101-1000' : count <= 10000 ? '1001-10000' : '10001+';
  function tableParts(table) {
    // Native tBodies/children exclude nested tables. The query fallback also
    // supports DOM implementations which expose only selector methods.
    const head = table?.tHead || table?.querySelector?.('thead') || null;
    const bodies = table?.tBodies ? Array.from(table.tBodies) : Array.from(table?.querySelectorAll?.('tbody') || [table?.querySelector?.('tbody')].filter(Boolean))
      .filter(body => !body.parentElement || body.parentElement === table);
    const allRows = [], rows = [];
    let nested = false;
    for (const body of bodies) {
      const direct = Array.from(body.children || body.querySelectorAll('tr')).filter(row => !row.tagName || row.tagName === 'TR')
        .filter(row => !row.parentElement || row.parentElement === body);
      for (const row of direct) allRows.push(row);
      const matched = body.querySelectorAll('tr.product.product-row');
      for (const row of matched) if (!row.parentElement || row.parentElement === body) rows.push(row);
      if (direct.some(row => row.querySelector?.('table'))) nested = true;
    }
    return {head,bodies,allRows,rows,nested};
  }
  function structureOf(parts) {
    const {head,bodies,allRows,rows} = parts;
    const headers = Array.from(head?.querySelectorAll('th') || []);
    // No arbitrary labels, classes, attribute values, IDs or customer text leave
    // this function. Even unknown headings become the same fixed enum.
    return {version:1,columns:headers.slice(0,32).map(cell => {
      const key = headerKey(cell); return CANONICAL_COLUMNS.has(key) ? key : 'unknown';
    }),bodyCount:Math.min(bodies.length,32),rowCount:bucket(allRows.length),
      unmatchedRows:bucket(Math.max(0,allRows.length-rows.length)),
      hasOrderIdAttribute:allRows.some(row => row.getAttribute?.('data-orderid') != null),
      hasPartyIdAttribute:allRows.some(row => row.getAttribute?.('data-partyid') != null),
      hasOrderTimeAttribute:allRows.some(row => Array.from(row.querySelectorAll?.('td') || []).some(cell => cell.getAttribute?.('data-order-utc-ms') != null))};
  }
  function parseRows(table, selection, parts) {
    let parties = null, excluded = new Set();
    if (typeof selection === "string") {
      if (!ID.test(selection)) return unavailable("invalid", "invalid_scope");
      parties = new Set([selection]);
    } else if (Array.isArray(selection)) {
      if (!selection.length || selection.length > 100 || selection.some(id => typeof id !== "string" || !ID.test(id))
        || new Set(selection).size !== selection.length) return unavailable("invalid", "invalid_scope");
      parties = new Set(selection);
    } else if (selection !== null) {
      if (!selection || typeof selection !== "object" || !Array.isArray(selection.partyIds)
        || !selection.partyIds.length || selection.partyIds.length > 100
        || selection.partyIds.some(id => typeof id !== "string" || !ID.test(id))
        || new Set(selection.partyIds).size !== selection.partyIds.length
        || !Array.isArray(selection.carryEntryIds) || selection.carryEntryIds.length > 2000
        || typeof selection.startedAt !== "string") return unavailable("invalid", "invalid_scope");
      // Calendar/show timestamps are legacy metadata, never order eligibility.
      parties = new Set(selection.partyIds);
      const exclusions = selection.excludedPartyIds || [];
      if (!Array.isArray(exclusions) || exclusions.some(id => !parties.has(id))
        || new Set(exclusions).size !== exclusions.length) return unavailable("invalid", "invalid_scope");
      excluded = new Set(exclusions);
    }
    if (!table || !table.isConnected) return unavailable("loading", "table_missing");
    if (table.getAttribute("aria-busy") === "true") return unavailable("loading", "table_busy");
    const {head,bodies,allRows,rows,nested} = parts;
    if (!head || !bodies.length) return unavailable("loading", "table_incomplete");
    if (bodies.length > 32 || allRows.length > 50000) return unavailable("invalid", "scan_capacity_exceeded");
    if (nested || head.rows && head.rows.length !== 1) return unavailable("partial", "table_incomplete");
    const columns = Object.create(null);
    const headers = Array.from(head.querySelectorAll("th"), cell => ({
      key: headerKey(cell), explicit: Boolean(cell.getAttribute('data-sort-by')?.trim()),
    }));
    const hasRevealDataColumn = headers.some(header => header.explicit && header.key === 'IsRevealed');
    for (const [index, {key, explicit}] of headers.entries()) {
      // A decorative label can repeat the title of the checkbox column.
      if (key === 'IsRevealed' && hasRevealDataColumn && !explicit) continue;
      if (key && Object.prototype.hasOwnProperty.call(columns, key)) return unavailable("invalid", "duplicate_columns");
      if (key) columns[key] = index;
    }
    if (!Number.isInteger(columns.FirstName) || !Number.isInteger(columns.IsRevealed)) return unavailable("invalid", "columns_changed");
    // A renamed row anywhere in any body must never disappear from a healthy
    // snapshot. No partial row list is exposed; the server keeps its last good list.
    if (rows.length !== allRows.length) return unavailable("partial", "table_incomplete");
    // Bound scanning separately from the selected parties' capacity.
    if (rows.length > 50000) return unavailable("invalid", "scan_capacity_exceeded");

    const entries = [], revealedIds = [], revealedEntries = [], seen = new Set();
    for (const [rowOffset, row] of rows.entries()) {
      const cells = row.children ? Array.from(row.children).filter(cell => cell.tagName === 'TD') : row.querySelectorAll("td");
      const rowFailure = reason => failureContext(reason,rowOffset+1,Math.min(cells.length,32));
      const orderId = readIdentity(row,cells,'data-orderid',columns.OrderID,'Order');
      const partyId = readIdentity(row,cells,'data-partyid',columns.PartyID,'Party');
      // Ignore only proven out-of-scope rows, never unidentified current orders.
      if (partyId && (parties && !parties.has(partyId) || excluded.has(partyId))) continue;
      if (!ID.test(orderId) || !ID.test(partyId)) return unavailable("invalid", "missing_order_identity", {
        ...rowFailure('missing_order_identity'),order:identityEvidence(row,cells,'data-orderid',columns.OrderID,'Order'),
        party:identityEvidence(row,cells,'data-partyid',columns.PartyID,'Party')});
      const id = partyId + ":" + orderId;
      if (seen.has(id)) return unavailable("invalid", "duplicate_order_identity", rowFailure("duplicate_order_identity"));
      seen.add(id);
      const rawDate = cells[columns.OrderDate]?.getAttribute("data-order-utc-ms");
      let orderedAt = null;
      if (rawDate !== null && rawDate !== undefined && rawDate !== "") {
        if (!/^[0-9]+$/.test(rawDate)) return unavailable("invalid", "invalid_order_time", rowFailure("invalid_order_time"));
        orderedAt = Number(rawDate);
        if (!Number.isSafeInteger(orderedAt) || orderedAt > 8640000000000000) return unavailable("invalid", "invalid_order_time", rowFailure("invalid_order_time"));
      }
      const nameCell = cells[columns.FirstName], revealCell = cells[columns.IsRevealed];
      if (!nameCell || !revealCell) return unavailable("partial", "row_incomplete", rowFailure("row_incomplete"));
      const checks = revealCell.querySelectorAll('input[type="checkbox"]');
      if (checks.length !== 1 || checks[0].indeterminate || checks[0].disabled || checks[0].getAttribute?.('aria-busy') === 'true' || typeof checks[0].checked !== "boolean") return unavailable("partial", "reveal_state_missing", rowFailure("reveal_state_missing"));
      if (checks[0].checked) {
        revealedIds.push(id); revealedEntries.push({id, orderedAt});
      } else {
        const name = nameCell.textContent.trim();
        if (!name || name.length > 100 || Array.from(name).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return unavailable("invalid", "invalid_first_name", rowFailure("invalid_first_name"));
        const surname = Number.isInteger(columns.LastName) ? String(cells[columns.LastName]?.textContent || '').trim() : '';
        const lastName = surname && surname.length <= 100 && !/[\u0000-\u001f\u007f]/.test(surname) ? surname : null;
        entries.push({id, name, orderedAt, ...(lastName ? {lastName} : {})});
      }
      if (entries.length > 2000 || revealedIds.length > 10000) return unavailable("invalid", "capacity_exceeded", rowFailure("capacity_exceeded"));
    }
    if (rows.length && !seen.size && (!parties || [...parties].some(id => !excluded.has(id)))) return unavailable("partial", "selected_party_not_visible");
    entries.sort((a, b) => (a.orderedAt ?? Number.MAX_SAFE_INTEGER) - (b.orderedAt ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id));
    return {parserState: "ready", reason: null, entries, revealedIds, revealedEntries};
  }
  function parseTable(table, selection = null) {
    const parts = tableParts(table);
    const structure = structureOf(parts);
    const result = parseRows(table,selection,parts);
    return {...result,structure,...(result.parserState!=='ready'&&!result.failure?{failure:failureContext(result.reason)}:{})};
  }
  const api = Object.freeze({parseTable});
  root.SparkleQueueParser = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
