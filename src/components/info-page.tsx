import Link from "next/link";

export type InfoSection = { heading: string; paragraphs: string[] };

export function InfoPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: InfoSection[];
}) {
  return (
    <main className="info-page page-shell">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span>{title}</div>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}<span className="period">.</span></h1>
      <p className="info-intro">{intro}</p>
      <div className="info-sections">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
      </div>
    </main>
  );
}
