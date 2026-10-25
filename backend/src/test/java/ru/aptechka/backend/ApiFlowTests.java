package ru.aptechka.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import com.jayway.jsonpath.JsonPath;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

// End-to-end API scenarios on H2. The clock is fixed at 2026-10-25 12:00 Moscow time.
@SpringBootTest
@AutoConfigureMockMvc
class ApiFlowTests {

	private static final String PASSWORD = "password123";
	private static final String GTIN_EAN = "4601234567893";

	@Autowired
	private MockMvc mvc;

	private String owner, caregiver, family, patientUser;
	private String patientId;

	@BeforeEach
	void careCircle() throws Exception {
		String run = UUID.randomUUID().toString().substring(0, 8);
		owner = register("anna-" + run, "Анна");
		caregiver = register("elena-" + run, "Елена");
		family = register("max-" + run, "Максим");
		patientUser = register("nina-" + run, "Нина Петровна");
		patientId = read(call(owner, post("/api/patients"), """
				{"name": "Нина Петровна", "birthYear": 1948, "relation": "Дочь"}""").andExpect(status().isCreated()), "$.id");
		addMember(caregiver, "CAREGIVER").andExpect(status().isCreated());
		addMember(family, "FAMILY").andExpect(status().isCreated());
		addMember(patientUser, "PATIENT").andExpect(status().isCreated());
	}

	@Test
	void careCircleAndRoles() throws Exception {
		call(owner, get("/api/me"), null).andExpect(status().isOk())
				.andExpect(jsonPath("$.patients[0].role").value("OWNER"));
		call(patientUser, get("/api/me"), null)
				.andExpect(jsonPath("$.patients[0].role").value("PATIENT"))
				.andExpect(jsonPath("$.patients[0].permissions.length()").value(4));
		call(owner, get(url("/members")), null).andExpect(jsonPath("$.length()").value(4));

		addMember("nobody-" + UUID.randomUUID() + "@test.ru", "FAMILY").andExpect(status().isNotFound());
		addMember(caregiver, "FAMILY").andExpect(status().isConflict());
		String another = register("other-" + UUID.randomUUID().toString().substring(0, 8), "Ещё один");
		addMember(another, "PATIENT").andExpect(status().isConflict());
		addMember(another, "OWNER").andExpect(status().isBadRequest());

		// A stranger cannot even learn the profile exists; members cannot manage it.
		call(another, get(url("")), null).andExpect(status().isNotFound());
		call(caregiver, post(url("/members")), "{\"email\": \"" + another + "\", \"role\": \"FAMILY\"}").andExpect(status().isForbidden());
		call(patientUser, get(url("/signals")), null).andExpect(status().isForbidden());
		call(family, get(url("/signals")), null).andExpect(status().isOk());

		call(null, get("/api/me"), null).andExpect(status().isUnauthorized());
	}

	@Test
	void courseScheduleMarksAndStock() throws Exception {
		call(owner, post(url("/stock")), """
				{"name": "Эналаприл", "strength": "10 мг", "form": "Таблетки", "unit": "табл.", "qty": 5, "packSize": 20,
				 "expiry": "2027-01-31", "gtin": "%s"}""".formatted(GTIN_EAN)).andExpect(status().isCreated());
		call(caregiver, post(url("/courses")), course("2026-10-26")).andExpect(status().isForbidden());
		call(owner, post(url("/courses")), course("2026-10-24")).andExpect(status().isCreated());
		call(owner, post(url("/courses")), course("2026-10-30")).andExpect(status().isConflict());

		String schedule = body(call(patientUser, get(url("/schedule")), null).andExpect(status().isOk()));
		assertThat(JsonPath.<List<String>>read(schedule, "$[*].time")).containsExactly("08:00", "09:00", "14:00", "20:00");
		assertThat(JsonPath.<List<String>>read(schedule, "$[*].status")).containsExactly("OVERDUE", "OVERDUE", "PLANNED", "PLANNED");
		String enalapril = JsonPath.read(schedule, "$[0].courseMedId");

		call(family, post(url("/doses")), mark(enalapril, "2026-10-25", "08:00", "TAKEN")).andExpect(status().isForbidden());
		String logId = read(call(caregiver, post(url("/doses")), mark(enalapril, "2026-10-25", "08:00", "TAKEN"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("TAKEN"))
				.andExpect(jsonPath("$.markedByName").value("Елена"))
				.andExpect(jsonPath("$.consumedFromStock").value(true)), "$.logId");
		call(owner, get(url("/stock")), null).andExpect(jsonPath("$[0].qty").value(4));
		call(patientUser, post(url("/doses")), mark(enalapril, "2026-10-25", "08:00", "TAKEN")).andExpect(status().isConflict());
		call(patientUser, post(url("/doses")), mark(enalapril, "2026-10-26", "08:00", "TAKEN")).andExpect(status().isBadRequest());
		call(patientUser, post(url("/doses")), mark(enalapril, "2026-10-25", "10:00", "TAKEN")).andExpect(status().isBadRequest());

		call(caregiver, delete(url("/doses/" + logId)), null).andExpect(status().isNoContent());
		call(owner, get(url("/stock")), null).andExpect(jsonPath("$[0].qty").value(5));
		call(patientUser, post(url("/doses")), mark(enalapril, "2026-10-25", "08:00", "TAKEN"))
				.andExpect(status().isCreated()).andExpect(jsonPath("$.markedByRole").value("PATIENT"));

		// Enalapril: 20:00 today + 2 × 8 more days = 17 needed, 4 at home → 13 missing → 1 pack of 20.
		String shopping = body(call(owner, get(url("/shopping")), null).andExpect(status().isOk()));
		assertThat(JsonPath.<List<String>>read(shopping, "$[*].name")).containsExactly("Метформин", "Эналаприл");
		assertThat(JsonPath.<Number>read(shopping, "$[1].missing").doubleValue()).isEqualTo(13.0);
		assertThat(JsonPath.<Integer>read(shopping, "$[1].packs")).isEqualTo(1);

		String signals = body(call(owner, get(url("/signals")), null));
		assertThat(JsonPath.<List<String>>read(signals, "$[*].kind")).contains("MISSED_DOSE", "LOW_STOCK").doesNotContain("HELP_REQUEST");

		String courseId = JsonPath.read(schedule, "$[0].courseId");
		call(owner, post(url("/courses/" + courseId + "/end")), null).andExpect(jsonPath("$.active").value(false));
		assertThat(JsonPath.<List<String>>read(body(call(owner, get(url("/schedule")), null)), "$[*].time")).containsExactly("08:00");
	}

	@Test
	void barcodeScanAndRestock() throws Exception {
		call(owner, post(url("/stock/scan")), "{\"code\": \"%s\"}".formatted(GTIN_EAN))
				.andExpect(status().isOk()).andExpect(jsonPath("$.source").value("NONE"));
		call(owner, post(url("/stock/scan")), "{\"code\": \"4601234567890\"}").andExpect(status().isBadRequest());
		call(family, post(url("/stock/scan")), "{\"code\": \"%s\"}".formatted(GTIN_EAN)).andExpect(status().isForbidden());

		String item = """
				{"name": "Эналаприл", "strength": "10 мг", "form": "Таблетки", "unit": "табл.", "qty": 20, "packSize": 20,
				 "expiry": "%s", "gtin": "%s"}""";
		call(caregiver, post(url("/stock")), item.formatted("2027-06-30", GTIN_EAN)).andExpect(status().isCreated());
		call(caregiver, post(url("/stock/scan")), "{\"code\": \"(01)0%s(17)261110(21)ABC\"}".formatted(GTIN_EAN))
				.andExpect(jsonPath("$.source").value("STOCK"))
				.andExpect(jsonPath("$.suggestion.name").value("Эналаприл"))
				.andExpect(jsonPath("$.expiry").value("2026-11-10"));

		// Second package: same entry, more tablets, and the earlier expiry wins.
		call(caregiver, post(url("/stock")), item.formatted("2026-11-10", GTIN_EAN))
				.andExpect(jsonPath("$.qty").value(40))
				.andExpect(jsonPath("$.expiry").value("2026-11-10"))
				.andExpect(jsonPath("$.expiresSoon").value(true));
		call(owner, get(url("/stock")), null).andExpect(jsonPath("$.length()").value(1));
		String signals = body(call(owner, get(url("/signals")), null));
		assertThat(JsonPath.<List<String>>read(signals, "$[*].kind")).containsExactly("EXPIRING_STOCK");
	}

	@Test
	void healthDiaryThresholdsAndHelp() throws Exception {
		call(caregiver, post(url("/vitals")), "{\"type\": \"BLOOD_PRESSURE\", \"value1\": 175, \"value2\": 95}")
				.andExpect(status().isCreated()).andExpect(jsonPath("$.outOfRange").value(true));
		call(caregiver, post(url("/vitals")), "{\"type\": \"BLOOD_PRESSURE\", \"value1\": 175}").andExpect(status().isBadRequest());
		call(caregiver, post(url("/vitals")), "{\"type\": \"PULSE\", \"value1\": 1200}").andExpect(status().isBadRequest());
		call(patientUser, post(url("/vitals")), "{\"type\": \"WELLBEING\", \"value1\": 4}").andExpect(status().isCreated());
		call(family, post(url("/vitals")), "{\"type\": \"PULSE\", \"value1\": 70}").andExpect(status().isForbidden());

		call(patientUser, post(url("/help-requests")), "{\"message\": \"Кружится голова\"}").andExpect(status().isCreated());
		String signals = body(call(family, get(url("/signals")), null));
		assertThat(JsonPath.<List<String>>read(signals, "$[*].kind")).containsExactly("HELP_REQUEST", "VITAL_OUT_OF_RANGE");
		assertThat(JsonPath.<String>read(signals, "$[0].detail")).isEqualTo("Кружится голова");

		call(owner, put(url("/vital-thresholds/BLOOD_PRESSURE")), "{\"min1\": 100, \"max1\": 180, \"min2\": 60, \"max2\": 100}")
				.andExpect(jsonPath("$.custom").value(true));
		call(caregiver, put(url("/vital-thresholds/PULSE")), "{\"min1\": 40}").andExpect(status().isForbidden());
		call(owner, get(url("/vitals?type=BLOOD_PRESSURE")), null).andExpect(jsonPath("$[0].outOfRange").value(false));

		String helpId = JsonPath.read(signals, "$[0].refId");
		call(family, post(url("/help-requests/" + helpId + "/resolve")), null)
				.andExpect(jsonPath("$.resolvedByName").value("Максим"));
		call(owner, get(url("/summary")), null)
				.andExpect(jsonPath("$.signals.length()").value(0))
				.andExpect(jsonPath("$.latestVitals.length()").value(2))
				.andExpect(jsonPath("$.patientName").value("Нина Петровна"));
	}

	private String register(String name, String displayName) throws Exception {
		String email = name + "@test.ru";
		call(null, post("/api/auth/register"), """
				{"email": "%s", "password": "%s", "displayName": "%s"}""".formatted(email, PASSWORD, displayName))
				.andExpect(status().isCreated());
		return email;
	}

	private ResultActions addMember(String email, String role) throws Exception {
		return call(owner, post(url("/members")), "{\"email\": \"%s\", \"role\": \"%s\"}".formatted(email, role));
	}

	private String url(String path) {
		return "/api/patients/" + patientId + path;
	}

	private static String course(String start) {
		return """
				{"title": "Терапевт, октябрь", "startDate": "%s", "meds": [
				  {"name": "Эналаприл", "strength": "10 мг", "form": "Таблетки", "unit": "табл.", "dose": 1, "times": ["20:00", "08:00"], "days": 10},
				  {"name": "Метформин", "strength": "500 мг", "form": "Таблетки", "unit": "табл.", "dose": 1, "times": ["09:00", "14:00"], "days": 5, "note": "во время еды"}
				]}""".formatted(start);
	}

	private static String mark(String courseMedId, String date, String time, String status) {
		return "{\"courseMedId\": \"%s\", \"date\": \"%s\", \"time\": \"%s\", \"status\": \"%s\"}".formatted(courseMedId, date, time, status);
	}

	private ResultActions call(String email, MockHttpServletRequestBuilder request, String json) throws Exception {
		if (email != null) {
			request.with(httpBasic(email, PASSWORD));
		}
		if (json != null) {
			request.contentType(MediaType.APPLICATION_JSON).content(json);
		}
		return mvc.perform(request);
	}

	private static String body(ResultActions result) throws Exception {
		return result.andReturn().getResponse().getContentAsString();
	}

	private static String read(ResultActions result, String path) throws Exception {
		return JsonPath.read(body(result), path);
	}

}
