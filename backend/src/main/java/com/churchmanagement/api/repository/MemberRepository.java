package com.churchmanagement.api.repository;

import java.util.Optional;


import com.churchmanagement.api.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {
    long countByStatusIgnoreCase(String status);
}

Optional<Member> findByEmail(String email);
