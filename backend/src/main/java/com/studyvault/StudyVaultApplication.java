package com.studyvault;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class StudyVaultApplication {
    public static void main(String[] args) {
        SpringApplication.run(StudyVaultApplication.class, args);
    }
}
