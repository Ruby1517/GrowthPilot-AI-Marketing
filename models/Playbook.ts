export type Playbook = {
  id: string;
  name: string;
  prompt: string;           // system prompt for the assistant
  capture: boolean;         // whether to capture lead details
};
export const PLAYBOOKS: Playbook[] = [
  {
    id: "homepage",
    name: "Homepage Lead Qualifier",
    prompt:
      "You qualify inbound visitors. Ask 1–2 questions to learn need + timeline. Offer to collect name/email/company to connect with sales.",
    capture: true,
  },
  {
    id: "pricing",
    name: "Pricing Helper",
    prompt:
      "You explain pricing plans concisely and recommend a plan based on team size and use-cases. Offer a demo if uncertain.",
    capture: true,
  },
  {
    id: "demo",
    name: "Book a Demo",
    prompt:
      "You ask 2–3 quick questions (role, company size, goals) and then collect name/email/company to schedule a demo.",
    capture: true,
  },
];
export function getPlaybook(id?: string) {
  return PLAYBOOKS.find(p => p.id === id) || PLAYBOOKS[0];
}
