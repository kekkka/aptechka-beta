package ru.aptechka.backend.care;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ru.aptechka.backend.account.CurrentUser;
import ru.aptechka.backend.care.CareService.MemberView;
import ru.aptechka.backend.care.CareService.PatientView;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

	private final CareService care;

	public PatientController(CareService care) {
		this.care = care;
	}

	public record CreatePatientRequest(
			@NotBlank @Size(max = 100) String name,
			@Min(1900) @Max(2100) Integer birthYear,
			@Size(max = 1000) String notes,
			@Min(5) @Max(240) Integer graceMinutes,
			@Size(max = 60) String relation) {
	}

	public record UpdatePatientRequest(
			@NotBlank @Size(max = 100) String name,
			@Min(1900) @Max(2100) Integer birthYear,
			@Size(max = 1000) String notes,
			@NotNull @Min(5) @Max(240) Integer graceMinutes) {
	}

	public record AddMemberRequest(@NotBlank @Email String email, @NotNull CareRole role, @Size(max = 60) String relation) {
	}

	public record UpdateMemberRequest(@NotNull CareRole role, @Size(max = 60) String relation) {
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	PatientView create(@AuthenticationPrincipal CurrentUser me, @Valid @RequestBody CreatePatientRequest r) {
		return care.createPatient(me.id(), r.name(), r.birthYear(), r.notes(), r.graceMinutes(), r.relation());
	}

	@GetMapping("/{patientId}")
	PatientView get(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId) {
		return care.patient(patientId, me.id());
	}

	@PutMapping("/{patientId}")
	PatientView update(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @Valid @RequestBody UpdatePatientRequest r) {
		return care.updatePatient(patientId, me.id(), r.name(), r.birthYear(), r.notes(), r.graceMinutes());
	}

	@GetMapping("/{patientId}/members")
	List<MemberView> members(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId) {
		return care.members(patientId, me.id());
	}

	@PostMapping("/{patientId}/members")
	@ResponseStatus(HttpStatus.CREATED)
	MemberView addMember(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @Valid @RequestBody AddMemberRequest r) {
		return care.addMember(patientId, me.id(), r.email(), r.role(), r.relation());
	}

	@PutMapping("/{patientId}/members/{memberId}")
	MemberView updateMember(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @PathVariable UUID memberId,
			@Valid @RequestBody UpdateMemberRequest r) {
		return care.updateMember(patientId, me.id(), memberId, r.role(), r.relation());
	}

	@DeleteMapping("/{patientId}/members/{memberId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void removeMember(@AuthenticationPrincipal CurrentUser me, @PathVariable UUID patientId, @PathVariable UUID memberId) {
		care.removeMember(patientId, me.id(), memberId);
	}

}
