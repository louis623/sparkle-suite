'use strict';

// Local synthetic Smoke helpers only; install before Playwright/auth imports.
// Never serialize errors, requests,
// response bodies, console arguments, stacks, or transport diagnostics.
const write = process.stderr.write.bind(process.stderr);
const events = new Set([
  'HELPER_OUTPUT_SUPPRESSED',
  'HELPER_FAILED',
  'HELPER_UNHANDLED_REJECTION',
  'HELPER_UNCAUGHT_EXCEPTION',
  'HELPER_ROUTE_FAILED',
  'HELPER_CLOSE_FAILED',
]);
function emit(event) {
  write((events.has(event) ? event : 'HELPER_OUTPUT_SUPPRESSED') + '\n');
}
for (const method of ['log', 'error', 'warn', 'info', 'debug', 'dir', 'trace']) {
  console[method] = () => emit('HELPER_OUTPUT_SUPPRESSED');
}
function suppressWrite(_chunk, encoding, callback) {
  emit('HELPER_OUTPUT_SUPPRESSED');
  const done = typeof encoding === 'function' ? encoding : callback;
  if (typeof done === 'function') done();
  return true;
}
process.stdout.write = suppressWrite;
process.stderr.write = suppressWrite;
process.on('unhandledRejection', () => {
  emit('HELPER_UNHANDLED_REJECTION');
  process.exit(1);
});
process.on('uncaughtException', () => {
  emit('HELPER_UNCAUGHT_EXCEPTION');
  process.exit(1);
});

// Await/catch all route failures, including cancellation during browser close.
function guardRoute(handler, onFailure) {
  return async route => {
    try {
      await handler(route);
    } catch {
      emit('HELPER_ROUTE_FAILED');
      try { onFailure(); } catch {}
      try { await route.abort(); } catch {}
    }
  };
}
module.exports = { emit, guardRoute };
