const { test } = require("node:test");
const assert = require("node:assert/strict");
const { calculateMatch } = require("./jobMatcher");

test("scores the percentage of resume skills matching the job description", () => {
  const resume = {
    linkedinData: {
      skills: ["JavaScript", "React", "Docker"],
    },
  };

  const result = calculateMatch(
    resume,
    "Looking for a React and Docker engineer",
  );

  assert.equal(result.matchScore, 67);
  assert.deepEqual(result.matchingSkills, ["React", "Docker"]);
});

test("returns a zero score when the job description is missing", () => {
  const result = calculateMatch(
    { parsedText: "Python developer" },
    "",
  );

  assert.deepEqual(result, {
    matchScore: 0,
    matchingSkills: [],
  });
});

test("scores PDF resume text when there are no structured skills", () => {
  const resume = {
    parsedText: "Built Python APIs using FastAPI",
  };

  const result = calculateMatch(
    resume,
    "Python developer with FastAPI",
  );

  assert.equal(result.matchScore, 67);
  assert.deepEqual(result.matchingSkills, ["python", "fastapi"]);
});