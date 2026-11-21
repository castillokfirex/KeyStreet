package co.keystreet.common;

import co.keystreet.config.KeyStreetProperties;
import co.keystreet.tenant.TenantResolverFilter;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

  private final KeyStreetProperties props;
  private final HandlerExceptionResolver resolver;
  private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
  private final Map<String, Bucket> assistantBuckets = new ConcurrentHashMap<>();

  public RateLimitFilter(
      KeyStreetProperties props,
      @Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver) {
    this.props = props;
    this.resolver = resolver;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    if (!props.getSecurity().isRateLimitEnabled()) {
      return true;
    }
    if (!HttpMethod.POST.matches(request.getMethod())) {
      return true;
    }
    String path = resolvePath(request);
    return !"/api/v1/auth/login".equals(path) && !"/api/v1/assistant/query".equals(path);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String path = resolvePath(request);
    String ip = clientIp(request);

    Bucket bucket;
    if ("/api/v1/auth/login".equals(path)) {
      bucket =
          loginBuckets.computeIfAbsent(
              ip,
              k ->
                  Bucket.builder()
                      .addLimit(
                          Bandwidth.builder()
                              .capacity(5)
                              .refillGreedy(5, Duration.ofMinutes(1))
                              .build())
                      .build());
    } else {
      String slug = String.valueOf(request.getHeader(TenantResolverFilter.HEADER_TENANT_SLUG));
      bucket =
          assistantBuckets.computeIfAbsent(
              ip + ":" + slug,
              k ->
                  Bucket.builder()
                      .addLimit(
                          Bandwidth.builder()
                              .capacity(20)
                              .refillGreedy(20, Duration.ofMinutes(1))
                              .build())
                      .build());
    }

    if (!bucket.tryConsume(1)) {
      resolver.resolveException(
          request,
          response,
          null,
          new ApiException(
              HttpStatus.TOO_MANY_REQUESTS,
              "RATE_LIMIT_EXCEEDED",
              "Demasiadas solicitudes. Intenta nuevamente en un minuto."));
      return;
    }

    chain.doFilter(request, response);
  }

  private static String resolvePath(HttpServletRequest req) {
    String uri = req.getRequestURI();
    String ctx = req.getContextPath();
    return (ctx != null && !ctx.isEmpty() && uri.startsWith(ctx)) ? uri.substring(ctx.length()) : uri;
  }

  private static String clientIp(HttpServletRequest req) {
    String xff = req.getHeader("X-Forwarded-For");
    if (xff != null && !xff.isBlank()) {
      int comma = xff.indexOf(',');
      return (comma > 0 ? xff.substring(0, comma) : xff).trim();
    }
    return req.getRemoteAddr();
  }
}
