// Seed initial data for KennyOS
import { db, addPerson, addDecision, addKnowledgeArticle } from '../database/index.js';

// Seed people
const people = [
  { name: 'Dr. SO Tze Him (蘇醫生)', role: 'Medical Advisor', company: 'Dr.BaBa SPV' },
  { name: 'David Ooi', role: 'CMO', company: 'ChatDaddy' },
  { name: 'Shivonne Khoo', role: 'Lead Engineer', company: 'AOS 2.0' },
  { name: 'Emy Chan', role: 'COO', company: 'Dr.BaBa' },
  { name: 'Isaac', role: 'Co-Founder', company: 'Dr.BaBa' },
];

console.log('Seeding people...');
people.forEach(p => {
  try {
    addPerson(p.name, p.role, p.company);
    console.log(`  Added: ${p.name}`);
  } catch (e) {
    // May already exist
  }
});

// Seed decisions
const decisions = [
  { topic: 'Dr.BaBa SPV Structure', decision: 'Use SPV model with 蘇醫生 as Medical Advisor, Kenny as investment partner' },
  { topic: 'AOS 2.0 Architecture', decision: 'Gateway-as-Control-Plane pattern for WhatsApp AI agents' },
  { topic: 'ChatDaddy Focus', decision: 'Prioritize CS automation and LinkedIn outreach for revenue growth' },
];

console.log('Seeding decisions...');
decisions.forEach(d => {
  try {
    addDecision(d.topic, d.decision);
    console.log(`  Added: ${d.topic}`);
  } catch (e) {}
});

// Seed articles
const articles = [
  {
    url: 'https://sequoiacap.com/article/services-the-new-software/',
    title: 'Services Are The New Software',
    summary: 'AI shifting from copilots to autopilots. Next major companies will masquerade as services firms.'
  },
];

console.log('Seeding articles...');
articles.forEach(a => {
  try {
    addKnowledgeArticle(a.url, a.title, a.summary);
    console.log(`  Added: ${a.title}`);
  } catch (e) {}
});

console.log('\n✅ Seed complete!');
console.log('Run `bun run dev` to try CLI');
console.log('Run `bun run web` to try web interface');