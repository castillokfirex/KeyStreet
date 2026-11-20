package co.keystreet.catalog.dto;

import java.util.Map;
import java.util.UUID;

public record TenantPublicDto(
    UUID id,
    String slug,
    String name,
    String whatsappPhone,
    String currency,
    String locale,
    Map<String, Object> branding,
    Map<String, Object> settings) {}
