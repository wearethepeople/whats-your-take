export function meta() {
  return [
    { title: "What's Your Take?" },
    {
      name: "description",
      content:
        "A pop-up civic guestbook from We (ARE) the People. One question, answered anonymously, shared publicly.",
    },
  ];
}

export default function Home() {
  return (
    <main className="container">
      <h1>What&rsquo;s Your Take?</h1>
      <p>
        A pop-up civic guestbook from We (ARE) the People. Under a shaded canopy, a table asks one
        question. Responses are anonymous by design &mdash; and shared publicly, and we say so right
        on the card.
      </p>
      <p>
        This site is under construction. Event pages, the browsable corpus, and the season&rsquo;s
        portrait will appear here after the first table closes.
      </p>
    </main>
  );
}
