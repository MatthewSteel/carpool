CREATE TABLE "public"."users" (
    "id" SERIAL PRIMARY KEY,
    "lastSeen" timestamp without time zone,
    "lastLastSeen" timestamp without time zone
);

-- Rows: ids from 0 to 1 000 000 inclusive
INSERT INTO "public"."users" ("lastSeen")
SELECT NULL FROM GENERATE_SERIES(0, 1000000) as t;
