package co.keystreet.assistant;

import co.keystreet.assistant.dto.AssistantDtos.AssistantQueryResponse;
import co.keystreet.assistant.dto.AssistantDtos.RagIngestPayload;
import co.keystreet.assistant.dto.AssistantDtos.RagQueryPayload;
import co.keystreet.config.KeyStreetProperties;
import java.time.Duration;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class RagClient {

  private final RestClient restClient;
  private final String internalToken;

  public RagClient(KeyStreetProperties props) {
    SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
    rf.setConnectTimeout(Duration.ofSeconds(5));
    rf.setReadTimeout(Duration.ofSeconds(props.getRag().getTimeoutSeconds()));
    this.restClient = RestClient.builder().baseUrl(props.getRag().getBaseUrl()).requestFactory(rf).build();
    this.internalToken = props.getSecurity().getInternalApiToken();
  }

  public void ingest(RagIngestPayload payload) {
    restClient
        .post()
        .uri("/internal/v1/ingest")
        .header("X-Internal-Token", internalToken)
        .contentType(MediaType.APPLICATION_JSON)
        .body(payload)
        .retrieve()
        .toBodilessEntity();
  }

  public AssistantQueryResponse query(RagQueryPayload payload) {
    return restClient
        .post()
        .uri("/internal/v1/query")
        .header("X-Internal-Token", internalToken)
        .contentType(MediaType.APPLICATION_JSON)
        .body(payload)
        .retrieve()
        .body(AssistantQueryResponse.class);
  }
}
