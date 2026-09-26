// Sparkle Suite Live Queue v2: read-only, fail-closed Bomb Party parser.
(function (root) {
  "use strict";
  const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/;
  const HEADER_ALIASES = {partyid:'PartyID','party id':'PartyID',orderid:'OrderID','order id':'OrderID',firstname:'FirstName','first name':'FirstName',lastname:'LastName','last name':'LastName',orderdate:'OrderDate','order date':'OrderDate',isrevealed:'IsRevealed'};
  function headerKey(cell) {
    const sort = cell.getAttribute('data-sort-by');
    if (sort) return sort;
    const label = cell.querySelector?.('.header-content span, .header-content');
    return HEADER_ALIASES[String(label?.textContent || '').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim().toLowerCase()] || null;
  }
  function identityText(value, kind) {
    const text = String(value || '').replace(/\u00a0/g,' ').trim();
    if (ID.test(text)) return text;
    const labelled = text.match(new RegExp('^' + kind + '(?:\\s+ID)?\\s*[:#]?\\s+([A-Za-z0-9][A-Za-z0-9_-]{0,60})$', 'i'));
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
  const unavailable = (parserState, reason) => ({parserState, reason, entries: [], revealedIds: [], revealedEntries: []});
  function parseTable(table, selection = null) {
    let parties = null, cutoff = null, carry = new Set();
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
      cutoff = Date.parse(selection.startedAt);
      if (!Number.isSafeInteger(cutoff) || cutoff < 0 || new Date(cutoff).toISOString() !== selection.startedAt) return unavailable("invalid", "invalid_scope");
      parties = new Set(selection.partyIds);
      for (const id of selection.carryEntryIds) {
        if (typeof id !== "string") return unavailable("invalid", "invalid_scope");
        const parts = id.split(":");
        if (parts.length !== 2 || !parts.every(part => ID.test(part)) || !parties.has(parts[0]) || carry.has(id)) return unavailable("invalid", "invalid_scope");
        carry.add(id);
      }
    }
    if (!table || !table.isConnected) return unavailable("loading", "table_missing");
    if (table.getAttribute("aria-busy") === "true") return unavailable("loading", "table_busy");
    const head = table.querySelector("thead"), body = table.querySelector("tbody");
    if (!head || !body) return unavailable("loading", "table_incomplete");
    const columns = Object.create(null);
    for (const [index, cell] of Array.from(head.querySelectorAll("th")).entries()) {
      const key = headerKey(cell);
      if (key && Object.prototype.hasOwnProperty.call(columns, key)) return unavailable("invalid", "duplicate_columns");
      if (key) columns[key] = index;
    }
    if (!Number.isInteger(columns.FirstName) || !Number.isInteger(columns.IsRevealed)) return unavailable("invalid", "columns_changed");
    const rows = body.querySelectorAll("tr.product.product-row");
    // Bound raw scanning separately from the current show's capacity. History is filtered first.
    if (rows.length > 50000) return unavailable("invalid", "scan_capacity_exceeded");
    if (!rows.length) return unavailable("partial", "no_visible_orders");
    const entries = [], revealedIds = [], revealedEntries = [], seen = new Set();
    for (const row of rows) {
      const cells = row.querySelectorAll("td");
      const orderId = readIdentity(row,cells,'data-orderid',columns.OrderID,'Order');
      const partyId = readIdentity(row,cells,'data-partyid',columns.PartyID,'Party');
      // Ignore only proven out-of-scope rows, never unidentified current orders.
      if (parties && partyId && !parties.has(partyId)) continue;
      const earlyDate = cells[columns.OrderDate]?.getAttribute('data-order-utc-ms');
      const historical = cutoff !== null && carry.size === 0 && /^[0-9]+$/.test(earlyDate || '')
        && Number.isSafeInteger(Number(earlyDate)) && Number(earlyDate) < cutoff;
      if (historical) continue;
      if (!ID.test(orderId) || !ID.test(partyId)) return unavailable("invalid", "missing_order_identity");
      const id = partyId + ":" + orderId;
      if (seen.has(id)) return unavailable("invalid", "duplicate_order_identity");
      seen.add(id);
      const rawDate = cells[columns.OrderDate]?.getAttribute("data-order-utc-ms");
      let orderedAt = null;
      if (rawDate !== null && rawDate !== undefined && rawDate !== "") {
        if (!/^[0-9]+$/.test(rawDate)) return unavailable("invalid", "invalid_order_time");
        orderedAt = Number(rawDate);
        if (!Number.isSafeInteger(orderedAt) || orderedAt > 8640000000000000) return unavailable("invalid", "invalid_order_time");
      }
      if (cutoff !== null && !carry.has(id)) {
        if (orderedAt === null) return unavailable("partial", "order_time_missing");
        if (orderedAt < cutoff) continue;
      }
      const nameCell = cells[columns.FirstName], revealCell = cells[columns.IsRevealed];
      if (!nameCell || !revealCell) return unavailable("partial", "row_incomplete");
      const checks = revealCell.querySelectorAll('input[type="checkbox"]');
      if (checks.length !== 1 || checks[0].indeterminate || checks[0].disabled || checks[0].getAttribute?.('aria-busy') === 'true' || typeof checks[0].checked !== "boolean") return unavailable("partial", "reveal_state_missing");
      if (checks[0].checked) {
        revealedIds.push(id); revealedEntries.push({id, orderedAt});
      } else {
        const name = nameCell.textContent.trim();
        if (!name || name.length > 100 || Array.from(name).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return unavailable("invalid", "invalid_first_name");
        const surname = Number.isInteger(columns.LastName) ? String(cells[columns.LastName]?.textContent || '').trim() : '';
        const lastName = surname && surname.length <= 100 && !/[\u0000-\u001f\u007f]/.test(surname) ? surname : null;
        entries.push({id, name, orderedAt, ...(lastName ? {lastName} : {})});
      }
      if (entries.length > 2000 || revealedIds.length > 10000) return unavailable("invalid", "capacity_exceeded");
    }
    if (!seen.size) return unavailable("partial", "selected_party_not_visible");
    entries.sort((a, b) => (a.orderedAt ?? Number.MAX_SAFE_INTEGER) - (b.orderedAt ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id));
    return {parserState: "ready", reason: null, entries, revealedIds, revealedEntries};
  }
  const api = Object.freeze({parseTable});
  root.SparkleQueueParser = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
