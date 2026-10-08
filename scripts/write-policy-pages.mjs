import { mkdirSync, writeFileSync } from "node:fs";
import { privacySections, supportSections } from "../src/content/policies.js";

function page({ title, lede, sections, path }) {
  const blocks = sections.map((section) => `<h2>${section.heading}</h2>\n<p>${section.body}</p>`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin: 0; font-family: Georgia, serif; background: #070b14; color: #e2e8f0; }
    main { max-width: 40rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    a { color: #fde68a; }
    h1 { font-family: Palatino, Georgia, serif; }
    p, li { line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <p><a href="/">Secret Gifter</a></p>
    <h1>${title}</h1>
    <p>${lede}</p>
    ${blocks}
    <p><a href="${path === "/privacy/" ? "/support/" : "/privacy/"}">${path === "/privacy/" ? "Support" : "Privacy policy"}</a></p>
  </main>
</body>
</html>
`;
}

mkdirSync("public/privacy", { recursive: true });
mkdirSync("public/support", { recursive: true });
writeFileSync("public/privacy/index.html", page({
  title: "Privacy policy",
  lede: "This page describes what Secret Gifter stores.",
  sections: privacySections,
  path: "/privacy/",
}));
writeFileSync("public/support/index.html", page({
  title: "Support",
  lede: "This is the public contact page for Secret Gifter.",
  sections: supportSections,
  path: "/support/",
}));
