import type { Metadata } from "next";
import Link from "next/link";
import { EditorialArt } from "@/components/editorial-art";
import { StoryCard } from "@/components/story-card";
import { stories } from "@/lib/content";
import { pageMetadata } from "@/lib/page-metadata";
import { SITE_DESCRIPTION } from "@/lib/site";
import { getPublishedCmsArticles, toStorySummary } from "@/lib/cms-content";

export const metadata: Metadata = pageMetadata({
  title: "Vegas Unfiltered — Eat like a local. Party like a local. Save like a local.",
  description: SITE_DESCRIPTION,
  path: "",
});

export default async function Home() {
  const cmsLatest = (await getPublishedCmsArticles()).map(toStorySummary);
  const latest = cmsLatest.length ? cmsLatest : stories.slice(0, 4);
  const feature = cmsLatest[0] ?? stories[4];
  const sideStories = cmsLatest.length ? cmsLatest.slice(1, 4) : latest.slice(0, 3);

  return (
    <main>
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="hero-art-wrap">
          <EditorialArt
            alt="Original illustrated Las Vegas streetscape at dusk, made for this development preview"
            className="hero-art"
            priority
            src="/art/las-vegas-night.svg"
          />
        </div>
        <div className="hero-scrim" />
        <div className="hero-content page-shell">
          <p className="hero-kicker"><span /> THE CITY, WITHOUT THE FILTER</p>
          <h1 id="hero-title">THIS AIN’T<br />THE VEGAS<br /><em>THEY SELL YOU.</em></h1>
          <p className="hero-description">
            Real food. Real people. Real prices. Discover Las Vegas through the eyes
            of the people who live here.
          </p>
          <Link className="button button-light" href="/explore">
            EXPLORE THE REAL VEGAS <span aria-hidden="true">↗</span>
          </Link>
          <p className="hero-tagline">Eat like a local. Party like a local. Save like a local.</p>
        </div>
        <div className="hero-index"><span>36°10&apos; N</span><span>THE OTHER SIDE OF VEGAS</span></div>
      </section>

      <div className="ticker" aria-label="Our editorial promise">
        <div>NO PAID PRAISE <i>✳</i> NO MADE-UP TOTALS <i>✳</i> JUST THE CITY AS IT IS <i>✳</i> NO PAID PRAISE <i>✳</i></div>
      </div>

      <section className="latest-section section-pad page-shell" aria-labelledby="latest-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">NOT A TOP TEN LIST</span>
            <h2 id="latest-heading">Latest from<br /><em>the streets.</em></h2>
          </div>
          <p>Stories with a little dust on their shoes and a reason to exist.</p>
        </div>
        <div className="latest-layout">
          <div className="feature-story">
            <span className="feature-number">{cmsLatest.length ? "01 / LATEST REPORTING" : "01 / IN THE WORKS"}</span>
            <StoryCard size="feature" story={feature} />
          </div>
          <div className="latest-list">
            {sideStories.map((story, index) => (
              <div className="latest-item" key={story.slug}>
                <span className="latest-index">0{index + 2}</span>
                <StoryCard size="compact" story={story} />
              </div>
            ))}
            <Link className="text-link" href="/stories">MORE STORIES <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        {!cmsLatest.length && <p className="homepage-draft-note">
          These are demonstration concepts, not published reporting. Real stories
          come before search rankings.
        </p>}
      </section>

      <section className="eat-section section-pad">
        <div className="eat-intro page-shell">
          <div>
            <span className="eyebrow">COME HUNGRY, NOT CONVINCED</span>
            <h2>Eat like<br /><em>a local.</em></h2>
          </div>
          <div className="eat-copy">
            <p>
              No velvet ropes. No fake rankings. Just a future full of honest
              neighborhood meals, what they cost, and the people behind them.
            </p>
            <Link className="button button-dark" href="/eat">TAKE A LOOK AROUND <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="eat-feature page-shell">
          <EditorialArt
            alt="Original development illustration of a neighborhood diner"
            className="eat-art"
            src="/art/diner.svg"
          />
          <div className="eat-feature-note">
            <span className="eyebrow">ON THE EDITOR&apos;S TABLE</span>
            <h3>A good meal<br />doesn&apos;t need<br /><em>a dress code.</em></h3>
            <p>Affordable finds, late-night plates, and little places worth knowing.</p>
            <Link className="text-link" href="/eat/cheap-eats-las-vegas">THE GUIDE IN PROGRESS <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="receipt-section section-pad page-shell" aria-labelledby="receipt-heading">
        <div className="receipt-title">
          <span className="eyebrow">NO GUESSING. SHOW YOUR WORK.</span>
          <h2 id="receipt-heading">The<br /><em>receipt.</em></h2>
        </div>
        <div className="receipt-paper">
          <div className="receipt-top"><span>THE REAL VEGAS, ITEMIZED</span><span>ISSUE 001</span></div>
          <p className="receipt-placeholder">
            THE TOTAL COMES<br />AFTER THE MEAL.
          </p>
          <p className="receipt-explainer">
            Every future total will be backed by a real visit and a dated receipt.
            Until then, we leave the numbers blank.
          </p>
          <div className="receipt-bottom"><span>NO MADE-UP MATH.</span><span>THAT&apos;S A PROMISE.</span></div>
        </div>
        <p className="receipt-side-note">A recurring series about what a night out actually costs.</p>
      </section>

      <section className="neighborhood-section">
        <div className="neighborhood-art">
          <EditorialArt
            alt="Original development illustration inspired by a Las Vegas neighborhood street"
            className="neighborhood-image"
            src="/art/chinatown.svg"
          />
        </div>
        <div className="neighborhood-copy">
          <span className="eyebrow">PAST THE POSTCARD</span>
          <h2>Beyond<br />the <em>Strip.</em></h2>
          <p>
            Las Vegas is a collection of neighborhoods, not a single boulevard.
            We&apos;re making room for the places that rarely make the brochure.
          </p>
          <div className="neighborhood-links">
            {["Chinatown", "Downtown", "Arts District", "Henderson", "Summerlin"].map((place, index) => (
              <Link href="/explore" key={place}><span>0{index + 1}</span>{place}<b aria-hidden="true">↗</b></Link>
            ))}
          </div>
        </div>
      </section>

      <section className="interests-section section-pad page-shell">
        <div className="section-heading interests-heading">
          <div>
            <span className="eyebrow">PICK YOUR OWN ADVENTURE</span>
            <h2>Find your<br /><em>kind of Vegas.</em></h2>
          </div>
          <p>Useful guides are on the way. We&apos;ll publish them when they&apos;re ready.</p>
        </div>
        <div className="interest-list">
          {[
            ["01", "Cheap eats", "/eat"],
            ["02", "Date nights", "/stories"],
            ["03", "Nightlife", "/drink"],
            ["04", "Hidden gems", "/explore"],
            ["05", "Late-night food", "/eat"],
            ["06", "Budget days out", "/save"],
          ].map(([index, label, href]) => (
            <Link href={href} key={label}><span>{index}</span><strong>{label}</strong><b aria-hidden="true">↗</b></Link>
          ))}
        </div>
      </section>

      <section className="newsletter-section">
        <div className="newsletter-inner page-shell">
          <div>
            <span className="eyebrow">NO SPAM. NO STRIP-MALL HYPE.</span>
            <h2>THE REAL VEGAS,<br /><em>STRAIGHT TO YOUR INBOX.</em></h2>
            <p>We&apos;ll open the list when there&apos;s something worth sending.</p>
          </div>
          <div className="newsletter-status">
            <span className="status-dot" />
            SIGNUP OPENS WHEN OUR EMAIL PROVIDER IS READY
          </div>
        </div>
      </section>

      <section className="closing-note page-shell">
        <span className="eyebrow">INDEPENDENT BY INTENTION</span>
        <p>We&apos;re here for the real thing.<br /><em>And we&apos;ll tell you when we find it.</em></p>
      </section>
    </main>
  );
}
