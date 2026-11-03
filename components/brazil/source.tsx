export function Source({href, children}: {href: string; children: React.ReactNode}) { return <a className="source-link" href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>; }
