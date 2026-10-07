import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const exchanges = pgTable("exchanges", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizerId: text("organizer_id").notNull(),
  organizerEmail: text("organizer_email").notNull(),
  title: text("title").notNull(),
  budget: text("budget").notNull().default(""),
  occasion: text("occasion").notNull().default("Christmas"),
  eventDate: text("event_date").notNull().default(""),
  inviteMessage: text("invite_message").notNull().default(""),
  status: text("status").notNull().default("accepting"),
  signupDeadline: text("signup_deadline").notNull().default(""),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  joinToken: text("join_token").unique(),
  joinOpen: boolean("join_open").notNull().default(false),
  drawnAt: timestamp("drawn_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  exchangeId: uuid("exchange_id").notNull().references(() => exchanges.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  listTitle: text("list_title").notNull().default(""),
  ageBand: text("age_band").notNull().default(""),
  shopFor: text("shop_for").notNull().default(""),
  wishes: text("wishes").notNull().default(""),
  hobbies: text("hobbies").notNull().default(""),
  status: text("status").notNull().default("invited"),
  inviteToken: text("invite_token").unique(),
  exchangeRole: text("exchange_role").notNull().default("member"),
  wishListId: uuid("wish_list_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  exchangeId: uuid("exchange_id").notNull().references(() => exchanges.id, { onDelete: "cascade" }),
  giverMemberId: uuid("giver_member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  receiverMemberId: uuid("receiver_member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
});

export const deliveries = pgTable("deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  exchangeId: uuid("exchange_id").notNull().references(() => exchanges.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  status: text("status").notNull(),
  detail: text("detail").notNull().default(""),
  kind: text("kind").notNull().default("note"),
  providerMessageId: text("provider_message_id").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const exclusions = pgTable("exclusions", {
  id: uuid("id").primaryKey().defaultRandom(),
  exchangeId: uuid("exchange_id").notNull().references(() => exchanges.id, { onDelete: "cascade" }),
  giverMemberId: uuid("giver_member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  receiverMemberId: uuid("receiver_member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
});

export const wishLists = pgTable("wish_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: text("owner_user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const wishItems = pgTable("wish_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  listId: uuid("list_id").notNull().references(() => wishLists.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
  size: text("size").notNull().default(""),
  color: text("color").notNull().default(""),
  priority: text("priority").notNull().default(""),
  originalUrl: text("original_url").notNull().default(""),
  shoppingUrl: text("shopping_url").notNull().default(""),
  retailer: text("retailer").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id").notNull().references(() => wishItems.id, { onDelete: "cascade" }).unique(),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notificationPrefs = pgTable("notification_prefs", {
  userId: text("user_id").primaryKey(),
  emailInvites: boolean("email_invites").notNull().default(true),
  emailAssignments: boolean("email_assignments").notNull().default(true),
  emailReminders: boolean("email_reminders").notNull().default(true),
  smsOptIn: boolean("sms_opt_in").notNull().default(false),
  smsStoppedAt: text("sms_stopped_at").notNull().default(""),
  phone: text("phone").notNull().default(""),
});

export const notificationJobs = pgTable("notification_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  exchangeId: uuid("exchange_id").notNull().references(() => exchanges.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  kind: text("kind").notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  detail: text("detail").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterUserId: text("requester_user_id").notNull().default(""),
  requesterEmail: text("requester_email").notNull().default(""),
  subject: text("subject").notNull(),
  body: text("body").notNull().default(""),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const merchants = pgTable("merchants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  domains: text("domains").notNull(),
  affiliateParam: text("affiliate_param").notNull().default(""),
  configKey: text("config_key").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  countries: text("countries").notNull().default(""),
});

export const giftPreferences = pgTable("gift_preferences", {
  userId: text("user_id").primaryKey(),
  interests: text("interests").notNull().default(""),
  avoid: text("avoid").notNull().default(""),
  approach: text("approach").notNull().default("inspiration"),
  secondhand: boolean("secondhand").notNull().default(false),
  handmade: boolean("handmade").notNull().default(false),
  experiences: boolean("experiences").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const exchangeTraditions = pgTable("exchange_traditions", {
  exchangeId: uuid("exchange_id").primaryKey().references(() => exchanges.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default(""),
  rules: text("rules").notNull().default(""),
  memory: text("memory").notNull().default(""),
  photo: text("photo").notNull().default(""),
  photoApproved: boolean("photo_approved").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
