package ru.aptechka.backend.course;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ru.aptechka.backend.care.CareService;
import ru.aptechka.backend.care.Permission;
import ru.aptechka.backend.common.Errors;
import ru.aptechka.backend.stock.MedIdentity;

@Service
@Transactional
public class CourseService {

	public static final int MAX_DAYS = 90;
	public static final int MAX_TIMES = 8;

	private final CourseRepository courses;
	private final CareService care;
	private final Clock clock;

	public CourseService(CourseRepository courses, CareService care, Clock clock) {
		this.courses = courses;
		this.care = care;
		this.clock = clock;
	}

	public record MedInput(MedIdentity med, BigDecimal dose, List<String> times, int days, String note) {
	}

	public record MedView(UUID id, String name, String strength, String form, String unit, BigDecimal dose,
			List<String> times, int days, String note, LocalDate lastDay) {
	}

	public record CourseView(UUID id, String title, LocalDate startDate, LocalDate lastDay, String source, boolean active,
			LocalDate endedOn, List<MedView> meds) {
	}

	@Transactional(readOnly = true)
	public List<CourseView> list(UUID patientId, UUID userId) {
		care.require(patientId, userId, Permission.VIEW_PLAN);
		return courses.findByPatientIdOrderByStartDateDesc(patientId).stream().map(CourseService::view).toList();
	}

	@Transactional(readOnly = true)
	public List<Course> courses(UUID patientId) {
		return courses.findByPatientIdOrderByStartDateDesc(patientId);
	}

	// Only simple daily schedules are accepted: fixed times, the same dose every day.
	// Complex or "as needed" regimens stay out of the automatic plan, as in the prototype.
	public CourseView create(UUID patientId, UUID userId, String title, LocalDate start, String source, List<MedInput> meds) {
		care.require(patientId, userId, Permission.MANAGE);
		if (meds.isEmpty()) {
			throw Errors.badRequest("Добавьте хотя бы один препарат");
		}
		Course course = new Course(patientId, title.trim(), start, source, userId, clock.instant());
		int position = 0;
		for (MedInput m : meds) {
			course.addMed(new CourseMed(course, position++, m.med(), m.dose(), checkedTimes(m), m.days(), m.note()));
		}
		checkOverlap(patientId, course);
		return view(courses.save(course));
	}

	public CourseView end(UUID patientId, UUID userId, UUID courseId) {
		care.require(patientId, userId, Permission.MANAGE);
		Course course = courses.findByIdAndPatientId(courseId, patientId).orElseThrow(() -> Errors.notFound("Курс не найден"));
		if (!course.isActive()) {
			throw Errors.conflict("Курс уже завершён");
		}
		course.end(LocalDate.now(clock));
		return view(course);
	}

	private static List<String> checkedTimes(MedInput m) {
		if (m.times().isEmpty() || m.times().size() > MAX_TIMES) {
			throw Errors.badRequest(m.med().name() + ": укажите от 1 до " + MAX_TIMES + " времён приёма");
		}
		Set<String> unique = new HashSet<>();
		for (String t : m.times()) {
			if (!t.matches("([01]\\d|2[0-3]):[0-5]\\d") || !unique.add(t)) {
				throw Errors.badRequest(m.med().name() + ": время приёма «" + t + "» некорректно или повторяется");
			}
		}
		return m.times();
	}

	// The same medicine cannot run in two active courses on the same days:
	// doses and stock would be counted twice.
	private void checkOverlap(UUID patientId, Course created) {
		for (Course other : courses.findByPatientIdOrderByStartDateDesc(patientId)) {
			if (!other.isActive()) {
				continue;
			}
			for (CourseMed a : created.getMeds()) {
				for (CourseMed b : other.getMeds()) {
					boolean sameMed = a.identity().key().equals(b.identity().key());
					boolean overlaps = !a.lastDay().isBefore(b.getCourse().getStartDate()) && !b.lastDay().isBefore(created.getStartDate());
					if (sameMed && overlaps) {
						throw Errors.conflict(a.getName() + " уже есть в курсе «" + other.getTitle() + "» на эти даты");
					}
				}
			}
		}
	}

	static CourseView view(Course c) {
		List<MedView> meds = c.getMeds().stream()
				.map(m -> new MedView(m.getId(), m.getName(), m.getStrength(), m.getForm(), m.getUnit(), m.getDose(), m.timeList(),
						m.getDays(), m.getNote(), m.lastDay()))
				.toList();
		return new CourseView(c.getId(), c.getTitle(), c.getStartDate(), c.lastDay(), c.getSource(), c.isActive(), c.getEndedOn(), meds);
	}

}
