const stopwords = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "are",
  "was",
  "were",
  "will",
  "has",
  "have",
  "had",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "by",
  "as",
  "at",
  "be",
  "is",
  "it",
  "its",
  "your",
  "you",
  "our",
  "we",
  "or",
  "but",
  "if",
  "also",
  "into",
  "over",
  "under",
  "these",
  "those",
  "their",
  "them",
]);

const tokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopwords.has(word));

const calculateMatch = (resume, jobDescription) => {
  if (!jobDescription || typeof jobDescription !== "string") {
    return { matchScore: 0, matchingSkills: [] };
  }

  const jdTerms = [...new Set(tokenize(jobDescription))];
  if (jdTerms.length === 0) {
    return { matchScore: 0, matchingSkills: [] };
  }

  const profile = resume.linkedinData || {};
  const rawSkills = profile.skills || [];
  const skillsList = rawSkills
    .map((skill) => (typeof skill === "string" ? skill : skill.name || ""))
    .filter(Boolean);

  if (skillsList.length > 0) {
    const matchingSkills = skillsList.filter((skill) =>
      jdTerms.some((term) => skill.toLowerCase().includes(term)),
    );

    let score = Math.round(
      (matchingSkills.length / Math.max(skillsList.length, 1)) * 100,
    );
    if (score > 99) score = 99;

    return {
      matchScore: score,
      matchingSkills,
    };
  }

  const parsedText = (resume.parsedText || "").trim();
  if (parsedText.length === 0) {
    return { matchScore: 0, matchingSkills: [] };
  }

  const resumeTerms = new Set(tokenize(parsedText));
  const matchingSkills = jdTerms.filter((term) => resumeTerms.has(term));
  let score = Math.round((matchingSkills.length / jdTerms.length) * 100);
  if (score > 99) score = 99;

  return {
    matchScore: score,
    matchingSkills,
  };
};

module.exports = { calculateMatch };
