import Link from "next/link";
import { EditorialArt } from "@/components/editorial-art";
import { StoryCard } from "@/components/story-card";
import { AdSenseUnit } from "@/components/adsense-unit";
import type { Story } from "@/lib/content";

export function HomeContent({ reviews }: { reviews: Story[] }) {
  return (
    <main>
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="hero-art-wrap">
          <EditorialArt alt="Original development illustration of Las Vegas at dusk" className="hero-art" priority showDevelopmentLabel src="/art/las-vegas-night.svg" />
        </div>
        <div className="hero-scrim" />
        <div className="hero-content page-shell">
          <p className="hero-kicker"><span /> OUR TIME OUT. OUR HONEST TAKE.</p>
          <h1 id="hero-title">WE WENT.<br />WE TRIED IT.<br /><em>HERE&apos;S THE TRUTH.</em></h1>
          <p className="hero-description">Restaurants, date nights, and things to do in Las Vegas. Our experiences together, what they cost, and whether we would go back.</p>
          <Link className="button button-light" href="/restaurants">READ OUR REVIEWS <span aria-hidden="true">↗</span></Link>
          <p className="hero-tagline">The food. The drinks. The experience. One honest review.</p>
        </div>
        <div className="hero-index"><span>LAS VEGAS, NEVADA</span><span>RESTAURANTS &amp; ACTIVITIES</span></div>
      </section>
      <div className="ticker" aria-label="Our review promise"><div>FIRSTHAND EXPERIENCES <i>✳</i> REAL COSTS <i>✳</i> NO GUARANTEED PRAISE <i>✳</i> OUR OWN VERDICTS <i>✳</i></div></div>
      <section className="latest-section section-pad page-shell" aria-labelledby="latest-heading">
        <div className="section-heading">
          <div><span className="eyebrow">THE STORY BEHIND THE SCORE</span><h2 id="latest-heading">Our latest<br /><em>reviews.</em></h2></div>
          <p>What we loved, what we didn&apos;t, and what you should know before going.</p>
        </div>
        <div className="category-story-grid">{reviews.slice(0, 4).map((review) => <StoryCard key={review.slug} story={review} />)}</div>
        {!reviews.length && <p className="review-empty-state">Our first reviews are on the way. Check back for firsthand experiences, real costs, and honest verdicts.</p>}
      </section>
      {reviews.length > 0 && <div className="page-shell homepage-ad"><AdSenseUnit placement="homepage-after-reviews" /></div>}
      <section className="eat-section section-pad">
        <div className="eat-intro page-shell">
          <div><span className="eyebrow">PICK YOUR NEXT TIME OUT</span><h2>Dinner or<br /><em>an adventure?</em></h2></div>
          <div className="eat-copy"><p>One place for the whole experience. Food, drinks, atmosphere, and value belong in the review, not separate departments.</p></div>
        </div>
        <div className="category-story-grid page-shell">
          <div><h3>Restaurants</h3><p>What we ordered, how it tasted, how we were treated, and the actual bill.</p><Link className="button button-dark" href="/restaurants">RESTAURANT REVIEWS ↗</Link></div>
          <div><h3>Activities</h3><p>What we did together, what was worth the time and money, and whether we would do it again.</p><Link className="button button-dark" href="/activities">ACTIVITY REVIEWS ↗</Link></div>
        </div>
      </section>
      <section className="receipt-section section-pad page-shell" aria-labelledby="receipt-heading">
        <div className="receipt-title"><span className="eyebrow">THE DETAILS MATTER</span><h2 id="receipt-heading">More than<br /><em>a number.</em></h2></div>
        <div className="receipt-paper">
          <div className="receipt-top"><span>OUR EDITORIAL SCORE</span><span>OUT OF 10</span></div>
          <p className="receipt-explainer">A score is our personal verdict, not a customer average. Read the story for the why, the cost, and the context. A hosted visit or sponsorship is disclosed and never buys a positive review.</p>
          <div className="receipt-bottom"><span>NO INVENTED SCORES.</span><span>NO HIDDEN DEALS.</span></div>
        </div>
        <p className="receipt-side-note"><Link href="/about">Meet us</Link> and read our <Link href="/editorial-policy">review policy</Link>.</p>
      </section>
    </main>
  );
}
