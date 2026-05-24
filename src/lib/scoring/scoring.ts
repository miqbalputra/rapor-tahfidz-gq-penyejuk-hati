import type { AssessmentType, PredicateRule } from "@/types/domain";

export type ScoreInput = Record<string, number>;

export function calculateTotal(assessment: AssessmentType, values: ScoreInput) {
  const scores = assessment.components.map((component) => {
    const rawValue = values[component.code] ?? 0;
    return Math.min(Math.max(rawValue, 0), component.maxScore);
  });

  if (assessment.totalFormula === "average") {
    return scores.length === 0 ? 0 : roundScore(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  if (assessment.totalFormula === "manual") {
    return roundScore(values.total ?? 0);
  }

  return roundScore(scores.reduce((sum, score) => sum + score, 0));
}

export function getPredicate(score: number, rules: PredicateRule[]) {
  return rules.find((rule) => score >= rule.min && score <= rule.max)?.label ?? "-";
}

export function isTahfidzPassed(total: number, fluencyMistakes: number | undefined, assessment: AssessmentType) {
  const passesScore = assessment.passingMinScore ? total >= assessment.passingMinScore : true;
  const passesMistakes =
    typeof assessment.maxFluencyMistakes === "number" && typeof fluencyMistakes === "number"
      ? fluencyMistakes <= assessment.maxFluencyMistakes
      : true;

  return passesScore && passesMistakes;
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

