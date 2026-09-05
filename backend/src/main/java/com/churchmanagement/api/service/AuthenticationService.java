package com.churchmanagement.api.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.churchmanagement.api.domain.Member;
import com.churchmanagement.api.dto.LoginRequest;
import com.churchmanagement.api.dto.LoginResponse;
import com.churchmanagement.api.repository.MemberRepository;

@Service
public class AuthenticationService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthenticationService(
            MemberRepository memberRepository,
            PasswordEncoder passwordEncoder) {

        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public LoginResponse login(LoginRequest request) {

        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), member.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }

        // JWT generation comes next
        return new LoginResponse("LOGIN_SUCCESS");
    }
}