import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const exchanges = pgTable("exchanges", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizerId: text("organizer_id").notNull(),
  organizerEmail: text("organizer_email").notNull(),
  title: text("title").notNull(),
  budget: text("budget").notNull().default(""),
  occasion: text("occasion").notNull().default("Christmas"),
  eventDate: text("event_date").notNull().default(""),
  inviteMessage: text("invite_message").notNull().default(""),
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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
