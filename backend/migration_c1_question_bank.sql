-- C1: Seed default competency question bank with BARS + cross-validation questions
-- Run in Supabase SQL editor (dev first, then prod after merge to main)

INSERT INTO app_settings (key, value) VALUES ('competency_question_bank', '{
  "version": "v1",
  "competencies": {
    "commercial_acumen": {
      "bars": {
        "1": "Relies on others to identify revenue opportunities; limited understanding of P&L drivers",
        "2": "Identifies straightforward opportunities in existing accounts; understands basic financials",
        "3": "Proactively develops multi-year account strategies; manages complex deal structures",
        "4": "Creates new market segments; consistently exceeds targets through innovative commercial approaches"
      },
      "questions": [
        {"id": "ca_q1", "type": "frequency", "text": "How often do you identify new revenue opportunities beyond your current pipeline?", "anchors": {"1": "Rarely", "2": "Occasionally", "3": "Regularly", "4": "Consistently"}},
        {"id": "ca_q2", "type": "situational", "text": "What is your typical role in pricing and commercial negotiations?", "anchors": {"1": "Observer", "2": "Support role", "3": "Co-lead", "4": "Full ownership"}},
        {"id": "ca_q3", "type": "frequency", "text": "How often do you lead deal structuring for complex engagements?", "anchors": {"1": "Never", "2": "Occasionally", "3": "Most deals", "4": "Always"}}
      ]
    },
    "client_relationship": {
      "bars": {
        "1": "Maintains existing client contacts reactively; limited executive-level access",
        "2": "Builds trusted advisor status with direct clients; some C-suite exposure",
        "3": "Develops deep multi-level relationships across client organizations; regular C-suite engagement",
        "4": "Recognized as strategic partner by client leadership; shapes client''s strategic direction"
      },
      "questions": [
        {"id": "cr_q1", "type": "frequency", "text": "How often do you engage directly with C-suite or senior executives at client organizations?", "anchors": {"1": "Rarely", "2": "Quarterly", "3": "Monthly", "4": "Weekly"}},
        {"id": "cr_q2", "type": "situational", "text": "When a client escalation occurs, what is your typical role?", "anchors": {"1": "Informed after resolution", "2": "Support the response", "3": "Lead the response", "4": "Proactively prevent through relationships"}},
        {"id": "cr_q3", "type": "frequency", "text": "How often do clients proactively seek your strategic input beyond the current engagement?", "anchors": {"1": "Never", "2": "Occasionally", "3": "Regularly", "4": "Frequently"}}
      ]
    },
    "leadership": {
      "bars": {
        "1": "Manages assigned team tasks; limited influence beyond immediate team",
        "2": "Develops team capabilities; earns respect from direct reports and peers",
        "3": "Inspires cross-functional teams; recognized as a talent developer across the practice",
        "4": "Shapes organizational culture; attracts and retains top talent firm-wide"
      },
      "questions": [
        {"id": "ld_q1", "type": "frequency", "text": "How often do team members or peers seek your mentorship or coaching?", "anchors": {"1": "Rarely", "2": "Occasionally", "3": "Regularly", "4": "Frequently"}},
        {"id": "ld_q2", "type": "situational", "text": "When facing team conflict or underperformance, what is your typical approach?", "anchors": {"1": "Escalate to management", "2": "Address with direct guidance", "3": "Coach toward resolution", "4": "Create systemic solutions"}},
        {"id": "ld_q3", "type": "frequency", "text": "How often do you lead initiatives that develop talent beyond your direct team?", "anchors": {"1": "Never", "2": "Annually", "3": "Quarterly", "4": "Monthly"}}
      ]
    },
    "practice_building": {
      "bars": {
        "1": "Contributes to existing practice offerings; limited involvement in growth strategy",
        "2": "Develops new service offerings within existing practice areas; supports business development",
        "3": "Drives practice growth through new capabilities, partnerships, or market expansion",
        "4": "Transforms practice direction; creates industry-leading capabilities that generate significant new revenue"
      },
      "questions": [
        {"id": "pb_q1", "type": "frequency", "text": "How often do you contribute to developing new service offerings or capabilities?", "anchors": {"1": "Rarely", "2": "Annually", "3": "Quarterly", "4": "Monthly"}},
        {"id": "pb_q2", "type": "situational", "text": "What is your role in your practice''s go-to-market strategy?", "anchors": {"1": "Execute assigned tasks", "2": "Provide input", "3": "Co-develop strategy", "4": "Set strategic direction"}},
        {"id": "pb_q3", "type": "frequency", "text": "How often do you bring in new partnerships, alliances, or ecosystem relationships for the practice?", "anchors": {"1": "Never", "2": "Rarely", "3": "Occasionally", "4": "Regularly"}}
      ]
    },
    "executive_presence": {
      "bars": {
        "1": "Communicates clearly in small groups; less comfortable in high-stakes or large-audience settings",
        "2": "Presents confidently to senior audiences; holds attention in most situations",
        "3": "Commands the room in executive settings; influences decisions through communication style",
        "4": "Recognized as a compelling thought leader; shapes opinions at industry and board level"
      },
      "questions": [
        {"id": "ep_q1", "type": "frequency", "text": "How often do you present to senior leadership or large audiences (50+)?", "anchors": {"1": "Rarely", "2": "Quarterly", "3": "Monthly", "4": "Weekly"}},
        {"id": "ep_q2", "type": "situational", "text": "When challenged publicly on your recommendations, how do you typically respond?", "anchors": {"1": "Defer to others", "2": "Defend with prepared data", "3": "Engage constructively and adapt", "4": "Turn pushback into alignment"}},
        {"id": "ep_q3", "type": "frequency", "text": "How often are you specifically requested to represent the firm in high-stakes client or industry settings?", "anchors": {"1": "Never", "2": "Occasionally", "3": "Regularly", "4": "Frequently"}}
      ]
    },
    "strategic_thinking": {
      "bars": {
        "1": "Focuses primarily on tactical execution; limited consideration of long-term implications",
        "2": "Connects current work to broader business goals; identifies emerging trends",
        "3": "Develops multi-year strategies; anticipates market shifts and positions proactively",
        "4": "Shapes firm and industry direction through original strategic insights and bold bets"
      },
      "questions": [
        {"id": "st_q1", "type": "frequency", "text": "How often do you proactively identify market trends or shifts that influence your practice''s direction?", "anchors": {"1": "Rarely", "2": "Occasionally", "3": "Regularly", "4": "Continuously"}},
        {"id": "st_q2", "type": "situational", "text": "When making decisions, how far ahead do you typically plan?", "anchors": {"1": "Current quarter", "2": "6-12 months", "3": "1-2 years", "4": "3+ years"}},
        {"id": "st_q3", "type": "frequency", "text": "How often do your strategic recommendations influence decisions above your level?", "anchors": {"1": "Rarely", "2": "Occasionally", "3": "Regularly", "4": "Frequently"}}
      ]
    },
    "delivery_excellence": {
      "bars": {
        "1": "Delivers assigned work on time; relies on established processes and guidance",
        "2": "Manages projects independently; consistently meets quality and timeline expectations",
        "3": "Leads complex multi-workstream engagements; resolves delivery risks proactively",
        "4": "Sets delivery standards for the practice; rescues distressed engagements and creates replicable frameworks"
      },
      "questions": [
        {"id": "de_q1", "type": "frequency", "text": "How often do you lead engagements with multiple workstreams or cross-functional teams?", "anchors": {"1": "Rarely", "2": "Occasionally", "3": "Regularly", "4": "Always"}},
        {"id": "de_q2", "type": "situational", "text": "When a project faces significant delivery risk, what is your typical role?", "anchors": {"1": "Flag to leadership", "2": "Propose mitigations", "3": "Lead recovery", "4": "Prevent through proactive risk management"}},
        {"id": "de_q3", "type": "frequency", "text": "How often do you create or improve delivery frameworks, methodologies, or tools used by others?", "anchors": {"1": "Never", "2": "Rarely", "3": "Occasionally", "4": "Regularly"}}
      ]
    }
  }
}')
ON CONFLICT (key) DO NOTHING;
