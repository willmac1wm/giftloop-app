export function organizerPerson(event) {
  const people = event?.participants || [];
  if (!people.length) return null;
  return people.find((person) => person.id && person.id === event.organizerId) || people[0];
}

export function organizerMatch(event) {
  const me = organizerPerson(event);
  if (!me || !Array.isArray(event?.matches) || event.matches.length === 0) return null;
  return event.matches.find((match) => match?.giver?.id === me.id) || null;
}

export function deviceNextAction(exchange) {
  if (!exchange) return "create";
  if (Array.isArray(exchange.matches) && exchange.matches.length > 0) return "reveal";
  const step = exchange.wizardStep || "start";
  if (step !== "start" || exchange.setupComplete) return "continue";
  return "create";
}

export const NEXT_ACTION_LABEL = {
  create: "Create an exchange",
  continue: "Continue your exchange",
  reveal: "Reveal your recipient",
};
