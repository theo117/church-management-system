package com.churchmanagement.api.service;

import com.churchmanagement.api.domain.Member;
import com.churchmanagement.api.domain.Role;
import com.churchmanagement.api.repository.MemberRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer implements CommandLineRunner {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminInitializer(
            MemberRepository memberRepository,
            PasswordEncoder passwordEncoder) {

        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {

        if (memberRepository.findByEmail("admin@church.local").isPresent()) {
            return;
        }

        Member admin = new Member();

        admin.setName("Administrator");
        admin.setEmail("admin@church.local");
        admin.setRole(Role.ADMIN);
        admin.setEnabled(true);
        admin.setStatus("active");

        admin.setPasswordHash(
                passwordEncoder.encode("ChangeMe123!")
        );

        memberRepository.save(admin);

        System.out.println("Created default administrator account.");
    }
}