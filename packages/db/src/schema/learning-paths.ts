import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { sifts } from "./sifts";

export const learningPaths = pgTable("learning_paths", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // e.g. "Mastering React"
  goal: text("goal").notNull(), // User's original prompt
  summary: text("summary"), // AI summary of progress so far
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const learningPathSifts = pgTable("learning_path_sifts", {
    id: text("id").primaryKey(),
    pathId: text("path_id")
        .notNull()
        .references(() => learningPaths.id, { onDelete: "cascade" }),
    siftId: text("sift_id")
        .notNull()
        .references(() => sifts.id, { onDelete: "cascade" }),
    parentSiftId: text("parent_sift_id"), // Nullable: ID of the parent module if this is a deep dive
    order: integer("order").notNull(), // 1, 2, 3...
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
