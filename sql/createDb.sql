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

CREATE EVENT IF NOT EXISTS PurgeOldImages ON SCHEDULE every 1 day ON COMPLETION PRESERVE DO
DELETE FROM
    Images
WHERE
    timestamp < (NOW() - INTERVAL 2 DAY);

CREATE EVENT IF NOT EXISTS PurgeOldMeasurements ON SCHEDULE every 1 day ON COMPLETION PRESERVE DO
DELETE FROM
    Measurements
WHERE
    timestamp < (NOW() - INTERVAL 7 DAY);
