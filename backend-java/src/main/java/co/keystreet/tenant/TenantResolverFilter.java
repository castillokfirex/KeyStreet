package co.keystreet.tenant;

import co.keystreet.common.ApiException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

@Component
public class TenantResolverFilter extends OncePerRequestFilter {

  public static final String HEADER_TENANT_SLUG = "X-Tenant-Slug";
  private static final AntPathMatcher MATCHER = new AntPathMatcher();

  private final TenantRepository tenantRepository;
  private final HandlerExceptionResolver resolver;

  public TenantResolverFilter(
      TenantRepository tenantRepository,
      @Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver) {
    this.tenantRepository = tenantRepository;
    this.resolver = resolver;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = resolvePath(request);
    return !MATCHER.match("/api/**", path) || MATCHER.match("/api/internal/**", path);
  }

  private static String resolvePath(HttpServletRequest req) {
    String uri = req.getRequestURI();
    String ctx = req.getContextPath();
    return (ctx != null && !ctx.isEmpty() && uri.startsWith(ctx)) ? uri.substring(ctx.length()) : uri;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    try {
      UUID resolvedTenantId = resolveTenantId(request);
      TenantContext.set(resolvedTenantId);
      chain.doFilter(request, response);
    } catch (ApiException ex) {
      resolver.resolveException(request, response, null, ex);
    } finally {
      TenantContext.clear();
    }
  }

  private UUID resolveTenantId(HttpServletRequest request) {
    String slugHeader = trimOrNull(request.getHeader(HEADER_TENANT_SLUG));
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();

    if (auth instanceof JwtAuthenticationToken jwtAuth) {
      String tidClaim = jwtAuth.getToken().getClaimAsString("tid");
      if (tidClaim == null || tidClaim.isBlank()) {
        throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_TOKEN", "Token sin tenant");
      }
      UUID jwtTenantId = UUID.fromString(tidClaim);
      Tenant tenant =
          tenantRepository
              .findById(jwtTenantId)
              .orElseThrow(
                  () -> new ApiException(HttpStatus.FORBIDDEN, "TENANT_NOT_FOUND", "Tienda invalida"));
      if (!"ACTIVE".equals(tenant.getStatus())) {
        throw new ApiException(HttpStatus.FORBIDDEN, "TENANT_SUSPENDED", "Tienda suspendida");
      }
      if (slugHeader != null && !slugHeader.equalsIgnoreCase(tenant.getSlug())) {
        throw new ApiException(
            HttpStatus.FORBIDDEN, "TENANT_MISMATCH", "El tenant no coincide con la sesion");
      }
      return tenant.getId();
    }

    String slug = slugHeader != null ? slugHeader : extractSubdomainSlug(request.getServerName());
    if (slug == null) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "TENANT_REQUIRED",
          "Cabecera X-Tenant-Slug requerida para resolver la tienda");
    }

    Tenant tenant =
        tenantRepository
            .findBySlug(slug.toLowerCase())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND", "Tienda no encontrada: " + slug));
    if (!"ACTIVE".equals(tenant.getStatus())) {
      throw new ApiException(HttpStatus.FORBIDDEN, "TENANT_SUSPENDED", "Tienda suspendida");
    }
    return tenant.getId();
  }

  private static String trimOrNull(String v) {
    if (v == null) {
      return null;
    }
    String t = v.trim();
    return t.isEmpty() ? null : t;
  }

  private static String extractSubdomainSlug(String host) {
    if (host == null
        || host.equalsIgnoreCase("localhost")
        || host.matches("^\\d+\\.\\d+\\.\\d+\\.\\d+$")) {
      return null;
    }
    String[] parts = host.split("\\.");
    if (parts.length >= 3 && !"www".equalsIgnoreCase(parts[0])) {
      return parts[0];
    }
    return null;
  }
}
