package ru.aptechka.backend.account;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ru.aptechka.backend.care.CareService;
import ru.aptechka.backend.care.CareService.MembershipView;

@RestController
public class AuthController {

	private final AccountService accounts;
	private final CareService care;

	public AuthController(AccountService accounts, CareService care) {
		this.accounts = accounts;
		this.care = care;
	}

	public record RegisterRequest(
			@NotBlank @Email @Size(max = 254) String email,
			@NotBlank @Size(min = 8, max = 72) String password,
			@NotBlank @Size(max = 100) String displayName) {
	}

	public record UserView(UUID id, String email, String displayName) {
	}

	public record MeView(UUID id, String email, String displayName, List<MembershipView> patients) {
	}

	@PostMapping("/api/auth/register")
	@ResponseStatus(HttpStatus.CREATED)
	UserView register(@Valid @RequestBody RegisterRequest request) {
		AppUser user = accounts.register(request.email(), request.password(), request.displayName());
		return new UserView(user.getId(), user.getEmail(), user.getDisplayName());
	}

	// Also serves as the login check for the stateless HTTP Basic frontend.
	@GetMapping("/api/me")
	MeView me(@AuthenticationPrincipal CurrentUser me) {
		return new MeView(me.id(), me.email(), me.displayName(), care.memberships(me.id()));
	}

}
