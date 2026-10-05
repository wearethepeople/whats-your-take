import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NarrativeMarkdown } from "~/components/narrative-markdown";

const render = (source: string) =>
  renderToStaticMarkup(createElement(NarrativeMarkdown, { source }));

describe("NarrativeMarkdown", () => {
  it("renders emphasis and lists", () => {
    const html = render("A **good** day.\n\n- one\n- two");
    expect(html).toContain("<strong>good</strong>");
    expect(html).toContain("<ul");
    expect(html).toContain("<li>one</li>");
  });

  it("renders plain multi-paragraph text as paragraphs", () => {
    const html = render("First.\n\nSecond.");
    expect(html.match(/<p>/g)).toHaveLength(2);
  });

  it("drops raw HTML, scripts, and images", () => {
    for (const source of [
      "<script>alert(1)</script>",
      '<img src="https://evil.example/x.png">',
      "![x](https://evil.example/x.png)",
      '<a href="https://evil.example" onclick="x()">hi</a>',
      "<iframe src='https://evil.example'></iframe>",
    ]) {
      const html = render(source);
      expect(html, source).not.toMatch(/<(script|img|iframe)/i);
      expect(html, source).not.toMatch(/onclick/i);
    }
  });

  it("strips javascript: link targets but keeps the text", () => {
    const html = render("[click](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<a");
    expect(html).toContain("click");
  });

  it("opens http(s) links safely", () => {
    const html = render("[site](https://example.com)");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("demotes h1 so the event name stays the only h1", () => {
    expect(render("# Title")).not.toContain("<h1");
  });
});
