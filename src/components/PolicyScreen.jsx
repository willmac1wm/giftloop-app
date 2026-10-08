import React from "react";

export default function PolicyScreen({ title, lede, sections, otherHref, otherLabel }) {
  return (
    <article className="glass-panel p-6 max-w-lg mx-auto space-y-3">
      <h2 className="text-xl font-bold font-heading text-white">{title}</h2>
      <p className="text-sm text-slate-300">{lede}</p>
      {sections.map((section) => (
        <section key={section.heading}>
          <h3 className="text-sm font-semibold text-white">{section.heading}</h3>
          <p className="text-sm text-slate-300 mt-1">{section.body}</p>
        </section>
      ))}
      <p className="text-sm"><a className="text-amber-200" href={otherHref}>{otherLabel}</a></p>
    </article>
  );
}
