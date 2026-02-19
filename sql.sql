CREATE TABLE IF NOT EXISTS `reda_admin_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `identifier` VARCHAR(64) NOT NULL,
  `admin_name` VARCHAR(64) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `target` VARCHAR(64) NOT NULL,
  `detail` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_logs_identifier` (`identifier`),
  INDEX `idx_logs_created` (`created_at`)
);

CREATE TABLE IF NOT EXISTS `reda_admin_locations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `identifier` VARCHAR(64) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `coords` VARCHAR(128) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_locations_identifier` (`identifier`)
);

CREATE TABLE IF NOT EXISTS `reda_admin_bans` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `identifier` VARCHAR(64) NOT NULL,
  `admin_identifier` VARCHAR(64) NOT NULL,
  `reason` VARCHAR(255) DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_bans_identifier` (`identifier`),
  INDEX `idx_bans_active` (`active`)
);
