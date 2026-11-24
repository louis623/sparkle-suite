export function sitePreviewFrameAttributes(themeLabel: string) {
  const label = themeLabel.replace(/[\r\n]+/g, ' ').trim()
  return {
    title: `Preview of your site in ${label}`,
    sandbox: 'allow-scripts',
    referrerPolicy: 'no-referrer',
  } as const
}

/** Shared srcdoc frame. Chunk 2 places it on the My Website page. */
export function SitePreviewFrame({ html, themeLabel }: { html: string; themeLabel: string }) {
  const frame = sitePreviewFrameAttributes(themeLabel)
  return (
    <iframe
      title={frame.title}
      sandbox={frame.sandbox}
      referrerPolicy={frame.referrerPolicy}
      srcDoc={html}
    />
  )
}
