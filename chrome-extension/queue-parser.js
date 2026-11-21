// Sparkle Suite Live Queue v2: read-only Bomb Party parser. Copy visible identity; skip one unreadable row.
(function (root) {
  "use strict";
  const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/;
  const IDENTITY_MAX = 128;
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
  function visibleText(value) {
    return String(value || '').replace(/\u00a0/g,' ').trim();
  }
  // Copy the visible value as shown, after trimming whitespace only. No label stripping.
  // A row is kept only if party:order already matches Live validId.
  const LIVE_ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/;
  const LIVE_PART = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
  function liveToken(value) {
    const text = visibleText(value);
    return text && text.length <= IDENTITY_MAX && LIVE_PART.test(text) ? text : '';
  }
  function liveEntryId(partyId, orderId) {
    if (!liveToken(partyId) || !liveToken(orderId)) return '';
    const id = partyId + ':' + orderId;
    return id.length <= 128 && LIVE_ID.test(id) ? id : '';
  }
  function readIdentity(row, cells, attribute, column, kind) {
    const cell = Number.isInteger(column) ? cells[column] : null;
    const rawCell = visibleText(cell?.textContent);
    const rawLink = visibleText(cell?.querySelector?.('a')?.textContent);
    // Prefer the visible cell, then the link. Attributes are a fallback only when
    // both visible sources are empty, including when those attributes differ or look odd.
    if (rawCell || rawLink) return rawCell || rawLink;
    return visibleText(row.getAttribute(attribute));
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
    if (/\//.test(text)) characters.push('slash');
    if (/\./.test(text)) characters.push('dot');
    if (/=/.test(text)) characters.push('equals');
    if (/[^A-Za-z0-9\s:#_\-\/\.=\x00-\x1f\x7f-\uffff]/.test(text)) characters.push('other');
    if (/[\x00-\x1f\x7f]/.test(text)) characters.push('control');
    const trimmed = text.replace(/\u00a0/g,' ').trim();
    const labelled = Boolean(parsed && trimmed && trimmed !== parsed);
    return {format:!trimmed?'missing':!parsed?'unsupported':labelled?'labelled':'plain',
      length:text.length===0?'0':text.length<=10?'1-10':text.length<=100?'11-100':text.length<=1000?'101-1000':'1001+',characters};
  }
  function identityEvidence(row, cells, attribute, column, kind) {
    const attributeRaw = String(row.getAttribute(attribute) || '');
    const cell = Number.isInteger(column) ? cells[column] : null;
    const cellRaw = String(cell?.textContent || '');
    const linkRaw = String(cell?.querySelector?.('a')?.textContent || '');
    const attributeText = attributeRaw.trim(), cellText = cellRaw.replace(/\u00a0/g,' ').trim(), linkText = linkRaw.replace(/\u00a0/g,' ').trim();
    const a = liveToken(attributeText), c = liveToken(cellText), l = liveToken(linkText);
    const compare = (left,right) => !left || !right ? 'unavailable' : left === right ? 'match' : 'mismatch';
    const comparisons = {attributeCell:compare(a,c),attributeLink:compare(a,l),cellLink:compare(c,l)};
    const visibleUnreadable = Boolean(cellText && !c || linkText && !l);
    const chosen = c || l || (!(cellText || linkText) ? a : '');
    const problem = chosen ? 'none' : visibleUnreadable || (attributeText && !a) ? 'unsupported_format' : 'missing';
    return {problem,attribute:valueShape(attributeRaw,a),cell:valueShape(cellRaw,c),link:valueShape(linkRaw,l),comparisons};
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
  function isEmptyMessage(row, width) {
    const cells = Array.from(row.cells || row.children || []);
    const cell = cells[0];
    if (cells.length !== 1 || cell?.tagName !== 'TD' || Number(cell.getAttribute('colspan')) !== width) return false;
    const identity = '[data-orderid], [data-partyid], [data-order-utc-ms], [data-order-id], [data-party-id]';
    const unavailable = 'a, button, input, select, form, table, progress, [aria-busy="true"], [role="progressbar"], [class*="spinner" i], [class*="loading" i]';
    if (row.matches?.(identity) || row.querySelector?.(identity + ', ' + unavailable) || row.getAttribute('aria-busy') === 'true') return false;
    const label = String(cell.textContent || '').trim().replace(/\s+/g, ' ');
    return /^(?:no (?:party )?orders(?: (?:found|available|to display|yet))?|no (?:data|records)(?: available| to display| found)?)\.?$/i.test(label);
  }
  function parseRows(table, selection, parts, discoveryExclusions = null) {
    let parties = null, excluded = new Set(discoveryExclusions || []);
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
    if (rows.length !== allRows.length
      && !(bodies.length === 1 && rows.length === 0 && allRows.length === 1 && isEmptyMessage(allRows[0], headers.length))) {
      return unavailable("partial", "table_incomplete");
    }
    // Bound scanning separately from the selected parties' capacity.
    if (rows.length > 50000) return unavailable("invalid", "scan_capacity_exceeded");

    const entries = [], revealedIds = [], revealedEntries = [], seen = new Set();
    const rowSamples = [], skippedByReason = Object.create(null);
    const keptByParty = Object.create(null), skippedByParty = Object.create(null);
    let skippedRowCount = 0, waitingRowCount = 0, revealedRowCount = 0, checkboxUnknownCount = 0, firstSkip = null;
    let skippedUnreadableParty = 0;
    const checkboxOf = revealCell => {
      const checks = revealCell?.querySelectorAll?.('input[type="checkbox"]');
      if (!checks || checks.length !== 1 || checks[0].indeterminate || checks[0].disabled
        || checks[0].getAttribute?.('aria-busy') === 'true' || typeof checks[0].checked !== "boolean") return 'unknown';
      return checks[0].checked ? 'revealed' : 'waiting';
    };
    let partyForRow = '';
    const noteRow = (rowIndex, checkbox, disposition, skipReason) => {
      if (checkbox === 'unknown') checkboxUnknownCount += 1;
      if (disposition === 'kept' && checkbox === 'waiting') waitingRowCount += 1;
      if (disposition === 'kept' && checkbox === 'revealed') revealedRowCount += 1;
      if (disposition === 'skipped') {
        skippedRowCount += 1;
        skippedByReason[skipReason] = (skippedByReason[skipReason] || 0) + 1;
        if (partyForRow) skippedByParty[partyForRow] = (skippedByParty[partyForRow] || 0) + 1;
        else skippedUnreadableParty += 1;
      }
      if (disposition === 'kept' && partyForRow) keptByParty[partyForRow] = (keptByParty[partyForRow] || 0) + 1;
      if (rowSamples.length < 32) rowSamples.push({
        rowIndex, checkbox, disposition,
        ...(skipReason ? {skipReason} : {}),
        identity: checkbox === 'waiting' ? 'new_waiting' : checkbox === 'revealed' ? 'already_revealed' : 'unknown',
      });
    };
    const rowReportOf = () => ({
      version:1, exactRowCount:allRows.length, productRowCount:rows.length,
      keptRowCount:entries.length + revealedIds.length, skippedRowCount,
      waitingRowCount, revealedRowCount, checkboxUnknownCount,
      skippedByReason:{...skippedByReason}, rows:[...rowSamples],
    });
    for (const [rowOffset, row] of rows.entries()) {
      let rowNoted = false;
      try {
      const cells = row.children ? Array.from(row.children).filter(cell => cell.tagName === 'TD') : row.querySelectorAll("td");
      const rowFailure = reason => failureContext(reason,rowOffset+1,Math.min(cells.length,32));
      const nameCell = Number.isInteger(columns.FirstName) ? cells[columns.FirstName] : null;
      const revealCell = Number.isInteger(columns.IsRevealed) ? cells[columns.IsRevealed] : null;
      const checkbox = checkboxOf(revealCell);
      const skip = (reason, extraFailure) => {
        if (!firstSkip) firstSkip = {reason, failure: extraFailure ? {...rowFailure(reason),...extraFailure} : rowFailure(reason)};
        noteRow(rowOffset+1, checkbox, 'skipped', reason);
        rowNoted = true;
      };
      const orderId = readIdentity(row,cells,'data-orderid',columns.OrderID,'Order');
      const partyId = readIdentity(row,cells,'data-partyid',columns.PartyID,'Party');
      partyForRow = liveToken(partyId);
      // Discovery may ignore excluded row data only after a usable Live identity is read.
      // An unreadable row is skipped; it must never empty the rest of the snapshot.
      if (!orderId || !partyId || !liveEntryId(partyId, orderId)) {
        skip('missing_order_identity', {
          order:identityEvidence(row,cells,'data-orderid',columns.OrderID,'Order'),
          party:identityEvidence(row,cells,'data-partyid',columns.PartyID,'Party')});
        continue;
      }
      const outside = parties && !parties.has(partyForRow) || excluded.has(partyForRow);
      if (outside) { noteRow(rowOffset+1, checkbox, 'outside'); rowNoted = true; continue; }
      const id = liveEntryId(partyId, orderId);
      if (seen.has(id)) { skip('duplicate_order_identity'); continue; }
      seen.add(id);
      const rawDate = cells[columns.OrderDate]?.getAttribute("data-order-utc-ms");
      let orderedAt = null;
      if (rawDate !== null && rawDate !== undefined && rawDate !== "") {
        if (!/^[0-9]+$/.test(rawDate)) { seen.delete(id); skip('invalid_order_time'); continue; }
        orderedAt = Number(rawDate);
        if (!Number.isSafeInteger(orderedAt) || orderedAt > 8640000000000000) { seen.delete(id); skip('invalid_order_time'); continue; }
      }
      if (!nameCell || !revealCell) { seen.delete(id); skip('row_incomplete'); continue; }
      if (checkbox === 'unknown') { seen.delete(id); skip('reveal_state_missing'); continue; }
      if (checkbox === 'revealed') {
        revealedIds.push(id); revealedEntries.push({id, orderedAt});
      } else {
        const name = nameCell.textContent.trim();
        if (!name || name.length > 100 || Array.from(name).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) {
          seen.delete(id); skip('invalid_first_name'); continue;
        }
        const surname = Number.isInteger(columns.LastName) ? String(cells[columns.LastName]?.textContent || '').trim() : '';
        const lastName = surname && surname.length <= 100 && !/[\u0000-\u001f\u007f]/.test(surname) ? surname : null;
        entries.push({id, name, orderedAt, ...(lastName ? {lastName} : {})});
      }
      noteRow(rowOffset+1, checkbox, 'kept');
      rowNoted = true;
      if (entries.length > 2000 || revealedIds.length > 10000) return unavailable("invalid", "capacity_exceeded", rowFailure("capacity_exceeded"));
      } catch {
        if (!rowNoted) {
          partyForRow = partyForRow || '';
          if (!firstSkip) firstSkip = {reason:'row_incomplete', failure:failureContext('row_incomplete',rowOffset+1,null)};
          noteRow(rowOffset+1, 'unknown', 'skipped', 'row_incomplete');
        }
      }
    }
    const rowReport = rowReportOf();
    if (discoveryExclusions === null && rows.length && !seen.size && skippedRowCount === 0
      && (!parties || [...parties].some(id => !excluded.has(id)))) {
      return {...unavailable("partial", "selected_party_not_visible"), rowReport};
    }
    if (!seen.size && skippedRowCount) {
      return {...unavailable(firstSkip.reason === 'invalid_first_name' || firstSkip.reason === 'invalid_order_time'
        || firstSkip.reason === 'missing_order_identity' || firstSkip.reason === 'duplicate_order_identity' || firstSkip.reason === 'capacity_exceeded'
        ? 'invalid' : 'partial', firstSkip.reason, firstSkip.failure), rowReport};
    }
    const inScopeParty = id => !parties || (parties.has(id) && !excluded.has(id));
    const partyMissingFromReady = Object.keys(skippedByParty).some(id => inScopeParty(id) && !keptByParty[id])
      || Boolean(skippedUnreadableParty && (parties ? [...parties].some(id => !excluded.has(id) && !keptByParty[id]) : true));
    if (partyMissingFromReady) {
      const reason = firstSkip && ['table_incomplete','row_incomplete','reveal_state_missing','selected_party_not_visible'].includes(firstSkip.reason)
        ? firstSkip.reason : 'row_incomplete';
      return {...unavailable('partial', reason, firstSkip && firstSkip.failure), rowReport};
    }
    entries.sort((a, b) => (a.orderedAt ?? Number.MAX_SAFE_INTEGER) - (b.orderedAt ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id));
    return {parserState: "ready", reason: null, entries, revealedIds, revealedEntries, rowReport};
  }
  function parseTable(table, selection = null) {
    const parts = tableParts(table);
    const structure = structureOf(parts);
    const result = parseRows(table,selection,parts);
    return {...result,structure,...(result.parserState!=='ready'&&!result.failure?{failure:failureContext(result.reason)}:{})};
  }
  function parseDiscovery(table, excludedPartyIds = []) {
    const parts = tableParts(table), structure = structureOf(parts);
    const valid = Array.isArray(excludedPartyIds) && excludedPartyIds.length <= 100
      && excludedPartyIds.every(id => typeof id === 'string' && ID.test(id)) && new Set(excludedPartyIds).size === excludedPartyIds.length;
    const result = valid ? parseRows(table,null,parts,excludedPartyIds) : unavailable('invalid','invalid_scope');
    return {...result,structure,...(result.parserState!=='ready'&&!result.failure?{failure:failureContext(result.reason)}:{})};
  }
  const api = Object.freeze({parseTable,parseDiscovery});
  root.SparkleQueueParser = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
