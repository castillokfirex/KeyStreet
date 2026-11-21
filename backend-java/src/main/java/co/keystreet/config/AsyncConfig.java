package co.keystreet.config;

import co.keystreet.tenant.TenantContext;
import java.util.UUID;
import java.util.concurrent.Executor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableAsync
@EnableTransactionManagement(order = 100)
public class AsyncConfig {

  @Bean(name = "taskExecutor")
  public Executor taskExecutor() {
    ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
    exec.setCorePoolSize(4);
    exec.setMaxPoolSize(8);
    exec.setQueueCapacity(100);
    exec.setThreadNamePrefix("ks-async-");
    exec.setTaskDecorator(tenantPropagatingDecorator());
    exec.initialize();
    return exec;
  }

  private TaskDecorator tenantPropagatingDecorator() {
    return runnable -> {
      UUID captured = TenantContext.get();
      return () -> {
        UUID previous = TenantContext.get();
        TenantContext.set(captured);
        try {
          runnable.run();
        } finally {
          TenantContext.set(previous);
        }
      };
    };
  }
}
