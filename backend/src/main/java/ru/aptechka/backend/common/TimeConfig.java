package ru.aptechka.backend.common;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// Dose times are wall-clock times of the person receiving care, so "now" and
// "today" are evaluated in app.timezone. app.fixed-time pins the clock for tests and demos.
@Configuration
public class TimeConfig {

	@Bean
	Clock clock(@Value("${app.timezone:Europe/Moscow}") String zone, @Value("${app.fixed-time:}") String fixedTime) {
		ZoneId zoneId = ZoneId.of(zone);
		return fixedTime.isBlank() ? Clock.system(zoneId) : Clock.fixed(Instant.parse(fixedTime), zoneId);
	}

}
