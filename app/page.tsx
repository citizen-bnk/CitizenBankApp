import { SHELL_HTML } from "./shell-html";

export const dynamic = "force-static";

/**
 * The mobile app shell. Markup and styles come straight from the Citizen AI
 * prototype; /mobile/app.js fetches the customer's data from Core and brings
 * it to life. Scripts are plain deferred tags so they run once, in order.
 */
export default function MobileApp() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/mobile/app.css" precedence="default" />
      <div id="app-root" style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />
      <script src="/vendor/anime.min.js" defer />
      <script src="/mobile/app.js" defer />
    </>
  );
}
