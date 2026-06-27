const calculateMatch = (resume, jobDescription) => {
    if (!jobDescription || typeof jobDescription !== 'string') {
        return { matchScore: 0, matchingSkills: [] };
    }

    const jdLower = jobDescription.toLowerCase();

    // Extract skills safely from the resume
    const profile = resume.linkedinData || {};
    const rawSkills = profile.skills || [];

    // Clean up skills
    const skillsList = rawSkills.map(skill =>
        typeof skill === 'string' ? skill : skill.name || ''
    ).filter(Boolean);

    const matchingSkills = [];

    // Check if each skill exists in the job description
    skillsList.forEach(skill => {
        if (jdLower.includes(skill.toLowerCase())) {
            matchingSkills.push(skill);
        }
    });

    // Calculate the score (cap it at 100%)
    let score = Math.round((matchingSkills.length / 10) * 100);
    if (score > 100) score = 100;

    return {
        matchScore: score,
        matchingSkills: matchingSkills
    };
};

module.exports = { calculateMatch };