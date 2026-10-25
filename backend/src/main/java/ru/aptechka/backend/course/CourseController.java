package ru.aptechka.backend.course;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ru.aptechka.backend.account.CurrentUser;
import ru.aptechka.backend.course.CourseService.CourseView;
import ru.aptechka.backend.course.CourseService.MedInput;
import ru.aptechka.backend.course.ScheduleService.DoseView;
import ru.aptechka.backend.course.ShoppingService.ShoppingItem;
import ru.aptechka.backend.stock.MedIdentity;

@RestController
@RequestMapping("/api/patients/{patientId}")
public class CourseController {

	private final CourseService courses;
	private final ScheduleService schedule;
	private final ShoppingService shopping;

	public CourseController(CourseService courses, ScheduleService schedule, ShoppingService shopping) {
		this.courses = courses;
		this.schedule = schedule;
		this.shopping = shopping;
	}

	public record MedRequest(
			@NotBlank @Size(max = 100) String name,
			@NotBlank @Size(max = 50) String strength,
			@NotBlank @Size(max = 30) String form,
			@NotBlank @Size(max = 20) String unit,
			@NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("20") BigDecimal dose,
			@NotEmpty List<@NotBlank String> times,
			@Min(1) @Max(CourseService.MAX_DAYS) int days,
			@Size(max = 200) String note) {
	}

	public record CourseRequest(
			@NotBlank @Size(max = 200) String title,
			@NotNull LocalDate startDate,
			@Size(max = 200) String source,
			@NotEmpty @Size(max = 20) List<@Valid MedRequest> meds) {
	}

	public record MarkRequest(
			@NotNull UUID courseMedId,
			@NotNull LocalDate date,
			@NotNull @Pattern(regexp = "\\d{2}:\\d{2}") String time,
			@NotNull DoseStatus status,
			@Size(max = 200) String note) {
	}

	@GetMapping("/courses")
	List<CourseView> list(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId) {
		return courses.list(patientId, me.id());
	}

	@PostMapping("/courses")
	@ResponseStatus(HttpStatus.CREATED)
	CourseView create(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @Valid @RequestBody CourseRequest r) {
		List<MedInput> meds = r.meds().stream()
				.map(m -> new MedInput(new MedIdentity(m.name(), m.strength(), m.form(), m.unit()), m.dose(), m.times(), m.days(), m.note()))
				.toList();
		return courses.create(patientId, me.id(), r.title(), r.startDate(), r.source(), meds);
	}

	@PostMapping("/courses/{courseId}/end")
	CourseView end(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @PathVariable UUID courseId) {
		return courses.end(patientId, me.id(), courseId);
	}

	@GetMapping("/schedule")
	List<DoseView> schedule(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return schedule.day(patientId, me.id(), date != null ? date : schedule.today());
	}

	@PostMapping("/doses")
	@ResponseStatus(HttpStatus.CREATED)
	DoseView mark(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @Valid @RequestBody MarkRequest r) {
		return schedule.mark(patientId, me.id(), r.courseMedId(), r.date(), r.time(), r.status(), r.note());
	}

	@DeleteMapping("/doses/{logId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void unmark(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @PathVariable UUID logId) {
		schedule.unmark(patientId, me.id(), logId);
	}

	@GetMapping("/shopping")
	List<ShoppingItem> shopping(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId) {
		return shopping.list(patientId, me.id());
	}

}
