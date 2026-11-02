export function ReviewScore({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return null;
  return (
    <p className="review-score" aria-label={`Our editorial score: ${score} out of 10`}>
      <strong>{score.toFixed(1)}<small> / 10</small></strong>
      <span>OUR EDITORIAL SCORE</span>
    </p>
  );
}
