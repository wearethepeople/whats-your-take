import { SiteFooter, SiteHeader } from "~/components/site-chrome";

export function meta() {
  return [{ title: "Page not found · What’s Your Take?" }];
}

export function loader() {
  throw new Response("Not Found", { status: 404 });
}

export default function NotFound() {
  return null;
}

export function ErrorBoundary() {
  return (
    <div className="flex min-h-screen flex-col font-sans text-foreground">
      <SiteHeader />

      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <h1 className="font-serif text-4xl font-semibold sm:text-5xl">Page not found.</h1>
        <p className="text-muted-foreground">We couldn&rsquo;t find that page.</p>
      </main>

      <SiteFooter />
    </div>
  );
}
