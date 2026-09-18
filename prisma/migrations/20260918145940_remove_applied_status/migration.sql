-- Reassign legacy APPLIED rows (never produced by classification) to CONFIRMED
-- before removing the enum value.
UPDATE `Application` SET `status` = 'CONFIRMED' WHERE `status` = 'APPLIED';

-- AlterTable
ALTER TABLE `Application` MODIFY `status` ENUM('CONFIRMED', 'REJECTED', 'INTERVIEW', 'INFO_REQUESTED', 'OTHER') NOT NULL DEFAULT 'CONFIRMED';
