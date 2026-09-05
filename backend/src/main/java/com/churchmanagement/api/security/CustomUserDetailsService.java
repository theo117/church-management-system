package com.churchmanagement.api.security;

import com.churchmanagement.api.domain.Member;
import com.churchmanagement.api.repository.MemberRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final MemberRepository memberRepository;

    public CustomUserDetailsService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found"));

        return User.builder()
                .username(member.getEmail())
                .password(member.getPasswordHash())
                .authorities(List.of(
                        new SimpleGrantedAuthority("ROLE_" + member.getRole().name())))
                .disabled(!member.isEnabled())
                .build();
    }
}