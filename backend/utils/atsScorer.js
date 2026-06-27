const calculateATSScore = (linkedinData) => {
    let score = 0;

    // 1. Defend against empty data
    if (!linkedinData || typeof linkedinData !== 'object') {
        return 0;
    }

    // 2. Grade Skills (Max 40 points)
    if (linkedinData.skills && Array.isArray(linkedinData.skills)) {
        const skillCount = linkedinData.skills.length;
        score += Math.min(skillCount * 4, 40);
    }

    // 3. Grade Experience (Max 40 points)
    const experienceData = linkedinData.experience || linkedinData.positions;
    if (experienceData && Array.isArray(experienceData)) {
        const jobCount = experienceData.length;
        score += Math.min(jobCount * 15, 40);
    }

    // 4. Grade Education (Max 20 points)
    const educationData = linkedinData.education || linkedinData.educations;
    if (educationData && Array.isArray(educationData) && educationData.length > 0) {
        score += 20;
    }

    return score;
};

// Use CommonJS export to match our backend setup
module.exports = { calculateATSScore };