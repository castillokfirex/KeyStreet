package co.keystreet.orders;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WhatsappOrderIntentRepository extends JpaRepository<WhatsappOrderIntent, UUID> {}
