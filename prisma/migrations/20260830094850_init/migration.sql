-- CreateTable
CREATE TABLE `Application` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NULL,
    `appliedAt` DATETIME(3) NULL,
    `status` ENUM('APPLIED', 'CONFIRMED', 'REJECTED', 'INTERVIEW', 'INFO_REQUESTED', 'OTHER') NOT NULL DEFAULT 'APPLIED',
    `gmailThreadId` VARCHAR(191) NOT NULL,
    `lastEventAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Application_gmailThreadId_key`(`gmailThreadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GmailToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `refreshToken` TEXT NOT NULL,
    `scope` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
