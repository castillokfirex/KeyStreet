package co.keystreet.common;

import java.util.Collections;
import java.util.Map;
import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

  private final HttpStatus status;
  private final String errorCode;
  private final Map<String, Object> extra;

  public ApiException(HttpStatus status, String errorCode, String message) {
    this(status, errorCode, message, Collections.emptyMap());
  }

  public ApiException(
      HttpStatus status, String errorCode, String message, Map<String, Object> extra) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.extra = extra == null ? Collections.emptyMap() : Map.copyOf(extra);
  }

  public HttpStatus getStatus() {
    return status;
  }

  public String getErrorCode() {
    return errorCode;
  }

  public Map<String, Object> getExtra() {
    return extra;
  }
}
