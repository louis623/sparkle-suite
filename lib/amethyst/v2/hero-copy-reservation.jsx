const React = window.React;

// No effects, image/video assets, IDs or extra accessible headings in the sizing
// copy. Its text and original classes reserve exactly the saved content's size
// at every width, before the visible copy enters a streamed response.
function sizingCopy(node) {
  if (!React.isValidElement(node)) return node;
  const { children, id, ...props } = node.props;
  const type = typeof node.type === 'string' && /^h[1-6]$/.test(node.type) ? 'div' : node.type;
  return React.createElement(type, props, React.Children.map(children, sizingCopy));
}

export function HeroCopyReservation({ enabled, children }) {
  if (!enabled) return children;
  const copy = sizingCopy(children);
  return <div className="ssr-hero-copy">
    {React.cloneElement(copy, { 'data-ssr-reservation': '', 'aria-hidden': true, inert: true })}
    {children}
  </div>;
}
