CREATE TABLE IF NOT EXISTS Devices (
    device_id SMALLINT UNSIGNED PRIMARY KEY,
    device_name VARCHAR(50) NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

CREATE TABLE IF NOT EXISTS Measurements (
    measurement_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    device_id SMALLINT UNSIGNED NOT NULL,
    timestamp DATETIME NOT NULL,
    measurement_type ENUM('temperature', 'CO2', 'OD') NOT NULL,
    value FLOAT NOT NULL,
    INDEX idx_device_id (device_id),
    INDEX idx_timestamp (timestamp),
    CONSTRAINT fk_device_id_meas FOREIGN KEY (device_id) REFERENCES Devices (device_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

CREATE TABLE IF NOT EXISTS Images (
    image_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    device_id SMALLINT UNSIGNED NOT NULL,
    timestamp DATETIME NOT NULL,
    image_data MEDIUMBLOB NOT NULL,
    INDEX idx_device_id (device_id),
    INDEX idx_timestamp (timestamp),
    CONSTRAINT fk_device_id_img FOREIGN KEY (device_id) REFERENCES Devices (device_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

CREATE TABLE IF NOT EXISTS Tasks (
    task_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    device_id SMALLINT UNSIGNED NOT NULL,
    task_name VARCHAR(50) NULL task_start DATETIME NOT NULL,
    task_type ENUM('temperature', 'CO2', 'OD') NOT NULL,
    task_start DATETIME NOT NULL,
    task_end DATETIME NOT NULL,
    recurring BOOLEAN NOT NULL,
    INDEX idx_device_id (device_id),
    INDEX idx_timestamp (task_start),
    CONSTRAINT fk_device_id_task FOREIGN KEY (device_id) REFERENCES Devices (device_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

CREATE EVENT IF NOT EXISTS PurgeOldImages ON SCHEDULE every 1 hour ON COMPLETION PRESERVE DO
DELETE FROM
    Images
WHERE
    timestamp < (NOW() - INTERVAL 1 DAY);

CREATE EVENT IF NOT EXISTS PurgeOldMeasurements ON SCHEDULE every 1 hour ON COMPLETION PRESERVE DO
DELETE FROM
    Measurements
WHERE
    timestamp < (NOW() - INTERVAL 7 DAY);

CREATE EVENT IF NOT EXISTS PurgeOldTasks ON SCHEDULE every 1 hour ON COMPLETION PRESERVE DO
DELETE FROM
    Tasks
WHERE
    recurring = 0
    AND task_end < (NOW() - INTERVAL 7 DAY);
