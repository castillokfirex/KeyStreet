package co.keystreet.config;

import co.keystreet.common.ApiException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

@Component
public class InternalTokenFilter extends OncePerRequestFilter {

  public static final String HEADER_INTERNAL_TOKEN = "X-Internal-Token";
  private static final AntPathMatcher MATCHER = new AntPathMatcher();

  private final byte[] expectedTokenBytes;
  private final HandlerExceptionResolver resolver;

  public InternalTokenFilter(
      KeyStreetProperties props,
      @Qualifier("handlerExceptionResolver") HandlerExceptionResolver resolver) {
    this.expectedTokenBytes =
        props.getSecurity().getInternalApiToken().getBytes(StandardCharsets.UTF_8);
    this.resolver = resolver;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String uri = request.getRequestURI();
    String ctx = request.getContextPath();
    String path = (ctx != null && !ctx.isEmpty() && uri.startsWith(ctx)) ? uri.substring(ctx.length()) : uri;
    return !MATCHER.match("/internal/**", path);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String provided = request.getHeader(HEADER_INTERNAL_TOKEN);
    if (provided == null
        || !MessageDigest.isEqual(
            expectedTokenBytes, provided.getBytes(StandardCharsets.UTF_8))) {
      resolver.resolveException(
          request,
          response,
          null,
          new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_INTERNAL_TOKEN", "No autorizado"));
      return;
    }

    UsernamePasswordAuthenticationToken auth =
        new UsernamePasswordAuthenticationToken(
            "internal-rag", null, List.of(new SimpleGrantedAuthority("ROLE_INTERNAL")));
    SecurityContextHolder.getContext().setAuthentication(auth);
    try {
      chain.doFilter(request, response);
    } finally {
      SecurityContextHolder.clearContext();
    }
  }
}
