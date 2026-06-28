// frontend/src/components/AtsTemplate.jsx
import { forwardRef } from 'react';

const AtsTemplate = forwardRef(({ data }, ref) => {
  if (!data || !data.linkedinData) return null;

  const profile = data.linkedinData;
  const experience = profile.experience || profile.positions || [];
  const education = profile.education || profile.educations || [];
  const skills = profile.skills || [];

  return (
    <div ref={ref} className="p-10 max-w-4xl mx-auto bg-white text-black font-sans min-h-[1056px]">
      {/* HEADER */}
      <header className="border-b-2 border-black pb-4 mb-6 text-center">
        <h1 className="text-4xl font-bold uppercase tracking-wider">{data.title || "Professional Resume"}</h1>
        <p className="text-sm mt-2">
           LinkedIn Export • ATS Score: ({data.atsScore})/100
        </p>
      </header>

      {/* EXPERIENCE SECTION */}
      <section className="mb-6">
        <h2 className="text-xl font-bold uppercase tracking-widest border-b border-gray-300 mb-4 pb-1">
          Professional Experience
        </h2>
        {experience.map((job, index) => (
          <div key={index} className="mb-4">
            <div className="flex justify-between items-baseline">
              <h3 className="font-bold text-lg">{job.title || "Role Title"}</h3>
              <span className="text-sm font-semibold">{job.companyName || "Company"}</span>
            </div>
            <p className="text-sm mt-2 text-gray-700">
              {job.description || "• Led cross-functional teams to deliver key objectives.\n• Analyzed data to improve operational efficiency."}
            </p>
          </div>
        ))}
      </section>

      {/* EDUCATION SECTION */}
      <section className="mb-6">
        <h2 className="text-xl font-bold uppercase tracking-widest border-b border-gray-300 mb-4 pb-1">
          Education
        </h2>
        {education.map((edu, index) => (
          <div key={index} className="mb-2">
            <h3 className="font-bold">{edu.schoolName || "University Name"}</h3>
            <p className="text-sm">{edu.degreeName || "Degree"} • {edu.fieldOfStudy || "Field of Study"}</p>
          </div>
        ))}
      </section>

      {/* SKILLS SECTION */}
      <section>
        <h2 className="text-xl font-bold uppercase tracking-widest border-b border-gray-300 mb-4 pb-1">
          Core Competencies
        </h2>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span key={index} className="text-sm">
              {typeof skill === 'string' ? skill : skill.name || "Skill"}
              {index < skills.length - 1 ? " • " : ""}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
});

export default AtsTemplate;