package com.churchmanagement.api.dto;

import com.churchmanagement.api.domain.Role;

public record MemberResponse(
        Long id,
        String name,
        String email,
        String status,
        String ministry,
        String smallGroup,
        String lastAttended,
        Role role,
        boolean enabled
) {}