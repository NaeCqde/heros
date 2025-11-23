CREATE TABLE `eros` (
	`thumbnail` text PRIMARY KEY NOT NULL,
	`src` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monsnodes` (
	`src` text PRIMARY KEY NOT NULL,
	`thumbnail` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pendings` (
	`src` text PRIMARY KEY NOT NULL,
	`thumbnail` text NOT NULL
);
