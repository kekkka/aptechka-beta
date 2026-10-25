package ru.aptechka.backend.course;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ru.aptechka.backend.account.AppUser;
import ru.aptechka.backend.account.AppUserRepository;
import ru.aptechka.backend.care.CareMember;
import ru.aptechka.backend.care.CareRole;
import ru.aptechka.backend.care.CareService;
import ru.aptechka.backend.care.Permission;
import ru.aptechka.backend.common.Errors;
import ru.aptechka.backend.stock.StockItem;
import ru.aptechka.backend.stock.StockService;

// Turns courses into concrete doses for a day and records marks against them.
@Service
@Transactional
public class ScheduleService {

	private final CourseService courses;
	private final CourseMedRepository meds;
	private final DoseLogRepository logs;
	private final AppUserRepository users;
	private final StockService stock;
	private final CareService care;
	private final Clock clock;

	public ScheduleService(CourseService courses, CourseMedRepository meds, DoseLogRepository logs, AppUserRepository users,
			StockService stock, CareService care, Clock clock) {
		this.courses = courses;
		this.meds = meds;
		this.logs = logs;
		this.users = users;
		this.stock = stock;
		this.care = care;
		this.clock = clock;
	}

	public record DoseView(UUID courseId, String courseTitle, UUID courseMedId, String name, String strength, String form,
			String unit, BigDecimal dose, String medNote, LocalDate date, String time, DoseStatus status, UUID logId,
			String markedByName, CareRole markedByRole, java.time.Instant markedAt, String note, boolean consumedFromStock) {
	}

	public LocalDate today() {
		return LocalDate.now(clock);
	}

	@Transactional(readOnly = true)
	public List<DoseView> day(UUID patientId, UUID userId, LocalDate date) {
		CareMember member = care.require(patientId, userId, Permission.VIEW_PLAN);
		return doses(patientId, member.getPatient().getGraceMinutes(), date, date);
	}

	// All planned doses in [from, to] with their marks and current status.
	@Transactional(readOnly = true)
	public List<DoseView> doses(UUID patientId, int graceMinutes, LocalDate from, LocalDate to) {
		Map<String, DoseLog> marks = logs.findByCourseMedCoursePatientIdAndDoseDateBetween(patientId, from, to).stream()
				.collect(Collectors.toMap(DoseLog::doseKey, Function.identity()));
		Map<UUID, String> names = names(marks.values().stream().map(DoseLog::getMarkedBy).collect(Collectors.toSet()));
		LocalDateTime now = LocalDateTime.now(clock);
		List<DoseView> result = new ArrayList<>();
		for (Course course : courses.courses(patientId)) {
			for (CourseMed med : course.getMeds()) {
				for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
					if (!med.plannedOn(d)) {
						continue;
					}
					for (String time : med.timeList()) {
						DoseLog log = marks.get(med.getId() + "|" + d + "|" + time);
						// After a course is stopped only doses that were already marked stay visible.
						boolean afterEnd = course.getEndedOn() != null && !d.isBefore(course.getEndedOn());
						if (afterEnd && log == null) {
							continue;
						}
						result.add(view(course, med, d, time, log, names, now, graceMinutes));
					}
				}
			}
		}
		result.sort(Comparator.comparing(DoseView::date).thenComparing(DoseView::time).thenComparing(DoseView::name));
		return result;
	}

	public DoseView mark(UUID patientId, UUID userId, UUID courseMedId, LocalDate date, String time, DoseStatus status, String note) {
		CareMember member = care.require(patientId, userId, Permission.MARK_DOSE);
		if (status != DoseStatus.TAKEN && status != DoseStatus.SKIPPED) {
			throw Errors.badRequest("Отметить можно только «принято» или «пропуск»");
		}
		CourseMed med = meds.findByIdAndCoursePatientId(courseMedId, patientId).orElseThrow(() -> Errors.notFound("Препарат не найден"));
		Course course = med.getCourse();
		boolean planned = med.plannedOn(date) && med.timeList().contains(time)
				&& (course.getEndedOn() == null || date.isBefore(course.getEndedOn()));
		if (!planned) {
			throw Errors.badRequest("На это время приём не запланирован");
		}
		if (date.isAfter(LocalDate.now(clock))) {
			throw Errors.badRequest("Нельзя отметить приём заранее");
		}
		if (logs.existsByCourseMedIdAndDoseDateAndDoseTime(courseMedId, date, time)) {
			throw Errors.conflict("Этот приём уже отмечен");
		}
		UUID stockItemId = null;
		BigDecimal consumed = BigDecimal.ZERO;
		if (status == DoseStatus.TAKEN) {
			Optional<StockItem> source = stock.consume(patientId, med.identity(), med.getDose());
			if (source.isPresent()) {
				stockItemId = source.get().getId();
				consumed = med.getDose();
			}
		}
		DoseLog log = logs.save(new DoseLog(med, date, time, status, note, userId, member.getRole(), clock.instant(), stockItemId, consumed));
		return view(course, med, date, time, log, names(Set.of(userId)), LocalDateTime.now(clock), member.getPatient().getGraceMinutes());
	}

	// Undo a mark; a dose that was taken from the cabinet is put back.
	public void unmark(UUID patientId, UUID userId, UUID logId) {
		care.require(patientId, userId, Permission.MARK_DOSE);
		DoseLog log = logs.findByIdAndCourseMedCoursePatientId(logId, patientId).orElseThrow(() -> Errors.notFound("Отметка не найдена"));
		if (log.getStockItemId() != null && log.getConsumed().signum() > 0) {
			stock.restore(log.getStockItemId(), log.getConsumed());
		}
		logs.delete(log);
	}

	private Map<UUID, String> names(Set<UUID> ids) {
		return users.findAllById(ids.stream().filter(java.util.Objects::nonNull).toList()).stream()
				.collect(Collectors.toMap(AppUser::getId, AppUser::getDisplayName));
	}

	private static DoseView view(Course course, CourseMed med, LocalDate date, String time, DoseLog log, Map<UUID, String> names,
			LocalDateTime now, int graceMinutes) {
		DoseStatus status;
		if (log != null) {
			status = log.getStatus();
		} else {
			LocalDateTime planned = date.atTime(LocalTime.parse(time));
			status = now.isBefore(planned) ? DoseStatus.PLANNED
					: now.isBefore(planned.plusMinutes(graceMinutes)) ? DoseStatus.DUE : DoseStatus.OVERDUE;
		}
		return new DoseView(course.getId(), course.getTitle(), med.getId(), med.getName(), med.getStrength(), med.getForm(), med.getUnit(),
				med.getDose(), med.getNote(), date, time, status,
				log == null ? null : log.getId(),
				log == null ? null : names.get(log.getMarkedBy()),
				log == null ? null : log.getMarkedByRole(),
				log == null ? null : log.getMarkedAt(),
				log == null ? null : log.getNote(),
				log != null && log.getStockItemId() != null);
	}

}
