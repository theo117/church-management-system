package com.churchmanagement.api.service;

import com.churchmanagement.api.domain.Donation;
import com.churchmanagement.api.dto.DonationUpsertRequest;
import com.churchmanagement.api.repository.DonationRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DonationPrecisionTest {
    @Test
    void preservesCentsAcrossCreateListAndUpdate() {
        DonationRepository repository = mock(DonationRepository.class);
        DashboardService service = new DashboardService(
            null, null, null, null, null, repository, null, null, null, null
        );
        Donation donation = new Donation("Donor", "General", new BigDecimal("1234.56"), "Sep 12");
        when(repository.save(any(Donation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.findAll()).thenReturn(List.of(donation));
        when(repository.findById(1L)).thenReturn(Optional.of(donation));

        DonationUpsertRequest request = new DonationUpsertRequest(
            "Donor", "General", new BigDecimal("1234.56"), "Sep 12"
        );
        assertEquals("R1,234.56", service.createDonation(request).amount());
        assertEquals("R1,234.56", service.donations().getFirst().amount());
        assertEquals("R1,234.56", service.updateDonation(1L, request).amount());

        donation.setAmount(new BigDecimal("0.01"));
        assertEquals("R0.01", service.donations().getFirst().amount());
        donation.setAmount(new BigDecimal("1200.00"));
        assertEquals("R1,200", service.donations().getFirst().amount());
    }
}
