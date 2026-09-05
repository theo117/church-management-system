package com.churchmanagement.api.service;

import com.churchmanagement.api.domain.Member;
import com.churchmanagement.api.domain.Role;
import com.churchmanagement.api.dto.MemberDetailsResponse;
import com.churchmanagement.api.dto.MemberRequest;
import com.churchmanagement.api.repository.MemberRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    public MemberService(
            MemberRepository memberRepository,
            PasswordEncoder passwordEncoder) {

        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<MemberDetailsResponse> getAllMembers() {

        return memberRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public MemberDetailsResponse getMember(Long id) {

        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        return toResponse(member);
    }

    public MemberDetailsResponse createMember(MemberRequest request) {

        Member member = new Member();

        member.setName(request.name());
        member.setEmail(request.email());
        member.setStatus(request.status());
        member.setMinistry(request.ministry());
        member.setSmallGroup(request.smallGroup());
        member.setLastAttended(request.lastAttended());

        member.setRole(
                request.role() == null
                        ? Role.MEMBER
                        : request.role());

        member.setPasswordHash(passwordEncoder.encode("ChangeMe123!"));
        member.setEnabled(true);

        memberRepository.save(member);

        return toResponse(member);
    }

    public MemberDetailsResponse updateMember(Long id, MemberRequest request) {

        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member not found"));

        member.setName(request.name());
        member.setEmail(request.email());
        member.setStatus(request.status());
        member.setMinistry(request.ministry());
        member.setSmallGroup(request.smallGroup());
        member.setLastAttended(request.lastAttended());

        if (request.role() != null) {
            member.setRole(request.role());
        }

        memberRepository.save(member);

        return toResponse(member);
    }

    public void deleteMember(Long id) {

        if (!memberRepository.existsById(id)) {
            throw new RuntimeException("Member not found");
        }

        memberRepository.deleteById(id);
    }

    private MemberDetailsResponse toResponse(Member member) {

        return new MemberDetailsResponse(
                member.getId(),
                member.getName(),
                member.getEmail(),
                member.getStatus(),
                member.getMinistry(),
                member.getSmallGroup(),
                member.getLastAttended(),
                member.getRole(),
                member.isEnabled()
        );
    }
}