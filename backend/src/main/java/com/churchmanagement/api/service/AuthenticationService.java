package com.churchmanagement.api.service;

import com.churchmanagement.api.domain.Member;
import com.churchmanagement.api.dto.LoginRequest;
import com.churchmanagement.api.dto.LoginResponse;
import com.churchmanagement.api.repository.MemberRepository;
import com.churchmanagement.api.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthenticationService(
            MemberRepository memberRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {

        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {

        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), member.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }

        org.springframework.security.core.userdetails.User user =
                new org.springframework.security.core.userdetails.User(
                        member.getEmail(),
                        member.getPasswordHash(),
                        java.util.List.of()
                );

        String token = jwtService.generateToken(user);

        return new LoginResponse(token);
    }
}
