package ru.aptechka.backend.account;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

// The authenticated principal. Per-patient rights come from the care circle,
// not from Spring authorities, so the authority list is empty.
public record CurrentUser(UUID id, String email, String passwordHash, String displayName) implements UserDetails {

	static CurrentUser of(AppUser user) {
		return new CurrentUser(user.getId(), user.getEmail(), user.getPasswordHash(), user.getDisplayName());
	}

	@Override
	public List<GrantedAuthority> getAuthorities() {
		return List.of();
	}

	@Override
	public String getPassword() {
		return passwordHash;
	}

	@Override
	public String getUsername() {
		return email;
	}

}
