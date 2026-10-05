// Renders a host-authored event narrative (Markdown source) on the public
// event page. Restricted subset: no images, no raw HTML — images would make
// visitors' browsers load third-party resources (I1/I6). react-markdown emits
// React elements, so there is no dangerouslySetInnerHTML; with no CSP in the
// app, this allowlist is the XSS defence.

import ReactMarkdown, { type Components } from "react-markdown";
import { cn } from "~/lib/utils";

const ALLOWED_ELEMENTS = [
  "p",
  "em",
  "strong",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "a",
  "br",
  "hr",
  "code",
];

const SAFE_HREF = /^(https?:|mailto:)/i;

// The event name is the page's only <h1>, so narrative headings start at h2.
const components: Components = {
  h1: ({ node: _node, ...props }) => <h2 className="mt-4 text-xl font-semibold" {...props} />,
  h2: ({ node: _node, ...props }) => <h2 className="mt-4 text-xl font-semibold" {...props} />,
  h3: ({ node: _node, ...props }) => <h3 className="mt-3 text-lg font-semibold" {...props} />,
  h4: ({ node: _node, ...props }) => <h4 className="mt-3 font-semibold" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="list-disc pl-6" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="list-decimal pl-6" {...props} />,
  blockquote: ({ node: _node, ...props }) => (
    <blockquote className="border-l-2 border-primary pl-4 italic" {...props} />
  ),
  code: ({ node: _node, ...props }) => <code className="font-mono text-sm" {...props} />,
  a: ({ node: _node, href, ...props }) =>
    href && SAFE_HREF.test(href) ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
        {...props}
      />
    ) : (
      <span {...props} />
    ),
};

export function NarrativeMarkdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn("flex max-w-prose flex-col gap-4 text-muted-foreground", className)}>
      <ReactMarkdown
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        skipHtml
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
