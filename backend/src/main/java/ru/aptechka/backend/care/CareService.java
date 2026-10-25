package ru.aptechka.backend.care;

import java.time.Clock;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ru.aptechka.backend.account.AccountService;
import ru.aptechka.backend.account.AppUser;
import ru.aptechka.backend.account.AppUserRepository;
import ru.aptechka.backend.common.Errors;

@Service
@Transactional
public class CareService {

	public static final int DEFAULT_GRACE_MINUTES = 30;

	private final PatientRepository patients;
	private final CareMemberRepository members;
	private final AppUserRepository users;
	private final Clock clock;

	public CareService(PatientRepository patients, CareMemberRepository members, AppUserRepository users, Clock clock) {
		this.patients = patients;
		this.members = members;
		this.users = users;
		this.clock = clock;
	}

	public record MembershipView(UUID patientId, String patientName, CareRole role, String relation, Set<Permission> permissions) {

		static MembershipView of(CareMember m) {
			return new MembershipView(m.getPatient().getId(), m.getPatient().getName(), m.getRole(), m.getRelation(), m.getRole().permissions());
		}

	}

	public record PatientView(UUID id, String name, Integer birthYear, String notes, int graceMinutes, CareRole myRole, Set<Permission> permissions) {

		static PatientView of(CareMember m) {
			Patient p = m.getPatient();
			return new PatientView(p.getId(), p.getName(), p.getBirthYear(), p.getNotes(), p.getGraceMinutes(), m.getRole(), m.getRole().permissions());
		}

	}

	public record MemberView(UUID id, UUID userId, String displayName, String email, CareRole role, String relation) {

		static MemberView of(CareMember m) {
			return new MemberView(m.getId(), m.getUser().getId(), m.getUser().getDisplayName(), m.getUser().getEmail(), m.getRole(), m.getRelation());
		}

	}

	// Every patient-scoped endpoint goes through here. A stranger gets 404, not 403,
	// so the API does not reveal which care profiles exist.
	@Transactional(readOnly = true)
	public CareMember require(UUID patientId, UUID userId, Permission permission) {
		CareMember member = members.findByPatientIdAndUserId(patientId, userId)
				.orElseThrow(() -> Errors.notFound("Профиль не найден"));
		if (!member.can(permission)) {
			throw Errors.forbidden("Недостаточно прав для этого действия");
		}
		return member;
	}

	@Transactional(readOnly = true)
	public List<MembershipView> memberships(UUID userId) {
		return members.findByUserIdOrderByCreatedAt(userId).stream().map(MembershipView::of).toList();
	}

	public PatientView createPatient(UUID userId, String name, Integer birthYear, String notes, Integer graceMinutes, String relation) {
		AppUser owner = users.getReferenceById(userId);
		Patient patient = patients.save(new Patient(name.trim(), birthYear, notes, graceMinutes == null ? DEFAULT_GRACE_MINUTES : graceMinutes, clock.instant()));
		CareMember member = members.save(new CareMember(patient, owner, CareRole.OWNER, relation, clock.instant()));
		return PatientView.of(member);
	}

	@Transactional(readOnly = true)
	public PatientView patient(UUID patientId, UUID userId) {
		return PatientView.of(require(patientId, userId, Permission.VIEW_PLAN));
	}

	public PatientView updatePatient(UUID patientId, UUID userId, String name, Integer birthYear, String notes, int graceMinutes) {
		CareMember member = require(patientId, userId, Permission.MANAGE);
		member.getPatient().update(name.trim(), birthYear, notes, graceMinutes);
		return PatientView.of(member);
	}

	@Transactional(readOnly = true)
	public List<MemberView> members(UUID patientId, UUID userId) {
		require(patientId, userId, Permission.VIEW_ALL);
		return members.findByPatientIdOrderByCreatedAt(patientId).stream().map(MemberView::of).toList();
	}

	// Adds an already registered person. There is no e-mail delivery yet, so the
	// invitee registers first and the organiser adds them by e-mail.
	public MemberView addMember(UUID patientId, UUID userId, String email, CareRole role, String relation) {
		CareMember owner = require(patientId, userId, Permission.MANAGE);
		checkAssignable(patientId, role);
		AppUser user = users.findByEmail(AccountService.normalizeEmail(email))
				.orElseThrow(() -> Errors.notFound("Пользователь с такой почтой не зарегистрирован. Попросите его создать аккаунт."));
		if (members.findByPatientIdAndUserId(patientId, user.getId()).isPresent()) {
			throw Errors.conflict("Этот человек уже в круге заботы");
		}
		return MemberView.of(members.save(new CareMember(owner.getPatient(), user, role, relation, clock.instant())));
	}

	public MemberView updateMember(UUID patientId, UUID userId, UUID memberId, CareRole role, String relation) {
		require(patientId, userId, Permission.MANAGE);
		CareMember member = memberOf(patientId, memberId);
		if (member.getRole() == CareRole.OWNER) {
			throw Errors.badRequest("Роль организатора изменить нельзя");
		}
		if (member.getRole() != role) {
			checkAssignable(patientId, role);
		}
		member.update(role, relation);
		return MemberView.of(member);
	}

	public void removeMember(UUID patientId, UUID userId, UUID memberId) {
		require(patientId, userId, Permission.MANAGE);
		CareMember member = memberOf(patientId, memberId);
		if (member.getRole() == CareRole.OWNER) {
			throw Errors.badRequest("Организатора нельзя удалить из круга заботы");
		}
		members.delete(member);
	}

	private CareMember memberOf(UUID patientId, UUID memberId) {
		return members.findById(memberId)
				.filter(m -> m.getPatient().getId().equals(patientId))
				.orElseThrow(() -> Errors.notFound("Участник не найден"));
	}

	private void checkAssignable(UUID patientId, CareRole role) {
		if (role == CareRole.OWNER) {
			throw Errors.badRequest("Организатор у профиля один");
		}
		if (role == CareRole.PATIENT && members.existsByPatientIdAndRole(patientId, CareRole.PATIENT)) {
			throw Errors.conflict("Аккаунт подопечного уже привязан к профилю");
		}
	}

}
