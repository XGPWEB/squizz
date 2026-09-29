import { sqliteTable, text, integer, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";
export const quizzes = sqliteTable(
  "quizzes",
  { id: text("id").primaryKey(), owner: text("owner").notNull(), data: text("data").notNull() },
  (t) => [uniqueIndex("idx_quizzes_owner_id").on(t.owner, t.id)],
);
export const rooms = sqliteTable("rooms", {
  code: text("code").primaryKey(),
  host: text("host").notNull(),
  quiz: text("quiz").notNull(),
  phase: text("phase").notNull(),
  question: integer("question").notNull(),
  started: integer("started").notNull(),
  created: integer("created").notNull(),
});
export const players = sqliteTable(
  "players",
  { code: text("code").notNull(), id: text("id").notNull(), name: text("name").notNull() },
  (t) => [primaryKey({ columns: [t.code, t.id] }), uniqueIndex("idx_players_code_name").on(t.code, t.name)],
);
export const answers = sqliteTable(
  "answers",
  {
    code: text("code").notNull(),
    player: text("player").notNull(),
    question: integer("question").notNull(),
    choice: integer("choice").notNull(),
    points: integer("points").notNull(),
    payload: text("payload").notNull().default(""),
    correctness: integer("correctness"),
  },
  (t) => [primaryKey({ columns: [t.code, t.player, t.question] })],
);
