// Short-lived Vercel development identity, scoped to the exact preview origin.
// Never forward credentials to font/CDN/analytics origins or persist them.
exports.authenticatePreview = async function(context, base) {
  const token = process.env.VERCEL_OIDC_TOKEN;
  if (!token) return;
  const origin = new URL(base).origin;
  await context.route(origin+'/**', route => route.continue({headers:{...route.request().headers(),'x-vercel-trusted-oidc-idp-token':token}}));
};
