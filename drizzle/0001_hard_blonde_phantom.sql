CREATE TABLE `agent_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`candidate_json` text NOT NULL,
	`preview_json` text NOT NULL,
	`expected_version` integer NOT NULL,
	`applied_version` integer,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `agent_proposals_owner_expiry` ON `agent_proposals` (`owner_id`,`expires_at`);