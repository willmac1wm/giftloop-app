export const SUPPORT_EMAIL = "essentialtradecontractors@gmail.com";
export const LEGAL_ENTITY = "Essential Trade Contractors LLC";
export const MAILING_ADDRESS = "130 County Road, Dennis, NJ 08210";

export const privacySections = [
  {
    heading: "Who we are",
    body: `${LEGAL_ENTITY} operates GiftLoop, a Secret Santa and gift-exchange app. ${MAILING_ADDRESS}. Contact ${SUPPORT_EMAIL}.`,
  },
  {
    heading: "What the app collects",
    body: "Account email and name from sign-in. Exchange names, email addresses, and phone numbers an organizer enters for participants. Wish lists, likes, hobbies, dislikes, allergies, sizes, and notes a person saves. Gift date, budget, exclusions, and draw results. Notification choices, including a phone number only when that person opts in to texts. Support messages. A device-only note a giver types after opening a guest link.",
  },
  {
    heading: "What we do with it",
    body: "We run the exchange: invitations, the draw, the recipient view for the assigned giver, and reminders the organizer queues. The organizer does not see who drew whom. A guest reveal link can be opened by anyone who has that link. Store buttons can add a referral code. Those codes are sample codes unless an approved affiliate account is connected. Opening a store does not charge anyone inside the app and does not mark a gift purchased.",
  },
  {
    heading: "Who else processes it",
    body: "Netlify hosts the site, accounts, and database. If email or text is turned on, Resend or Twilio delivers those messages. Apple delivers local reminders on the iPhone app. Retailers receive the store visit when someone leaves GiftLoop to shop.",
  },
  {
    heading: "How long it stays",
    body: "Account data stays until the person deletes the account in the app. Deleting an account removes exchanges they organize, their wish lists, notification settings, and support tickets, and clears their name, email, phone, and wishes from exchanges they joined. Guest links already sent can still contain a name. Device notes stay on that device until sign-out or account deletion clears them there.",
  },
  {
    heading: "Choices",
    body: "Decline an invitation. Turn off email reminders. Texts require a separate opt-in, and STOP ends them. Delete the account from Account. Ask for a copy or a correction at the support address above.",
  },
];

export const supportSections = [
  {
    heading: "Contact",
    body: `Email ${SUPPORT_EMAIL}. ${LEGAL_ENTITY}, ${MAILING_ADDRESS}. Signed-in members can also send a note from Account.`,
  },
  {
    heading: "What we can help with",
    body: "Sign-in and confirmation email, an invitation that will not accept, a draw that will not run, a reminder that did not arrive, and deleting an account. We do not look up who someone is giving a gift to.",
  },
  {
    heading: "Shopping",
    body: "Store links may include a referral code. GiftLoop does not sell digital goods and does not take payment inside the app. A purchase happens on the retailer’s site, in the browser.",
  },
];
