CREATE UNIQUE INDEX IF NOT EXISTS "unique_name_workspace" ON "latitude"."evaluations" USING btree ("name","workspace_id");