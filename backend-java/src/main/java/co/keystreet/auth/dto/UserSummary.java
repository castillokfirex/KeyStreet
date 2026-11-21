package co.keystreet.auth.dto;

import co.keystreet.user.Role;
import java.util.UUID;

public record UserSummary(UUID id, String email, String fullName, Role role, UUID tenantId) {}
