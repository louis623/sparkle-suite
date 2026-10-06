import { Children, isValidElement, type ChangeEvent, type FormEvent, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Match the existing hook-boundary UI tests without adding a DOM dependency.
// Real handlers and ReactDOM markup run; browser validity and network are injected.
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const slot = hooks.cursor++
    if (!(slot in hooks.values)) hooks.values[slot] = initial
    return [hooks.values[slot], (next: unknown) => {
      hooks.values[slot] = typeof next === 'function' ? next(hooks.values[slot]) : next
    }]
  },
  useEffect: () => {},
}))

import { PrelaunchWaitlistForm } from '@/app/prelaunch/_components/PrelaunchWaitlistForm'

type NodeProps = {
  children?: ReactNode
  name?: string
  type?: string
  value?: string
  disabled?: boolean
  className?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit?: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

function nodes(node: ReactNode): ReactElement<NodeProps>[] {
  return Children.toArray(node).flatMap(child => {
    if (!isValidElement<NodeProps>(child)) return []
    return [child, ...nodes(child.props.children)]
  })
}
function render() {
  hooks.cursor = 0
  return PrelaunchWaitlistForm()
}
function change(name: string, value: string) {
  const field = nodes(render()).find(node => node.props.name === name && node.props.onChange)
  expect(field).toBeDefined()
  field!.props.onChange!({ currentTarget: { name, value, type: 'text' } } as ChangeEvent<HTMLInputElement>)
}
function submit(valid = true) {
  const form = nodes(render()).find(node => node.type === 'form')!
  const reportValidity = vi.fn(() => valid)
  const preventDefault = vi.fn()
  const pending = form.props.onSubmit!({
    currentTarget: { reportValidity }, preventDefault,
  } as unknown as FormEvent<HTMLFormElement>)
  return { pending, reportValidity, preventDefault }
}
const fetchMock = vi.fn()

beforeEach(() => {
  hooks.values = []
  hooks.cursor = 0
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('HTMLInputElement', class {})
  vi.stubGlobal('window', {
    location: { search: '?src=TikTok&campaign=Plum_Review&email=do-not-forward@example.com' },
    sessionStorage: { getItem: () => null },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('build-queue form submission (provider-free)', () => {
  it('reports invalid browser fields and never sends the form', async () => {
    const html = renderToStaticMarkup(render())
    expect(html).toMatch(/<input(?=[^>]*name="name")(?=[^>]*required="")[^>]*>/)
    expect(html).toMatch(/<input(?=[^>]*name="email")(?=[^>]*required="")(?=[^>]*type="email")[^>]*>/)
    const { pending, reportValidity, preventDefault } = submit(false)
    await pending
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(reportValidity).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(renderToStaticMarkup(render())).not.toContain('ss-form-wrap is-sent')
  })

  it('submits normalized campaign labels and shows the call/payment/no-reservation confirmation', async () => {
    change('name', 'TEST Queue')
    change('email', 'queue@example.com')
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, welcomeEmail: { status: 'skipped' } }) })
    const { pending } = submit()
    const sending = nodes(render()).find(node => node.type === 'button' && node.props.type === 'submit')!
    expect(sending.props.disabled).toBe(true)
    expect(renderToStaticMarkup(render())).toContain('Sending your details')
    await pending
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/prelaunch/waitlist')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual(expect.objectContaining({
      name: 'TEST Queue', email: 'queue@example.com', smsConsent: false,
      attribution: { src: 'tiktok', campaign: 'plum_review' },
    }))
    expect(options.body).not.toContain('do-not-forward')
    const html = renderToStaticMarkup(render())
    expect(html).toContain('ss-form-wrap is-sent')
    expect(html).toContain('role="status"')
    expect(html).toContain('30-minute call')
    expect(html).toContain('No payment has been taken.')
    expect(html).toContain('Your build starts once your first month and setup fee are paid.')
    expect(html).toContain('Joining the queue does not reserve founder pricing.')
  })

  it.each(['response', 'network'])('retains fields after a %s failure and leaves submit available for retry', async failure => {
    change('name', 'TEST Queue')
    change('email', 'queue@example.com')
    if (failure === 'response') fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'Please try again.' }) })
    else fetchMock.mockRejectedValue(new Error('Connection interrupted. Please try again.'))
    await submit().pending
    const tree = render()
    expect(nodes(tree).find(node => node.props.name === 'name')?.props.value).toBe('TEST Queue')
    expect(nodes(tree).find(node => node.props.name === 'email')?.props.value).toBe('queue@example.com')
    expect(nodes(tree).find(node => node.type === 'button' && node.props.type === 'submit')?.props.disabled).toBe(false)
    const html = renderToStaticMarkup(tree)
    expect(html).toContain('role="alert"')
    expect(html).toContain('Please try again.')
    expect(html).not.toContain('ss-form-wrap is-sent')
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
