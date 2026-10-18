export default function PaymentCancelledPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16 text-slate-950">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Sparkle Suite</p>
      <h1 className="mt-3 text-3xl font-semibold">Payment was not completed</h1>
      <p className="mt-4 text-base leading-7 text-slate-700">
        The payment link can be sent again. The account is created only after the payment goes through.
      </p>
    </main>
  )
}